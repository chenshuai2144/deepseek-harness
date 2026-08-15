/**
 * Workbench SCM plugin, browser half: occupies `sidebar.scm` and `details.scm`
 * and drives privileged git.* RPC against the current session workspace.
 */
import z from '@deepseek-ai/schemastery'
import type { ConnectionHandle } from '@deepseek-ai/dsh-api-remotes/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { ScmDiff } from './ScmDiff.tsx'
import { ScmEntry } from './ScmEntry.tsx'
import { ScmPanel } from './ScmPanel.tsx'
import { en, NS, zh, type ScmKey } from './locales.ts'

export type { ScmDiffInjected, ScmDiffProps } from './ScmDiff.tsx'
export type { ScmEntryInjected, ScmEntryProps } from './ScmEntry.tsx'
export type { ScmPanelInjected, ScmPanelProps } from './ScmPanel.tsx'
export type { ScmKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** SCM sidebar and details copy. */
    scm: ScmKey
  }
}

/** Client-side poll period for git.status while the SCM view is mounted. */
export interface Config {
  /** Milliseconds between status refreshes. */
  refreshIntervalMs: number
}

/** Validated {@link Config}. */
export const Config: z<Config> = z.object({
  refreshIntervalMs: z.number().min(250).default(2000),
})

/** Required services for locale, slots, layout writes, and git RPC. */
export const inject = ['slots', 'locale', 'connection', 'layout']

/**
 * Register the SCM dictionaries and occupy the layout-owned SCM slots.
 * @param ctx - client root context.
 * @param config - validated poll period.
 */
export function apply(ctx: ClientContext, config: Config): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-scm: dictionaries')
  const connection = ctx.get('connection') as ConnectionHandle
  const panelInject = () => ({
    status: connection.api.git.status.bind(connection.api.git),
    stage: connection.api.git.stage.bind(connection.api.git),
    unstage: connection.api.git.unstage.bind(connection.api.git),
    commit: connection.api.git.commit.bind(connection.api.git),
    openScmDetails: (selection: Parameters<typeof ctx.layout.openScmDetails>[0]) => {
      ctx.layout.openScmDetails(selection)
    },
    showAgentView: () => { ctx.layout.setSidebarView('agent') },
    refreshIntervalMs: config.refreshIntervalMs,
  })
  const entryInject = () => ({
    showScmView: () => { ctx.layout.setSidebarView('scm') },
  })
  const diffInject = () => ({
    diff: connection.api.git.diff.bind(connection.api.git),
  })
  ctx.slots.inject(
    'sidebar.scm',
    () => ctx.slots.register({
      name: 'sidebar.scm',
      locale: NS,
      inject: panelInject,
    }, ScmPanel),
  )
  ctx.slots.inject(
    'details.scm',
    () => ctx.slots.register({
      name: 'details.scm',
      locale: NS,
      inject: diffInject,
    }, ScmDiff),
  )
  ctx.slots.inject(
    'sidebar.footer.action',
    () => ctx.slots.register({
      name: 'sidebar.footer.action',
      id: 'scm-open',
      locale: NS,
      inject: entryInject,
    }, ScmEntry),
  )
}
