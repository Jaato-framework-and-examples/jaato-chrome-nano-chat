// Nano Chat side panel — drives Chrome's on-device Gemini Nano through the
// jaato WebSocket facade (@jaato/sdk). The daemon runs the `chrome_ai` provider
// which attaches over CDP to the headed Chrome that has Nano provisioned.
//
// Profile is selected via an INLINE spec (not a named profile-set) and this is
// a plain attended chat — one long-lived session reused across turns. No
// cascade (cascades are for unattended multi-stage orchestration).
import { JaatoClient, Session, EventTypeValue } from "./vendor/jaato-sdk.js";

// Daemon: `jaato-server --web-socket :8080 --ws-unsafe-no-auth` binds IPv4
// 0.0.0.0, so connect on 127.0.0.1 (localhost is IPv4/IPv6-ambiguous here).
const URL = "ws://127.0.0.1:8080";

// Inline profile spec — the "select the profile inline" path. The chrome_ai
// plugin_configs (cdp_url + the anchor page) are filled in at connect() time by
// resolveAnchor(), because the page the Prompt API runs on is chosen from the
// browser's live tabs (see below), not known statically.
const PROFILE = {
  name: "nano-chat",
  description: "On-device Gemini Nano chat via chrome_ai.",
  model: "gemini-nano",
  provider: "chrome_ai",
  plugins: [],
  // Nano's context window is tiny (~9k tokens); drop the framework's always-on
  // BASE instructions (~3-5k tokens) so the prompt fits.
  suppress_base_instructions: true,
  // Short persona, re-sent every turn (so it survives context GC). It anchors
  // Nano's tool-awareness: without it, one "you can't actually browse" nudge
  // makes the small model adopt an "I'm just a language model" persona from its
  // own history and refuse tools it was using a moment ago. Verified to keep it
  // calling tools after that exact provocation. "once" curbs redundant re-calls.
  system_instructions:
    "You drive a live web browser with REAL tools (navigate, read, list links, " +
    "click, type, submit, back). To act on a page, call the matching tool once, " +
    "then answer from its result. Never say you are only a language model or that " +
    "you cannot browse — you can, through these tools.",
};

// cdp_url is interpreted DAEMON-side (Linux peer). An SSH reverse tunnel maps
// the peer's 127.0.0.1:9222 -> this Windows box's Chrome CDP ([::1]:9222).
const CDP_URL = "http://127.0.0.1:9222";

// Fallback anchor page: the extension's own host.html served by a tiny static
// server on THIS box's localhost. localhost is a secure context, so the Prompt
// API is exposed there — used only when we can't anchor onto a real tab.
const HOST_FALLBACK = "http://localhost:8765/host.html";

// Choose the page the Prompt API is anchored to.  Rather than always spawning a
// dedicated "chrome_ai host" tab, we prefer to ATTACH to a normal https tab the
// user already has open (reuse_page → the provider attaches instead of creating,
// and leaves the tab open on teardown).  Only when we can't see the tabs (plain
// localhost page, no chrome.tabs) or none is https do we fall back to host.html.
async function resolveAnchor() {
  if (!IN_EXTENSION) return { page_url: HOST_FALLBACK, anchor: "host page (no tabs API)" };
  try {
    const tabs = await chrome.tabs.query({});
    const https = tabs.filter((t) => t.url && t.url.startsWith("https://"));
    // Prefer a BACKGROUND https tab: the browser tools drive the ACTIVE tab, so
    // anchoring elsewhere keeps a tool-triggered navigation from yanking the
    // page out from under the model mid-turn.
    const pick = https.find((t) => !t.active) || https[0];
    if (pick) return { page_url: pick.url, anchor: pick.url };
  } catch (e) {
    // fall through to the host page
  }
  return { page_url: HOST_FALLBACK, anchor: "host page (no https tab open)" };
}

// ---------------------------------------------------------------------------
// Curated CDP host tools (proof of concept) — let the MODEL drive the browser.
//
// Handlers run in THIS extension via chrome.debugger, so they only work when
// the app runs as the LOADED extension (a real chrome-extension:// context with
// the "debugger" permission). The plain http://localhost page has no chrome.*
// APIs, so tools are auto-disabled there.
//
// SECURITY: for this POC every tool is auto_approve:true and onPermission
// approves — the model can navigate/read/click the active tab with no prompt.
// Fine for local experimentation you drive; tighten (auto_approve:false + a real
// onPermission policy) before anything resembling real use.
// ---------------------------------------------------------------------------
const IN_EXTENSION = typeof chrome !== "undefined" && !!(chrome.debugger && chrome.tabs);
const DBG_PROTO = "1.3";
let attachedTabId = null;

