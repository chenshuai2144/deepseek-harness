/** Session-header control that reopens the right-column workspace home. */
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from '../locales.ts'
import css from './WorkspaceHomeAction.module.css'

/** Injected layout write for the header workspace control. */
export interface WorkspaceHomeActionInjected {
  /** Open the right-column workspace home. */
  openWorkspaceHome: () => void
}

/** Full props for the session-header workspace control. */
export type WorkspaceHomeActionProps =
  PropsRuntime<'conversation.session.header.utilities'>
  & PropsLocale<typeof NS>
  & WorkspaceHomeActionInjected

/**
 * Reopen the workspace pane from the session header after the column is closed.
 * @param props - session runtime share, locale, and layout write.
 * @returns the header control.
 */
export function WorkspaceHomeAction({ openWorkspaceHome, t }: WorkspaceHomeActionProps) {
  return (
    <button
      type="button"
      className={css.button}
      aria-label={t('workspace.open')}
      onClick={() => { openWorkspaceHome() }}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  )
}
