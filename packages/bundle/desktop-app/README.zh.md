# `@deepseek-ai/dsh-desktop-app`

[English](README.md) | 中文

dsh 桌面 surface 组合包。[`cordis.patch.yml`](cordis.patch.yml) 叠加在 [`dsh-base`](../base/README.md) 与 [`dsh-web-app`](../web-app/README.md) 之上：禁用 HTTP 监听路径（`webserver`、`web-startup`、`web-runtime`、`client-hmr`），重写 connection 行且不带 LAN 信任列表，从模块注册表的必需注入中移除已禁用的服务器服务，钉住 [`directory-picker-native`](../../host/directory-picker-native/README.md)，并挂载本包的 `desktop-runtime` 胶水插件（配置为 `{surfaceContext}`）。`apps/desktop` 中的 Electron 应用自行构建并提供 HTML、渲染入口、透明产品标记和无边框窗口控制；它复用客户端 shell 内核并通过 IPC 与 ApiProxy 通信，但不加载 `apps/web/dist`，也不打开端口。窗口会在 Host 启动期间立即显示 Desktop 自有的加载文档，并在 Host 的 ready 消息提供启动图后切换到插件 UI。

当 `surfaceContext` 为 true 时，插件注册 `harness:source` 段和 `app:desktop-surface` 全局段（顺序 −98），以及 bash 可见的 `DSH_DESKTOP=1` 变量，使模型知道自己处于本机窗口中，且不得再启动替代服务器。

## 模型体验

### Harness 源码与桌面 surface 上下文

#### 模型看到什么

当 `surfaceContext` 为 true 时，`harness:source` 段标明磁盘上的 Harness 实现位置，但不声称它是工作目录；`app:desktop-surface` 全局段把模型定向到桌面窗口。

##### 该字段的原文（如需要）

```markdown
You are interacting with the user through the DeepSeek Harness desktop app, a local window on this machine — not a browser tab and not a URL. When the user refers to "this app", "this window", or "this GUI" without naming another target, they mean this desktop window. The window provides no implicit DOM, route, or screenshot context. Do not start a replacement server or a second GUI unless the user asks; this process already hosts the Agent UI.
```

#### Token 影响

每个会话一行源码说明和一段提示词，外加两行受管环境变量；每个进程恒定。

#### KV Cache 影响

该提示词段靠近系统提示词头部，并在进程生命周期内保持稳定，因此不会在各轮之间使缓存失效。

## 已知限制与暂缓事项

- **仅源码树 Electron**：`dsh desktop` 启动检出目录中的 `apps/desktop` 外壳；打包安装程序不属于本组合包。
- **无客户端插件 HMR（热模块替换）**：该覆盖层禁用 `client-hmr`；渲染进程改动后使用 `pnpm --dir apps/desktop start:rebuild`，普通 `start` 则复用已构建的渲染进程以便快速启动。
