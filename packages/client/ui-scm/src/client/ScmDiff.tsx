import { useEffect, useState } from 'react'
import type { GitFileDiff, IApiClient } from '@deepseek-ai/dsh-api-remotes/client'
import { DiffBlock, IconChevronLeftOutline14, IconChevronRightOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ScmSelection } from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { gitFailureCopy } from './git-error.ts'
import { NS } from './locales.ts'
import css from './ScmDiff.module.css'

/** Injected git.diff and layout write for the SCM details occupant. */
export interface ScmDiffInjected {
  /** Privileged git.diff. */
  diff: IApiClient['git']['diff']
  /** Open another SCM file while preserving list navigation order. */
  openScmDetails: (selection: ScmSelection) => void
  /** Return the right column to the Changes list. */
  showChanges: () => void
  /** Return the right column to the workspace home. */
  showHome: () => void
  /** Close the details column. */
  closeDetails: () => void
}

/** Full props for the SCM details diff. */
export type ScmDiffProps =
  PropsRuntime<'details.scm'> & PropsLocale<typeof NS> & ScmDiffInjected

/**
 * Read-only SCM file diff in the details column.
 * @param props - session hooks, owner selection, locale, and git.diff inject.
 * @returns the details body.
 */
export function ScmDiff({
  sessionId,
  selection,
  order,
  useSessions,
  diff,
  openScmDetails,
  showChanges,
  showHome,
  closeDetails,
  t,
}: ScmDiffProps) {
  const cwd = useSessions(list => list.byId[sessionId]?.cwd)
  const [file, setFile] = useState<GitFileDiff | undefined>(undefined)
  const [failure, setFailure] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (cwd === undefined || selection === null) {
      setFile(undefined)
      setFailure(undefined)
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    void diff({ cwd, path: selection.path, staged: selection.staged }, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return
        const result = response.result
        if (result.ok) {
          setFile(result.value)
          setFailure(undefined)
          return
        }
        if (result.error.code === 'cancelled') return
        setFile(undefined)
        setFailure(gitFailureCopy(result.error.code, t))
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setFile(undefined)
        setFailure(error instanceof Error ? error.message : t('error.failed'))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => { controller.abort() }
  }, [cwd, diff, selection, t])

  const selectedIndex = selection === null
    ? -1
    : order.findIndex(item => item.path === selection.path && item.staged === selection.staged)
  const previous = selectedIndex > 0 ? order[selectedIndex - 1] : undefined
  const next = selectedIndex >= 0 ? order[selectedIndex + 1] : undefined
  const back = (
    <div className={css.chrome}>
      <button type="button" className={css.back} onClick={showHome}>{t('action.back')}</button>
      <button type="button" className={css.back} onClick={showChanges}>{t('action.backToChanges')}</button>
      <span className={css.navigation}>
        <button
          type="button"
          className={css.navButton}
          aria-label={t('action.previousFile')}
          disabled={previous === undefined}
          onClick={() => { if (previous !== undefined) openScmDetails(previous) }}
        >
          <IconChevronLeftOutline14 />
        </button>
        <span>{selectedIndex < 0 ? '–' : `${selectedIndex + 1}/${order.length}`}</span>
        <button
          type="button"
          className={css.navButton}
          aria-label={t('action.nextFile')}
          disabled={next === undefined}
          onClick={() => { if (next !== undefined) openScmDetails(next) }}
        >
          <IconChevronRightOutline14 />
        </button>
      </span>
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
  )
  if (selection === null) {
    return <div className={css.root} data-testid="scm-diff">{back}<p className={css.empty}>{t('diff.empty')}</p></div>
  }
  if (failure !== undefined) {
    return <div className={css.root} data-testid="scm-diff">{back}<p className={css.error}>{failure}</p></div>
  }
  if (loading || file === undefined) {
    return <div className={css.root} data-testid="scm-diff">{back}<p className={css.loading}>{t('diff.loading')}</p></div>
  }
  return (
    <div className={css.root} data-testid="scm-diff">
      {back}
      <DiffBlock diffs={[{ path: file.path, oldText: file.oldText, newText: file.newText }]} />
    </div>
  )
}