async function activeTabId() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = tabs && tabs[0];
  if (!tab) throw new Error("no active tab to drive");
  return tab.id;
}

function dbgSend(tabId, method, params) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params || {}, (res) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(res);
    });
  });
}

async function ensureAttached() {
  const tabId = await activeTabId();
  if (attachedTabId !== tabId) {
    if (attachedTabId != null) {
      await new Promise((r) => chrome.debugger.detach({ tabId: attachedTabId }, () => r()));
    }
    await new Promise((resolve, reject) => {
      chrome.debugger.attach({ tabId }, DBG_PROTO, () => {
        const err = chrome.runtime.lastError;
        if (err && !/already attached/i.test(err.message)) reject(new Error(err.message));
        else resolve();
      });
    });
    attachedTabId = tabId;
    await dbgSend(tabId, "Page.enable");
    await dbgSend(tabId, "Runtime.enable");
  }
  return tabId;
}

async function evalJs(expression) {
  const tabId = await ensureAttached();
  const r = await dbgSend(tabId, "Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (r && r.exceptionDetails) throw new Error(r.exceptionDetails.text || "evaluate failed");
  return r && r.result ? r.result.value : undefined;
}

const CDP_TOOLS = [
  {
    name: "browser_navigate",
    description: "Navigate the active browser tab to an absolute URL; returns the final URL.",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    auto_approve: true,
    handler: async ({ url }) => {
      const tabId = await ensureAttached();
      await dbgSend(tabId, "Page.navigate", { url });
      await new Promise((r) => setTimeout(r, 1500));
      return "ok, url=" + (await evalJs("location.href"));
    },
  },
  {
    name: "browser_get_url",
    description: "Return the active tab's current URL and page title as JSON.",
    parameters: { type: "object", properties: {} },
    auto_approve: true,
    handler: async () => evalJs("JSON.stringify({url:location.href,title:document.title})"),
  },
  {
    name: "browser_get_text",
    description: "Return the active tab's visible text, truncated to `max` chars (default 1200).",
    parameters: { type: "object", properties: { max: { type: "number" } } },
    auto_approve: true,
    handler: async ({ max }) => {
      const n = Math.min(Math.max(Number(max) || 1200, 100), 4000);
      const t = await evalJs(`(document.body?document.body.innerText:"").slice(0,${n})`);
      return t || "(no visible text)";
    },
  },
  {
    name: "browser_click",
    description: "Click an element in the active tab, matched by CSS `selector` OR by visible `text` (link/button text, case-insensitive substring). Reports what was clicked and, if it navigated, the resulting URL.",
    parameters: { type: "object", properties: { selector: { type: "string" }, text: { type: "string" } } },
    auto_approve: true,
    handler: async ({ selector, text }) => {
      const sel = JSON.stringify(selector || "");
      const txt = JSON.stringify((text || "").toLowerCase());
      const before = await evalJs("location.href");
      const result = await evalJs(`(() => {
        try {
          const sel = ${sel}, txt = ${txt};
          let el = null;
          if (sel) { try { el = document.querySelector(sel); } catch (e) { return "invalid selector: " + e.message; } }
          if (!el && txt) {
            const cands = [...document.querySelectorAll("a,button,[role=button],input[type=submit],input[type=button]")];
            // innerText || textContent: innerText can be empty for elements that
            // aren't laid out; textContent is layout-independent.
            el = cands.find((n) => ((n.innerText || n.textContent || n.value || "").toLowerCase().includes(txt))) || null;
          }
          if (!el) return "no matching element";
          el.scrollIntoView();
          // If it targets a new tab, retarget to this tab so navigation happens
          // where the model can see it (it can only read the tab it drives).
          const a = el.tagName === "A" ? el : (el.closest ? el.closest("a[href]") : null);
          if (a && a.target === "_blank") a.target = "_self";
          el.click();
          return "clicked: " + (el.innerText || el.textContent || el.value || el.tagName).trim().slice(0, 60);
        } catch (e) { return "click error: " + e.message; }
      })()`);
      if (!/^clicked:/.test(result)) return result;               // no match / error — pass through
      await new Promise((r) => setTimeout(r, 1200));               // let any navigation settle
      const after = await evalJs("location.href");
      return after !== before ? result + " → navigated to " + after : result + " (no navigation; still at " + after + ")";
    },
  },
  {
    name: "browser_list_links",
    description: "List visible links/buttons in the active tab as [{i,text,href}] (JSON), capped at `max` (default 30). Use to choose a click target by its text instead of guessing a selector.",
    parameters: { type: "object", properties: { max: { type: "number" } } },
    auto_approve: true,
    handler: async ({ max }) => {
      const n = Math.min(Math.max(Number(max) || 30, 1), 100);
      return evalJs(`(() => {
        const seen = new Set(), out = [];
        const els = [...document.querySelectorAll("a[href],button,[role=button],input[type=submit],input[type=button]")];
        for (const el of els) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;               // skip hidden
          const text = (el.innerText || el.value || el.getAttribute("aria-label") || "").split("\\n").join(" ").trim().slice(0, 80);
          if (!text) continue;
          const href = el.tagName === "A" ? el.href : "";
          const key = text + "|" + href;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push({ i: out.length, text, href });
          if (out.length >= ${n}) break;
        }
        return JSON.stringify(out);
      })()`);
    },
  },
  {
    name: "browser_back",
    description: "Go back one entry in the active tab's history; returns the resulting URL.",
    parameters: { type: "object", properties: {} },
    auto_approve: true,
    handler: async () => {
      await evalJs("history.back()");
      await new Promise((r) => setTimeout(r, 1200));
      return "ok, url=" + (await evalJs("location.href"));
    },
  },
  {
    name: "browser_type",
    description: "Type `text` into a field in the active tab, matched by CSS `selector` or by its placeholder/label/name `field`. Returns the field's new value.",
    parameters: { type: "object", properties: { text: { type: "string" }, selector: { type: "string" }, field: { type: "string" } }, required: ["text"] },
    auto_approve: true,
    handler: async ({ text, selector, field }) => {
      const t = JSON.stringify(text || "");
      const sel = JSON.stringify(selector || "");
      const fld = JSON.stringify((field || "").toLowerCase());
      return evalJs(`(() => {
        try {
          const t = ${t}, sel = ${sel}, fld = ${fld};
          let el = null;
          if (sel) { try { el = document.querySelector(sel); } catch (e) { return "invalid selector: " + e.message; } }
          if (!el && fld) {
            const inputs = [...document.querySelectorAll("input,textarea")];
            el = inputs.find((n) => {
              const hay = [n.placeholder, n.name, n.getAttribute("aria-label"), n.id].map((x) => (x || "").toLowerCase()).join(" ");
              if (hay.includes(fld)) return true;
              if (n.id) { const lab = document.querySelector('label[for="' + n.id + '"]'); if (lab && (lab.innerText || "").toLowerCase().includes(fld)) return true; }
              const wrap = n.closest("label");
              return !!(wrap && (wrap.innerText || "").toLowerCase().includes(fld));
            }) || null;
          }
          if (!el) { const a = document.activeElement; if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA")) el = a; }
          if (!el) return "no matching field";
          el.focus();
          const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          const desc = Object.getOwnPropertyDescriptor(proto, "value");
          if (desc && desc.set) desc.set.call(el, t); else el.value = t;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          return "typed into " + ((el.name || el.placeholder || el.id || el.tagName) + "").slice(0, 40) + ": " + (el.value || "").slice(0, 60);
        } catch (e) { return "type error: " + e.message; }
      })()`);
    },
  },
  {
    name: "browser_submit",
    description: "Submit the form of the focused or `selector`-matched field (or press Enter on it). Returns the resulting URL.",
    parameters: { type: "object", properties: { selector: { type: "string" } } },
    auto_approve: true,
    handler: async ({ selector }) => {
      const sel = JSON.stringify(selector || "");
      const r = await evalJs(`(() => {
        try {
          const sel = ${sel};
          let el = null;
          if (sel) { try { el = document.querySelector(sel); } catch (e) { return "invalid selector: " + e.message; } }
          if (!el) el = document.activeElement;
          if (!el) return "no target to submit";
          const form = el.form || (el.closest ? el.closest("form") : null);
          if (form) { if (form.requestSubmit) form.requestSubmit(); else form.submit(); return "submitted form"; }
          ["keydown", "keypress", "keyup"].forEach((type) =>
            el.dispatchEvent(new KeyboardEvent(type, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true })));
          return "pressed Enter on " + (el.tagName || "").toLowerCase();
        } catch (e) { return "submit error: " + e.message; }
      })()`);
      await new Promise((res) => setTimeout(res, 1200));
      return r + " (url=" + (await evalJs("location.href")) + ")";
    },
  },
];

const $ = (id) => document.getElementById(id);
const log = $("log"), input = $("input"), sendBtn = $("send");
const dot = $("dot"), statusText = $("statusText");

let session = null;
let busy = false;

function setStatus(kind, text) {
  dot.className = kind === "up" ? "up" : kind === "down" ? "down" : "";
  statusText.textContent = text;
}
function scrollDown() { log.scrollTop = log.scrollHeight; }
function bubble(cls, text = "") {
  const el = document.createElement("div");
  el.className = cls;
  el.textContent = text;
  log.appendChild(el);
  scrollDown();
  return el;
}
const addUser = (t) => bubble("msg user", t);
const addBot = () => bubble("msg bot pending");
const addMeta = (t) => bubble("meta", t);
const addErr = (t) => bubble("err", t);

function setEnabled(on) {
  busy = !on;
  input.disabled = !on;
  sendBtn.disabled = !on;
}

function autoResize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 120) + "px";
}

