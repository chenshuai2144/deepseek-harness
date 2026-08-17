# Agent Note: Desktop Electron Agent GUI — three-process shell over the existing RPC

Status: implemented

English | [中文](2026-08-14-desktop-electron-agent-gui.zh.md)

## Problem

The shipped Web GUI already owns the Agent chat workbench, the four-quadrant RPC, and the client plugin graph. A local-window product still has to appear without standing up `dsh-host-webserver`, without a second host/client package family, and without turning the first period into an IDE. The [GUI layering note](2026-07-19-gui-layering-and-rpc-protocol.md) reserved an IPC `doFetch` subclass for that shell; the reservation is no longer hypothetical.

## Decision

`apps/desktop` (`@deepseek-ai/dsh-desktop`) is the Electron application. `dsh desktop` launches [`electron-main.mjs`](../../../../apps/desktop/electron-main.mjs), which registers tsx and then loads the TypeScript main — Electron's argv parser treats a bare `--import tsx/esm` as an app path. The main process owns the window, forks the Host under Node (`--import tsx/esm`) so that child's hook is not Electron argv, and forwards structured-clone fetch. It creates the window immediately and loads a self-contained desktop loading document while the Host boots; the Host ready message carries the boot graph, allowing the main process to replace that document without a second IPC request. The sandboxed renderer (`sandbox`, `contextIsolation`, no Node) has its own Vite build, HTML entry, transparent fish mark, and frameless title bar under `apps/desktop`; it does not resolve or serve `dsh-web-frontend`. The desktop entry mounts the shared client shell kernel so plugin UI composition remains common between products, while product chrome and artifacts belong to Desktop. The privileged `dsh-app://` scheme serves the desktop dist so Vite's absolute `/assets/…` URLs resolve. The Host child runs `runProfile({ profile: 'desktop' })` and exposes the same Connection `fetch` handler and client-bundle bytes the Web path uses. Preload installs `window.__DSH_DESKTOP__` for transport and a separate window-control bridge; client `apply()` selects [`IpcApiClient`](../../../../packages/client/connection/src/client/ipc-api-client.ts), which swaps only `doFetch`. Mux and host streams keep the base-class SSE reader.

The `desktop` profile template is `['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@deepseek-ai/dsh-desktop-app']`. [`dsh-desktop-app`](../../../../packages/bundle/desktop-app/README.md) is a patch overlay: it disables `webserver`, `web-startup`, `web-runtime`, and `client-hmr`; restates `connection` without a `webRuntime` inject and with `trustedHosts: []`; pins `directory-picker-native`; and mounts `desktop-runtime` so the model sees a local window (`app:desktop-surface`, `DSH_DESKTOP=1`) rather than a URL. `dsh desktop` launches this shell from a repository checkout and is a dump alias for `--profile desktop`. Electron stays a dependency of `apps/desktop` only.

Period one is the Agent conversation plus the three-column workbench and SCM panel on the same client. Native directory picking stays on `host.pickDirectory`; SCM mutations use privileged `git.*`. The [OpenSumi-like workbench note](2026-08-14-opensumi-like-workbench-agent-scm.md) owns that layout and Git seam.

## Alternatives considered

**Reuse `dsh-host-webserver` inside Electron and point the renderer at `http://127.0.0.1`.** That would keep the Web carriage and its listen/trust/HMR surface in a product that has no browser tab and no LAN URL. The layering note already forbids this reuse; IPC talks to the shared fetch handler instead.

**Load the built `apps/web` frontend inside Electron.** That couples Desktop startup, product chrome, and release artifacts to the Web application even though only the client shell kernel is common. Desktop builds its own renderer and imports the kernel as source instead.

**Add a `packages/electron-*` capability family.** New products assemble in `apps/`. A parallel host/client package tree would duplicate Connection, modules, and the web client for a carrier swap.

**Ship the first period as an IDE (Monaco, explorer, editor groups, bottom terminal).** That is a different workbench. The Agent GUI already exists; the first period only changes how it is hosted.

**Publish `electron` on `@deepseek-ai/dsh`.** The CLI install would grow by a desktop runtime the `npx dsh web` user never launches. Source-tree `pnpm dsh desktop` is the first-period contract; a packed installer is later work.

**Open a second WebSocket stack for desktop streams.** Host `toFetchHandler` already returns streaming `Response` bodies. The IPC port carries those bytes; inventing another downlink codec would fork the protocol.

## Consequences

The Web product is unchanged: HTTP `/api` and WebSocket downlinks still register only when `webServer` is present. Connection and modules start without that service so the Host child can live in a zero-port tree. Desktop and Web produce separate renderer artifacts while sharing the plugin-driven shell kernel. An ordinary desktop start reuses its built renderer and exposes the window before Host readiness; `start:rebuild` remains the explicit source-change path. The cost is a third process to supervise, a custom scheme because `file://` cannot serve the Vite asset layout, and no client-plugin HMR until a later period. Privileged RPC methods treat the sandboxed renderer as loopback (`Host: 127.0.0.1`, no `Origin`) because it is the product's own window, not a remote browser.
