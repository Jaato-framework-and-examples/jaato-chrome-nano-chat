// Final resume test on the merged Advisor fix: NO workspace pinning, recovery on,
// listSessions() gate -> attachSession(id) -> index resolves the cold session.
import { WebSocket } from "ws";
globalThis.WebSocket = WebSocket;
const { JaatoClient, Session, EventTypeValue } = await import("./extension/vendor/jaato-sdk.js");

const URL = "ws://127.0.0.1:8080";
const RECOVERY = { autoReattachSessionId: true };
const profile = {
  name: "nano-chat", description: "resume", model: "gemini-nano", provider: "chrome_ai",
  plugins: [], suppress_base_instructions: true,
  plugin_configs: { chrome_ai: { cdp_url: "http://127.0.0.1:9222", page_url: "https://example.com/", reuse_page: true } },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- A: create (recovery on, NO workspace pin), plant a memory ---
const a = await JaatoClient.session({
  url: URL, profile, clientType: "chat", recovery: RECOVERY,
  openTimeoutMs: 8000, sessionTimeoutMs: 120000,
});
const sid = a.sessionId;
console.log("A sessionId:", sid);
let r1 = "";
for await (const c of a.stream("Remember this exactly: the secret word is PLATYPUS. Reply with just: OK.")) r1 += c;
console.log("A reply:", JSON.stringify(r1.trim()));
await a.close();
console.log("A closed (session unloads server-side)");
await sleep(2500);

// --- B: fresh client, recovery on, NO workspace knowledge ---
const b = new JaatoClient({ url: URL, recovery: RECOVERY, clientConfig: { presentation: { client_type: "chat" } } });
await b.connect();
b.subscribe(EventTypeValue.AGENT_OUTPUT, () => {});   // subscribe before attach (peer's gotcha)

const listed = new Promise((res) => {
  const u = b.subscribe(EventTypeValue.SESSION_LIST ?? "session.list", (ev) => { u?.(); res(ev?.sessions || []); });
  setTimeout(() => res([]), 8000);
});
await b.listSessions();
const ids = (await listed).map((s) => s.id);
console.log("listSessions() ->", ids.length, "session(s); persisted id present?", ids.includes(sid));

await b.attachSession(sid);
console.log("attached; b.sessionId:", b.sessionId);
const bs = new Session(b);
let r2 = "";
for await (const c of bs.stream("What is the secret word I asked you to remember? Answer with one word.")) r2 += c;
console.log("B reply:", JSON.stringify(r2.trim()));
await bs.close();
console.log(/PLATYPUS/i.test(r2) ? "PASS: context RESUMED across full disconnect ✅" : "FAIL: not retained ❌");
console.log("DONE");
