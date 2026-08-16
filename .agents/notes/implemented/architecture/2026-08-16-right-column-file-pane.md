# Agent Note: Right-column File pane — privileged list and read-only preview

Status: implemented

English | [中文](2026-08-16-right-column-file-pane.zh.md)

## Problem

The [workspace-pane note](2026-08-16-right-column-workspace-pane.md) left File off the home until a Host surface and a real occupant existed. Registry `workspace.list` returns workspace rows, not directory children. `host.listDirectory` lists directories for the picker and is not loopback-only. `ctx.fs` already lists files and reads text in the Host process, but the browser had no privileged RPC onto that seam. Opening a path through `host.openPath` still hands the file to the OS, which is not an in-pane preview.

## Decision

File is a workspace-home tile with two layout occupants. [`ui-layout`](../../../../packages/client/ui-layout/README.md) owns `details.files` and `details.file`, plus `openFiles()` / `openFileDetails()`. [`ui-file`](../../../../packages/client/ui-file/README.md) occupies those slots. The tree calls privileged `fs.listDir`; a file click writes `fileSelection` and opens a read-only [`CodeBlock`](../../../../packages/client/ui-primitives/README.md) through privileged `fs.readText`. Both methods take the session workspace as an absolute `cwd`, resolve through `ctx.fs`, and refuse a path outside that root. A preview that exceeds 1 MiB UTF-8 bytes returns a leading prefix with `truncated: true`. The browser carrier pins `fs.listDir` and `fs.readText` to loopback beside `git.*`. Viewing state stays in the layout store.

The existing FileSystem seam remains the Service Definition and local provider. The new RPC and `ui-file` are the human Consumer. The model keeps filesystem tools.

This note owns the File tile and the `fs.*` GUI contract. The workspace-pane note still owns pane location. The workbench note still owns the homemade-shell and Git decisions.

## Alternatives considered

**Reuse `host.listDirectory` plus `host.openPath`.** The picker listing omits files, is not session-cwd scoped, and is not loopback-only. `openPath` leaves the pane.

**Name the methods `workspace.list` / `workspace.read`.** Those names already mean registry rows. A second meaning on the same keys would collide.

**Expose write and edit on the same `fs.*` domain.** The File pane is read-only. Mutation stays with the model tools.

**Ship a File tile that only lists.** The workspace-pane rule forbids an empty occupant. Preview is part of the first slice.

## Consequences

A connected Session can open File from the workspace home without a tool click. A remote browser cannot drive host filesystem reads. Terminal remains a later PR. There is no editor, watcher, or HTTP file serving.
