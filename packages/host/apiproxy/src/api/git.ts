/**
 * git domain contract. Privileged loopback-only methods that drive the
 * workspace Git seam for the SCM panel. The client submits the session
 * workspace root as `cwd`; the host never resolves a relative path against
 * process.cwd.
 */

import type { RpcRequest, RpcResponse } from './rpc.ts'

/** One changed path in a status list. */
export interface GitChange {
  /** Path relative to the workspace root. */
  path: string
  /** Porcelain status letter. */
  status: string
  /** Prior path when `status` is a rename. */
  originalPath?: string
}

/** git.status response value. */
export interface GitStatus {
  /** Current branch name, or `HEAD` when detached. */
  branch: string
  /** Commits ahead of the upstream, or 0 when there is no upstream. */
  ahead: number
  /** Commits behind the upstream, or 0 when there is no upstream. */
  behind: number
  /** Staged changes (index vs HEAD). */
  staged: GitChange[]
  /** Unstaged changes (worktree vs index), including untracked paths. */
  unstaged: GitChange[]
}

/** git.diff response value: both sides of one file. */
export interface GitFileDiff {
  /** Path relative to the workspace root. */
  path: string
  /** Prior content, or `null` when the file is new / untracked. */
  oldText: string | null
  /** Current content, or `''` when the file is deleted. */
  newText: string
}

/** Git-domain unary methods (the map key git.* of RpcMethodMap). */
export interface GitApi {
  /** Read staged and unstaged changes at a workspace root. */
  status(
    request: RpcRequest<{ cwd: string }>,
    signal: AbortSignal,
  ): Promise<RpcResponse<GitStatus>>

  /** Read both sides of one path for a read-only diff. */
  diff(
    request: RpcRequest<{ cwd: string; path: string; staged: boolean }>,
    signal: AbortSignal,
  ): Promise<RpcResponse<GitFileDiff>>

  /** Stage paths into the index. */
  stage(request: RpcRequest<{ cwd: string; paths: string[] }>): Promise<RpcResponse<{ ok: true }>>

  /** Unstage paths from the index. */
  unstage(request: RpcRequest<{ cwd: string; paths: string[] }>): Promise<RpcResponse<{ ok: true }>>

  /** Create a commit from the current index. */
  commit(request: RpcRequest<{ cwd: string; message: string }>): Promise<RpcResponse<{ commit: string }>>

  /** Read the current branch name. */
  branch(request: RpcRequest<{ cwd: string }>): Promise<RpcResponse<{ name: string }>>
}