// ── Session persistence + resume ────────────────────────────────────────────
// Persist the session id so a panel RELOAD resumes the SAME daemon session
// (Nano keeps the whole conversation) instead of starting fresh. Requires the
// daemon's WS resume support (session-workspace index + inline-profile restore +
// suppress_base_instructions on restore). chrome.storage.local in the loaded
// extension; localStorage when running as a plain page.
const SID_KEY = "nanoChat.sessionId";
const _hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
async function loadSid() {
  if (_hasChromeStorage) return (await chrome.storage.local.get(SID_KEY))[SID_KEY] || null;
  try { return localStorage.getItem(SID_KEY); } catch (e) { return null; }
}
async function saveSid(id) {
  if (!id) return;
  if (_hasChromeStorage) await chrome.storage.local.set({ [SID_KEY]: id });
  else try { localStorage.setItem(SID_KEY, id); } catch (e) { /* private mode */ }
}
async function dropSid() {
  if (_hasChromeStorage) await chrome.storage.local.remove(SID_KEY);
  else try { localStorage.removeItem(SID_KEY); } catch (e) { /* ignore */ }
}

// Resolve the session id after a fire-and-forget createSession — it arrives on
// the SessionInfoEvent, and a cold runner bootstrap can take many seconds.
function waitForSessionId(client, timeoutMs) {
  if (client.sessionId) return Promise.resolve(client.sessionId);
  return new Promise((resolve) => {
    let t;
    const u = client.subscribe(EventTypeValue.SESSION_INFO, () => { clearTimeout(t); if (u) u(); resolve(client.sessionId); });
    t = setTimeout(() => { if (u) u(); resolve(null); }, timeoutMs);
  });
}
// The daemon's session list now unions cold provisioned-workspace sessions, so a
// persisted id resolves here. Returns the list of session ids.
function listSessionIds(client, timeoutMs = 8000) {
  return new Promise((resolve) => {
    let t;
    const u = client.subscribe(EventTypeValue.SESSION_LIST, (ev) => { clearTimeout(t); if (u) u(); resolve(((ev && ev.sessions) || []).map((s) => s.id)); });
    t = setTimeout(() => { if (u) u(); resolve([]); }, timeoutMs);
    client.listSessions();
  });
}

