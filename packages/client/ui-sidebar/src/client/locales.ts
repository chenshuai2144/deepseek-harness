/** `sidebar` namespace dictionaries: shell controls (brand row, New Session, fold toggle). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'session.new': '新会话',
  'session.new.label': '新建会话',
  'toggle.open': '打开侧边栏',
  'toggle.collapse': '收起侧边栏',
  'tasks': '任务中心',
  'tasks.aria': '打开任务中心',
  'inbox': '通知',
  'inbox.aria': '打开通知收件箱',
  'commands': '命令',
  'commands.aria': '打开命令面板',
} satisfies Record<string, string>

/** The sidebar namespace key union. */
export type SidebarKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'session.new': 'New Session',
  'session.new.label': 'New session',
  'toggle.open': 'Open sidebar',
  'toggle.collapse': 'Collapse sidebar',
  'tasks': 'Task center',
  'tasks.aria': 'Open task center',
  'inbox': 'Notifications',
  'inbox.aria': 'Open notification inbox',
  'commands': 'Commands',
  'commands.aria': 'Open command palette',
} satisfies Record<SidebarKey, string>
