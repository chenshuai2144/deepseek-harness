/**
 * Service Definition for the `ctx.git` capability seam: workspace-root Git
 * operations the GUI SCM panel drives. The first-period closed set is
 * status / diff / stage / unstage / commit / branch. Merge, rebase, push,
 * pull, and remote authentication are out of scope. The model keeps using
 * `bash` for Git; this seam is not a model-facing tool.
 * @module @deepseek-ai/dsh-git
 */

import { Context, Service } from '@deepseek-ai/cordis'

/** Closed failure vocabulary of the Git primitives (mirrored onto the wire by consumers). */
export type GitErrorCode = 'not-a-repository' | 'git-not-found' | 'empty-message' | 'git-failed'

/** Typed failure thrown by Git primitives so consumers can map business codes without string matching. */
export class GitError extends Error {
  /**
   * @param code - closed business code of the failure.
   * @param cwd - the workspace root the failure is about.
   * @param message - operator-facing description.
   */
  constructor(readonly code: GitErrorCode, readonly cwd: string, message: string) {
    super(message)
    this.name = 'GitError'
  }
}

/** One changed path in a status list. */
export interface GitChange {
  /** Path relative to the workspace root. */
  path: string
  /** Porcelain status letter (`M`, `A`, `D`, `R`, `C`, `U`, `?`, `!`, `T`). */
  status: string
  /** Prior path when `status` is a rename. */
  originalPath?: string
}

/** `status` result for one workspace root that is a Git repository. */
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

/** Both sides of one file for the SCM details diff. */
export interface GitFileDiff {
  /** Path relative to the workspace root. */
  path: string
  /** Prior content, or `null` when the file is new / untracked. */
  oldText: string | null
  /** Current content, or `''` when the file is deleted. */
  newText: string
}

/** `commit` result. */
export interface GitCommitResult {
  /** The new commit object name (short or full, as the provider reports). */
  commit: string
}

/** `branch` result. */
export interface GitBranchInfo {
  /** Current branch name, or `HEAD` when detached. */
  name: string
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    git: Git
  }
}

/**
 * Abstract workspace Git service. Subclass, implement the abstract methods,
 * and load the subclass as a plugin — it registers as `ctx.git` (one
 * implementation per context; loading a second throws, cordis' standard
 * duplicate-service behavior).
 */
export abstract class Git extends Service {
  constructor(ctx: Context) {
    super(ctx, 'git')
  }

  /**
   * Read staged and unstaged changes at a workspace root.
   * @param cwd - absolute workspace root.
   * @param signal - caller lifetime; abort rejects with the abort reason.
   * @returns the status lists and current branch.
   * @throws {GitError} `not-a-repository` / `git-not-found` / `git-failed`.
   */
  abstract status(cwd: string, signal?: AbortSignal): Promise<GitStatus>

  /**
   * Read both sides of one path for a read-only diff.
   * @param cwd - absolute workspace root.
   * @param path - workspace-relative path.
   * @param staged - true reads index vs HEAD; false reads worktree vs index.
   * @param signal - caller lifetime; abort rejects with the abort reason.
   * @returns old and new text for {@link GitFileDiff}.
   * @throws {GitError} `not-a-repository` / `git-not-found` / `git-failed`.
   */
  abstract diff(cwd: string, path: string, staged: boolean, signal?: AbortSignal): Promise<GitFileDiff>

  /**
   * Stage paths into the index.
   * @param cwd - absolute workspace root.
   * @param paths - workspace-relative paths; empty is a no-op.
   * @throws {GitError} `not-a-repository` / `git-not-found` / `git-failed`.
   */
  abstract stage(cwd: string, paths: readonly string[]): Promise<void>

  /**
   * Unstage paths from the index (keep the worktree).
   * @param cwd - absolute workspace root.
   * @param paths - workspace-relative paths; empty is a no-op.
   * @throws {GitError} `not-a-repository` / `git-not-found` / `git-failed`.
   */
  abstract unstage(cwd: string, paths: readonly string[]): Promise<void>

  /**
   * Create a commit from the current index.
   * @param cwd - absolute workspace root.
   * @param message - non-blank commit message.
   * @returns the new commit object name.
   * @throws {GitError} `empty-message` / `not-a-repository` / `git-not-found` / `git-failed`.
   */
  abstract commit(cwd: string, message: string): Promise<GitCommitResult>

  /**
   * Read the current branch name.
   * @param cwd - absolute workspace root.
   * @returns the branch name, or `HEAD` when detached.
   * @throws {GitError} `not-a-repository` / `git-not-found` / `git-failed`.
   */
  abstract branch(cwd: string): Promise<GitBranchInfo>
}

export default Git
