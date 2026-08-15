/**
 * Local backend of the Git seam: registers `ctx.git` and runs the host `git`
 * binary against a workspace root through `simple-git`. Missing binaries and
 * non-repositories fail loud with {@link GitError}.
 * @module @deepseek-ai/dsh-git-local
 */

import { readFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import {
  Git, GitError,
  type GitBranchInfo, type GitChange, type GitCommitResult, type GitFileDiff, type GitStatus,
} from '@deepseek-ai/dsh-git'
import { CheckRepoActions, simpleGit, type SimpleGit } from 'simple-git'

/** Plugin config: which `git` binary to spawn. */
export interface Config {
  /** Git executable name or absolute path. */
  binary: string
  /** Byte cap for each side of a file diff (complete result). */
  maxDiffBytes: number
}

export const Config: z<Config> = z.object({
  binary: z.string().default('git'),
  maxDiffBytes: z.number().min(1024).default(1_048_576),
})

/** The `ctx.git` local implementation. */
export default class LocalGit extends Git {
  static Config = Config

  /**
   * @param ctx - plugin context.
   * @param config - validated {@link Config}.
   */
  constructor(ctx: Context, private readonly config: Config) {
    super(ctx)
  }

  /**
   * Read staged and unstaged changes at a workspace root.
   * @param cwd - absolute workspace root.
   * @param signal - caller lifetime; abort rejects with the abort reason.
   * @returns the status lists and current branch.
   */
  async status(cwd: string, signal?: AbortSignal): Promise<GitStatus> {
    this.#throwIfAborted(signal)
    const git = await this.#repo(cwd)
    try {
      const result = await git.status()
      this.#throwIfAborted(signal)
      const staged: GitChange[] = []
      const unstaged: GitChange[] = []
      for (const file of result.files) {
        if (file.index !== ' ' && file.index !== '?') {
          staged.push(changeOf(file.path, file.index, file.from))
        }
        if (file.working_dir !== ' ') {
          unstaged.push(changeOf(file.path, file.working_dir, file.from))
        }
      }
      return {
        /* v8 ignore next -- simple-git reports a name or 'HEAD'; a null current is not observed */
        branch: result.current ?? 'HEAD',
        ahead: result.ahead,
        behind: result.behind,
        staged,
        unstaged,
      }
    } catch (error: unknown) {
      throw mapGitError(error, cwd)
    }
  }

  /**
   * Read both sides of one path for a read-only diff.
   * @param cwd - absolute workspace root.
   * @param path - workspace-relative path.
   * @param staged - true reads index vs HEAD; false reads worktree vs index.
   * @param signal - caller lifetime; abort rejects with the abort reason.
   * @returns old and new text for the SCM details panel.
   */
  async diff(cwd: string, path: string, staged: boolean, signal?: AbortSignal): Promise<GitFileDiff> {
    this.#throwIfAborted(signal)
    const git = await this.#repo(cwd)
    try {
      const oldText = staged
        ? await tryShow(git, `HEAD:${path}`)
        : await tryShow(git, `:${path}`) ?? await tryShow(git, `HEAD:${path}`)
      this.#throwIfAborted(signal)
      const newText = staged
        ? await tryShow(git, `:${path}`) ?? ''
        : await readWorktree(join(cwd, path), this.config.maxDiffBytes)
      return {
        path,
        oldText: boundText(oldText, this.config.maxDiffBytes),
        newText: boundRequiredText(newText, this.config.maxDiffBytes),
      }
    } catch (error: unknown) {
      throw mapGitError(error, cwd)
    }
  }

  /**
   * Stage paths into the index.
   * @param cwd - absolute workspace root.
   * @param paths - workspace-relative paths; empty is a no-op.
   */
  async stage(cwd: string, paths: readonly string[]): Promise<void> {
    if (paths.length === 0) return
    const git = await this.#repo(cwd)
    try {
      await git.add([...paths])
    } catch (error: unknown) {
      throw mapGitError(error, cwd)
    }
  }

  /**
   * Unstage paths from the index (keep the worktree).
   * @param cwd - absolute workspace root.
   * @param paths - workspace-relative paths; empty is a no-op.
   */
  async unstage(cwd: string, paths: readonly string[]): Promise<void> {
    if (paths.length === 0) return
    const git = await this.#repo(cwd)
    try {
      await git.reset(['HEAD', '--', ...paths])
    } catch (error: unknown) {
      throw mapGitError(error, cwd)
    }
  }

  /**
   * Create a commit from the current index.
   * @param cwd - absolute workspace root.
   * @param message - non-blank commit message.
   * @returns the new commit object name.
   */
  async commit(cwd: string, message: string): Promise<GitCommitResult> {
    if (message.trim() === '') {
      throw new GitError('empty-message', cwd, 'commit message must not be empty')
    }
    const git = await this.#repo(cwd)
    try {
      const result = await git.commit(message)
      if (result.commit === '') {
        throw new GitError('git-failed', cwd, `git commit produced no object in ${cwd}`)
      }
      return { commit: result.commit }
    } catch (error: unknown) {
      throw mapGitError(error, cwd)
    }
  }

  /**
   * Read the current branch name.
   * @param cwd - absolute workspace root.
   * @returns the branch name, or `HEAD` when detached.
   */
  async branch(cwd: string): Promise<GitBranchInfo> {
    const git = await this.#repo(cwd)
    try {
      const name = (await git.revparse(['--abbrev-ref', 'HEAD'])).trim()
      return { name }
    } catch (error: unknown) {
      /* v8 ignore start -- rev-parse fails only after checkIsRepo already passed */
      throw mapGitError(error, cwd)
      /* v8 ignore stop */
    }
  }

  async #repo(cwd: string): Promise<SimpleGit> {
    if (!isAbsolute(cwd)) {
      throw new GitError('git-failed', cwd, `git cwd must be an absolute path: ${cwd}`)
    }
    const git = simpleGit({ baseDir: cwd, binary: this.config.binary, maxConcurrentProcesses: 1 })
    let isRepo: boolean
    try {
      isRepo = await git.checkIsRepo(CheckRepoActions.IN_TREE)
    } catch (error: unknown) {
      throw mapGitError(error, cwd)
    }
    if (!isRepo) {
      throw new GitError('not-a-repository', cwd, `${cwd} is not a git repository`)
    }
    return git
  }

  #throwIfAborted(signal: AbortSignal | undefined): void {
    if (signal?.aborted) {
      throw signal.reason instanceof Error ? signal.reason : new Error('aborted')
    }
  }
}

