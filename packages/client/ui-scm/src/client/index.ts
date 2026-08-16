/**
 * Workbench SCM plugin, browser half: occupies `details.changes` and
 * `details.scm` and drives privileged git.* RPC against the current session
 * workspace.
 */
import z from '@deepseek-ai/schemastery'
import type { ConnectionHandle } from '@deepseek-ai/dsh-api-remotes/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { ScmDiff } from './ScmDiff.tsx'
import { ScmPanel } from './ScmPanel.tsx'
import { en, NS, zh, type ScmKey } from './locales.ts'

export type { ScmDiffInjected, ScmDiffProps } from './ScmDiff.tsx'
export type { ScmPanelInjected, ScmPanelProps } from './ScmPanel.tsx'
export type { ScmKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** SCM changes list and details copy. */
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
    showHome: () => { ctx.layout.openWorkspaceHome() },
    closeDetails: () => { ctx.layout.closeDetails() },
    refreshIntervalMs: config.refreshIntervalMs,
  })
  const diffInject = () => ({
    diff: connection.api.git.diff.bind(connection.api.git),
    showChanges: () => { ctx.layout.openChanges() },
    showHome: () => { ctx.layout.openWorkspaceHome() },
    closeDetails: () => { ctx.layout.closeDetails() },
  })
  ctx.slots.inject(
    'details.changes',
    () => ctx.slots.register({
      name: 'details.changes',
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
}
