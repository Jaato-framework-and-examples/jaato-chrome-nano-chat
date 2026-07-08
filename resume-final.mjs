// Full end-to-end on main (all fixes): create -> plant memory -> full disconnect
// -> reattach -> (1) requestHistory returns the transcript, (2) a new turn shows
// context is intact and does NOT overflow (#537 suppress-on-restore).
import { WebSocket } from "ws";
globalThis.WebSocket = WebSocket;
const { JaatoClient, Session, EventTypeValue } = await import("./extension/vendor/jaato-sdk.js");

const URL = "ws://127.0.0.1:8080";
const RECOVERY = { autoReattachSessionId: true };
const profile = {
  name: "nano-chat", description: "final", model: "gemini-nano", provider: "chrome_ai",
  plugins: [], suppress_base_instructions: true,
  plugin_configs: { chrome_ai: { cdp_url: "http://127.0.0.1:9222", page_url: "https://example.com/", reuse_page: true } },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- A: create + plant a memory (two turns) ---
const a = await JaatoClient.session({ url: URL, profile, clientType: "chat", recovery: RECOVERY, openTimeoutMs: 8000, sessionTimeoutMs: 120000 });
const sid = a.sessionId;
console.log("A sessionId:", sid);
for (const t of ["Remember exactly: the secret word is PLATYPUS. Reply with just: OK.", "What is 2+2? Reply with just the number."]) {
  let r = ""; for await (const c of a.stream(t)) r += c; console.log("A ->", JSON.stringify(r.trim()));
}
await a.close();
console.log("A closed (session unloads)");
await sleep(2500);

// --- B: cold reattach ---
const b = new JaatoClient({ url: URL, recovery: RECOVERY, clientConfig: { presentation: { client_type: "chat" } } });
await b.connect();
let historyEv = null;
b.subscribeAll((ev) => { if (ev && Array.isArray(ev.history)) historyEv = ev; });
await b.attachSession(sid);
const bs = new Session(b, () => "y");

// (1) transcript repaint via requestHistory
await sleep(12000);           // let the cold runner come up
await b.requestHistory("main");
await sleep(5000);
console.log("\n=== (1) TRANSCRIPT (requestHistory) ===");
if (historyEv && historyEv.history.length) {
  console.log("HistoryEvent: " + historyEv.history.length + " entries");
  historyEv.history.forEach((m, i) => {
    const role = m.role || m.author || "?";
    const text = (m.text != null ? m.text : (Array.isArray(m.parts) ? m.parts.map((p) => p.text || "").join("") : JSON.stringify(m).slice(0, 120)));
    console.log("   [" + i + "] " + role + ": " + JSON.stringify((text || "").trim()).slice(0, 100));
  });
} else {
  console.log("HistoryEvent: none/empty");
}

// (2) context intact + no overflow
console.log("\n=== (2) CONTEXT + NO OVERFLOW (a new turn) ===");
let r2 = ""; for await (const c of bs.stream("What is the secret word I asked you to remember? Answer with one word.")) r2 += c;
console.log("B reply:", JSON.stringify(r2.trim()));
await bs.close();

const transcriptOk = !!(historyEv && historyEv.history.length >= 2);
const contextOk = /PLATYPUS/i.test(r2);
console.log("\nVERDICT: transcript=" + (transcriptOk ? "REPLAYED ✅" : "missing ❌") + "  context=" + (contextOk ? "RETAINED ✅" : "lost ❌"));
console.log("DONE");