/**
 * Map a porcelain letter and optional rename source onto {@link GitChange}.
 * @param path - current path.
 * @param status - porcelain letter.
 * @param from - prior path when renamed.
 * @returns the change row.
 */
function changeOf(path: string, status: string, from?: string): GitChange {
  return from === undefined ? { path, status } : { path, status, originalPath: from }
}

/**
 * Read a git object, or null when it does not exist.
 * @param git - simple-git client rooted at the workspace.
 * @param spec - `HEAD:path` or `:path`.
 * @returns the object text, or null when git has no such object.
 */
async function tryShow(git: SimpleGit, spec: string): Promise<string | null> {
  try {
    return await git.show([spec])
  } catch {
    // Missing blob (new / untracked / deleted-from-index) is the only
    // failure this helper exists to swallow; callers map other git errors.
    return null
  }
}

/**
 * Read a worktree file as UTF-8 text, or empty when it is gone.
 * @param abs - absolute worktree path.
 * @param maxBytes - complete-result byte cap.
 * @returns file text, or `''` when the path is missing.
 */
async function readWorktree(abs: string, maxBytes: number): Promise<string> {
  try {
    const text = await readFile(abs, 'utf8')
    return boundRequiredText(text, maxBytes)
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return ''
    throw error
  }
}

/**
 * Cap one diff side so the complete result stays inside the configured bound.
 * @param text - side text, or null when the side is absent.
 * @param maxBytes - complete-result byte cap.
 * @returns the (possibly sliced) text, or null when the side is absent.
 */
function boundText(text: string | null, maxBytes: number): string | null {
  if (text === null) return null
  return boundRequiredText(text, maxBytes)
}

/**
 * Cap a present diff side so the complete result stays inside the configured bound.
 * @param text - side text that is known to exist.
 * @param maxBytes - complete-result byte cap.
 * @returns the (possibly sliced) text.
 */
function boundRequiredText(text: string, maxBytes: number): string {
  if (Buffer.byteLength(text, 'utf8') <= maxBytes) return text
  return Buffer.from(text, 'utf8').subarray(0, maxBytes).toString('utf8')
}

/**
 * Map a spawn or porcelain failure onto {@link GitError}.
 * @param error - thrown value from simple-git or Node.
 * @param cwd - workspace root the call targeted.
 * @returns a typed GitError (rethrows an existing one).
 */
function mapGitError(error: unknown, cwd: string): GitError {
  if (error instanceof GitError) return error
  /* v8 ignore start -- simple-git and Node fs reject with Error */
  if (!(error instanceof Error)) {
    return new GitError('git-failed', cwd, String(error))
  }
  /* v8 ignore stop */
  const message = error.message
  const code = (error as NodeJS.ErrnoException).code
  if (code === 'ENOENT' || /not recognized|not found|ENOENT/i.test(message)) {
    return new GitError('git-not-found', cwd, `git executable not found while operating on ${cwd}`)
  }
  /* v8 ignore start -- simple-git reports a missing repo as checkIsRepo false, not a thrown message after IN_TREE */
  if (/not a git repository/i.test(message)) {
    return new GitError('not-a-repository', cwd, `${cwd} is not a git repository`)
  }
  /* v8 ignore stop */
  return new GitError('git-failed', cwd, message)
}
