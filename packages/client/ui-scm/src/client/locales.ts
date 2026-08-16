/** `scm` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'scm'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'title': '源代码管理',
  'branch.aria': '当前分支',
  'empty.noSession': '没有会话',
  'empty.noWorkspace': '没有工作区',
  'empty.clean': '没有更改',
  'section.unstaged': '更改',
  'section.staged': '暂存的更改',
  'action.stage': '暂存',
  'action.unstage': '取消暂存',
  'action.stageAll': '全部暂存',
  'action.commit': '提交',
  'action.back': '返回工作区',
  'action.backToChanges': '返回更改',
  'action.close': '关闭工作区',
  'commit.placeholder': '提交说明',
  'commit.empty': '提交说明不能为空',
  'error.notRepo': '不是 git 仓库',
  'error.notFound': '未找到 git',
  'error.unavailable': 'Git 服务不可用',
  'error.emptyMessage': '提交说明不能为空',
  'error.failed': 'Git 操作失败',
  'diff.empty': '选择一个文件查看差异',
  'diff.loading': '正在加载差异',
} as const

/** English dictionary, key-identical to the Chinese source of truth. */
export const en: Record<ScmKey, string> = {
  'title': 'Source Control',
  'branch.aria': 'Current branch',
  'empty.noSession': 'No session',
  'empty.noWorkspace': 'No workspace',
  'empty.clean': 'No changes',
  'section.unstaged': 'Changes',
  'section.staged': 'Staged Changes',
  'action.stage': 'Stage',
  'action.unstage': 'Unstage',
  'action.stageAll': 'Stage All',
  'action.commit': 'Commit',
  'action.back': 'Back to workspace',
  'action.backToChanges': 'Back to changes',
  'action.close': 'Close workspace',
  'commit.placeholder': 'Commit message',
  'commit.empty': 'Commit message cannot be empty',
  'error.notRepo': 'Not a git repository',
  'error.notFound': 'git was not found',
  'error.unavailable': 'Git is unavailable',
  'error.emptyMessage': 'Commit message cannot be empty',
  'error.failed': 'Git operation failed',
  'diff.empty': 'Select a file to view the diff',
  'diff.loading': 'Loading diff',
}

/** Key domain of the `scm` namespace (zh is the source of truth). */
export type ScmKey = keyof typeof zh
