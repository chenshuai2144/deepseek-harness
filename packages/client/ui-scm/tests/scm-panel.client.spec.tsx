// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { GitStatus, RpcResponse, SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import { ScmPanel, type ScmPanelProps } from '../src/client/ScmPanel.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const SESSION = 'session' as SessionId
const t: ScmPanelProps['t'] = makeTranslate(zh)

function ok<T>(value: T): Promise<RpcResponse<T>> {
  return Promise.resolve({ rpcId: 'rpc' as RpcResponse<T>['rpcId'], result: { ok: true, value } })
}

function err(code: string): Promise<RpcResponse<never>> {
  return Promise.resolve({
    rpcId: 'rpc' as RpcResponse<never>['rpcId'],
    result: { ok: false, error: { code, message: code, details: {} } },
  } as RpcResponse<never>)
}

function summary(cwd?: string): SessionSummary {
  return {
    id: SESSION,
    displayTitle: 'session',
    updatedAt: 1,
    running: false,
    blank: false,
    ...cwd === undefined ? {} : { cwd },
  }
}

function list(current: SessionId | undefined, cwd?: string): SessionListState {
  return {
    ids: current === undefined ? [] : [current],
    byId: current === undefined ? {} : { [current]: summary(cwd) },
    current,
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
  }
}

function props(over: Partial<ScmPanelProps> & { sessions?: SessionListState } = {}): ScmPanelProps {
  const state = over.sessions ?? list(SESSION, '/repo')
  const status = over.status ?? vi.fn(() => ok<GitStatus>({
    branch: 'main',
    ahead: 0,
    behind: 0,
    staged: [],
    unstaged: [],
  }))
  return {
    sessionId: SESSION,
    useSessions: <T,>(select: (snapshot: SessionListState) => T) => select(state),
    useWorkspaces: () => { throw new Error('unused') },
    status,
    stage: over.stage ?? vi.fn(() => ok({ ok: true as const })),
    unstage: over.unstage ?? vi.fn(() => ok({ ok: true as const })),
    commit: over.commit ?? vi.fn(() => ok({ commit: 'abc' })),
    openScmDetails: over.openScmDetails ?? vi.fn(),
    showHome: over.showHome ?? vi.fn(),
    closeDetails: over.closeDetails ?? vi.fn(),
    refreshIntervalMs: over.refreshIntervalMs ?? 60_000,
    t,
    ...over,
  } as ScmPanelProps
}

