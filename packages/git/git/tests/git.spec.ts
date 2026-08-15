import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import Git, { GitError } from '@deepseek-ai/dsh-git'
import * as invariant from '@deepseek-ai/dsh-git/invariant'

class TestGit extends Git {
  status(): Promise<never> { return Promise.reject(new Error('unused')) }
  diff(): Promise<never> { return Promise.reject(new Error('unused')) }
  stage(): Promise<void> { return Promise.resolve() }
  unstage(): Promise<void> { return Promise.resolve() }
  commit(): Promise<never> { return Promise.reject(new Error('unused')) }
  branch(): Promise<never> { return Promise.reject(new Error('unused')) }
}

describe('GitError', () => {
  it('carries the closed code and cwd', () => {
    const error = new GitError('not-a-repository', '/tmp/ws', '/tmp/ws is not a git repository')
    expect(error.name).toBe('GitError')
    expect(error.code).toBe('not-a-repository')
    expect(error.cwd).toBe('/tmp/ws')
    expect(error.message).toContain('not a git repository')
  })
})

describe('Git service', () => {
  it('registers as ctx.git', () => {
    const ctx = new Context()
    new TestGit(ctx)
    expect(ctx.git).toBeInstanceOf(TestGit)
    expect(ctx.git.name).toBe('git')
  })
})

describe('invariant companion', () => {
  it('registers under the package name', async () => {
    const register = vi.fn().mockReturnValue(() => {})
    const dispose = await invariant.apply({ invariants: { register } } as never)
    expect(register).toHaveBeenCalledWith('@deepseek-ai/dsh-git', expect.any(Function))
    expect(() => { (register.mock.calls[0]![1] as () => void)() }).not.toThrow()
    expect(dispose).toBeTypeOf('function')
  })
})