async function connect() {
  setStatus("connecting", "connecting…");
  try {
    const anchor = await resolveAnchor();
    const profile = {
      ...PROFILE,
      plugin_configs: {
        chrome_ai: {
          cdp_url: CDP_URL,
          page_url: anchor.page_url,
          reuse_page: true,   // attach to the tab above; don't spawn/close one
        },
      },
    };
    // Low-level client (not the one-shot facade) so we can branch attach-or-create.
    // recovery: re-attaches on transient reconnects; with the persisted id below it
    // also lets a fresh panel load cold-resume the session.
    const client = new JaatoClient({
      url: URL,
      recovery: { autoReattachSessionId: true },
      clientConfig: { presentation: { client_type: "chat" } },
      openTimeoutMs: 8000,
    });
    await client.connect();

    // Host tools: registered after connect, before create/attach. Keep the
    // handlers locally and ship only the schemas (Session wraps TOOL_EXECUTE_REQUEST).
    const toolHandlers = new Map();
    if (IN_EXTENSION && CDP_TOOLS.length) {
      const wire = CDP_TOOLS.map((spec) => {
        const { handler, ...rest } = spec;
        if (handler) toolHandlers.set(spec.name, handler);
        return rest;
      });
      await client.registerClientTools(wire);
    }
    // Subscribe before attach — the daemon can drive the resumed turn immediately
    // and the client has no zero-subscriber buffer.
    client.subscribe(EventTypeValue.AGENT_OUTPUT, () => {});

    // Resume the persisted session if the daemon still lists it; else create fresh.
    let resumed = false;
    const persisted = await loadSid();
    if (persisted) {
      try {
        const ids = await listSessionIds(client);
        if (ids.includes(persisted)) { await client.attachSession(persisted); resumed = true; }
      } catch (e) {
        await dropSid();   // stale/broken persisted session — forget it, create fresh
      }
    }
    if (!resumed) {
      const idReady = waitForSessionId(client, 90000);   // cold bootstrap + chrome_ai attach
      await client.createSession({ profile });
      const sid = await idReady;
      if (!sid) throw new Error("session.new produced no session id in time");
      await saveSid(sid);
    } else {
      await saveSid(client.sessionId);
    }

    session = new Session(client, () => "y", toolHandlers);   // onPermission: approve (POC)
    setStatus("up", "gemini-nano · connected");
    setEnabled(true);
    addMeta(resumed
      ? "↻ Resumed your previous session — Nano still remembers the conversation."
      : "Connected — Nano anchored to " + anchor.anchor + ".");
    addMeta(IN_EXTENSION
      ? "Browser tools ON (navigate · read · list links · click · type · submit · back)."
      : "Browser tools need the loaded extension — running as a plain page, so they're off.");
    input.focus();
  } catch (e) {
    // Transient failure (daemon down, warmup timeout): keep the persisted id so
    // the next load can still resume. Resume-specific failures already dropped it.
    setStatus("down", "disconnected");
    setEnabled(false);
    addErr(
      "Connect failed: " + (e && e.message ? e.message : e) +
      "  — check the jaato daemon is on :8080 and the Nano Chrome is up on :9222.",
    );
  }
}

