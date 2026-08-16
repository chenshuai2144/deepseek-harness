# Agent Note: OpenSumi 式工作台 — 自建架子、Agent 对话与 Git SCM

Status: implemented

[English](2026-08-14-opensumi-like-workbench-agent-scm.md) | 中文

## 问题

桌面 Electron 外壳已经承载 web 客户端。用户仍需要一个能在 Agent 对话和面向人的 Git 面板之间切换的工作台，但不能把 OpenSumi、Theia 或 Code-OSS 当依赖，不能做 VS Code 扩展或市场，也不能引入 Monaco。模型已经能经 `bash` 跑 `git`；再挂一个面向模型的 Git 工具会拆开同一工作区的编辑。查看态（打开哪个侧栏视图、选中哪个 SCM 文件）不得进入会话日志。

## 决策

工作台是现有 web 客户端上的 layout 贡献，不是新的 Electron 包族。[`ui-layout`](../../../../packages/client/ui-layout/README.md) 拥有三栏 Agent 架子（`sidebar` | `conversation` | `details`）。左栏是 Agent 会话列表（`sidebar.agent`）。没有活动栏，也没有空的 IDE 座位。SCM 占用右侧工作区的 Changes 视图（[工作区栏](2026-08-16-right-column-workspace-pane.md)）。SCM 文件 diff 占用 `details.scm`，并复用 [`DiffBlock`](../../../../packages/client/ui-primitives/README.md)。`sidebarView`、`detailsView` 和 `scmSelection` 存在 layout store 中。

Git 是完整的能力 seam。[`dsh-git`](../../../../packages/git/git/README.md) 是 Service Definition（`status`／`diff`／`stage`／`unstage`／`commit`／`branch`）。[`dsh-git-local`](../../../../packages/git/git-local/README.md) 是经 `simple-git` 的本地提供方。[`dsh-client-ui-scm`](../../../../packages/client/ui-scm/README.md) 是面向人的 Consumer，走特权 `git.*` RPC，与 `host.pickDirectory` 一样钉在回环。模型继续使用 `bash`。web-app 花名册只挂一次 `git-local` 和 `ui-scm`；desktop 叠在那份花名册上。

产品入口仍是 `pnpm dsh desktop`／`dsh web`。没有 `apps/vscode`，也没有市场。

## 考虑过的替代方案

**引入 OpenSumi 或 Theia。** 任一框架都会拥有工作台进程模型、DI 容器和 SCM 贡献 API。本仓库已有 Cordis 插件、slot 和 Electron 宿主。引入该依赖会用外来扩展宿主替换 slot 链和现有 Agent 对话。

**做 VS Code 扩展并复用 VS Code SCM。** 那是借用另一产品的 SCM 和编辑器。它需要市场、第二个入口（`dsh vscode`）和 Monaco。Agent 对话会活在 VS Code 里，而不是反过来。

**在 `bash` 旁边再挂一个面向模型的 `git` 工具。** 两个 Git 入口会抢同一工作区的编辑。SCM 面板给人用；模型继续用它已有的 shell。

**手写解析 `git` porcelain。** 维护中的封装（`simple-git`）删掉自有解析代码和测试。找不到 `git` 或路径不是仓库时，仍通过 `GitError` 失败要响。

**把视图选择写进会话日志。** 侧栏视图状态是查看态。记入日志会把一次 UI 点击变成模型可见事实。

## 后果

桌面和 web 产品共享同一套工作台。SCM 从右栏工作区首页打开；没有活动栏。第一期 SCM 停在本地 index 与提交；远程、合并和 blame 仍由 Agent／`bash` 完成。特权 `git.*` 仅限回环，远程浏览器不能驱动宿主的 Git 二进制。
