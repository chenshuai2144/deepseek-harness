# Agent Note: Right-column Simple Browser — sandboxed iframe

Status: implemented

[English](2026-08-16-right-column-browser-pane.md) | 中文

## Problem

[工作区栏笔记](2026-08-16-right-column-workspace-pane.md) 在具备真实占用方之前把 Browser 留在首页之外。空磁贴会违反工作台禁止空 IDE 座位的规则。用户仍需要 Cursor 式 Simple Browser：在工作区栏输入 URL，不必离开 Agent 工作台就能看到页面。`host.openPath` 会把 URL 交给操作系统浏览器。Web fetch 工具把文本返回给模型，而不是给人预览。

## Decision

Browser 是工作区首页磁贴，对应一个 layout 占用方。[`ui-layout`](../../../../packages/client/ui-layout/README.md) 拥有 `details.browser`，以及 `openBrowser()` / `openBrowserPage()`。[`ui-browser`](../../../../packages/client/ui-browser/README.md) 占用该 slot。地址栏只在 `resolveBrowserHref` 之后接受 `http` 与 `https`；点击打开会写入 `browserHref` 并加载沙箱 iframe。javascript、data、file、blob、about、凭据、回环、localhost 以及工作台自身源会被拒绝，因此 iframe 不能变成产品 UI。查看态留在 layout store。

该栏是人用 Consumer。模型继续使用 web 搜索与抓取工具。没有特权 browse RPC：导航在客户端运行。

本笔记拥有 Browser 磁贴和地址栏 URL 策略。工作区栏笔记仍拥有栏的位置。

## Alternatives considered

**只在桌面使用 Electron `<webview>`。** 桌面与 Web 产品共用一个工作台。仅桌面磁贴会在 `dsh web` 上隐藏 Browser，或把首页分叉。

**由 Host 代理页面并写入 `srcdoc`。** 那是阅读器，不是浏览器：它丢掉 cookie、脚本和源，并扩大 Host XSS 面。

**复用 `host.openPath`。** 那会离开该栏，也不是工作台内预览。

**允许任意协议或产品源。** `javascript:` 以及把工作台源放进 iframe，都是进入 Agent GUI 的 XSS 路径。

## Consequences

已连接的 Session 不必点工具卡就能从工作区首页打开 Browser。发送 `X-Frame-Options` 或 CSP `frame-ancestors` 的站点在 iframe 内仍会空白；这是已记录的嵌入限制，不是空占用方。Terminal 仍留到后续 PR。没有前进/后退历史，也没有由 Agent 打开页面。
