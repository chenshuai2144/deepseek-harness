# Agent Note: 右栏工作区 — 首页与 Changes

Status: implemented

[English](2026-08-16-right-column-workspace-pane.md) | 中文

## 问题

右栏原先是工具调用详情，默认关闭。用户看 Agent 工作台时，期望能直接打开工作区，而不必先点一张工具卡片。[工作台笔记](2026-08-14-opensumi-like-workbench-agent-scm.md) 把 SCM 放在左侧栏底部，以免架子长出活动栏。Git 因此能打开，但会顶掉会话列表，而且右栏在选中工具或文件之前一直是空的。

## 决策

右栏是工作区。[`ui-layout`](../../../../packages/client/ui-layout/README.md) 拥有 `details.home`（本包的 `WorkspaceHome`）、`details.changes`、`details.files` 和 `details.file`。已连接的 Session 以约定默认宽度打开首页。首页只渲染已实现的磁贴：Changes 和 File。[`ui-scm`](../../../../packages/client/ui-scm/README.md) 占用 `details.changes`，文件 diff 仍占用 `details.scm`。[`ui-file`](../../../../packages/client/ui-file/README.md) 占用 `details.files` 与 `details.file`。工具调用详情仍经 `openDetails()` 占用 `details`。首页、Changes、File、文件 diff 和工具详情上的「+」都回到首页；关闭仍把 `details` 写成零。会话栏头的工作区控件会重新打开已关闭的栏。切换 Session id 会把该栏带回首页。左栏只留 Agent 会话列表；`sidebar.scm` 和侧栏底部的 SCM 入口已去掉。

`detailsView` 为 `'home' | 'changes' | 'files' | 'file' | 'conversation' | 'scm'`。查看态留在 layout store，从不进入会话日志。Terminal、Browser 磁贴在各自具备 Host 面和真实占用方之前不出现在首页。[File 栏笔记](2026-08-16-right-column-file-pane.md) 拥有 File 磁贴和 `fs.*` GUI 约定。

本笔记拥有栏位位置。工作台笔记仍拥有自建架子、不引入 OpenSumi、以及 Git 能力 seam 的决策。

## 考虑过的替代方案

**把 SCM 留在侧栏底部，右栏继续只放工具详情。** 这符合先前的工作台笔记，但不是工作区：打开 Git 会顶掉会话列表，右栏在点工具卡或文件之前一直空着。

**做没有实现的 Terminal／Browser 磁贴。** 工作台规则禁止空的 IDE 座位。这两块分别需要人用 PTY GUI 或 Electron webview。

**只在用户显式点击后才打开工作区。** 已连接的 Session 本来就有工作区；把栏藏到用户去找入口，等于重复「详情默认关闭」的问题。

## 后果

有 Session 时不必点工具卡就能看到工作区首页。仍允许关闭该栏；再次打开走会话栏头控件，或 `openWorkspaceHome`／`openChanges`／`openFiles`／`openDetails`。Terminal、Browser 留到后续 PR。窄视口仍经现有让步链自动关闭详情栏。
