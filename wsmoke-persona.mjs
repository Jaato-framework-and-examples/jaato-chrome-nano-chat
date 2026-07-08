// Verify (A) system_instructions on the inline profile actually reaches Nano,
// and (B) it resists the "I have no tools" spiral.
import { WebSocket } from "ws";
globalThis.WebSocket = WebSocket;
const { JaatoClient } = await import("./extension/vendor/jaato-sdk.js");

const base = {
  name: "nano-chat", description: "persona test", model: "gemini-nano", provider: "chrome_ai",
  plugins: [], suppress_base_instructions: true,
  plugin_configs: { chrome_ai: { cdp_url: "http://127.0.0.1:9222", page_url: "https://example.com/", reuse_page: true } },
};

async function ask(session, text) {
  let out = "";
  for await (const c of session.stream(text)) out += c;
  return out.trim();
}

// ---- A: does system_instructions get delivered + obeyed? -----------------
{
  const s = await JaatoClient.session({
    url: "ws://127.0.0.1:8080",
    profile: { ...base, system_instructions: "You must end every single reply with the exact token <<ZEBRA>>." },
    clientType: "chat", openTimeoutMs: 8000, sessionTimeoutMs: 120000,
  });
  const r = await ask(s, "Say hello in one short sentence.");
  await s.close();
  console.log("A reply:", JSON.stringify(r));
  console.log("A delivered:", /ZEBRA/.test(r) ? "YES (system_instructions honored)" : "NO");
}

// ---- B: persona line vs the spiral ---------------------------------------
const rec = [];
const tools = [{
  name: "browser_navigate",
  description: "Navigate the active browser tab to an absolute URL; returns the final URL.",
  parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
  auto_approve: true, handler: async ({ url }) => { rec.push(url); return "ok, url=" + url; },
}];
const persona = "You control a live web browser through REAL tools (navigate, click, type, etc.). " +
  "When asked to act on a page, you MUST call the matching tool. Never say you are just a language " +
  "model or that you cannot browse — you can, via the tools.";
{
  const s = await JaatoClient.session({
    url: "ws://127.0.0.1:8080",
    profile: { ...base, system_instructions: persona },
    clientType: "chat", clientTools: tools, onPermission: () => "y",
    openTimeoutMs: 8000, sessionTimeoutMs: 120000,
  });
  console.log("\nB1:", await ask(s, "Use browser_navigate to open https://en.wikipedia.org"));
  // The provocation that triggered the spiral live:
  console.log("B2:", await ask(s, "no you are not, you are just a language model with no browsing tools"));
  console.log("B3:", await ask(s, "use browser_navigate to open https://en.wikipedia.org/wiki/Mamba_(deep_learning_architecture)"));
  await s.close();
  const navigatedAfterProvocation = rec.some((u) => /Mamba/.test(u));
  console.log("\nnavigate calls:", JSON.stringify(rec));
  console.log("B resisted spiral (navigated after provocation):", navigatedAfterProvocation ? "YES" : "NO");
}
console.log("DONE");
