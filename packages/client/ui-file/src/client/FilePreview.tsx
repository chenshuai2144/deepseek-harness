import { useEffect, useState } from 'react'
import type { FsFileText, IApiClient } from '@deepseek-ai/dsh-api-remotes/client'
import { CodeBlock, IconCopyOutline16, writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { fsFailureCopy } from './fs-error.ts'
import { languageOf } from './language.ts'
import { NS } from './locales.ts'
import css from './FilePreview.module.css'

/** Injected fs.readText and layout writes for the File preview. */
export interface FilePreviewInjected {
  /** Privileged fs.readText. */
  readText: IApiClient['fs']['readText']
  /** Return the right column to the File tree. */
  showFiles: () => void
  /** Return the right column to the workspace home. */
  showHome: () => void
  /** Close the details column. */
  closeDetails: () => void
}

/** Full props for the File preview. */
export type FilePreviewProps =
  PropsRuntime<'details.file'> & PropsLocale<typeof NS> & FilePreviewInjected

/**
 * Read-only workspace file preview in the details column.
 * @param props - session hooks, owner selection, locale, and fs.readText inject.
 * @returns the preview body.
 */
export function FilePreview({
  sessionId, selection, useSessions, readText, showFiles, showHome, closeDetails, t,
}: FilePreviewProps) {
  const cwd = useSessions(list => list.byId[sessionId]?.cwd)
  const [file, setFile] = useState<FsFileText | undefined>(undefined)
  const [failure, setFailure] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [copiedPath, setCopiedPath] = useState(false)

  useEffect(() => {
    setCopiedPath(false)
    if (cwd === undefined || selection === null) {
      setFile(undefined)
      setFailure(undefined)
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    void readText({ cwd, path: selection.path }, controller.signal)
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
        setFailure(fsFailureCopy(result.error.code, t))
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
  }, [cwd, readText, selection, t])

  const path = selection?.path
  return (
    <div className={css.root} data-testid="file-preview">
      <div className={css.chrome}>
        <button type="button" className={css.back} onClick={showHome}>{t('action.back')}</button>
        <button type="button" className={css.back} onClick={showFiles}>{t('action.backToFiles')}</button>
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
      {path === undefined
        ? <p className={css.empty}>{t('empty.preview')}</p>
        : loading
          ? <p className={css.empty}>{t('preview.loading')}</p>
          : failure !== undefined
            ? <p className={css.empty}>{failure}</p>
            : file === undefined
              ? <p className={css.empty}>{t('empty.preview')}</p>
              : (
                <div className={css.body}>
                  <div className={css.pathBar}>
                    <div className={css.breadcrumb} title={file.path}>
                      {file.path.split('/').map((segment, index, segments) => (
                        <span key={`${segment}:${index}`}>
                          {segment}{index < segments.length - 1 ? <i>/</i> : null}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={css.copyPath}
                      aria-label={copiedPath ? t('copied') : t('copyPath')}
                      onClick={() => {
                        void writeClipboard(file.path).then((copied) => {
                          if (!copied) return
                          setCopiedPath(true)
                          window.setTimeout(() => { setCopiedPath(false) }, 1000)
                        })
                      }}
                    >
                      <IconCopyOutline16 size={14} />
                    </button>
                  </div>
                  {file.truncated ? <p className={css.truncated}>{t('preview.truncated')}</p> : null}
                  <CodeBlock
                    code={file.text}
                    lang={languageOf(file.path)}
                    copyLabel={t('copy')}
                    copiedLabel={t('copied')}
                  />
                </div>
              )}
    </div>
  )
}
