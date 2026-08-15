import { useEffect, useState } from 'react'
import type { GitFileDiff, IApiClient } from '@deepseek-ai/dsh-api-remotes/client'
import { DiffBlock } from '@deepseek-ai/dsh-client-ui-primitives'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { gitFailureCopy } from './git-error.ts'
import { NS } from './locales.ts'
import css from './ScmDiff.module.css'

/** Injected git.diff for the SCM details occupant. */
export interface ScmDiffInjected {
  /** Privileged git.diff. */
  diff: IApiClient['git']['diff']
}

/** Full props for the SCM details diff. */
export type ScmDiffProps =
  PropsRuntime<'details.scm'> & PropsLocale<typeof NS> & ScmDiffInjected

/**
 * Read-only SCM file diff in the details column.
 * @param props - session hooks, owner selection, locale, and git.diff inject.
 * @returns the details body.
 */
export function ScmDiff({ sessionId, selection, useSessions, diff, t }: ScmDiffProps) {
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

  if (selection === null) {
    return <div className={css.root} data-testid="scm-diff"><p className={css.empty}>{t('diff.empty')}</p></div>
  }
  if (failure !== undefined) {
    return <div className={css.root} data-testid="scm-diff"><p className={css.error}>{failure}</p></div>
  }
  if (loading || file === undefined) {
    return <div className={css.root} data-testid="scm-diff"><p className={css.loading}>{t('diff.loading')}</p></div>
  }
  return (
    <div className={css.root} data-testid="scm-diff">
      <DiffBlock diffs={[{ path: file.path, oldText: file.oldText, newText: file.newText }]} />
    </div>
  )
}
