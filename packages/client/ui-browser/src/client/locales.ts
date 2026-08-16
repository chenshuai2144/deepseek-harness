/** `browser` namespace dictionaries. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'browser'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'title': '浏览器',
  'address': '地址',
  'placeholder': '输入 https 地址',
  'action.back': '返回工作区',
  'action.close': '关闭工作区',
  'action.go': '打开',
  'empty': '输入地址后打开页面',
  'frame': '页面预览',
  'error.empty': '请输入地址',
  'error.invalid': '地址无效',
  'error.protocol': '只支持 http 和 https',
  'error.loopback': '不能打开本机或本产品地址',
} as const

/** English dictionary, key-identical to the Chinese source of truth. */
export const en: Record<BrowserKey, string> = {
  'title': 'Browser',
  'address': 'Address',
  'placeholder': 'Enter an https address',
  'action.back': 'Back to workspace',
  'action.close': 'Close workspace',
  'action.go': 'Go',
  'empty': 'Enter an address to open a page',
  'frame': 'Page preview',
  'error.empty': 'Enter an address',
  'error.invalid': 'Invalid address',
  'error.protocol': 'Only http and https are allowed',
  'error.loopback': 'Cannot open a local or product address',
}

/** Key domain of the `browser` namespace (zh is the source of truth). */
export type BrowserKey = keyof typeof zh
