import { useEffect, useState, type FormEvent } from 'react'
import { IconGlobeOutline14, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { resolveBrowserHref, type BrowserHrefReason } from './href.ts'
import { NS, type BrowserKey } from './locales.ts'
import css from './BrowserPanel.module.css'

/** Injected layout writes and the workbench origin for same-origin refusal. */
export interface BrowserPanelInjected {
  /** Open the iframe on one already-accepted http(s) URL. */
  openPage: (href: string) => void
  /** Return the right column to the workspace home. */
  showHome: () => void
  /** Close the details column. */
  closeDetails: () => void
  /** `window.location.origin` of the workbench, when known. */
  productOrigin?: string
}

/** Full props for the Simple Browser. */
export type BrowserPanelProps =
  PropsRuntime<'details.browser'> & PropsLocale<typeof NS> & BrowserPanelInjected

/**
 * Right-column Simple Browser: address bar plus a sandboxed iframe.
 * @param props - owner href, locale, and layout writes.
 * @returns the Browser pane.
 */
export function BrowserPanel({
  href,
  openPage,
  showHome,
  closeDetails,
  productOrigin,
  t,
}: BrowserPanelProps) {
  const [draft, setDraft] = useState(href ?? '')
  const [failure, setFailure] = useState<BrowserHrefReason | undefined>(undefined)

  useEffect(() => {
    setDraft(href ?? '')
    setFailure(undefined)
  }, [href])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const resolved = resolveBrowserHref(draft, productOrigin)
    if (!resolved.ok) {
      setFailure(resolved.reason)
      return
    }
    setFailure(undefined)
    openPage(resolved.href)
  }

  return (
    <div className={css.root} data-testid="browser-panel">
      <div className={css.header}>
        <button type="button" className={css.back} onClick={showHome}>{t('action.back')}</button>
        <span className={css.title}>{t('title')}</span>
        <button
          type="button"
          className={css.iconButton}
          aria-label={t('action.close')}
          onClick={closeDetails}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <form className={css.bar} onSubmit={submit}>
        <span className={css.address}>
          <Input
            icon={<IconGlobeOutline14 size={14} />}
            value={draft}
            onChange={(event) => { setDraft(event.target.value) }}
            placeholder={t('placeholder')}
            aria-label={t('address')}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </span>
        <button type="submit" className={css.go}>{t('action.go')}</button>
      </form>
      {failure !== undefined ? <p className={css.empty}>{failureCopy(failure, t)}</p> : null}
      {href === null
        ? failure === undefined ? <p className={css.empty}>{t('empty')}</p> : null
        : (
          <iframe
            className={css.frame}
            title={t('frame')}
            src={href}
            sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"
            referrerPolicy="no-referrer"
          />
        )}
    </div>
  )
}

/**
 * Map a parse failure onto Browser-pane copy.
 * @param reason - `resolveBrowserHref` failure.
 * @param t - bound `browser` translator.
 * @returns the user-visible sentence.
 */
const FAILURE_COPY: Record<BrowserHrefReason, BrowserKey> = {
  empty: 'error.empty',
  invalid: 'error.invalid',
  protocol: 'error.protocol',
  loopback: 'error.loopback',
}

function failureCopy(reason: BrowserHrefReason, t: BrowserPanelProps['t']): string {
  return t(FAILURE_COPY[reason])
}
