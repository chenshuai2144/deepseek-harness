# @deepseek-ai/dsh-git-local

[English](README.md) | 中文

[`ctx.git`](../git/README.md) 的本机进程提供方。它通过 [`simple-git`](https://github.com/steveukx/git-js) 对绝对工作区根执行本机 `git` 二进制。`binary`（默认 `git`）和 `maxDiffBytes`（默认 1 MiB，每个 diff 侧的完整结果上限）是经过校验的 Config 字段。找不到可执行文件、路径不是仓库、空提交说明，以及其他 Git 失败会抛出对应代码的 `GitError`。`status` 把 `simple-git` 的 porcelain `files` 拆成已暂存（index 字母）和未暂存（工作树字母）两个列表。`diff` 读取 `HEAD` / index / 工作树文本，以便 SCM 面板喂给已有的 `DiffBlock` 基元。空的 `stage` / `unstage` 路径列表是空操作。

## 模型体验

无。该提供方服务 GUI 的 SCM 面板；模型继续通过 `bash` 使用 Git。

#### KV Cache 影响

无；该包既不组装也不发送提供方请求。

## 已知限制与暂缓事项

- **没有文件监视**：SCM 面板按配置间隔并在变更后轮询 `status`；本提供方不拥有监视订阅。
- **仅 UTF-8 diff**：每一侧按 UTF-8 读取并在 `maxDiffBytes` 处截断；二进制文件不会被单独识别。
