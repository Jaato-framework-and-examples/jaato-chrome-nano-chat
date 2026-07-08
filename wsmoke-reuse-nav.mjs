// Reproduce the "Cannot read properties of undefined (reading 'run')" failure
// and prove the per-turn helper re-injection fixes it: anchor onto an https
// tab, take a turn, NAVIGATE that tab (wipes window.__jaato), take another turn.
import { WebSocket } from "ws";
globalThis.WebSocket = WebSocket;
import http from "http";

function cdpHttp(path) {
  return new Promise((res, rej) => {
    http.get("http://[::1]:9222" + path, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej);
  });
}
// raw CDP to one target (to drive a navigation out-of-band, like a browser tool would)
async function navigate(target, url) {
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0; const p = new Map();
  const send = (m, pr) => new Promise((r, j) => { const i = ++id; p.set(i, { r, j }); ws.send(JSON.stringify({ id: i, method: m, params: pr || {} })); });
  ws.on("message", (d) => { const m = JSON.parse(d.toString()); if (m.id && p.has(m.id)) { const x = p.get(m.id); p.delete(m.id); m.error ? x.j(new Error(JSON.stringify(m.error))) : x.r(m.result); } });
  await new Promise((r) => ws.on("open", r));
  await send("Page.enable");
  await send("Page.navigate", { url });
  await new Promise((r) => setTimeout(r, 2500));
  ws.close();
}

const pages = (await cdpHttp("/json")).filter((t) => t.type === "page");
const anchor = pages.find((t) => t.url.startsWith("https://"));
if (!anchor) { console.log("NO https tab to anchor on — open one first."); process.exit(1); }
console.log("ANCHOR:", anchor.url);

const { JaatoClient } = await import("./extension/vendor/jaato-sdk.js");
const s = await JaatoClient.session({
  url: "ws://127.0.0.1:8080",
  profile: {
    name: "nano-chat", description: "reuse+nav smoke", model: "gemini-nano",
    provider: "chrome_ai", plugins: [], suppress_base_instructions: true,
    plugin_configs: { chrome_ai: { cdp_url: "http://127.0.0.1:9222", page_url: anchor.url, reuse_page: true } },
  },
  clientType: "chat", openTimeoutMs: 8000, sessionTimeoutMs: 120000,
});
console.log("SESSION_OPEN sid=" + s.sessionId);

async function turn(label, text) {
  process.stdout.write(label + ": ");
  let out = "";
  for await (const c of s.stream(text)) { out += c; process.stdout.write(c); }
  console.log("");
  return out.trim();
}

const t1 = await turn("TURN1", "Say the word ping.");
console.log("--- navigating anchored tab to https://example.org (wipes window.__jaato) ---");
await navigate(anchor, "https://example.org/");
const t2 = await turn("TURN2", "Say the word pong.");

await s.close();
console.log(t1 && t2
  ? "PASS: both turns produced output across a navigation (helper self-healed)."
  : "FAIL: a turn came back empty (t1=" + JSON.stringify(t1) + " t2=" + JSON.stringify(t2) + ").");
console.log("DONE");
