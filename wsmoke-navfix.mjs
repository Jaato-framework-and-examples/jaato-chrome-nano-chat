// Reproduce the failing case ("navigate to en.wikipedia.org") with the full
// 8-tool menu and confirm Nano now selects browser_navigate (instead of copying
// the preamble's example id and giving up). Handlers are no-ops that just record
// the call, so nothing disturbs the anchor tab.
import { WebSocket } from "ws";
globalThis.WebSocket = WebSocket;

const called = [];
const rec = (name, canned) => async (args) => { called.push({ name, args }); return canned; };

// Same names/descriptions the extension ships (schemas are what the model sees).
const tools = [
  { name: "browser_navigate", description: "Navigate the active browser tab to an absolute URL; returns the final URL.",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    auto_approve: true, handler: rec("browser_navigate", "ok, url=https://en.wikipedia.org/") },
  { name: "browser_get_url", description: "Return the active tab's current URL and page title as JSON.",
    parameters: { type: "object", properties: {} }, auto_approve: true, handler: rec("browser_get_url", '{"url":"about:blank","title":""}') },
  { name: "browser_get_text", description: "Return the active tab's visible text, truncated to `max` chars (default 1200).",
    parameters: { type: "object", properties: { max: { type: "number" } } }, auto_approve: true, handler: rec("browser_get_text", "(no visible text)") },
  { name: "browser_list_links", description: "List visible links/buttons in the active tab as [{i,text,href}] (JSON), capped at `max` (default 30).",
    parameters: { type: "object", properties: { max: { type: "number" } } }, auto_approve: true, handler: rec("browser_list_links", "[]") },
  { name: "browser_click", description: "Click an element in the active tab, matched by CSS `selector` OR by visible `text`.",
    parameters: { type: "object", properties: { selector: { type: "string" }, text: { type: "string" } } }, auto_approve: true, handler: rec("browser_click", "no matching element") },
  { name: "browser_type", description: "Type `text` into a field in the active tab, matched by CSS `selector` or placeholder/label/name `field`.",
    parameters: { type: "object", properties: { text: { type: "string" }, selector: { type: "string" }, field: { type: "string" } }, required: ["text"] }, auto_approve: true, handler: rec("browser_type", "no matching field") },
  { name: "browser_submit", description: "Submit the form of the focused or `selector`-matched field (or press Enter on it).",
    parameters: { type: "object", properties: { selector: { type: "string" } } }, auto_approve: true, handler: rec("browser_submit", "no form") },
  { name: "browser_back", description: "Go back one entry in the active tab's history; returns the resulting URL.",
    parameters: { type: "object", properties: {} }, auto_approve: true, handler: rec("browser_back", "ok, url=about:blank") },
];

const { JaatoClient } = await import("./extension/vendor/jaato-sdk.js");
const s = await JaatoClient.session({
  url: "ws://127.0.0.1:8080",
  profile: {
    name: "nano-chat", description: "navfix smoke", model: "gemini-nano", provider: "chrome_ai",
    plugins: [], suppress_base_instructions: true,
    plugin_configs: { chrome_ai: { cdp_url: "http://127.0.0.1:9222", page_url: "https://example.com/", reuse_page: true } },
  },
  clientType: "chat", clientTools: tools, onPermission: () => "y",
  openTimeoutMs: 8000, sessionTimeoutMs: 120000,
});
console.log("SESSION_OPEN sid=" + s.sessionId);

let raw = "";
for await (const chunk of s.stream("navigate to en.wikipedia.org")) raw += chunk;
await s.close();

console.log("RAW REPLY:\n" + raw + "\n---");
console.log("tools called:", JSON.stringify(called));
const navd = called.some((c) => c.name === "browser_navigate");
const leakedExample = /t_1a2b3c4d/.test(raw);
console.log("navigate called:", navd);
console.log("example id leaked:", leakedExample);
console.log(navd && !leakedExample ? "PASS" : "FAIL");
console.log("DONE");
