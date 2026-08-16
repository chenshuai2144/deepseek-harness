# @deepseek-ai/dsh-client-ui-scm

English | [中文](README.zh.md)

Workbench SCM plugin: occupies layout-owned `details.changes` and `details.scm`. The Changes list shows the current session workspace's Git branch, unstaged and staged paths, and a commit box. File clicks call `ctx.layout.openScmDetails`; the details column renders a read-only [`DiffBlock`](../ui-primitives/README.md). All mutations go through privileged `git.*` RPC. The model keeps using `bash` for Git. Design rationale lives in [the workbench Agent Note](../../../.agents/notes/implemented/architecture/2026-08-14-opensumi-like-workbench-agent-scm.md) and [the workspace-pane Agent Note](../../../.agents/notes/implemented/architecture/2026-08-16-right-column-workspace-pane.md).

`refreshIntervalMs` (default `2000`) is a validated Config field: the panel polls `git.status` while the SCM view is mounted and refreshes again after stage, unstage, or commit. An empty commit message is rejected in the panel before RPC. A missing workspace, a path that is not a repository, a missing `git` binary, and an unavailable `ctx.git` each render an actionable empty state.

## Model Experience

None, as this plugin is a human SCM panel over privileged RPC; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **No remotes, merge, or blame** — push, pull, fetch, merge, rebase, stash, and blame stay with Agent/`bash`.
- **No file watcher** — status refreshes on the configured poll interval and after mutations.
- **Read-only details diff** — the details column reuses `DiffBlock`; there is no merge editor or Monaco.