// The jaato renderer wraps model output it detects as code in
// <j-code language="..."><j-line n="N">...</j-line></j-code>. Nano emits tool
// calls as prose, so they arrive tagged language="tool_call". Strip those
// blocks from the display (completed ones, plus a still-open one mid-stream so
// no partial tool call flashes). Other languages are left untouched.
const TOOLCALL_BLOCK = /<j-code\s+language=["']tool_call["'][^>]*>[\s\S]*?<\/j-code>/gi;
const TOOLCALL_OPEN_TAIL = /<j-code\s+language=["']tool_call["'][^>]*>[\s\S]*$/i;
function stripToolCalls(s) {
  return s.replace(TOOLCALL_BLOCK, "").replace(TOOLCALL_OPEN_TAIL, "");
}

async function send() {
  const text = input.value.trim();
  if (!text || busy || !session) return;
  input.value = "";
  autoResize();
  setEnabled(false);
  addUser(text);
  const bot = addBot();
  try {
    let raw = "";
    let any = false;
    for await (const chunk of session.stream(text)) {
      any = true;
      raw += chunk;
      bot.textContent = stripToolCalls(raw);
      scrollDown();
    }
    const finalText = stripToolCalls(raw).trim();
    if (!any) bot.textContent = "(no output — the model returned nothing)";
    else if (!finalText) bot.textContent = "(used a tool; no text reply)";
    else bot.textContent = finalText;
  } catch (e) {
    bot.remove();
    addErr("Turn error: " + (e && e.message ? e.message : e));
  } finally {
    bot.classList.remove("pending");
    setEnabled(true);
    input.focus();
  }
}

input.addEventListener("input", autoResize);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});
sendBtn.addEventListener("click", send);

connect();
