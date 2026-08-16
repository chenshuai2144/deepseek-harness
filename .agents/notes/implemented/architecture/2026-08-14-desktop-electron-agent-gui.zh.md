# Agent Note: 桌面 Electron Agent GUI — 叠在现有 RPC 上的三进程外壳

Status: implemented

[English](2026-08-14-desktop-electron-agent-gui.md) | 中文

## 问题

已交付的 Web GUI 已经拥有 Agent 聊天工作台、四象限 RPC 和客户端插件图。本地窗口产品仍需出现，但不能拉起 `dsh-host-webserver`，不能再拆一套 host/client 包族，也不能把第一期做成 IDE。[GUI 分层笔记](2026-07-19-gui-layering-and-rpc-protocol.md) 为该外壳预留了 IPC `doFetch` 子类；该预留不再是假想。

## 决策

`apps/desktop`（`@deepseek-ai/dsh-desktop`）是 Electron 外壳。`dsh desktop` 启动 [`electron-main.mjs`](../../../../apps/desktop/electron-main.mjs)，由它注册 tsx 再加载 TypeScript 主进程——Electron 的 argv 解析会把裸的 `--import tsx/esm` 当成应用路径。主进程拥有窗口，并以 Node（`--import tsx/esm`）fork Host，避免子进程的钩子被当成 Electron argv，再转发结构化克隆 fetch。渲染进程处于沙箱（`sandbox`、`contextIsolation`、无 Node），并通过特权 `dsh-app://` 方案加载已构建的 [`dsh-web-frontend`](../../../../apps/web) dist，以便 Vite 的绝对 `/assets/…` URL 能够解析。窗口标题是 DeepSeek Harness，任务栏／程序坞标记是产品鱼标（Windows 上为 `icon.ico`，其余平台为 `icon.png`），不是 Electron 默认图标。Host 子进程运行 `runProfile({ profile: 'desktop' })`，并暴露与 Web 路径相同的 Connection `fetch` handler、启动图和客户端 bundle 字节。preload 安装 `window.__DSH_DESKTOP__`；客户端 `apply()` 选择 [`IpcApiClient`](../../../../packages/client/connection/src/client/ipc-api-client.ts)，只替换 `doFetch`。mux 与 host 流仍走基类 SSE 读取。

`desktop` profile 模板为 `['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@deepseek-ai/dsh-desktop-app']`。[`dsh-desktop-app`](../../../../packages/bundle/desktop-app/README.md) 是补丁覆盖层：禁用 `webserver`、`web-startup`、`web-runtime` 和 `client-hmr`；重写 `connection`，去掉 `webRuntime` inject 且 `trustedHosts: []`；钉住 `directory-picker-native`；并挂载 `desktop-runtime`，使模型看到的是本机窗口（`app:desktop-surface`、`DSH_DESKTOP=1`）而不是 URL。`dsh desktop` 从仓库检出启动此外壳，配置 dump 时等同 `--profile desktop`。`electron` 只作为 `apps/desktop` 的依赖。

第一期是同一客户端上的 Agent 对话，加上三栏工作台和 SCM 面板。原生选目录仍走 `host.pickDirectory`；SCM 变更走特权 `git.*`。[OpenSumi 式工作台笔记](2026-08-14-opensumi-like-workbench-agent-scm.md) 拥有该 layout 与 Git seam。

## 考虑过的替代方案

**在 Electron 内复用 `dsh-host-webserver`，让渲染进程指向 `http://127.0.0.1`。** 这会把 Web 载体及其监听／信任／HMR 表面留在一个没有浏览器标签、也没有 LAN URL 的产品里。分层笔记已禁止这种复用；IPC 改为对话同一套 fetch handler。

**再拆一套 `packages/electron-*` capability 包族。** 新产品组装写在 `apps/`。平行的 host/client 包树只会为一次载体替换复制 Connection、modules 和 web client。

**第一期做成 IDE（Monaco、资源管理器、编辑器分组、底栏终端）。** 那是另一套工作台。Agent GUI 已经存在；第一期只改托管方式。

**把 `electron` 发布进 `@deepseek-ai/dsh`。** CLI 安装包会膨胀出一个 `npx dsh web` 用户从不启动的桌面运行时。第一期约定是源码树里的 `pnpm dsh desktop`；打包安装程序留到后续。

**为桌面流再开一套 WebSocket。** Host 的 `toFetchHandler` 已经能返回流式 `Response`。IPC 端口搬运这些字节；再发明一种下行编解码会分叉协议。

## 后果

Web 产品保持不变：仅在存在 `webServer` 时才注册 HTTP `/api` 与 WebSocket 下行。Connection 与 modules 现在可以在没有该服务时启动，以便 Host 子进程活在零端口树中。代价是需要监督的第三进程、因 `file://` 无法承载 Vite 资源布局而引入的自定义 scheme，以及在后续周期之前没有客户端插件 HMR。特权 RPC 方法把沙箱渲染进程视为回环（`Host: 127.0.0.1`，无 `Origin`），因为它是产品自己的窗口，而不是远程浏览器。
