/**
 * Privileged git.* RPC: relative cwd refused at the wire, missing ctx.git is
 * git-unavailable, GitError codes map onto the wire vocabulary, and abort
 * on status/diff is cancelled.
 */

import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import SessionStore from '@deepseek-ai/dsh-session'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import { GitError } from '@deepseek-ai/dsh-git'
import type { Git } from '@deepseek-ai/dsh-git'
import type { RpcRequest, RpcResponse } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import { RpcId } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import { createApiProxy } from '@deepseek-ai/dsh-host-apiproxy'

const CWD = process.cwd()

let nextRpc = 1
function request<P>(payload: P): RpcRequest<P> {
  return { rpcId: RpcId(`git-${String(nextRpc++)}`), payload }
}

function expectOk<T>(response: RpcResponse<T>): T {
  expect(response.result.ok).toBe(true)
  if (!response.result.ok) throw new Error('unreachable')
  return response.result.value
}

function expectErr<T>(response: RpcResponse<T>): { code: string; message: string; details: unknown } {
  expect(response.result.ok).toBe(false)
  if (response.result.ok) throw new Error('unreachable')
  return response.result.error
}

async function harness(git?: Partial<Git>): Promise<ReturnType<typeof createApiProxy>> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(UserQuestionService)
  await ctx.plugin(AgentRegistry)
  if (git !== undefined) ctx.provide('git', git as Git)
  return createApiProxy(ctx, { defaultModelSelection: () => ({ provider: 'p', model: 'm' }), cwd: CWD })
}

const CLEAN = { branch: 'main', ahead: 0, behind: 0, staged: [], unstaged: [] }

describe('git.* RPC', () => {
  it('refuses a relative cwd before touching ctx.git', async () => {
    const api = await harness()
    expect(expectErr(await api.git.status(request({ cwd: 'relative' }), new AbortController().signal)))
      .toMatchObject({ code: 'git-failed', details: { cwd: 'relative' } })
  })

  it('reports git-unavailable when the seam is not composed', async () => {
    const api = await harness()
    const signal = new AbortController().signal
    expect(expectErr(await api.git.status(request({ cwd: CWD }), signal)).code).toBe('git-unavailable')
    expect(expectErr(await api.git.diff(request({ cwd: CWD, path: 'a.ts', staged: false }), signal)).code)
      .toBe('git-unavailable')
    expect(expectErr(await api.git.stage(request({ cwd: CWD, paths: ['a.ts'] }))).code).toBe('git-unavailable')
    expect(expectErr(await api.git.unstage(request({ cwd: CWD, paths: ['a.ts'] }))).code).toBe('git-unavailable')
    expect(expectErr(await api.git.commit(request({ cwd: CWD, message: 'x' }))).code).toBe('git-unavailable')
    expect(expectErr(await api.git.branch(request({ cwd: CWD }))).code).toBe('git-unavailable')
  })

  it('forwards successful primitives', async () => {
    const git = {
      status: vi.fn(async () => CLEAN),
      diff: vi.fn(async () => ({ path: 'a.ts', oldText: 'old', newText: 'new' })),
      stage: vi.fn(async () => {}),
      unstage: vi.fn(async () => {}),
      commit: vi.fn(async () => ({ commit: 'abc' })),
      branch: vi.fn(async () => ({ name: 'main' })),
    }
    const api = await harness(git)
    const signal = new AbortController().signal
    expect(expectOk(await api.git.status(request({ cwd: CWD }), signal))).toEqual(CLEAN)
    expect(expectOk(await api.git.diff(request({ cwd: CWD, path: 'a.ts', staged: true }), signal)))
      .toEqual({ path: 'a.ts', oldText: 'old', newText: 'new' })
    expect(expectOk(await api.git.stage(request({ cwd: CWD, paths: ['a.ts'] })))).toEqual({ ok: true })
    expect(expectOk(await api.git.unstage(request({ cwd: CWD, paths: ['a.ts'] })))).toEqual({ ok: true })
    expect(expectOk(await api.git.commit(request({ cwd: CWD, message: 'done' })))).toEqual({ commit: 'abc' })
    expect(expectOk(await api.git.branch(request({ cwd: CWD })))).toEqual({ name: 'main' })
    expect(git.diff).toHaveBeenCalledWith(CWD, 'a.ts', true, signal)
    expect(git.commit).toHaveBeenCalledWith(CWD, 'done')
  })

  it('maps each GitError code onto the wire vocabulary', async () => {
    const api = await harness({
      status: async () => { throw new GitError('not-a-repository', CWD, 'no repo') },
      diff: async () => { throw new GitError('git-not-found', CWD, 'no git') },
      stage: async () => { throw new GitError('git-failed', CWD, 'stage failed') },
      unstage: async () => { throw new Error('plain') },
      commit: async () => { throw new GitError('empty-message', CWD, 'empty') },
      branch: async () => { throw 'raw' },
    })
    const signal = new AbortController().signal
    expect(expectErr(await api.git.status(request({ cwd: CWD }), signal)))
      .toMatchObject({ code: 'git-not-a-repository', details: { cwd: CWD } })
    expect(expectErr(await api.git.diff(request({ cwd: CWD, path: 'a.ts', staged: false }), signal)))
      .toMatchObject({ code: 'git-not-found', details: { cwd: CWD } })
    expect(expectErr(await api.git.stage(request({ cwd: CWD, paths: ['a.ts'] }))))
      .toMatchObject({ code: 'git-failed', details: { cwd: CWD } })
    expect(expectErr(await api.git.unstage(request({ cwd: CWD, paths: ['a.ts'] }))))
      .toMatchObject({ code: 'internal', message: 'plain' })
    expect(expectErr(await api.git.commit(request({ cwd: CWD, message: '' }))))
      .toMatchObject({ code: 'git-empty-message', details: { cwd: CWD } })
    expect(expectErr(await api.git.branch(request({ cwd: CWD }))))
      .toMatchObject({ code: 'internal', message: 'raw' })
  })

  it('reports cancelled when status or diff is aborted', async () => {
    const hang = async (_cwd: string, signal?: AbortSignal): Promise<never> => {
      await new Promise<never>((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(signal.reason instanceof Error ? signal.reason : new Error('git request aborted'))
        }, { once: true })
      })
      throw new Error('hang settled without abort')
    }
    const api = await harness({
      status: hang,
      diff: async (_cwd, _path, _staged, signal) => hang(_cwd, signal),
    })
    const statusAbort = new AbortController()
    const statusPending = api.git.status(request({ cwd: CWD }), statusAbort.signal)
    statusAbort.abort()
    expect(expectErr(await statusPending).code).toBe('cancelled')
    const diffAbort = new AbortController()
    const diffPending = api.git.diff(request({ cwd: CWD, path: 'a.ts', staged: false }), diffAbort.signal)
    diffAbort.abort()
    expect(expectErr(await diffPending).code).toBe('cancelled')
  })
})
