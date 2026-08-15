import { IconBranchOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { NS } from './locales.ts'
import css from './ScmEntry.module.css'

/** Injected write that opens the SCM sidebar occupant. */
export interface ScmEntryInjected {
  /** Switch the left column to the SCM panel. */
  showScmView: () => void
}

/** Footer action that opens SCM from the agent sidebar. */
export type ScmEntryProps =
  PropsRuntime<'sidebar.footer.action'> & PropsLocale<typeof NS> & ScmEntryInjected

/**
 * Agent-sidebar foot control that opens the SCM panel.
 * @param props - column width flag, locale, and the layout write.
 * @returns the footer button.
 */
export function ScmEntry({ wide, showScmView, t }: ScmEntryProps) {
  return (
    <button
      type="button"
      className={wide ? css.trigger : `${css.trigger} ${css.rail}`}
      aria-label={t('title')}
      onClick={() => { showScmView() }}
    >
      <IconBranchOutline16 size={wide ? 16 : 18} />
      {wide && <span className={css.label}>{t('title')}</span>}
    </button>
  )
}
