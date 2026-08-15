# git/ — Git capability family

English | [中文](README.zh.md)

The capability family spans the Git Service Definition and the local-process provider. The GUI SCM panel is the Consumer; the model keeps using `bash` for Git. All are **product** packages.

| Package | Role | ctx key |
|---|---|---|
| [`git/`](git/README.md) | Defines the workspace Git contract shared by Service Providers and Consumers. | `ctx.git` |
| [`git-local/`](git-local/README.md) | Runs the host `git` binary against a workspace root through `simple-git`. | (registers `ctx.git`) |

A leaf `cordis.yml` selects the local provider. The web and desktop bundles mount it so the privileged `git.*` RPC can reach a workspace.

The first-period operation set is `status` / `diff` / `stage` / `unstage` / `commit` / `branch`. Merge, rebase, push, pull, and remote authentication are out of scope.
