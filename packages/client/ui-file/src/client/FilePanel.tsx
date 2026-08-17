import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { FsDirEntryView, IApiClient } from '@deepseek-ai/dsh-api-remotes/client'
import { IconFolderClose16, IconFolderOpen16, IconSearchOutline16, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import type { FileSelection } from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { fsFailureCopy } from './fs-error.ts'
import { NS } from './locales.ts'
import { matchWorkspaceFiles, scanWorkspaceFiles, type FileIndex } from './file-search.ts'
import css from './FilePanel.module.css'

/** Injected fs.listDir and layout writes for the File tree. */
export interface FilePanelInjected {
  /** Privileged fs.listDir. */
  listDir: IApiClient['fs']['listDir']
  /** Open the details column on one workspace file. */
  openFileDetails: (selection: FileSelection) => void
  /** Return the right column to the workspace home. */
  showHome: () => void
  /** Close the details column. */
  closeDetails: () => void
}

/** Full props for the File tree. */
export type FilePanelProps =
  PropsRuntime<'details.files'> & PropsLocale<typeof NS> & FilePanelInjected

/**
 * Right-column File tree rooted at the session workspace.
 * @param props - session share, locale, and fs RPC inject.
 * @returns the File list.
 */
export function FilePanel({
  sessionId,
  useSessions,
  listDir,
  openFileDetails,
  showHome,
  closeDetails,
  recentFiles,
  quickFileRequest,
  t,
}: FilePanelProps) {
  const cwd = useSessions(list => list.byId[sessionId]?.cwd)
  const hasSession = useSessions(list => list.byId[sessionId] !== undefined)
  const [listings, setListings] = useState<Record<string, FsDirEntryView[]>>({})
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(['']))
  const [failure, setFailure] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [fileIndex, setFileIndex] = useState<FileIndex | undefined>(undefined)
  const [scanning, setScanning] = useState(false)
  const [scanFailure, setScanFailure] = useState<string | undefined>(undefined)
  const searchBox = useRef<HTMLDivElement>(null)

  const load = useCallback(async (workspace: string, path: string, signal?: AbortSignal) => {
    const response = await listDir({ cwd: workspace, ...path === '' ? {} : { path } }, signal)
    if (signal?.aborted) return
    const result = response.result
    if (result.ok) {
      setListings(current => ({ ...current, [path]: result.value.entries }))
      setFailure(undefined)
      return
    }
    if (result.error.code === 'cancelled') return
    if (path === '') {
      setListings({})
      setFailure(fsFailureCopy(result.error.code, t))
      return
    }
    setFailure(fsFailureCopy(result.error.code, t))
  }, [listDir, t])

  useEffect(() => {
    const controller = new AbortController()
    setListings({})
    setExpanded(new Set(['']))
    setFailure(undefined)
    setQuery('')
    setFileIndex(undefined)
    setScanFailure(undefined)
    if (cwd === undefined) {
      setLoading(false)
      return () => { controller.abort() }
    }
    const workspace = cwd
    setLoading(true)
    void load(workspace, '', controller.signal)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setFailure(error instanceof Error ? error.message : t('error.failed'))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => { controller.abort() }
  }, [cwd, load, t])

  useEffect(() => {
    if (cwd === undefined || (query.trim() === '' && quickFileRequest === 0) || fileIndex !== undefined) return
    const controller = new AbortController()
    setScanning(true)
    void scanWorkspaceFiles(listDir, cwd, controller.signal)
      .then(setFileIndex)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setScanFailure(error instanceof Error ? error.message : t('error.failed'))
      })
      .finally(() => { if (!controller.signal.aborted) setScanning(false) })
    return () => { controller.abort() }
  }, [cwd, fileIndex, listDir, query, quickFileRequest, t])

  useEffect(() => {
    if (quickFileRequest === 0) return
    searchBox.current?.querySelector('input')?.focus()
  }, [quickFileRequest])

  const matches = useMemo(
    () => matchWorkspaceFiles(fileIndex?.paths ?? [], query),
    [fileIndex, query],
  )

  const toggle = useCallback((path: string) => {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(path)) {
        next.delete(path)
        return next
      }
      next.add(path)
      return next
    })
    if (listings[path] === undefined && cwd !== undefined) {
      void load(cwd, path).catch((error: unknown) => {
        setFailure(error instanceof Error ? error.message : t('error.failed'))
      })
    }
  }, [cwd, listings, load, t])

  const chrome = (
    <FileChrome showHome={showHome} closeDetails={closeDetails} t={t}>
      <span className={css.title}>{t('title')}</span>
    </FileChrome>
  )

  if (!hasSession) {
    return (
      <div className={css.root} data-testid="file-panel">
        {chrome}
        <p className={css.empty}>{t('empty.noSession')}</p>
      </div>
    )
  }
  if (cwd === undefined) {
    return (
      <div className={css.root} data-testid="file-panel">
        {chrome}
        <p className={css.empty}>{t('empty.noWorkspace')}</p>
      </div>
    )
  }
  if (failure !== undefined && listings[''] === undefined) {
    return (
      <div className={css.root} data-testid="file-panel">
        {chrome}
        <p className={css.empty}>{failure}</p>
      </div>
    )
  }
  if (loading && listings[''] === undefined) {
    return (
      <div className={css.root} data-testid="file-panel">
        {chrome}
        <p className={css.empty}>{t('loading')}</p>
      </div>
    )
  }
  const roots = listings[''] ?? []
  return (
    <div className={css.root} data-testid="file-panel">
      {chrome}
      {failure !== undefined ? <p className={css.empty}>{failure}</p> : null}
      <div ref={searchBox} className={css.search}>
        <Input
          icon={<IconSearchOutline16 size={14} />}
          value={query}
          onChange={(event) => { setQuery(event.target.value) }}
          placeholder={t('search.placeholder')}
          aria-label={t('search.aria')}
          spellCheck={false}
        />
        <kbd>Ctrl P</kbd>
      </div>
      {query.trim() !== '' ? (
        <div className={css.searchResults} role="listbox" aria-label={t('search.results')}>
          {scanning ? <p className={css.empty}>{t('search.scanning')}</p> : null}
          {scanFailure === undefined ? null : <p className={css.empty}>{scanFailure}</p>}
          {!scanning && scanFailure === undefined && matches.length === 0 ? <p className={css.empty}>{t('search.empty')}</p> : null}
          {matches.map(path => (
            <button type="button" key={path} role="option" onClick={() => { openFileDetails({ path }) }}>
              <strong>{path.slice(path.lastIndexOf('/') + 1)}</strong>
              <span>{path}</span>
            </button>
          ))}
          {fileIndex?.truncated === true ? <p className={css.limit}>{t('search.truncated')}</p> : null}
        </div>
      ) : roots.length === 0
        ? <p className={css.empty}>{t('empty.directory')}</p>
        : (
          <div className={css.treeScroll}>
            {recentFiles.length === 0 ? null : (
              <section className={css.recent}>
                <h2>{t('recent.title')}</h2>
                {recentFiles.map(path => (
                  <button type="button" key={path} onClick={() => { openFileDetails({ path }) }} title={path}>{path}</button>
                ))}
              </section>
            )}
            <div className={css.tree} role="tree" aria-label={t('title')}>
              {sortEntries(roots).map(entry => (
                <TreeRow
                  key={entry.path}
                  entry={entry}
                  depth={0}
                  expanded={expanded}
                  listings={listings}
                  onToggle={toggle}
                  onOpen={openFileDetails}
                  t={t}
                />
              ))}
            </div>
          </div>
        )}
    </div>
  )
}

