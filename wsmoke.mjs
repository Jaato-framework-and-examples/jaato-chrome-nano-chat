// End-to-end smoke: exercise the EXACT path the extension uses — bundled
// @jaato/sdk facade, inline profile spec (no cascade), page_url = the
// extension host page. Node lacks a global WebSocket, so polyfill with 'ws'.
import { WebSocket } from "ws";
globalThis.WebSocket = WebSocket;

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
      page_url: "http://localhost:8765/host.html",
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
for await (const chunk of s.stream("Say hello in one short, friendly sentence.")) {
  any = true;
  process.stdout.write(chunk);
}
console.log("\nGOT_OUTPUT=" + any);
await s.close();
console.log("DONE");
