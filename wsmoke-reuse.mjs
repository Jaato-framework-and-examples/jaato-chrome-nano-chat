// Verify reuse_page: anchor Nano onto an already-open https tab (example.com)
// and confirm the provider ATTACHES to it — no new tab created, tab left open.
import { WebSocket } from "ws";
globalThis.WebSocket = WebSocket;
import http from "http";

function cdp(path) {
  return new Promise((res, rej) => {
    http.get("http://[::1]:9222" + path, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej);
  });
}
const pagesBefore = (await cdp("/json")).filter((t) => t.type === "page");
const anchor = pagesBefore.find((t) => t.url.startsWith("https://"));
console.log("ANCHOR   :", anchor ? anchor.url : "(none — will fall back to host page)");
console.log("PAGES_BEFORE:", pagesBefore.length);
pagesBefore.forEach((t) => console.log("   -", t.url));

const { JaatoClient } = await import("./extension/vendor/jaato-sdk.js");
const PROFILE = {
  name: "nano-chat",
  description: "On-device Gemini Nano chat via chrome_ai.",
  model: "gemini-nano",
  provider: "chrome_ai",
  plugins: [],
  suppress_base_instructions: true,
  plugin_configs: {
    chrome_ai: {
      cdp_url: "http://127.0.0.1:9222",
      page_url: anchor ? anchor.url : "http://localhost:8765/host.html",
      reuse_page: true,
    },
  },
};

const s = await JaatoClient.session({
  url: "ws://127.0.0.1:8080",
  profile: PROFILE,
  clientType: "chat",
  openTimeoutMs: 8000,
  sessionTimeoutMs: 120000,
});
console.log("SESSION_OPEN sid=" + s.sessionId);
process.stdout.write("REPLY: ");
let any = false;
for await (const chunk of s.stream("Say hi in one short sentence.")) { any = true; process.stdout.write(chunk); }
console.log("\nGOT_OUTPUT=" + any);

const pagesAfter = (await cdp("/json")).filter((t) => t.type === "page");
console.log("PAGES_AFTER :", pagesAfter.length);
pagesAfter.forEach((t) => console.log("   -", t.url));
console.log(pagesAfter.length === pagesBefore.length
  ? "PASS: no new tab was created (attached to existing)."
  : "FAIL: tab count changed (" + pagesBefore.length + " -> " + pagesAfter.length + ").");

await s.close();
// Give teardown a moment, then confirm the anchor tab is still open.
await new Promise((r) => setTimeout(r, 1500));
const pagesEnd = (await cdp("/json")).filter((t) => t.type === "page");
const stillThere = anchor ? pagesEnd.some((t) => t.url === anchor.url) : true;
console.log(stillThere ? "PASS: anchor tab left open after close()." : "FAIL: anchor tab was closed on teardown!");
console.log("DONE");
