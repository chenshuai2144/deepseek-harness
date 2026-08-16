/**
 * Workbench File plugin, browser half: occupies `details.files` and
 * `details.file` and drives privileged fs.* RPC against the current session
 * workspace.
 */
import type { ConnectionHandle } from '@deepseek-ai/dsh-api-remotes/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { FilePanel } from './FilePanel.tsx'
import { FilePreview } from './FilePreview.tsx'
import { en, NS, zh, type FileKey } from './locales.ts'

export type { FilePanelInjected, FilePanelProps } from './FilePanel.tsx'
export type { FilePreviewInjected, FilePreviewProps } from './FilePreview.tsx'
export type { FileKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** File tree and preview copy. */
    file: FileKey
  }
}

/** Required services for locale, slots, layout writes, and fs RPC. */
export const inject = ['slots', 'locale', 'connection', 'layout']

/**
 * Register the File dictionaries and occupy the layout-owned File slots.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-file: dictionaries')
  const connection = ctx.get('connection') as ConnectionHandle
  const panelInject = () => ({
    listDir: connection.api.fs.listDir.bind(connection.api.fs),
    openFileDetails: (selection: Parameters<typeof ctx.layout.openFileDetails>[0]) => {
      ctx.layout.openFileDetails(selection)
    },
    showHome: () => { ctx.layout.openWorkspaceHome() },
    closeDetails: () => { ctx.layout.closeDetails() },
  })
  const previewInject = () => ({
    readText: connection.api.fs.readText.bind(connection.api.fs),
    showFiles: () => { ctx.layout.openFiles() },
    showHome: () => { ctx.layout.openWorkspaceHome() },
    closeDetails: () => { ctx.layout.closeDetails() },
  })
  ctx.slots.inject(
    'details.files',
    () => ctx.slots.register({
      name: 'details.files',
      locale: NS,
      inject: panelInject,
    }, FilePanel),
  )
  ctx.slots.inject(
    'details.file',
    () => ctx.slots.register({
      name: 'details.file',
      locale: NS,
      inject: previewInject,
    }, FilePreview),
  )
}
