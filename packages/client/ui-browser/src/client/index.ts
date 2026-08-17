/**
 * Workbench Simple Browser plugin, browser half: occupies `details.browser`
 * with an address bar and a sandboxed iframe.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { BrowserPanel } from './BrowserPanel.tsx'
import { en, NS, zh, type BrowserKey } from './locales.ts'

export type { BrowserPanelInjected, BrowserPanelProps } from './BrowserPanel.tsx'
export type { BrowserKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Simple Browser copy. */
    browser: BrowserKey
  }
}

/** Required services for locale, slots, and layout writes. */
export const inject = ['slots', 'locale', 'layout']

/**
 * Register the Browser dictionaries and occupy the layout-owned Browser slot.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-browser: dictionaries')
  ctx.slots.inject(
    'details.browser',
    () => ctx.slots.register({
      name: 'details.browser',
      locale: NS,
      inject: () => ({
        openPage: (href: string) => { ctx.layout.openBrowserPage(href) },
        showHome: () => { ctx.layout.openWorkspaceHome() },
        closeDetails: () => { ctx.layout.closeDetails() },
        ...(typeof globalThis.location === 'undefined' ? {} : { productOrigin: globalThis.location.origin }),
      }),
    }, BrowserPanel),
  )
}
