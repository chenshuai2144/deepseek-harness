import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { diffLines } from 'diff'
import type { GitChange, GitStatus, IApiClient } from '@deepseek-ai/dsh-api-remotes/client'
import { Button, IconBranchOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ScmSelection } from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { gitFailureCopy } from './git-error.ts'
import { NS } from './locales.ts'
import css from './ScmPanel.module.css'

/** Injected git RPC methods and layout write for the SCM list. */
export interface ScmPanelInjected {
  /** Privileged git.status. */
  status: IApiClient['git']['status']
  /** Privileged git.stage. */
  stage: IApiClient['git']['stage']
  /** Privileged git.unstage. */
  unstage: IApiClient['git']['unstage']
  /** Privileged git.commit. */
  commit: IApiClient['git']['commit']
  /** Privileged git.diff used to calculate aggregate line counts. */
  diff: IApiClient['git']['diff']
  /** Open the details column on one SCM file. */
  openScmDetails: (selection: ScmSelection, order: readonly ScmSelection[]) => void
  /** Status poll period while this view is mounted. */
  refreshIntervalMs: number
  /** Return the right column to the workspace home. */
  showHome: () => void
  /** Close the details column. */
  closeDetails: () => void
}

/** Full props for the SCM changes list. */
export type ScmPanelProps =
  PropsRuntime<'details.changes'> & PropsLocale<typeof NS> & ScmPanelInjected

/**
 * Right-column SCM list: branch name, staged/unstaged paths, stage actions, and commit.
 * @param props - session share, locale, and git RPC inject.
 * @returns the Changes list.
 */
