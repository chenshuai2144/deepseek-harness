import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import LocalGit from '@deepseek-ai/dsh-git-local'
import * as invariant from '@deepseek-ai/dsh-git-local/invariant'
import { simpleGit } from 'simple-git'

const dirs: string[] = []

afterEach(async () => {
  await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })))
})

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-git-'))
  dirs.push(dir)
  return dir
}

async function repo(): Promise<string> {
  const dir = await tempDir()
  const git = simpleGit(dir)
  await git.init()
  await git.addConfig('user.name', 'dsh-test')
  await git.addConfig('user.email', 'dsh-test@example.com')
  await writeFile(join(dir, 'tracked.txt'), 'hello\n')
  await git.add('tracked.txt')
  await git.commit('init')
  return dir
}

function service(): LocalGit {
  return new LocalGit(new Context(), { binary: 'git', maxDiffBytes: 1_048_576 })
}

describe('LocalGit', () => {
  it('reports not-a-repository for a plain directory', async () => {
    const dir = await tempDir()
    await expect(service().status(dir)).rejects.toMatchObject({ code: 'not-a-repository', cwd: dir })
  })

  it('rejects a relative cwd', async () => {
    await expect(service().status('relative')).rejects.toMatchObject({ code: 'git-failed' })
  })

  it('maps a missing binary to git-not-found', async () => {
    const dir = await repo()
    const git = new LocalGit(new Context(), { binary: join(dir, 'no-such-git'), maxDiffBytes: 1024 })
    await expect(git.status(dir)).rejects.toMatchObject({ code: 'git-not-found', cwd: dir })
  })

  it('lists unstaged and staged changes and the current branch', async () => {
    const dir = await repo()
    await writeFile(join(dir, 'tracked.txt'), 'hello world\n')
    await writeFile(join(dir, 'new.txt'), 'fresh\n')
    const status = await service().status(dir)
    expect(status.branch.length).toBeGreaterThan(0)
    expect(status.unstaged.map(row => row.path).sort()).toEqual(['new.txt', 'tracked.txt'])
    expect(status.staged).toEqual([])
    await service().stage(dir, ['tracked.txt', 'new.txt'])
    const staged = await service().status(dir)
    expect(staged.staged.map(row => row.path).sort()).toEqual(['new.txt', 'tracked.txt'])
    expect(staged.unstaged).toEqual([])
  })

  it('stage and unstage of an empty path list are no-ops', async () => {
    const dir = await repo()
    await service().stage(dir, [])
    await service().unstage(dir, [])
    const status = await service().status(dir)
    expect(status.staged).toEqual([])
    expect(status.unstaged).toEqual([])
  })

  it('unstages a path and keeps the worktree edit', async () => {
    const dir = await repo()
    await writeFile(join(dir, 'tracked.txt'), 'edited\n')
    await service().stage(dir, ['tracked.txt'])
    await service().unstage(dir, ['tracked.txt'])
    const status = await service().status(dir)
    expect(status.staged).toEqual([])
    expect(status.unstaged).toEqual([{ path: 'tracked.txt', status: 'M' }])
  })

  it('rejects an empty commit message and commits a staged change', async () => {
    const dir = await repo()
    await expect(service().commit(dir, '   ')).rejects.toMatchObject({ code: 'empty-message', cwd: dir })
    await writeFile(join(dir, 'tracked.txt'), 'committed\n')
    await service().stage(dir, ['tracked.txt'])
    const result = await service().commit(dir, 'second')
    expect(result.commit.length).toBeGreaterThan(0)
    const status = await service().status(dir)
    expect(status.staged).toEqual([])
    expect(status.unstaged).toEqual([])
  })

  it('reads unstaged and staged diffs, including a new file and a deletion', async () => {
    const dir = await repo()
    await writeFile(join(dir, 'tracked.txt'), 'hello world\n')
    const unstaged = await service().diff(dir, 'tracked.txt', false)
    expect(unstaged).toEqual({ path: 'tracked.txt', oldText: 'hello\n', newText: 'hello world\n' })
    await writeFile(join(dir, 'added.txt'), 'brand\n')
    const added = await service().diff(dir, 'added.txt', false)
    expect(added.oldText).toBeNull()
    expect(added.newText).toBe('brand\n')
    await service().stage(dir, ['tracked.txt'])
    const staged = await service().diff(dir, 'tracked.txt', true)
    expect(staged).toEqual({ path: 'tracked.txt', oldText: 'hello\n', newText: 'hello world\n' })
    await service().unstage(dir, ['tracked.txt'])
    await rm(join(dir, 'tracked.txt'))
    const deleted = await service().diff(dir, 'tracked.txt', false)
    expect(deleted.oldText).toBe('hello\n')
    expect(deleted.newText).toBe('')
  })

  it('maps a porcelain failure to git-failed', async () => {
    const dir = await repo()
    await expect(service().stage(dir, ['missing.txt'])).rejects.toMatchObject({ code: 'git-failed', cwd: dir })
    await expect(service().unstage(dir, [join(dir, '..', 'outside.txt')])).rejects.toMatchObject({ code: 'git-failed', cwd: dir })
    await expect(service().commit(dir, 'nothing staged')).rejects.toMatchObject({ code: 'git-failed', cwd: dir })
  })

  it('honors an aborted diff signal', async () => {
    const dir = await repo()
    const signal = AbortSignal.abort(new Error('stop'))
    await expect(service().diff(dir, 'tracked.txt', false, signal)).rejects.toThrow('stop')
  })

  it('caps an oversized diff side', async () => {
    const dir = await repo()
    const git = new LocalGit(new Context(), { binary: 'git', maxDiffBytes: 1024 })
    await writeFile(join(dir, 'tracked.txt'), 'x'.repeat(4000))
    const diff = await git.diff(dir, 'tracked.txt', false)
    expect(Buffer.byteLength(diff.newText, 'utf8')).toBe(1024)
  })

  it('honors an aborted status signal', async () => {
    const dir = await repo()
    const signal = AbortSignal.abort(new Error('stop'))
    await expect(service().status(dir, signal)).rejects.toThrow('stop')
  })

  it('reports the current branch', async () => {
    const dir = await repo()
    const info = await service().branch(dir)
    expect(info.name.length).toBeGreaterThan(0)
  })

  it('maps a directory worktree read to git-failed', async () => {
    const dir = await repo()
    await expect(service().diff(dir, '.git', false)).rejects.toMatchObject({ code: 'git-failed', cwd: dir })
  })

  it('maps a simple-git not-a-repository message', async () => {
    const dir = await tempDir()
    await writeFile(join(dir, '.git'), 'not-a-dir\n')
    await expect(service().status(dir)).rejects.toMatchObject({ cwd: dir })
  })

  it('reports HEAD when the worktree is detached', async () => {
    const dir = await repo()
    await simpleGit(dir).checkout(['--detach', 'HEAD'])
    const status = await service().status(dir)
    expect(status.branch).toBe('HEAD')
    const info = await service().branch(dir)
    expect(info.name).toBe('HEAD')
  })

  it('includes the prior path on a staged rename', async () => {
    const dir = await repo()
    await simpleGit(dir).mv('tracked.txt', 'renamed.txt')
    const status = await service().status(dir)
    expect(status.staged).toEqual([{ path: 'renamed.txt', status: 'R', originalPath: 'tracked.txt' }])
  })

  it('reads a staged deletion as empty new text', async () => {
    const dir = await repo()
    await simpleGit(dir).rm(['--cached', 'tracked.txt'])
    const diff = await service().diff(dir, 'tracked.txt', true)
    expect(diff.oldText).toBe('hello\n')
    expect(diff.newText).toBe('')
  })

  it('maps a corrupt index after the repo check to git-failed', async () => {
    const dir = await repo()
    await writeFile(join(dir, '.git', 'index'), 'not-an-index')
    await expect(service().status(dir)).rejects.toMatchObject({ code: 'git-failed', cwd: dir })
  })

  it('honors an aborted signal whose reason is not an Error', async () => {
    const dir = await repo()
    const signal = AbortSignal.abort('stop')
    await expect(service().status(dir, signal)).rejects.toThrow('aborted')
  })

  it('maps a gitdir pointer whose target is missing', async () => {
    const dir = await tempDir()
    await writeFile(join(dir, '.git'), 'gitdir: /definitely/missing-git-dir\n')
    await expect(service().status(dir)).rejects.toMatchObject({ code: 'not-a-repository', cwd: dir })
  })

})

describe('invariant companion', () => {
  it('registers under the package name', async () => {
    const register = vi.fn().mockReturnValue(() => {})
    const dispose = await invariant.apply({ invariants: { register } } as never)
    expect(register).toHaveBeenCalledWith('@deepseek-ai/dsh-git-local', expect.any(Function))
    expect(() => { (register.mock.calls[0]![1] as () => void)() }).not.toThrow()
    expect(dispose).toBeTypeOf('function')
  })
})