describe('ScmPanel', () => {
  it('returns to the workspace home from the back control and closes from the header', async () => {
    const showHome = vi.fn()
    const closeDetails = vi.fn()
    render(<ScmPanel {...props({ showHome, closeDetails })} />)
    await screen.findByText('main')
    fireEvent.click(screen.getByRole('button', { name: zh['action.back'] }))
    expect(showHome).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: zh['action.close'] }))
    expect(closeDetails).toHaveBeenCalledOnce()
  })

  it('shows empty copy without a session or workspace', () => {
    const { rerender } = render(<ScmPanel {...props({ sessions: list(undefined) })} />)
    expect(screen.getByText(zh['empty.noSession'])).toBeDefined()
    rerender(<ScmPanel {...props({ sessions: list(SESSION) })} />)
    expect(screen.getByText(zh['empty.noWorkspace'])).toBeDefined()
  })

  it('shows the not-a-repository reason from git.status', async () => {
    render(<ScmPanel {...props({ status: vi.fn(() => err('git-not-a-repository')) })} />)
    expect(await screen.findByText(zh['error.notRepo'])).toBeDefined()
  })

  it('ignores a cancelled status poll', async () => {
    render(<ScmPanel {...props({ status: vi.fn(() => err('cancelled')) })} />)
    expect(await screen.findByText(zh['diff.loading'])).toBeDefined()
  })

  it('surfaces a thrown status failure', async () => {
    render(<ScmPanel {...props({ status: vi.fn(() => Promise.reject(new Error('boom'))) })} />)
    expect(await screen.findByText('boom')).toBeDefined()
  })

  it('lists changes, stages, unstages, and opens details', async () => {
    const status = vi.fn(() => ok<GitStatus>({
      branch: 'main',
      ahead: 0,
      behind: 0,
      unstaged: [{ path: 'a.ts', status: 'M' }],
      staged: [{ path: 'b.ts', status: 'A' }],
    }))
    const stage = vi.fn(() => ok({ ok: true as const }))
    const unstage = vi.fn(() => ok({ ok: true as const }))
    const openScmDetails = vi.fn()
    render(<ScmPanel {...props({ status, stage, unstage, openScmDetails })} />)
    expect(await screen.findByText('main')).toBeDefined()
    fireEvent.click(screen.getByText('a.ts'))
    expect(openScmDetails).toHaveBeenCalledWith({ path: 'a.ts', staged: false })
    fireEvent.click(screen.getByText('b.ts'))
    expect(openScmDetails).toHaveBeenCalledWith({ path: 'b.ts', staged: true })
    fireEvent.click(screen.getByText(zh['action.stage']))
    await waitFor(() => { expect(stage).toHaveBeenCalledWith({ cwd: '/repo', paths: ['a.ts'] }) })
    fireEvent.click(screen.getByText(zh['action.unstage']))
    await waitFor(() => { expect(unstage).toHaveBeenCalledWith({ cwd: '/repo', paths: ['b.ts'] }) })
    fireEvent.click(screen.getByText(zh['action.stageAll']))
    await waitFor(() => { expect(stage).toHaveBeenCalledWith({ cwd: '/repo', paths: ['a.ts'] }) })
  })

  it('rejects an empty commit message and commits a trimmed one', async () => {
    const status = vi.fn(() => ok<GitStatus>({
      branch: 'main',
      ahead: 0,
      behind: 0,
      unstaged: [],
      staged: [{ path: 'b.ts', status: 'A' }],
    }))
    const commit = vi.fn(() => ok({ commit: 'abc' }))
    render(<ScmPanel {...props({ status, commit })} />)
    expect(await screen.findByText('main')).toBeDefined()
    fireEvent.click(screen.getByText(zh['action.commit']))
    expect(screen.getByText(zh['commit.empty'])).toBeDefined()
    expect(commit).not.toHaveBeenCalled()
    fireEvent.change(screen.getByPlaceholderText(zh['commit.placeholder']), { target: { value: '  done  ' } })
    fireEvent.click(screen.getByText(zh['action.commit']))
    await waitFor(() => { expect(commit).toHaveBeenCalledWith({ cwd: '/repo', message: 'done' }) })
  })

  it('shows a commit RPC failure', async () => {
    const status = vi.fn(() => ok<GitStatus>({
      branch: 'main',
      ahead: 0,
      behind: 0,
      unstaged: [],
      staged: [{ path: 'b.ts', status: 'A' }],
    }))
    const commit = vi.fn(() => err('git-failed'))
    render(<ScmPanel {...props({ status, commit })} />)
    expect(await screen.findByText('main')).toBeDefined()
    fireEvent.change(screen.getByPlaceholderText(zh['commit.placeholder']), { target: { value: 'x' } })
    fireEvent.click(screen.getByText(zh['action.commit']))
    expect(await screen.findByText(zh['error.failed'])).toBeDefined()
  })

  it('shows the clean empty state', async () => {
    render(<ScmPanel {...props()} />)
    expect(await screen.findByText(zh['empty.clean'])).toBeDefined()
  })

  it('shows a stage RPC failure', async () => {
    const status = vi.fn(() => ok<GitStatus>({
      branch: 'main',
      ahead: 0,
      behind: 0,
      unstaged: [{ path: 'a.ts', status: 'M' }],
      staged: [],
    }))
    render(<ScmPanel {...props({ status, stage: vi.fn(() => err('git-failed')) })} />)
    expect(await screen.findByText('a.ts')).toBeDefined()
    fireEvent.click(screen.getByText(zh['action.stage']))
    expect(await screen.findByText(zh['error.failed'])).toBeDefined()
  })

  it('surfaces a non-Error status rejection', async () => {
    render(<ScmPanel {...props({ status: vi.fn(() => Promise.reject('nope')) })} />)
    expect(await screen.findByText(zh['error.failed'])).toBeDefined()
  })

  it('polls again on the refresh interval', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const status = vi.fn(() => ok<GitStatus>({
      branch: 'main',
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
    }))
    render(<ScmPanel {...props({ status, refreshIntervalMs: 1_000 })} />)
    expect(await screen.findByText(zh['empty.clean'])).toBeDefined()
    expect(status).toHaveBeenCalledTimes(1)
    await act(async () => { vi.advanceTimersByTime(1_000) })
    expect(status).toHaveBeenCalledTimes(2)
    status.mockRejectedValueOnce(new Error('poll-fail'))
    await act(async () => { vi.advanceTimersByTime(1_000) })
    expect(await screen.findByText('poll-fail')).toBeDefined()
  })

  it('shows an unstage RPC failure', async () => {
    const status = vi.fn(() => ok<GitStatus>({
      branch: 'main',
      ahead: 0,
      behind: 0,
      unstaged: [],
      staged: [{ path: 'b.ts', status: 'A' }],
    }))
    render(<ScmPanel {...props({ status, unstage: vi.fn(() => err('git-failed')) })} />)
    expect(await screen.findByText('b.ts')).toBeDefined()
    fireEvent.click(screen.getByText(zh['action.unstage']))
    expect(await screen.findByText(zh['error.failed'])).toBeDefined()
  })

  it('shows a stage-all RPC failure', async () => {
    const status = vi.fn(() => ok<GitStatus>({
      branch: 'main',
      ahead: 0,
      behind: 0,
      unstaged: [{ path: 'a.ts', status: 'M' }],
      staged: [],
    }))
    render(<ScmPanel {...props({ status, stage: vi.fn(() => err('git-failed')) })} />)
    expect(await screen.findByText('a.ts')).toBeDefined()
    fireEvent.click(screen.getByText(zh['action.stageAll']))
    expect(await screen.findByText(zh['error.failed'])).toBeDefined()
  })

  it('surfaces a non-Error mutation rejection', async () => {
    const status = vi.fn(() => ok<GitStatus>({
      branch: 'main',
      ahead: 0,
      behind: 0,
      unstaged: [{ path: 'a.ts', status: 'M' }],
      staged: [],
    }))
    render(<ScmPanel {...props({ status, stage: vi.fn(() => Promise.reject('nope')) })} />)
    expect(await screen.findByText('a.ts')).toBeDefined()
    fireEvent.click(screen.getByText(zh['action.stage']))
    expect(await screen.findByText(zh['error.failed'])).toBeDefined()
  })

  it('shows a rename prior path in the row title', async () => {
    const status = vi.fn(() => ok<GitStatus>({
      branch: 'main',
      ahead: 0,
      behind: 0,
      unstaged: [{ path: 'b.ts', status: 'R', originalPath: 'a.ts' }],
      staged: [],
    }))
    render(<ScmPanel {...props({ status })} />)
    expect(await screen.findByText('b.ts')).toBeDefined()
    expect(screen.getByTitle('a.ts → b.ts')).toBeDefined()
  })

  it('drops an in-flight status after unmount', async () => {
    let resolveStatus: ((value: RpcResponse<GitStatus>) => void) | undefined
    const pending = new Promise<RpcResponse<GitStatus>>((resolve) => { resolveStatus = resolve })
    const { unmount } = render(<ScmPanel {...props({ status: vi.fn(() => pending) })} />)
    unmount()
    resolveStatus?.(await ok<GitStatus>({
      branch: 'main',
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
    }))
  })

  it('drops a rejected in-flight status after unmount', async () => {
    let rejectStatus: ((reason: unknown) => void) | undefined
    const pending = new Promise<RpcResponse<GitStatus>>((_resolve, reject) => { rejectStatus = reject })
    const { unmount } = render(<ScmPanel {...props({ status: vi.fn(() => pending) })} />)
    unmount()
    rejectStatus?.(new Error('late'))
  })

  it('drops a rejected interval poll after unmount', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    let rejectStatus: ((reason: unknown) => void) | undefined
    const pending = new Promise<RpcResponse<GitStatus>>((_resolve, reject) => { rejectStatus = reject })
    const status = vi.fn()
      .mockImplementationOnce(() => ok<GitStatus>({
        branch: 'main',
        ahead: 0,
        behind: 0,
        staged: [],
        unstaged: [],
      }))
      .mockImplementationOnce(() => pending)
    const { unmount } = render(<ScmPanel {...props({ status, refreshIntervalMs: 1_000 })} />)
    expect(await screen.findByText(zh['empty.clean'])).toBeDefined()
    await act(async () => { vi.advanceTimersByTime(1_000) })
    unmount()
    rejectStatus?.(new Error('late'))
  })

  it('surfaces a non-Error interval rejection', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    const status = vi.fn()
      .mockImplementationOnce(() => ok<GitStatus>({
        branch: 'main',
        ahead: 0,
        behind: 0,
        staged: [],
        unstaged: [],
      }))
      .mockImplementationOnce(() => Promise.reject('nope'))
    render(<ScmPanel {...props({ status, refreshIntervalMs: 1_000 })} />)
    expect(await screen.findByText(zh['empty.clean'])).toBeDefined()
    await act(async () => { vi.advanceTimersByTime(1_000) })
    expect(await screen.findByText(zh['error.failed'])).toBeDefined()
  })
})
