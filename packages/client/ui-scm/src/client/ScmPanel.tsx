import { useCallback, useEffect, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import type { GitChange, GitStatus, IApiClient } from '@deepseek-ai/dsh-api-remotes/client'
import { Button, IconBranchOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ScmSelection } from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { gitFailureCopy } from './git-error.ts'
import { NS } from './locales.ts'
import css from './ScmPanel.module.css'

/** Injected git RPC methods and layout write for the SCM sidebar. */
export interface ScmPanelInjected {
  /** Privileged git.status. */
  status: IApiClient['git']['status']
  /** Privileged git.stage. */
  stage: IApiClient['git']['stage']
  /** Privileged git.unstage. */
  unstage: IApiClient['git']['unstage']
  /** Privileged git.commit. */
  commit: IApiClient['git']['commit']
  /** Open the details column on one SCM file. */
  openScmDetails: (selection: ScmSelection) => void
  /** Status poll period while this view is mounted. */
  refreshIntervalMs: number
  /** Return the left column to the agent session list. */
  showAgentView: () => void
}

/** Full props for the SCM sidebar panel. */
export type ScmPanelProps =
  PropsRuntime<'sidebar.scm'> & PropsLocale<typeof NS> & ScmPanelInjected

/**
 * Sidebar SCM panel: branch name, staged/unstaged lists, stage actions, and commit.
 * @param props - layout owner share, session hooks, locale, and git RPC inject.
 * @returns the SCM sidebar tree.
 */
export function ScmPanel({
  collapsed,
  useSessions,
  status,
  stage,
  unstage,
  commit,
  openScmDetails,
  refreshIntervalMs,
  showAgentView,
  t,
}: ScmPanelProps) {
  const cwd = useSessions(list => list.current === undefined ? undefined : list.byId[list.current]?.cwd)
  const hasSession = useSessions(list => list.current !== undefined)
  const [snapshot, setSnapshot] = useState<GitStatus | undefined>(undefined)
  const [failure, setFailure] = useState<string | undefined>(undefined)
  const [message, setMessage] = useState('')
  const [commitHint, setCommitHint] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)

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

  if (collapsed) {
    return (
      <div className={clsx(css.root, css.collapsed)} data-testid="scm-panel">
        <IconBranchOutline16 />
      </div>
    )
  }

  if (!hasSession) {
    return (
      <div className={css.root} data-testid="scm-panel">
        <button type="button" className={css.back} onClick={showAgentView}>{t('action.back')}</button>
        <p className={css.empty}>{t('empty.noSession')}</p>
      </div>
    )
  }
  if (cwd === undefined) {
    return (
      <div className={css.root} data-testid="scm-panel">
        <button type="button" className={css.back} onClick={showAgentView}>{t('action.back')}</button>
        <p className={css.empty}>{t('empty.noWorkspace')}</p>
      </div>
    )
  }
  if (failure !== undefined) {
    return (
      <div className={css.root} data-testid="scm-panel">
        <button type="button" className={css.back} onClick={showAgentView}>{t('action.back')}</button>
        <p className={css.empty}>{failure}</p>
      </div>
    )
  }
  if (snapshot === undefined) {
    return (
      <div className={css.root} data-testid="scm-panel">
        <button type="button" className={css.back} onClick={showAgentView}>{t('action.back')}</button>
        <p className={css.empty}>{t('diff.loading')}</p>
      </div>
    )
  }

  const canCommit = snapshot.staged.length > 0 && !busy

  return (
    <div className={css.root} data-testid="scm-panel">
      <div className={css.header}>
        <button type="button" className={css.back} onClick={showAgentView}>{t('action.back')}</button>
        <IconBranchOutline16 />
        <span className={css.branch} aria-label={t('branch.aria')}>{snapshot.branch}</span>
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
              onSelect={(path) => { openScmDetails({ path, staged: false }) }}
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
              onSelect={(path) => { openScmDetails({ path, staged: true }) }}
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
                setCommitHint(undefined)
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
