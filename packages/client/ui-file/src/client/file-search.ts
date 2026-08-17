/** Bounded recursive filename index for the File pane's quick-open view. */
import type { IApiClient } from '@deepseek-ai/dsh-api-remotes/client'

/** Maximum indexed files before quick open asks the user to refine the query. */
export const QUICK_OPEN_FILE_LIMIT = 5000

const IGNORED_DIRECTORIES = new Set(['.git', 'node_modules'])
const DEFAULT_MATCH_LIMIT = 100

/** Result of one recursive workspace scan. */
export interface FileIndex {
  paths: string[]
  truncated: boolean
}

/**
 * Build a bounded workspace-relative filename index.
 * @param listDir - privileged directory-listing RPC.
 * @param cwd - absolute workspace root.
 * @param signal - cancellation signal for the recursive scan.
 * @returns indexed workspace-relative paths and whether the limit was reached.
 */
export async function scanWorkspaceFiles(
  listDir: IApiClient['fs']['listDir'],
  cwd: string,
  signal: AbortSignal,
): Promise<FileIndex> {
  const paths: string[] = []
  const pending = ['']
  while (pending.length > 0) {
    if (signal.aborted) throw signal.reason instanceof Error ? signal.reason : new Error('File scan cancelled')
    const path = pending.shift()
    if (path === undefined) break
    const response = await listDir({ cwd, ...(path === '' ? {} : { path }) }, signal)
    if (!response.result.ok) throw new Error(`${response.result.error.code}: ${response.result.error.message}`)
    for (const entry of response.result.value.entries) {
      if (entry.type === 'directory' && !IGNORED_DIRECTORIES.has(entry.name)) pending.push(entry.path)
      else if (entry.type === 'file') paths.push(entry.path)
      if (paths.length >= QUICK_OPEN_FILE_LIMIT) return { paths, truncated: true }
    }
  }
  return { paths, truncated: false }
}

function scorePath(path: string, query: string): number | undefined {
  const lower = path.toLocaleLowerCase()
  const base = lower.slice(lower.lastIndexOf('/') + 1)
  if (base.startsWith(query)) return 0
  if (base.includes(query)) return 1
  if (lower.includes(query)) return 2
  let cursor = 0
  for (const char of lower) {
    if (char === query[cursor]) cursor++
    if (cursor === query.length) return 3
  }
  return undefined
}

/**
 * Rank filename matches by basename and path relevance.
 * @param paths - workspace-relative file index.
 * @param query - case-insensitive fuzzy query.
 * @param limit - maximum returned matches.
 * @returns ranked workspace-relative paths.
 */
export function matchWorkspaceFiles(paths: readonly string[], query: string, limit = DEFAULT_MATCH_LIMIT): string[] {
  const normalized = query.trim().toLocaleLowerCase()
  if (normalized === '') return []
  return paths
    .map(path => ({ path, score: scorePath(path, normalized) }))
    .filter((row): row is { path: string; score: number } => row.score !== undefined)
    .sort((a, b) => a.score - b.score || a.path.localeCompare(b.path))
    .slice(0, limit)
    .map(row => row.path)
}
