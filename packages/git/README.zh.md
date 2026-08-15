# git/ — Git 能力系列

[English](README.md) | 中文

该能力系列包含 Git Service Definition 与本机进程提供方。GUI 的 SCM 面板是 Consumer；模型继续通过 `bash` 使用 Git。全部为**产品**包。

| 包 | 职责 | ctx 键 |
|---|---|---|
| [`git/`](git/README.md) | 定义 Service Provider 与 Consumer 共享的工作区 Git 约定。 | `ctx.git` |
| [`git-local/`](git-local/README.md) | 通过 `simple-git` 对工作区根执行本机 `git` 二进制。 | （注册 `ctx.git`） |

叶子 `cordis.yml` 选择本地提供方。Web 与桌面捆绑会挂上它，以便特权 `git.*` RPC 能到达工作区。

第一期操作集为 `status` / `diff` / `stage` / `unstage` / `commit` / `branch`。合并、变基、推送、拉取与远程认证不在范围内。
