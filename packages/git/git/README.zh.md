# @deepseek-ai/dsh-git

[English](README.md) | 中文

工作区 Git 能力（`ctx.git`）的 Service Definition。抽象 `Git` 服务是本地提供方实现、GUI SCM 面板经特权 `git.*` RPC 消费的约定。第一期闭集为 `status`、`diff`、`stage`、`unstage`、`commit` 和 `branch`。找不到 `git` 二进制、路径不是仓库、空提交说明，以及其他 Git 失败会抛出带类型的 `GitError`（`git-not-found` / `not-a-repository` / `empty-message` / `git-failed`，各自携带主体 `cwd`）。模型不会从该 seam 得到 Git 工具；它继续使用 `bash`。设计理由见[类 OpenSumi 工作台 Agent Note](../../../.agents/notes/implemented/architecture/2026-08-14-opensumi-like-workbench-agent-scm.md)。

## 模型体验

无。该 seam 服务 GUI 主机的 SCM 面板；这里没有任何内容进入模型请求。

#### KV Cache 影响

无；该包既不组装也不发送提供方请求。

## 已知限制与暂缓事项

- **没有远程、合并或变基**：闭集止于本地 index 与提交操作；推送、拉取、fetch、合并、变基、stash 与 blame 等到有消费方需要时再做。
- **没有面向模型的 Git 工具**：在 `bash` 旁边再挂一个 Git 入口会拆分模型对工作区的编辑；SCM 面板是给人用的 Consumer。
