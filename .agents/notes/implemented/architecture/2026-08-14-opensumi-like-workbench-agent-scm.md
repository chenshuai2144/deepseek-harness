# Agent Note: OpenSumi-like workbench — homemade shell, Agent conversation, and Git SCM

Status: implemented

English | [中文](2026-08-14-opensumi-like-workbench-agent-scm.zh.md)

## Problem

The desktop Electron shell already hosts the web client. Users still need a workbench that can switch between the Agent conversation and a human Git panel without taking OpenSumi, Theia, or Code-OSS as a dependency, without a VS Code extension or marketplace, and without Monaco. The model already runs `git` through `bash`; a second model-facing Git tool would split workspace edits. Viewing state (which sidebar view is open, which SCM file is selected) must not enter the session log.

## Decision

The workbench is a layout contribution on the existing web client, not a new Electron package family. [`ui-layout`](../../../../packages/client/ui-layout/README.md) owns a three-column Agent frame (`sidebar` | `conversation` | `details`). The left column is the Agent session list (`sidebar.agent`). There is no activity bar and no empty IDE seats. SCM occupies the right workspace Changes view ([workspace pane](2026-08-16-right-column-workspace-pane.md)). SCM file diffs occupy `details.scm` and reuse [`DiffBlock`](../../../../packages/client/ui-primitives/README.md). `sidebarView`, `detailsView`, `scmSelection`, and `fileSelection` live in the layout store.

Git is a complete capability seam. [`dsh-git`](../../../../packages/git/git/README.md) is the Service Definition (`status` / `diff` / `stage` / `unstage` / `commit` / `branch`). [`dsh-git-local`](../../../../packages/git/git-local/README.md) is the local provider through `simple-git`. [`dsh-client-ui-scm`](../../../../packages/client/ui-scm/README.md) is the human Consumer over privileged `git.*` RPC, loopback-pinned beside `host.pickDirectory`. The model keeps using `bash`. The web-app roster mounts `git-local` and `ui-scm` once; desktop stacks on that roster.

Product entry remains `pnpm dsh desktop` / `dsh web`. There is no `apps/vscode` and no marketplace.

## Alternatives considered

**Import OpenSumi or Theia.** Either framework would own the workbench process model, DI container, and SCM contribution API. This repository already has Cordis plugins, slots, and an Electron host. Taking that dependency would replace the slot chain and the existing Agent conversation with a foreign extension host.

**Ship a VS Code extension and reuse VS Code SCM.** That borrows another product's SCM and editor. It requires a marketplace, a second entry (`dsh vscode`), and Monaco. The Agent conversation would live inside VS Code rather than the other way around.

**Add a model-facing `git` tool beside `bash`.** Two Git entries would compete for the same workspace edits. The SCM panel is for the human; the model keeps the shell it already has.

**Hand-parse `git` porcelain.** A maintained wrapper (`simple-git`) deletes owned parser code and tests. Missing `git` or a non-repository still fails loud through `GitError`.

**Put view selection in the session log.** Sidebar view state is viewing state. Logging it would make a model-visible fact out of a UI click.

## Consequences

The desktop and web products share one workbench. SCM opens from the right-column workspace home; there is no activity bar. First-period SCM stops at local index and commit operations; remotes, merge, and blame stay with Agent/`bash`. Privileged `git.*` is loopback-only, so a remote browser cannot drive the host Git binary.