export function ScmPanel({
  sessionId,
  useSessions,
  status,
  stage,
  unstage,
  commit,
  diff,
  openScmDetails,
  refreshIntervalMs,
  showHome,
  closeDetails,
  t,
}: ScmPanelProps) {
  const cwd = useSessions(list => list.byId[sessionId]?.cwd)
  const hasSession = useSessions(list => list.byId[sessionId] !== undefined)
  const [snapshot, setSnapshot] = useState<GitStatus | undefined>(undefined)
  const [failure, setFailure] = useState<string | undefined>(undefined)
  const [message, setMessage] = useState('')
  const [commitHint, setCommitHint] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [lineStats, setLineStats] = useState<{ additions: number; deletions: number } | undefined>(undefined)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (cwd === undefined) {
      setSnapshot(undefined)
      setFailure(undefined)
      return
    }
    const response = await status({ cwd }, signal)
    if (signal?.aborted) return
    const result = response.result
    if (result.ok) {
      setSnapshot(result.value)
      setFailure(undefined)
      return
    }
    if (result.error.code === 'cancelled') return
    setSnapshot(undefined)
    setFailure(gitFailureCopy(result.error.code, t))
  }, [cwd, status, t])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal).catch((error: unknown) => {
      if (controller.signal.aborted) return
      setFailure(error instanceof Error ? error.message : t('error.failed'))
    })
    const timer = window.setInterval(() => {
      void refresh(controller.signal).catch((error: unknown) => {
        if (controller.signal.aborted) return
        setFailure(error instanceof Error ? error.message : t('error.failed'))
      })
    }, refreshIntervalMs)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [refresh, refreshIntervalMs, t])

  const changeOrder = useMemo<readonly ScmSelection[]>(() => snapshot === undefined
    ? []
    : [
      ...snapshot.unstaged.map(row => ({ path: row.path, staged: false as const })),
      ...snapshot.staged.map(row => ({ path: row.path, staged: true as const })),
    ], [snapshot])
  const statsKey = cwd === undefined
    ? ''
    : `${cwd}\u0000${changeOrder.map(item => `${item.staged ? 's' : 'u'}:${item.path}`).join('\u0000')}`
  const statsRequest = useRef({ cwd, changeOrder })
  statsRequest.current = { cwd, changeOrder }

  useEffect(() => {
    const request = statsRequest.current
    if (request.cwd === undefined || request.changeOrder.length === 0) {
      setLineStats({ additions: 0, deletions: 0 })
      return
    }
    const workspace = request.cwd
    const controller = new AbortController()
    void Promise.all(request.changeOrder.map(async (selection) => {
      const response = await diff({ cwd: workspace, ...selection }, controller.signal)
      if (!response.result.ok) throw new Error(gitFailureCopy(response.result.error.code, t))
      return response.result.value
    })).then((files) => {
      if (controller.signal.aborted) return
      let additions = 0
      let deletions = 0
      for (const file of files) {
        for (const part of diffLines(file.oldText ?? '', file.newText)) {
          if (part.added) additions += part.count
          if (part.removed) deletions += part.count
        }
      }
      setLineStats({ additions, deletions })
    }).catch(() => {
      if (!controller.signal.aborted) setLineStats(undefined)
    })
    return () => { controller.abort() }
  }, [diff, statsKey, t])

  const mutate = useCallback(async (work: () => Promise<void>) => {
    setBusy(true)
    try {
      await work()
      await refresh()
    } catch (error: unknown) {
      setFailure(error instanceof Error ? error.message : t('error.failed'))
    } finally {
      setBusy(false)
    }
  }, [refresh, t])

  const chrome = (
    <ScmChrome showHome={showHome} closeDetails={closeDetails} t={t}>
      {snapshot === undefined
        ? null
        : (
          <>
            <IconBranchOutline16 />
            <span className={css.branch} aria-label={t('branch.aria')}>{snapshot.branch}</span>
          </>
        )}
    </ScmChrome>
  )

  if (!hasSession) {
    return (
      <div className={css.root} data-testid="scm-panel">
        {chrome}
        <p className={css.empty}>{t('empty.noSession')}</p>
      </div>
    )
  }
  if (cwd === undefined) {
    return (
      <div className={css.root} data-testid="scm-panel">
        {chrome}
        <p className={css.empty}>{t('empty.noWorkspace')}</p>
      </div>
    )
  }
  if (failure !== undefined) {
    return (
      <div className={css.root} data-testid="scm-panel">
        {chrome}
        <p className={css.empty}>{failure}</p>
      </div>
    )
  }
  if (snapshot === undefined) {
    return (
      <div className={css.root} data-testid="scm-panel">
        {chrome}
        <p className={css.empty}>{t('diff.loading')}</p>
      </div>
    )
  }

  const canCommit = snapshot.staged.length > 0 && !busy
  const changedFileCount = new Set(changeOrder.map(item => item.path)).size

  return (
    <div className={css.root} data-testid="scm-panel">
      {chrome}
      <div className={css.summary} aria-label={t('summary.aria')}>
        <span>{t('summary.files', { count: changedFileCount })}</span>
        <span className={css.additions}>+{lineStats?.additions ?? '–'}</span>
        <span className={css.deletions}>−{lineStats?.deletions ?? '–'}</span>
        <span className={css.sync}>↑{snapshot.ahead} ↓{snapshot.behind}</span>
      </div>
      {snapshot.unstaged.length === 0 && snapshot.staged.length === 0
        ? <p className={css.empty}>{t('empty.clean')}</p>
        : (
          <div className={css.lists}>
            <ChangeSection
              title={t('section.unstaged')}
              rows={snapshot.unstaged}
              actionLabel={t('action.stage')}
              extra={snapshot.unstaged.length > 0
                ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      void mutate(async () => {
                        const result = (await stage({ cwd, paths: snapshot.unstaged.map(row => row.path) })).result
                        if (!result.ok) throw new Error(gitFailureCopy(result.error.code, t))
                      })
                    }}
                  >
                    {t('action.stageAll')}
                  </Button>
                )
                : null}
              onSelect={(path) => { openScmDetails({ path, staged: false }, changeOrder) }}
              onAction={(path) => {
                void mutate(async () => {
                  const result = (await stage({ cwd, paths: [path] })).result
                  if (!result.ok) throw new Error(gitFailureCopy(result.error.code, t))
                })
              }}
            />
            <ChangeSection
              title={t('section.staged')}
              rows={snapshot.staged}
              actionLabel={t('action.unstage')}
              extra={snapshot.staged.length > 0
                ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      void mutate(async () => {
                        const result = (await unstage({ cwd, paths: snapshot.staged.map(row => row.path) })).result
                        if (!result.ok) throw new Error(gitFailureCopy(result.error.code, t))
                      })
                    }}
                  >
                    {t('action.unstageAll')}
                  </Button>
                )
                : null}
              onSelect={(path) => { openScmDetails({ path, staged: true }, changeOrder) }}
              onAction={(path) => {
                void mutate(async () => {
                  const result = (await unstage({ cwd, paths: [path] })).result
                  if (!result.ok) throw new Error(gitFailureCopy(result.error.code, t))
                })
              }}
            />
          </div>
        )}
      <div className={css.commit}>
        <textarea
          className={css.message}
          value={message}
          placeholder={t('commit.placeholder')}
          onChange={(event) => {
            setMessage(event.target.value)
            setCommitHint(undefined)
          }}
        />
        {commitHint === undefined ? null : <p className={css.hint}>{commitHint}</p>}
        <div className={css.actions}>
          <Button
            variant="primary"
            size="sm"
            disabled={!canCommit}
            onClick={() => {
              const trimmed = message.trim()
              if (trimmed === '') {
                setCommitHint(t('commit.empty'))
                return
              }
              void mutate(async () => {
                const result = (await commit({ cwd, message: trimmed })).result
                if (!result.ok) throw new Error(gitFailureCopy(result.error.code, t))
                setMessage('')
                setCommitHint(t('commit.success', { commit: result.value.commit.slice(0, 7) }))
              })
            }}
          >
            {t('action.commit')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Header chrome: back to home, optional branch, and close. */
function ScmChrome({
  showHome,
  closeDetails,
  t,
  children,
}: {
  showHome: () => void
  closeDetails: () => void
  t: ScmPanelProps['t']
  children?: ReactNode
}): ReactNode {
  return (
    <div className={css.header}>
      <button type="button" className={css.back} onClick={showHome}>{t('action.back')}</button>
      {children}
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
}

/**
 * One staged or unstaged list with per-row stage/unstage.
 * @param props.title - section heading.
 * @param props.rows - paths in this list.
 * @param props.actionLabel - per-row mutation label.
 * @param props.extra - optional heading control (stage all).
 * @param props.onSelect - open details on this path.
 * @param props.onAction - stage or unstage this path.
 * @returns the section, or null when the list is empty.
 */
function ChangeSection({
  title,
  rows,
  actionLabel,
  extra,
  onSelect,
  onAction,
}: {
  title: string
  rows: GitChange[]
  actionLabel: string
  extra?: ReactNode
  onSelect: (path: string) => void
  onAction: (path: string) => void
}): ReactNode {
  if (rows.length === 0) return null
  return (
    <section className={css.section}>
      <h2 className={css.sectionTitle}>
        <span>{title}</span>
        {extra}
      </h2>
      {rows.map(row => (
        <div key={`${row.status}:${row.path}`} className={css.item} role="listitem">
          <button type="button" className={css.row} onClick={() => { onSelect(row.path) }}>
            <span className={css.status}>{row.status}</span>
            <span className={css.path} title={row.originalPath === undefined ? row.path : `${row.originalPath} → ${row.path}`}>
              {row.path}
            </span>
          </button>
          <Button size="sm" onClick={() => { onAction(row.path) }}>{actionLabel}</Button>
        </div>
      ))}
    </section>
  )
}
