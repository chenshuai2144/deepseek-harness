# @deepseek-ai/dsh-client-ui-browser

[English](README.md) | 中文

工作台 Simple Browser 插件：占用 layout 拥有的 `details.browser`。地址栏在 `resolveBrowserHref` 接受 `http` 或 `https` URL 后调用 `ctx.layout.openBrowserPage`。栏随后在沙箱 iframe 中加载该地址。javascript、data、file、blob、about、凭据、回环、localhost 以及工作台自身源会被拒绝。查看态留在 layout store。模型继续使用 web 工具。设计理由见 [Browser 栏 Agent Note](../../../.agents/notes/implemented/architecture/2026-08-16-right-column-browser-pane.md) 与 [工作区栏 Agent Note](../../../.agents/notes/implemented/architecture/2026-08-16-right-column-workspace-pane.md)。

空地址栏、被拒绝的 URL，以及发送 `X-Frame-Options` 或 CSP `frame-ancestors` 的站点，都会渲染可行动的空态或拦截提示。

## 模型体验

无。本插件是面向人的 Simple Browser；这里没有任何内容进入模型请求。

#### KV Cache 影响

无；该包既不组装也不发送提供方请求。

## 已知限制与暂缓事项

- **iframe 嵌入** — 许多站点拒绝在 iframe 中渲染。本栏不代理 HTML，也不使用 Electron `<webview>`。
- **没有导航栏** — 没有前进/后退历史，没有由 Agent 打开页面，也没有独立 cookie 罐。
- **沙箱** — iframe 允许脚本、表单、弹窗和 same-origin，以便普通页面能运行；不允许导航工作台顶层。
