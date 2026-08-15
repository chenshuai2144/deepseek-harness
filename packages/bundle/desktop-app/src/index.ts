/**
 * @deepseek-ai/dsh-desktop-app — desktop-surface glue over the web-app roster.
 * Registers the harness-source and desktop-surface prompt sections plus the
 * bash-visible `DSH_DESKTOP` marker. HTTP serving stays disabled by the
 * bundle patch; the Electron shell talks to this host through IPC.
 * @module @deepseek-ai/dsh-desktop-app
 */

import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { addHarnessSourceSection } from '@deepseek-ai/dsh-app-boot'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-shell-env'

/** Stable Cordis plugin name. */
export const name = 'desktop-app'

/** This dsh installation's root, from either this package's source or built entry. */
const SOURCE_ROOT = fileURLToPath(new URL('../../../..', import.meta.url))

/** Environment variable marking a desktop-hosted session. */
const DSH_DESKTOP = 'DSH_DESKTOP' as const

/** Plugin config: whether the model sees desktop-surface orientation. */
export interface Config {
  /**
   * Register the model-visible surface context (the `app:desktop-surface`
   * prompt section and the `DSH_DESKTOP` bash variable).
   */
  surfaceContext: boolean
}

export const Config: z<Config> = z.object({
  surfaceContext: z.boolean().default(true),
})

/**
 * Model-visible orientation for sessions created through `dsh desktop`.
 * @returns the `app:desktop-surface` section text.
 */
export function desktopSurfacePrompt(): string {
  return 'You are interacting with the user through the DeepSeek Harness desktop app, '
    + 'a local window on this machine — not a browser tab and not a URL. '
    + 'When the user refers to "this app", "this window", or "this GUI" without naming another target, they mean this desktop window. '
    + 'The window provides no implicit DOM, route, or screenshot context. '
    + 'Do not start a replacement server or a second GUI unless the user asks; '
    + 'this process already hosts the Agent UI.'
}

/**
 * Mount the desktop runtime: surface prompt and the bash desktop marker.
 * @param ctx - plugin context carrying prompt and optional shell env.
 * @param config - validated {@link Config}.
 */
export function apply(ctx: Context, config: Config): void {
  if (!config.surfaceContext) return
  ctx.inject(['systemPrompt'], (promptCtx) => {
    addHarnessSourceSection(promptCtx, SOURCE_ROOT)
    promptCtx.systemPrompt.section({
      name: 'app:desktop-surface',
      order: -98,
      text: () => desktopSurfacePrompt(),
    })
  })
  ctx.inject(['shellEnv'], (runtimeCtx) => {
    runtimeCtx.shellEnv.register({
      name: 'desktop-runtime',
      variables: {
        [DSH_DESKTOP]: { description: 'Set to 1 when this session is hosted by the DeepSeek Harness desktop app.' },
      },
      resolve: () => ({ [DSH_DESKTOP]: '1' }),
    })
  })
}
