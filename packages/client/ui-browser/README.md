# @deepseek-ai/dsh-client-ui-browser

English | [中文](README.zh.md)

Workbench Simple Browser plugin: occupies layout-owned `details.browser`. The address bar calls `ctx.layout.openBrowserPage` after `resolveBrowserHref` accepts an `http` or `https` URL. The pane then loads that address in a sandboxed iframe. javascript, data, file, blob, about, credentials, loopback, localhost, and the workbench origin are refused. Viewing state stays in the layout store. The model keeps using web tools. Design rationale lives in [the Browser-pane Agent Note](../../../.agents/notes/implemented/architecture/2026-08-16-right-column-browser-pane.md) and [the workspace-pane Agent Note](../../../.agents/notes/implemented/architecture/2026-08-16-right-column-workspace-pane.md).

An empty address bar, a refused URL, and a site that sends `X-Frame-Options` or CSP `frame-ancestors` each render an actionable empty or blocked state.

## Model Experience

None, as this plugin is a human Simple Browser; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Iframe framing** — many sites refuse to render inside an iframe. This pane does not proxy HTML or use an Electron `<webview>`.
- **No navigation chrome** — there is no back/forward history, no Agent-driven open, and no cookie jar of its own.
- **Sandbox** — the iframe allows scripts, forms, popups, and same-origin so ordinary pages can run; it does not allow top-level navigation of the workbench.
