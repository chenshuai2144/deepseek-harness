/** `layout` namespace dictionaries: workspace-home chrome and live tiles. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'home.title': '工作区',
  'home.open': '打开工作区首页',
  'home.close': '关闭工作区',
  'tile.changes': '更改',
  'tile.files': '文件',
} as const

/** The layout namespace key union. */
export type LayoutKey = keyof typeof zh

/** English dictionary, key-identical to the Chinese source of truth. */
export const en: Record<LayoutKey, string> = {
  'home.title': 'Workspace',
  'home.open': 'Open workspace home',
  'home.close': 'Close workspace',
  'tile.changes': 'Changes',
  'tile.files': 'File',
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'layout'
