# @deepseek-ai/dsh-git-local

English | [中文](README.zh.md)

Local-process provider of [`ctx.git`](../git/README.md). It runs the host `git` binary against an absolute workspace root through [`simple-git`](https://github.com/steveukx/git-js). `binary` (default `git`) and `maxDiffBytes` (default 1 MiB, the complete-result cap for each diff side) are validated Config fields. A missing executable, a path that is not a repository, an empty commit message, and any other Git failure throw `GitError` with the matching code. `status` splits `simple-git`'s porcelain `files` into staged (index letter) and unstaged (worktree letter) lists. `diff` reads `HEAD` / index / worktree text so the SCM panel can feed the existing `DiffBlock` primitive. Empty `stage` / `unstage` path lists are no-ops.

## Model Experience

None, as this provider serves the GUI SCM panel; the model keeps using `bash` for Git.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **No file watcher** — the SCM panel polls `status` on a configured interval and after mutations; this provider does not own a watch subscription.
- **UTF-8 diffs only** — each side is read as UTF-8 and sliced at `maxDiffBytes`; binary files are not detected as a separate case.
