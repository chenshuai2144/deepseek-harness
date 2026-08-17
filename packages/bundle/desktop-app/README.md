# `@deepseek-ai/dsh-desktop-app`

English | [中文](README.zh.md)

The dsh desktop-surface bundle. [`cordis.patch.yml`](cordis.patch.yml) rides over [`dsh-base`](../base/README.md) and [`dsh-web-app`](../web-app/README.md): it disables the HTTP listen path (`webserver`, `web-startup`, `web-runtime`, `client-hmr`), restates the connection row without a LAN trust list, removes the disabled server service from the module registry's required injections, pins [`directory-picker-native`](../../host/directory-picker-native/README.md), and mounts this package's `desktop-runtime` glue plugin (config `{surfaceContext}`). The Electron application in `apps/desktop` builds and serves its own HTML, renderer entry, transparent product mark, and frameless window controls; it shares the client shell kernel and talks to ApiProxy through IPC, but does not load `apps/web/dist` or open a port. The window displays its desktop-owned loading document immediately while the Host boots, then replaces it with the plugin UI when the Host's ready message supplies the boot graph.

When `surfaceContext` is true, the plugin registers the `harness:source` section and the `app:desktop-surface` global section (order −98), plus the bash-visible `DSH_DESKTOP=1` variable, so the model knows it is in a local window and must not start a replacement server.

## Model Experience

### Harness-source and desktop-surface context

#### What the model sees

When `surfaceContext` is true, the `harness:source` section identifies the on-disk Harness implementation without claiming it is the working directory, and the `app:desktop-surface` global section orients the model to the desktop window.

##### Verbatim text for this field, when needed

```markdown
You are interacting with the user through the DeepSeek Harness desktop app, a local window on this machine — not a browser tab and not a URL. When the user refers to "this app", "this window", or "this GUI" without naming another target, they mean this desktop window. The window provides no implicit DOM, route, or screenshot context. Do not start a replacement server or a second GUI unless the user asks; this process already hosts the Agent UI.
```

#### Token effect

One source line and one prompt paragraph per session plus two managed-environment variable lines; constant per process.

#### KV Cache effect

The prompt section sits near the system prompt's head and is stable for the life of the process, so it does not invalidate the cache across turns.

## Known Limitations and Deferred Work

- **Source-tree Electron only** — `dsh desktop` launches the checkout's `apps/desktop` shell; a packed installer is not part of this bundle.
- **No client-plugin HMR** — the overlay disables `client-hmr`; use `pnpm --dir apps/desktop start:rebuild` after renderer changes, while ordinary `start` reuses the built renderer for fast launches.