/** Header chrome: back to home, title, and close. */
function FileChrome({
  showHome,
  closeDetails,
  t,
  children,
}: {
  showHome: () => void
  closeDetails: () => void
  t: FilePanelProps['t']
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

/** One tree row and, when expanded, its loaded children. */
function TreeRow({
  entry, depth, expanded, listings, onToggle, onOpen, t,
}: {
  entry: FsDirEntryView
  depth: number
  expanded: ReadonlySet<string>
  listings: Record<string, FsDirEntryView[]>
  onToggle: (path: string) => void
  onOpen: (selection: FileSelection) => void
  t: FilePanelProps['t']
}): ReactNode {
  const isDir = entry.type === 'directory'
  const open = isDir && expanded.has(entry.path)
  const children = open ? listings[entry.path] : undefined
  return (
    <>
      <div className={css.row} role="treeitem" aria-expanded={isDir ? open : undefined} style={{ paddingLeft: 8 + depth * 12 }}>
        {isDir
          ? (
            <button
              type="button"
              className={css.twist}
              aria-label={open ? t('action.collapse') : t('action.expand')}
              onClick={() => { onToggle(entry.path) }}
            >
              {open ? <IconFolderOpen16 size={14} /> : <IconFolderClose16 size={14} />}
            </button>
          )
          : <span className={css.twist} aria-hidden />}
        <button
          type="button"
          className={css.name}
          disabled={entry.type === 'other'}
          onClick={() => {
            if (isDir) onToggle(entry.path)
            else onOpen({ path: entry.path })
          }}
        >
          {entry.name}
        </button>
      </div>
      {children === undefined
        ? null
        : sortEntries(children).map(child => (
          <TreeRow
            key={child.path}
            entry={child}
            depth={depth + 1}
            expanded={expanded}
            listings={listings}
            onToggle={onToggle}
            onOpen={onOpen}
            t={t}
          />
        ))}
    </>
  )
}

/**
 * Directories first, then files, then other, keeping the backend name order
 * inside each group.
 * @param entries - one listing.
 * @returns a new array.
 */
function sortEntries(entries: FsDirEntryView[]): FsDirEntryView[] {
  const rank = { directory: 0, file: 1, other: 2 }
  return [...entries].sort((a, b) => rank[a.type] - rank[b.type])
}
