import { describe, expect, it, vi } from 'vitest'
import { matchWorkspaceFiles, scanWorkspaceFiles } from '../src/client/file-search.ts'

function listing(entries: Array<{ name: string; path: string; type: 'file' | 'directory' }>) {
  return Promise.resolve({
    rpcId: 'list' as never,
    result: { ok: true as const, value: { path: '', entries } },
  })
}

describe('workspace file quick open', () => {
  it('recursively indexes files while skipping dependency metadata', async () => {
    const listDir = vi.fn((request: { path?: string }) => {
      if (request.path === undefined) return listing([
        { name: 'src', path: 'src', type: 'directory' },
        { name: '.git', path: '.git', type: 'directory' },
        { name: 'README.md', path: 'README.md', type: 'file' },
      ])
      return listing([{ name: 'main.ts', path: 'src/main.ts', type: 'file' }])
    })
    const result = await scanWorkspaceFiles(listDir, '/repo', new AbortController().signal)

    expect(result).toEqual({ paths: ['README.md', 'src/main.ts'], truncated: false })
    expect(listDir).toHaveBeenCalledTimes(2)
  })

  it('ranks basename matches before path and subsequence matches', () => {
    expect(matchWorkspaceFiles([
      'docs/main-guide.txt',
      'src/main.ts',
      'src/domain.ts',
      'src/migration.test.ts',
    ], 'main')).toEqual([
      'docs/main-guide.txt',
      'src/main.ts',
      'src/domain.ts',
      'src/migration.test.ts',
    ])
    expect(matchWorkspaceFiles(['a.ts'], '   ')).toEqual([])
  })

  it('stops before RPC work when already cancelled', async () => {
    const controller = new AbortController()
    controller.abort(new Error('stop'))
    await expect(scanWorkspaceFiles(vi.fn() as never, '/repo', controller.signal)).rejects.toThrow('stop')
  })
})
