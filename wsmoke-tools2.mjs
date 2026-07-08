// Verify the new browser tools: (A) their page-side JS works against a real
// DOM, and (B) Nano actually selects and calls one end-to-end via the facade.
import { WebSocket } from "ws";
globalThis.WebSocket = WebSocket;
import http from "http";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function cdpHttp(path) {
  return new Promise((res, rej) => {
    http.get("http://[::1]:9222" + path, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej);
  });
}
// Raw CDP session to one page target (mirrors what chrome.debugger does in the extension).
async function attach(target) {
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0; const p = new Map();
  const send = (m, pr) => new Promise((r, j) => { const i = ++id; p.set(i, { r, j }); ws.send(JSON.stringify({ id: i, method: m, params: pr || {} })); });
  ws.on("message", (d) => { const m = JSON.parse(d.toString()); if (m.id && p.has(m.id)) { const x = p.get(m.id); p.delete(m.id); m.error ? x.j(new Error(JSON.stringify(m.error))) : x.r(m.result); } });
  await new Promise((r) => ws.on("open", r));
  await send("Page.enable"); await send("Runtime.enable");
  const evalJs = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
  const navigate = async (url) => { await send("Page.navigate", { url }); await sleep(1500); };
  return { evalJs, navigate, close: () => ws.close() };
}

// The exact page-side expressions the extension handlers run (copied from sidepanel.js).
const EXPR_LIST_LINKS = (n) => `(() => {
  const seen = new Set(), out = [];
  const els = [...document.querySelectorAll("a[href],button,[role=button],input[type=submit],input[type=button]")];
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
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
})()`;
const EXPR_TYPE = (t, sel, fld) => `(() => {
  try {
    const t = ${JSON.stringify(t)}, sel = ${JSON.stringify(sel)}, fld = ${JSON.stringify(fld.toLowerCase())};
    let el = null;
    if (sel) { try { el = document.querySelector(sel); } catch (e) { return "invalid selector: " + e.message; } }
    if (!el && fld) {
      const inputs = [...document.querySelectorAll("input,textarea")];
      el = inputs.find((n) => {
        const hay = [n.placeholder, n.name, n.getAttribute("aria-label"), n.id].map((x) => (x || "").toLowerCase()).join(" ");
        return hay.includes(fld);
      }) || null;
    }
    if (!el) return "no matching field";
    el.focus();
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) desc.set.call(el, t); else el.value = t;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return "typed: " + (el.value || "").slice(0, 60);
  } catch (e) { return "type error: " + e.message; }
})()`;
const EXPR_SUBMIT = (sel) => `(() => {
  try {
    const sel = ${JSON.stringify(sel)};
    let el = sel ? document.querySelector(sel) : document.activeElement;
    if (!el) return "no target";
    const form = el.form || (el.closest ? el.closest("form") : null);
    if (form) { if (form.requestSubmit) form.requestSubmit(); else form.submit(); return "submitted form"; }
    return "no form";
  } catch (e) { return "submit error: " + e.message; }
})()`;

// ---- Part A: page-JS logic against a crafted DOM -------------------------
const pages = (await cdpHttp("/json")).filter((t) => t.type === "page");
const anchor = pages.find((t) => t.url.startsWith("https://"));
if (!anchor) { console.log("No https tab to test on."); process.exit(1); }
const cdp = await attach(anchor);

const testHtml =
  '<!doctype html><body>' +
  '<a href="https://alpha.example/">Alpha link</a>' +
  '<button aria-label="Beta button">Beta</button>' +
  '<form onsubmit="window.__submitted=true;return false;">' +
  '<input name="q" placeholder="Search here" /><button type="submit">Go</button></form>' +
  '</body>';
await cdp.navigate("data:text/html," + encodeURIComponent(testHtml));

const links = JSON.parse(await cdp.evalJs(EXPR_LIST_LINKS(30)));
console.log("A.list_links:", JSON.stringify(links));
// The button shows innerText "Beta" (aria-label is only the fallback), and the
// handler correctly prefers visible text — same text browser_click matches on.
const okLinks = links.some((l) => l.text === "Alpha link" && l.href === "https://alpha.example/")
  && links.some((l) => l.text === "Beta") && links.some((l) => l.text === "Go");

const typed = await cdp.evalJs(EXPR_TYPE("hello nano", "", "search"));
console.log("A.type:", typed);
const okType = typed === "typed: hello nano";

const submitted = await cdp.evalJs(EXPR_SUBMIT('input[name="q"]'));
const flag = await cdp.evalJs("window.__submitted === true");
console.log("A.submit:", submitted, "| onsubmit fired:", flag);
const okSubmit = submitted === "submitted form" && flag === true;

console.log(okLinks && okType && okSubmit ? "PART A PASS" : "PART A FAIL");

// restore the anchor to a real secure origin so Nano can run on it again
await cdp.navigate("https://example.com/");
cdp.close();

// ---- Part B: Nano selects + calls browser_list_links via the facade ------
const called = {};
const evalOn = async (expression) => {
  const c = await attach((await cdpHttp("/json")).find((t) => t.url === "https://example.com/"));
  try { return await c.evalJs(expression); } finally { c.close(); }
};
const tools = [
  {
    name: "browser_list_links",
    description: "List visible links/buttons in the active tab as [{i,text,href}] (JSON), capped at `max` (default 30).",
    parameters: { type: "object", properties: { max: { type: "number" } } },
    auto_approve: true,
    handler: async ({ max }) => { called.list_links = true; return evalOn(EXPR_LIST_LINKS(Math.min(Number(max) || 30, 100))); },
  },
];

const { JaatoClient } = await import("./extension/vendor/jaato-sdk.js");
const s = await JaatoClient.session({
  url: "ws://127.0.0.1:8080",
  profile: {
    name: "nano-chat", description: "tools2 smoke", model: "gemini-nano", provider: "chrome_ai",
    plugins: [], suppress_base_instructions: true,
    plugin_configs: { chrome_ai: { cdp_url: "http://127.0.0.1:9222", page_url: "https://example.com/", reuse_page: true } },
  },
  clientType: "chat", clientTools: tools, onPermission: () => "y",
  openTimeoutMs: 8000, sessionTimeoutMs: 120000,
});
console.log("SESSION_OPEN sid=" + s.sessionId);
process.stdout.write("REPLY: ");
let reply = "";
for await (const chunk of s.stream("Call the browser_list_links tool, then tell me in one short sentence the text of the first link.")) {
  reply += chunk; process.stdout.write(chunk);
}
console.log("");
await s.close();
console.log("B.tool called:", !!called.list_links);
console.log(called.list_links ? "PART B PASS (Nano selected + called the new tool)" : "PART B FAIL (Nano did not call it)");
console.log("DONE");
