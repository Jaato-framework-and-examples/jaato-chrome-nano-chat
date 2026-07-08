// Nano Chat side panel — drives Chrome's on-device Gemini Nano through the
// jaato WebSocket facade (@jaato/sdk). The daemon runs the `chrome_ai` provider
// which attaches over CDP to the headed Chrome that has Nano provisioned.
//
// Profile is selected via an INLINE spec (not a named profile-set) and this is
// a plain attended chat — one long-lived session reused across turns. No
// cascade (cascades are for unattended multi-stage orchestration).
import { JaatoClient } from "./vendor/jaato-sdk.js";

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
    description: "Click an element in the active tab, matched by CSS `selector` OR by visible `text` (link/button text, case-insensitive substring). Returns what was clicked.",
    parameters: { type: "object", properties: { selector: { type: "string" }, text: { type: "string" } } },
    auto_approve: true,
    handler: async ({ selector, text }) => {
      const sel = JSON.stringify(selector || "");
      const txt = JSON.stringify((text || "").toLowerCase());
      return evalJs(`(() => {
        try {
          const sel = ${sel}, txt = ${txt};
          let el = null;
          if (sel) { try { el = document.querySelector(sel); } catch (e) { return "invalid selector: " + e.message; } }
          if (!el && txt) {
            const cands = [...document.querySelectorAll("a,button,[role=button],input[type=submit],input[type=button]")];
            el = cands.find((n) => ((n.innerText || n.value || "").toLowerCase().includes(txt))) || null;
          }
          if (!el) return "no matching element";
          el.scrollIntoView();
          el.click();
          return "clicked: " + (el.innerText || el.value || el.tagName).trim().slice(0, 60);
        } catch (e) { return "click error: " + e.message; }
      })()`);
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
    session = await JaatoClient.session({
      url: URL,
      profile,                   // inline spec — no cascadeDriverId
      clientType: "chat",        // interactive turn-based chat (strips signal_completion)
      clientTools: IN_EXTENSION ? CDP_TOOLS : [],  // CDP tools need chrome.debugger
      onPermission: () => "y",   // POC: approve tool calls (see SECURITY note above)
      openTimeoutMs: 8000,
      sessionTimeoutMs: 90000,   // cold runner bootstrap + chrome_ai attach
    });
    setStatus("up", "gemini-nano · connected");
    setEnabled(true);
    addMeta("Connected — Nano anchored to " + anchor.anchor + ".");
    addMeta(IN_EXTENSION
      ? "Browser tools ON (navigate / read / click the active tab)."
      : "Browser tools need the loaded extension — running as a plain page, so they're off.");
    input.focus();
  } catch (e) {
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
