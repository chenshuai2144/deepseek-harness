# @deepseek-ai/dsh-client-ui-scm

[English](README.md) | 中文

工作台 SCM 插件：占用 layout 拥有的 `details.changes` 与 `details.scm`。Changes 列表展示当前会话工作区的 Git 分支、ahead/behind 数量、去重后的变更文件数、增删行总数、未暂存与已暂存路径，以及带提交成功回执的提交框。它支持全部暂存、全部取消暂存，并按捕获的变更顺序在差异文件间前后导航。详情栏渲染只读 [`DiffBlock`](../ui-primitives/README.md)。所有读取和变更都走特权 `git.*` RPC。模型继续用 `bash` 操作 Git。设计理由见 [工作台 Agent Note](../../../.agents/notes/implemented/architecture/2026-08-14-opensumi-like-workbench-agent-scm.md) 与 [工作区栏 Agent Note](../../../.agents/notes/implemented/architecture/2026-08-16-right-column-workspace-pane.md)。

`refreshIntervalMs`（默认 `2000`）是经过校验的 Config 字段：SCM 视图挂载期间面板轮询 `git.status`，并在暂存、取消暂存或提交后再刷新一次。空提交说明会在面板里拒绝，不会发 RPC。缺少工作区、路径不是仓库、找不到 `git` 二进制、以及 `ctx.git` 不可用，都会渲染可行动的空态。

## 模型体验

无。本插件是面向人的 SCM 面板，经特权 RPC 工作；这里没有任何内容进入模型请求。

#### KV Cache 影响

无；该包既不组装也不发送提供方请求。

## 已知限制与暂缓事项

- **没有远程、合并或 blame** — push、pull、fetch、merge、rebase、stash 和 blame 仍由 Agent／`bash` 完成。
- **没有文件监视** — 状态按配置的轮询间隔刷新，并在变更操作后刷新。
- **只读详情 diff** — 详情栏复用 `DiffBlock`；没有合并编辑器，也不引入 Monaco。
