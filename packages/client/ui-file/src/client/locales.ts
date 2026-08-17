/** `file` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'file'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'title': '文件',
  'action.back': '返回工作区',
  'action.backToFiles': '返回文件',
  'action.close': '关闭工作区',
  'action.expand': '展开',
  'action.collapse': '折叠',
  'empty.noSession': '没有会话',
  'empty.noWorkspace': '没有工作区',
  'empty.directory': '空目录',
  'empty.preview': '选择一个文件查看',
  'loading': '正在加载',
  'preview.loading': '正在打开文件',
  'preview.truncated': '已截断预览',
  'copy': '复制',
  'copied': '复制成功',
  'copyPath': '复制路径',
  'search.placeholder': '快速打开文件',
  'search.aria': '按文件名搜索工作区',
  'search.results': '文件搜索结果',
  'search.scanning': '正在建立文件索引…',
  'search.empty': '没有匹配的文件。',
  'search.truncated': '索引已达到上限，请输入更精确的名称。',
  'recent.title': '最近打开',
  'error.unavailable': '文件系统不可用',
  'error.notFound': '找不到该路径',
  'error.notDirectory': '不是目录',
  'error.notText': '不是文本文件',
  'error.notFile': '不是普通文件',
  'error.tooLarge': '文件过大',
  'error.denied': '没有权限',
  'error.failed': '无法读取工作区',
} as const

/** English dictionary, key-identical to the Chinese source of truth. */
export const en: Record<FileKey, string> = {
  'title': 'File',
  'action.back': 'Back to workspace',
  'action.backToFiles': 'Back to files',
  'action.close': 'Close workspace',
  'action.expand': 'Expand',
  'action.collapse': 'Collapse',
  'empty.noSession': 'No session',
  'empty.noWorkspace': 'No workspace',
  'empty.directory': 'Empty directory',
  'empty.preview': 'Select a file to preview',
  'loading': 'Loading',
  'preview.loading': 'Opening file',
  'preview.truncated': 'Preview truncated',
  'copy': 'Copy',
  'copied': 'Copied',
  'copyPath': 'Copy path',
  'search.placeholder': 'Quick open file',
  'search.aria': 'Search workspace filenames',
  'search.results': 'File search results',
  'search.scanning': 'Building file index…',
  'search.empty': 'No matching files.',
  'search.truncated': 'The index reached its limit. Refine the filename.',
  'recent.title': 'Recently opened',
  'error.unavailable': 'Filesystem is unavailable',
  'error.notFound': 'Path not found',
  'error.notDirectory': 'Not a directory',
  'error.notText': 'Not a text file',
  'error.notFile': 'Not a regular file',
  'error.tooLarge': 'File is too large',
  'error.denied': 'Permission denied',
  'error.failed': 'Could not read the workspace',
}

/** Key domain of the `file` namespace (zh is the source of truth). */
export type FileKey = keyof typeof zh
