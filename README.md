# Nano Chat (jaato)

A tiny Chrome **MV3 side-panel extension** that chats with Chrome's built-in,
on-device **Gemini Nano** — driven through the [jaato](https://github.com/Jaato-framework-and-examples/jaato)
WebSocket facade (`@jaato/sdk`) and its `chrome_ai` model provider.

No API keys, no cloud calls: the model runs *inside your browser* (the
`LanguageModel` Prompt API), and jaato's `chrome_ai` provider talks to it over
the Chrome DevTools Protocol.

```
┌────────────────────┐   ws     ┌─────────────────────┐   CDP    ┌──────────────────────┐
│  Side panel (this  │─────────▶│  jaato daemon       │─────────▶│  Chrome  (LanguageModel│
│  extension)        │  @jaato  │  chrome_ai provider │  attach  │  = Gemini Nano)        │
│  JaatoClient.session│◀────────│  (prose tool-calls) │◀─────────│  anchored on a real tab│
└────────────────────┘  stream  └─────────────────────┘  events  └──────────────────────┘
        │  clientTools (browser_navigate / _get_url / _get_text / _click)
        └── run client-side via chrome.debugger on the active tab
```

## What makes it interesting

- **Zero-cost local LLM in a chat panel.** Gemini Nano ships inside Chrome; this
  is a full streaming chat UI on top of it in ~300 lines.
- **The model can drive the browser.** A curated set of CDP host tools
  (`clientTools`) let Nano navigate / read / click the active tab. Handlers run
  *client-side* in the extension via `chrome.debugger` — the daemon never
  touches your browser directly.
- **`reuse_page` anchoring.** Instead of spawning a dedicated "host" tab, the
  provider **attaches to a normal `https://` tab you already have open** and
  leaves it untouched on teardown. See *Anchoring* below.

## Requirements

- **Google Chrome** (or Edge) with **Gemini Nano provisioned** in the profile
  you run. The Prompt API is only exposed on secure origins (`https://` or
  `localhost`), never on `chrome-extension://` in current stable builds — which
  is exactly why the provider anchors onto a real page.
- A running **jaato daemon** (`jaato-server --web-socket …`) with the `chrome_ai`
  provider, on a **POSIX host** (Linux/macOS/WSL2). The daemon does not run on
  native Windows — see [Why the daemon runs on Linux](#why-the-daemon-runs-on-linux-not-natively-on-windows).
- **Node 18+** (only for the `wsmoke*.mjs` smoke tests and rebuilding the SDK
  bundle).

## Quick start (Windows + Linux peer, via the launcher)

The included [`start-nano-chat.ps1`](start-nano-chat.ps1) brings up the whole
stack idempotently:

1. **Nano Chrome** — headed Chrome on `:9222` (CDP) with a dedicated profile.
2. **jaato daemon** — `jaato-server` on a Linux peer, loopback + plain ws.
3. **SSH tunnels** — `-L 8080:…:8090` (panel → daemon) and
   `-R 9222:[::1]:9222` (daemon's `chrome_ai` → your Chrome's CDP).
4. **Host-page server** — a `python -m http.server` on `:8765` serving the
   extension dir (the `localhost` secure-origin fallback page).

```powershell
./start-nano-chat.ps1          # start everything not already up
./start-nano-chat.ps1 -Stop    # tear it down
```

Edit the config block at the top of the script (paths, host aliases, ports) for
your environment. If your daemon runs locally (Linux/macOS), you don't need the
tunnels — point the extension's `URL`/`cdp_url` at your local daemon and Chrome.

### Why the daemon runs on Linux, not natively on Windows

The topology above looks lopsided — Chrome runs on Windows but the jaato daemon
runs on a Linux peer, bridged by SSH tunnels. That's not a preference; **the
jaato daemon does not run on native Windows.**

Each session gets its own **runner subprocess**, and the daemon spawns it with
primitives that only exist on POSIX:

- `socket.socketpair(AF_UNIX)` for the daemon↔runner control channel, and
- `os.fork()` to fork the runner (the pre-warm pool forks from a warm template
  without re-`exec`).

Neither `AF_UNIX` socketpairs nor `fork()` exist on Windows CPython, and the WS
server always spawns a runner (there is no in-process fallback). The symptom if
you try anyway: the session opens and the `chrome_ai` provider even attaches to
Chrome, then the turn dies with **`session runner not ready: (re)spawn+bootstrap
did not complete within 30s`**.

So the daemon needs a POSIX host. Chrome (with Gemini Nano) stays on Windows,
and two SSH tunnels bridge the gap:

- **`-L 8080:localhost:8090`** — the extension (Windows) reaches the peer daemon.
- **`-R 9222:[::1]:9222`** — the peer's `chrome_ai` provider reaches *your*
  Windows Chrome's CDP endpoint.

Both ends therefore talk to `localhost`, which also sidesteps Chrome's CDP
`Host`-header validation. (WSL2 or any Linux/macOS box works as the peer; if you
run everything on Linux/macOS to begin with, none of this applies — daemon,
Chrome, and extension are all local and the tunnels disappear.)

## Load the extension

1. In the Nano Chrome (`:9222`), open `chrome://extensions`, enable
   **Developer mode** (once), **Load unpacked** → select the [`extension/`](extension/)
   folder.
2. Click the **Nano Chat** toolbar icon to open the side panel.

Or skip the extension entirely and open **`http://localhost:8765/sidepanel.html`**
as a plain page — the same UI, minus the browser-driving tools (those need the
`chrome.debugger` permission the loaded extension has).

## Anchoring (`reuse_page`)

The `chrome_ai` provider needs a page that exposes the `LanguageModel` API.
Rather than opening a throwaway tab, this extension picks a page from your live
tabs and passes it as the provider's `page_url` with `reuse_page: true`:

- Prefers a **background `https://` tab** (so a tool-triggered navigation on the
  *active* tab doesn't yank the model's page out from under it).
- Falls back to the bundled **`localhost` host page** when no `https` tab is open
  (or when running as the plain page, with no `chrome.tabs` access).

The provider **attaches** to that tab (no new tab created) and **leaves it open**
on teardown. If the anchored tab navigates, the page-side helper is
re-installed on the next turn automatically — the session self-heals.

> Requires jaato with the `chrome_ai` `reuse_page` knob. Without it, the provider
> falls back to creating (and closing) a dedicated tab.

## Files

| Path | What |
|------|------|
| `extension/manifest.json` | MV3 manifest (side panel + `debugger`/`tabs` perms, pinned key). |
| `extension/sidepanel.js` | The chat UI, the inline jaato profile spec, tab anchoring, and the CDP host tools. |
| `extension/sidepanel.html` | Panel markup + styles. |
| `extension/background.js` | Opens the side panel on toolbar click. |
| `extension/host.html` | The `localhost` secure-origin fallback page Nano can run on. |
| `extension/vendor/jaato-sdk.js` | Bundled, dependency-free `@jaato/sdk` (esbuild ESM). |
| `start-nano-chat.ps1` | One-command stack launcher / teardown. |
| `wsmoke.mjs` | Plain chat smoke over the exact facade path. |
| `wsmoke-tools.mjs` | `clientTools` smoke — the model calls a browser tool and grounds on the result. |
| `wsmoke-reuse.mjs` | Verifies `reuse_page` attaches (no new tab) and leaves the tab open. |
| `wsmoke-reuse-nav.mjs` | Verifies the session self-heals when the anchored tab navigates. |

Run a smoke: `node wsmoke.mjs` (needs the stack up).

## Rebuilding the SDK bundle

`extension/vendor/jaato-sdk.js` is `@jaato/sdk` bundled for the browser:

```bash
esbuild src/index.ts --bundle --format=esm --platform=browser \
    --outfile=extension/vendor/jaato-sdk.js
```

## Security note

This is a **proof of concept** wired for local experimentation you drive:

- The daemon in the launcher runs `--ws-unsafe-no-auth` on loopback.
- Every browser tool is `auto_approve: true` and `onPermission` returns `"y"` —
  the model can navigate / read / click your active tab **with no prompt**.

Tighten both (`auto_approve: false` + a real `onPermission` policy + WS bearer
auth) before anything resembling real use.

## License

POC / example code — see the upstream [jaato](https://github.com/Jaato-framework-and-examples/jaato)
project.
