/**
 * Right-column workspace home: chrome (+ back to home, close) and the live
 * Changes, File, and Browser tiles. Terminal tiles register here only
 * when they have a real occupant.
 */
import { IconBranchOutline16, IconFolderOpenOutline16, IconGlobeOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import css from './WorkspaceHome.module.css'

/** Injected layout writes for the workspace home. */
export interface WorkspaceHomeInjected {
  /** Open the Changes (SCM) list. */
  openChanges: () => void
  /** Open the File tree. */
  openFiles: () => void
  /** Open the Simple Browser. */
  openBrowser: () => void
  /** Return this column to the workspace home. */
  openWorkspaceHome: () => void
  /** Close the details column. */
  closeDetails: () => void
}

/** Full props for the workspace home occupant. */
export type WorkspaceHomeProps =
  PropsRuntime<'details.home'> & PropsLocale<typeof NS> & WorkspaceHomeInjected

/**
 * Workspace home: header chrome and the implemented Changes, File, and Browser tiles.
 * @param props - session runtime share, locale, and layout writes.
 * @returns the home body.
 */
export function WorkspaceHome({
  openChanges,
  openFiles,
  openBrowser,
  openWorkspaceHome,
  closeDetails,
  t,
}: WorkspaceHomeProps) {
  return (
    <div className={css.root} data-testid="workspace-home">
      <div className={css.header}>
        <button
          type="button"
          className={css.iconButton}
          aria-label={t('home.open')}
          onClick={() => { openWorkspaceHome() }}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <div className={css.title}>{t('home.title')}</div>
        <button
          type="button"
          className={css.iconButton}
          aria-label={t('home.close')}
          onClick={() => { closeDetails() }}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className={css.tiles}>
        <button type="button" className={css.tile} onClick={() => { openChanges() }}>
          <IconBranchOutline16 size={28} />
          <span>{t('tile.changes')}</span>
        </button>
        <button type="button" className={css.tile} onClick={() => { openFiles() }}>
          <IconFolderOpenOutline16 size={28} />
          <span>{t('tile.files')}</span>
        </button>
        <button type="button" className={css.tile} onClick={() => { openBrowser() }}>
          <IconGlobeOutline14 size={28} />
          <span>{t('tile.browser')}</span>
        </button>
      </div>
    </div>
  )
}
