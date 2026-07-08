// Drive the extension side panel via a raw CDP ws to ONLY the panel target
// (so we don't attach a debugger to the active tab the tool will use), send a
// tool-triggering chat message, and read the reply.
import { WebSocket } from "ws";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const list = await fetch("http://[::1]:9222/json").then((r) => r.json());
const t = list.find((x) => x.type === "page" && /^chrome-extension:\/\/.*\/sidepanel\.html/.test(x.url));
if (!t) { console.log("NO_PANEL_TARGET"); process.exit(1); }
console.log("PANEL_TARGET=" + t.url);

const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (method, params) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
ws.on("message", (d) => { const m = JSON.parse(d.toString()); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise((r) => ws.on("open", r));
await send("Runtime.enable");

const evalExpr = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;

// type + send a message that should trigger browser_get_url
await evalExpr(`(()=>{const i=document.getElementById('input');i.value='Use the browser_get_url tool, then tell me the page title in one short sentence.';document.getElementById('send').click();return 'sent';})()`);
console.log("MESSAGE_SENT");

let last = "";
for (let k = 0; k < 40; k++) {
  await sleep(2000);
  const log = await evalExpr("document.getElementById('log').innerText");
  if (log !== last) { last = log; }
  // stop once a bot reply (after the user msg) appears and input re-enabled
  const done = await evalExpr("!document.getElementById('send').disabled");
  if (done && /tool|title|url|Example|Domain|http/i.test(log)) break;
}
console.log("LOG<<<\n" + last + "\n>>>");
ws.close();
