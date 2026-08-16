/**
 * Privileged fs.* RPC: relative cwd refused at the wire, missing ctx.fs is
 * fs-unavailable, paths outside the workspace are fs-failed, and abort is
 * cancelled.
 */

import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import SessionStore from '@deepseek-ai/dsh-session'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import { FsError, FsTargetKey } from '@deepseek-ai/dsh-fs'
import type { FileSystem, FsDirEntry, FsTarget } from '@deepseek-ai/dsh-fs'
import type { RpcRequest, RpcResponse } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import { RpcId } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import { createApiProxy } from '@deepseek-ai/dsh-host-apiproxy'

const CWD = process.cwd()

let nextRpc = 1
function request<P>(payload: P): RpcRequest<P> {
  return { rpcId: RpcId(`fs-${String(nextRpc++)}`), payload }
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

function target(absolute: string): FsTarget {
  return { targetKey: FsTargetKey(absolute), displayPath: absolute }
}

function child(name: string, type: FsDirEntry['type'], absolute: string): FsDirEntry {
  return { name, type, target: target(absolute) }
}

async function harness(fs?: Partial<FileSystem>): Promise<ReturnType<typeof createApiProxy>> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(UserQuestionService)
  await ctx.plugin(AgentRegistry)
  if (fs !== undefined) ctx.provide('fs', fs as FileSystem)
  return createApiProxy(ctx, { defaultModelSelection: () => ({ provider: 'p', model: 'm' }), cwd: CWD })
}

