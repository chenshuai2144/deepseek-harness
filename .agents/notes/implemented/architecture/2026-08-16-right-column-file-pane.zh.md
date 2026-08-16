# Agent Note: 右栏 File — 特权列举与只读预览

Status: implemented

[English](2026-08-16-right-column-file-pane.md) | 中文

## 问题

[工作区栏笔记](2026-08-16-right-column-workspace-pane.md) 把 File 留到具备 Host 面和真实占用方之后。注册表上的 `workspace.list` 返回工作区行，不是目录子项。`host.listDirectory` 只给目录选择器列目录，且不是仅回环。`ctx.fs` 已能在 Host 进程里列文件、读文本，但浏览器没有接到这条 seam 的特权 RPC。经 `host.openPath` 打开路径仍把文件交给操作系统，不是栏内预览。

## 决策

File 是工作区首页磁贴，带两个 layout 占用方。[`ui-layout`](../../../../packages/client/ui-layout/README.md) 拥有 `details.files` 与 `details.file`，以及 `openFiles()`／`openFileDetails()`。[`ui-file`](../../../../packages/client/ui-file/README.md) 占用这两个槽。树调用特权 `fs.listDir`；点击文件写入 `fileSelection`，并经特权 `fs.readText` 打开只读 [`CodeBlock`](../../../../packages/client/ui-primitives/README.md)。两个方法都把会话工作区作为绝对 `cwd` 提交，经 `ctx.fs` 解析，并拒绝越出该根的路径。预览超过 1 MiB UTF-8 字节时返回前缀并带 `truncated: true`。浏览器载体把 `fs.listDir` 与 `fs.readText` 和 `git.*` 一样钉在回环。查看态留在 layout store。

现有 FileSystem seam 仍是 Service Definition 与本地 provider。新的 RPC 和 `ui-file` 是面向人的 Consumer。模型继续使用文件系统工具。

本笔记拥有 File 磁贴和 `fs.*` GUI 约定。工作区栏笔记仍拥有栏位位置。工作台笔记仍拥有自建架子和 Git 决策。

## 考虑过的替代方案

**复用 `host.listDirectory` 加 `host.openPath`。** 选择器列举不含文件，不以会话 cwd 为根，也不是仅回环。`openPath` 会离开该栏。

**把方法叫 `workspace.list`／`workspace.read`。** 这两个名字已经表示注册表行。同一键再表示目录内容会冲突。

**在同一 `fs.*` 域上暴露写入和编辑。** File 栏是只读的。变更仍走模型工具。

**只做列举、不做预览。** 工作区栏规则禁止空占用方。预览属于第一期。

## 后果

已连接的 Session 不必点工具卡就能从工作区首页打开 File。远程浏览器不能驱动主机文件系统读取。Terminal 与 Browser 仍留到后续 PR。没有编辑器、监视器或 HTTP 文件服务。
