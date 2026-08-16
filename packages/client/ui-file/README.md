# @deepseek-ai/dsh-client-ui-file

English | [中文](README.zh.md)

Workbench File plugin: occupies layout-owned `details.files` and `details.file`. The tree lists the current session workspace through privileged `fs.listDir`. File clicks call `ctx.layout.openFileDetails`; the details column renders a read-only [`CodeBlock`](../ui-primitives/README.md) through privileged `fs.readText`. Listing and preview stay inside the session `cwd`. The model keeps using filesystem tools. Design rationale lives in [the File-pane Agent Note](../../../.agents/notes/implemented/architecture/2026-08-16-right-column-file-pane.md) and [the workspace-pane Agent Note](../../../.agents/notes/implemented/architecture/2026-08-16-right-column-workspace-pane.md).

A missing workspace, a path outside the workspace, a missing `ctx.fs`, a non-text file, and a preview that exceeds the 1 MiB cap each render an actionable empty or truncated state.

## Model Experience

None, as this plugin is a human File pane over privileged RPC; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Read-only preview** — the details column reuses `CodeBlock`; there is no editor or Monaco.
- **No file watcher** — the tree loads on mount and when a directory expands.
- **Loopback-only** — `fs.listDir` and `fs.readText` are privileged; a remote browser cannot drive host filesystem reads.