describe('fs.* RPC', () => {
  it('refuses a relative cwd before touching ctx.fs', async () => {
    const api = await harness()
    expect(expectErr(await api.fs.listDir(request({ cwd: 'relative' }), new AbortController().signal)))
      .toMatchObject({ code: 'fs-failed', details: { cwd: 'relative' } })
    expect(expectErr(await api.fs.readText(request({ cwd: 'relative', path: 'a.ts' }), new AbortController().signal)))
      .toMatchObject({ code: 'fs-failed', details: { cwd: 'relative' } })
  })

  it('reports fs-unavailable when the seam is not composed', async () => {
    const api = await harness()
    const signal = new AbortController().signal
    expect(expectErr(await api.fs.listDir(request({ cwd: CWD }), signal)).code).toBe('fs-unavailable')
    expect(expectErr(await api.fs.readText(request({ cwd: CWD, path: 'a.ts' }), signal)).code)
      .toBe('fs-unavailable')
  })

  it('lists contained children and drops an escaped symlink target', async () => {
    const root = target(CWD)
    const inside = join(CWD, 'src', 'a.ts')
    const escaped = join(CWD, '..', 'outside')
    const fs = {
      resolve: vi.fn(async (path: string, opts?: { cwd?: string }) => {
        if (path === CWD || path === '' || path === '.') return root
        const base = opts?.cwd ?? CWD
        return target(`${base}/${path}`)
      }),
      contains: vi.fn((parent: FsTarget, childTarget: FsTarget) => (
        childTarget.displayPath === parent.displayPath
        || childTarget.displayPath.startsWith(`${parent.displayPath}/`)
        || childTarget.displayPath.startsWith(`${parent.displayPath}\\`)
      )),
      processPath: vi.fn((item: FsTarget) => item.displayPath),
      stat: vi.fn(async () => ({ version: 'v' as never, type: 'directory' as const })),
      listDir: vi.fn(async () => [
        child('a.ts', 'file', inside),
        child('leak', 'other', escaped),
      ]),
    }
    const api = await harness(fs)
    expect(expectOk(await api.fs.listDir(request({ cwd: CWD }), new AbortController().signal)))
      .toEqual({
        path: '',
        entries: [{ name: 'a.ts', path: 'src/a.ts', type: 'file' }],
      })
  })

  it('refuses a path that resolves outside the workspace', async () => {
    const root = target(CWD)
    const fs = {
      resolve: vi.fn(async (path: string) => path === CWD ? root : target('/tmp/escape')),
      contains: vi.fn(() => false),
      processPath: vi.fn((item: FsTarget) => item.displayPath),
    }
    const api = await harness(fs)
    expect(expectErr(await api.fs.readText(
      request({ cwd: CWD, path: '../escape' }),
      new AbortController().signal,
    ))).toMatchObject({ code: 'fs-failed', details: { cwd: CWD } })
  })

  it('reads a contained text file and reports truncation past the preview cap', async () => {
    const root = target(CWD)
    const huge = 'x'.repeat(1_048_576 + 8)
    const fs = {
      resolve: vi.fn(async (path: string, opts?: { cwd?: string }) => {
        if (path === CWD) return root
        return target(`${opts?.cwd ?? CWD}/${path}`)
      }),
      contains: vi.fn(() => true),
      processPath: vi.fn((item: FsTarget) => item.displayPath),
      stat: vi.fn(async () => ({ version: 'v' as never, type: 'file' as const, size: huge.length })),
      streamText: vi.fn(async () => [huge]),
    }
    const api = await harness(fs)
    const value = expectOk(await api.fs.readText(
      request({ cwd: CWD, path: 'notes.md' }),
      new AbortController().signal,
    ))
    expect(value.path).toBe('notes.md')
    expect(value.truncated).toBe(true)
    expect(value.text.length).toBe(1_048_576)
  })

  it('maps FsError codes and abort onto the wire vocabulary', async () => {
    const root = target(CWD)
    const fs = {
      resolve: vi.fn(async (path: string) => path === CWD ? root : target(`${CWD}/missing`)),
      contains: vi.fn(() => true),
      processPath: vi.fn((item: FsTarget) => item.displayPath),
      stat: vi.fn(async () => { throw new FsError('gone', 'FS_NOT_FOUND') }),
    }
    const api = await harness(fs)
    expect(expectErr(await api.fs.listDir(request({ cwd: CWD, path: 'missing' }), new AbortController().signal)))
      .toMatchObject({ code: 'fs-not-found', details: { path: 'missing' } })

    const aborted = new AbortController()
    aborted.abort()
    const hanging = {
      resolve: vi.fn(async (_path: string, opts?: { signal?: AbortSignal }) => {
        if (opts?.signal?.aborted) throw new FsError('aborted', 'FS_ABORTED')
        return root
      }),
      contains: vi.fn(() => true),
      processPath: vi.fn((item: FsTarget) => item.displayPath),
    }
    const hangingApi = await harness(hanging)
    expect(expectErr(await hangingApi.fs.listDir(request({ cwd: CWD }), aborted.signal)).code)
      .toBe('cancelled')
  })

  it('maps remaining FsError codes, non-directory / non-file stats, and a small preview', async () => {
    const root = target(CWD)
    const contained = {
      resolve: vi.fn(async (path: string, opts?: { cwd?: string }) => {
        if (path === CWD || path === '' || path === '.') return root
        return target(`${opts?.cwd ?? CWD}/${path}`)
      }),
      contains: vi.fn(() => true),
      processPath: vi.fn((item: FsTarget) => item.displayPath),
    }

    const notDir = await harness({
      ...contained,
      stat: vi.fn(async () => ({ version: 'v' as never, type: 'file' as const })),
    })
    expect(expectErr(await notDir.fs.listDir(
      request({ cwd: CWD, path: 'notes.md' }),
      new AbortController().signal,
    ))).toMatchObject({ code: 'fs-not-directory', details: { path: 'notes.md' } })

    const missing = await harness({
      ...contained,
      stat: vi.fn(async () => undefined),
    })
    expect(expectErr(await missing.fs.listDir(
      request({ cwd: CWD, path: 'gone' }),
      new AbortController().signal,
    ))).toMatchObject({ code: 'fs-not-found', details: { path: 'gone' } })
    expect(expectErr(await missing.fs.readText(
      request({ cwd: CWD, path: 'gone.md' }),
      new AbortController().signal,
    ))).toMatchObject({ code: 'fs-not-found', details: { path: 'gone.md' } })

    const notFile = await harness({
      ...contained,
      stat: vi.fn(async () => ({ version: 'v' as never, type: 'directory' as const })),
    })
    expect(expectErr(await notFile.fs.readText(
      request({ cwd: CWD, path: 'src' }),
      new AbortController().signal,
    ))).toMatchObject({ code: 'fs-not-regular-file', details: { path: 'src' } })

    const small = await harness({
      ...contained,
      stat: vi.fn(async () => ({ version: 'v' as never, type: 'file' as const, size: 5 })),
      streamText: vi.fn(async () => ['hello']),
    })
    expect(expectOk(await small.fs.readText(
      request({ cwd: CWD, path: 'notes.md' }),
      new AbortController().signal,
    ))).toEqual({ path: 'notes.md', text: 'hello', truncated: false })

    const codes: Array<[FsError['code'], string]> = [
      ['FS_NOT_DIRECTORY', 'fs-not-directory'],
      ['FS_NOT_TEXT', 'fs-not-text'],
      ['FS_NOT_REGULAR_FILE', 'fs-not-regular-file'],
      ['FS_TOO_LARGE', 'fs-too-large'],
      ['FS_PERMISSION_DENIED', 'fs-permission-denied'],
      ['FS_SANDBOX_DENIED', 'fs-permission-denied'],
      ['FS_IO_ERROR', 'fs-failed'],
    ]
    for (const [seam, wire] of codes) {
      const api = await harness({
        ...contained,
        stat: vi.fn(async () => { throw new FsError(seam, seam) }),
      })
      expect(expectErr(await api.fs.readText(
        request({ cwd: CWD, path: 'notes.md' }),
        new AbortController().signal,
      )).code).toBe(wire)
    }

    const aborted = new AbortController()
    aborted.abort()
    const hanging = await harness({
      ...contained,
      stat: vi.fn(async () => ({ version: 'v' as never, type: 'file' as const })),
      streamText: vi.fn(async (_target, signal?: AbortSignal) => {
        if (signal?.aborted) throw new FsError('aborted', 'FS_ABORTED')
        return ['x']
      }),
    })
    expect(expectErr(await hanging.fs.readText(
      request({ cwd: CWD, path: 'notes.md' }),
      aborted.signal,
    )).code).toBe('cancelled')

    const escaped = await harness({
      ...contained,
      processPath: vi.fn(() => join(CWD, '..', 'outside')),
    })
    expect(expectErr(await escaped.fs.listDir(request({ cwd: CWD }), new AbortController().signal)))
      .toMatchObject({ code: 'fs-failed', details: { cwd: CWD } })

    const boom = await harness({
      ...contained,
      stat: vi.fn(async () => { throw new Error('io') }),
    })
    expect(expectErr(await boom.fs.listDir(request({ cwd: CWD }), new AbortController().signal)))
      .toMatchObject({ code: 'internal', message: 'io' })
  })
})
