# Agent Note: Right-column Simple Browser — sandboxed iframe

Status: implemented

English | [中文](2026-08-16-right-column-browser-pane.zh.md)

## Problem

The [workspace-pane note](2026-08-16-right-column-workspace-pane.md) left Browser off the home until a real occupant existed. An empty tile would violate the workbench rule against vacant IDE seats. Users still need a Cursor-like Simple Browser: type a URL in the workspace pane and see the page without leaving the Agent workbench. `host.openPath` hands a URL to the OS browser. Web fetch tools return text to the model, not a human preview.

## Decision

Browser is a workspace-home tile with one layout occupant. [`ui-layout`](../../../../packages/client/ui-layout/README.md) owns `details.browser`, plus `openBrowser()` / `openBrowserPage()`. [`ui-browser`](../../../../packages/client/ui-browser/README.md) occupies that slot. The address bar accepts only `http` and `https` after `resolveBrowserHref`; a click on Go writes `browserHref` and loads a sandboxed iframe. javascript, data, file, blob, about, credentials, loopback, localhost, and the workbench origin are refused so the iframe cannot become the product UI. Viewing state stays in the layout store.

The pane is a human Consumer. The model keeps web search and fetch tools. There is no privileged browse RPC: navigation runs in the client.

This note owns the Browser tile and the address-bar URL policy. The workspace-pane note still owns pane location.

## Alternatives considered

**Ship an Electron `<webview>` only on desktop.** The desktop and web products share one workbench. A desktop-only tile would hide Browser on `dsh web` or fork the home.

**Host-proxy the page into `srcdoc`.** That is a reader, not a browser: it drops cookies, scripts, and origin, and it expands the Host XSS surface.

**Reuse `host.openPath`.** That leaves the pane and is not an in-workbench preview.

**Allow any scheme or the product origin.** `javascript:` and a framed workbench origin are XSS paths into the Agent GUI.

## Consequences

A connected Session can open Browser from the workspace home without a tool click. Sites that send `X-Frame-Options` or CSP `frame-ancestors` stay blank inside the iframe; that is a documented framing limit, not an empty occupant. Terminal remains a later PR. There is no back/forward history and no Agent-driven open.
