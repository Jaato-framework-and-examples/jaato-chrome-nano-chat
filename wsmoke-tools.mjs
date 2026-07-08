// Verify the jaato clientTools loop end-to-end: register CDP-backed host tools,
// prompt Nano to call one, watch it execute against a real browser tab and feed
// the result back. Mirrors the extension's tools, but handlers drive CDP via
// playwright (Node-runnable) instead of chrome.debugger, so no loaded extension
// is needed to prove the mechanism.
import { WebSocket } from "ws";
globalThis.WebSocket = WebSocket;
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/apanoia/.notebook-bridge/scripts/node_modules/playwright-core");
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

// A real tab the tools operate on (separate CDP client from the provider's).
const browser = await chromium.connectOverCDP("http://[::1]:9222");
const page = await browser.contexts()[0].newPage();
await page.goto("https://example.com", { waitUntil: "domcontentloaded" });

const fired = [];
const TOOLS = [
  {
    name: "browser_get_url",
    description: "Return the current tab URL and page title as JSON.",
    parameters: { type: "object", properties: {} },
    auto_approve: true,
    handler: async () => { fired.push("browser_get_url"); return JSON.stringify({ url: page.url(), title: await page.title() }); },
  },
  {
    name: "browser_navigate",
    description: "Navigate the tab to an absolute URL; returns the final URL.",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    auto_approve: true,
    handler: async ({ url }) => { fired.push("browser_navigate:" + url); await page.goto(url, { waitUntil: "domcontentloaded" }); return "ok, url=" + page.url(); },
  },
  {
    name: "browser_get_text",
    description: "Return the tab's visible text, truncated to `max` chars (default 800).",
    parameters: { type: "object", properties: { max: { type: "number" } } },
    auto_approve: true,
    handler: async ({ max }) => { fired.push("browser_get_text"); const t = await page.evaluate(() => (document.body ? document.body.innerText : "")); return t.slice(0, Math.min(Math.max(Number(max) || 800, 100), 3000)); },
  },
];

const s = await JaatoClient.session({
  url: "ws://127.0.0.1:8080",
  profile: PROFILE,
  clientType: "chat",
  clientTools: TOOLS,
  onPermission: () => "y",
  sessionTimeoutMs: 120000,
});
console.log("SESSION_OPEN sid=" + s.sessionId + " (tab starts at " + page.url() + ")");
process.stdout.write("REPLY: ");
for await (const chunk of s.stream(
  "Call the browser_get_url tool, then tell me the page title in one short sentence."
)) process.stdout.write(chunk);
console.log("\nTOOLS_FIRED=" + JSON.stringify(fired));
await s.close();
await browser.close();
console.log("DONE");
