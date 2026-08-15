# @deepseek-ai/dsh-git

English | [中文](README.zh.md)

Service Definition for the workspace Git capability (`ctx.git`). The abstract `Git` service is the contract local providers implement and the GUI SCM panel consumes through privileged `git.*` RPC. The first-period closed set is `status`, `diff`, `stage`, `unstage`, `commit`, and `branch`. A missing `git` binary, a path that is not a repository, an empty commit message, and any other Git failure throw the typed `GitError` (`git-not-found` / `not-a-repository` / `empty-message` / `git-failed`, each carrying the subject `cwd`). The model does not receive a Git tool from this seam; it keeps using `bash`. Design rationale lives in [the OpenSumi-like workbench Agent Note](../../../.agents/notes/implemented/architecture/2026-08-14-opensumi-like-workbench-agent-scm.md).

## Model Experience

None, as the seam serves the GUI host's SCM panel; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **No remotes, merge, or rebase** — the closed set stops at local index and commit operations; push, pull, fetch, merge, rebase, stash, and blame wait for a consumer that needs them.
- **No model-facing Git tool** — a second Git entry beside `bash` would split the model's workspace edits; the SCM panel is the human Consumer.
