# @deepseek-ai/dsh-client-ui-file

[English](README.md) | 中文

工作台 File 插件：占用 layout 拥有的 `details.files` 与 `details.file`。树通过特权 `fs.listDir` 列出当前会话工作区。点击文件会调用 `ctx.layout.openFileDetails`；详情栏经特权 `fs.readText` 渲染只读 [`CodeBlock`](../ui-primitives/README.md)。列举与预览都限制在会话 `cwd` 内。模型继续使用文件系统工具。设计理由见 [File 栏 Agent Note](../../../.agents/notes/implemented/architecture/2026-08-16-right-column-file-pane.md) 与 [工作区栏 Agent Note](../../../.agents/notes/implemented/architecture/2026-08-16-right-column-workspace-pane.md)。

缺少工作区、路径越出工作区、`ctx.fs` 不可用、非文本文件，以及预览超过 1 MiB 上限，都会渲染可行动的空态或截断提示。

`Ctrl+P` 会聚焦一个经 `fs.listDir` 建立的有界递归文件名索引；扫描跳过 `.git` 与 `node_modules`，模糊结果优先匹配文件名。File 栏还会保存当前框架最近打开的八个路径。文件预览显示工作区相对面包屑，并提供复制路径操作。

## 模型体验

无。本插件是面向人的 File 栏，经特权 RPC 工作；这里没有任何内容进入模型请求。

#### KV Cache 影响

无；该包既不组装也不发送提供方请求。

## 已知限制与暂缓事项

- **只读预览** — 详情栏复用 `CodeBlock`；没有编辑器，也不引入 Monaco。
- **没有文件监视** — 树在挂载和展开目录时加载；快速打开会在工作区或快速打开视图变化时重建快照。
- **仅回环** — `fs.listDir` 与 `fs.readText` 是特权方法；远程浏览器不能驱动主机文件系统读取。
