// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { GitFileDiff, RpcResponse, SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import { ScmDiff, type ScmDiffProps } from '../src/client/ScmDiff.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

const SESSION = 'session' as SessionId
const t: ScmDiffProps['t'] = makeTranslate(zh)

function rejectNonError<T>(): Promise<T> {
  // oxlint-disable-next-line typescript/prefer-promise-reject-errors -- Exercises the unknown rejection fallback.
  return new Promise((_resolve, reject) => { reject('nope') })
}

function ok<T>(value: T): Promise<RpcResponse<T>> {
  return Promise.resolve({ rpcId: 'rpc' as RpcResponse<T>['rpcId'], result: { ok: true, value } })
}

function err(code: string): Promise<RpcResponse<never>> {
  return Promise.resolve({
    rpcId: 'rpc' as RpcResponse<never>['rpcId'],
    result: { ok: false, error: { code, message: code, details: {} } },
  } as RpcResponse<never>)
}

function props(over: Partial<ScmDiffProps> = {}): ScmDiffProps {
  const state: SessionListState = {
    ids: [SESSION],
    byId: {
      [SESSION]: {
        id: SESSION,
        displayTitle: 'session',
        updatedAt: 1,
        running: false,
        blank: false,
        cwd: '/repo',
      },
    },
    current: SESSION,
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
  }
  return {
    sessionId: SESSION,
    selection: { path: 'a.ts', staged: false },
    order: [{ path: 'a.ts', staged: false }],
    useSessions: <T,>(select: (snapshot: SessionListState) => T) => select(state),
    useWorkspaces: () => { throw new Error('unused') },
    diff: over.diff ?? vi.fn(() => ok<GitFileDiff>({ path: 'a.ts', oldText: 'old', newText: 'new' })),
    openScmDetails: over.openScmDetails ?? vi.fn(),
    showChanges: over.showChanges ?? vi.fn(),
    showHome: over.showHome ?? vi.fn(),
    closeDetails: over.closeDetails ?? vi.fn(),
    t,
    ...over,
  } as ScmDiffProps
}

describe('ScmDiff', () => {
  it('asks the user to pick a file when nothing is selected', () => {
    render(<ScmDiff {...props({ selection: null })} />)
    expect(screen.getByText(zh['diff.empty'])).toBeDefined()
  })

  it('returns to Changes or home and closes from the chrome', () => {
    const showChanges = vi.fn()
    const showHome = vi.fn()
    const closeDetails = vi.fn()
    render(<ScmDiff {...props({ selection: null, showChanges, showHome, closeDetails })} />)
    fireEvent.click(screen.getByRole('button', { name: zh['action.backToChanges'] }))
    expect(showChanges).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: zh['action.back'] }))
    expect(showHome).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: zh['action.close'] }))
    expect(closeDetails).toHaveBeenCalledOnce()
  })

  it('moves to the adjacent changed file', () => {
    const openScmDetails = vi.fn()
    const order = [
      { path: 'a.ts', staged: false },
      { path: 'b.ts', staged: true },
    ]
    render(<ScmDiff {...props({ order, openScmDetails })} />)
    expect(screen.getByText('1/2')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: zh['action.nextFile'] }))
    expect(openScmDetails).toHaveBeenCalledWith(order[1])
    expect(screen.getByRole<HTMLButtonElement>('button', { name: zh['action.previousFile'] }).disabled).toBe(true)
  })

  it('renders the file diff', async () => {
    render(<ScmDiff {...props()} />)
    expect(await screen.findByText('a.ts')).toBeDefined()
    expect(screen.getByText(/old/)).toBeDefined()
    expect(screen.getByText(/new/)).toBeDefined()
  })

  it('shows a mapped git error', async () => {
    render(<ScmDiff {...props({ diff: vi.fn(() => err('git-not-found')) })} />)
    expect(await screen.findByText(zh['error.notFound'])).toBeDefined()
  })

  it('ignores a cancelled diff', async () => {
    render(<ScmDiff {...props({ diff: vi.fn(() => err('cancelled')) })} />)
    expect(await screen.findByText(zh['diff.loading'])).toBeDefined()
  })

  it('surfaces a thrown diff failure', async () => {
    render(<ScmDiff {...props({ diff: vi.fn(() => Promise.reject(new Error('read failed'))) })} />)
    expect(await screen.findByText('read failed')).toBeDefined()
  })

  it('surfaces a non-Error diff rejection', async () => {
    render(<ScmDiff {...props({ diff: vi.fn(() => rejectNonError()) as never })} />)
    expect(await screen.findByText(zh['error.failed'])).toBeDefined()
  })

  it('drops an in-flight diff when the selection is cleared', async () => {
    let resolveDiff: ((value: RpcResponse<GitFileDiff>) => void) | undefined
    const pending = new Promise<RpcResponse<GitFileDiff>>((resolve) => { resolveDiff = resolve })
    const { rerender } = render(<ScmDiff {...props({ diff: vi.fn(() => pending) })} />)
    expect(screen.getByText(zh['diff.loading'])).toBeDefined()
    rerender(<ScmDiff {...props({ selection: null, diff: vi.fn(() => pending) })} />)
    expect(screen.getByText(zh['diff.empty'])).toBeDefined()
    resolveDiff?.(await ok<GitFileDiff>({ path: 'a.ts', oldText: 'old', newText: 'new' }))
    expect(screen.queryByText('a.ts')).toBeNull()
  })

  it('drops a rejected in-flight diff after unmount', async () => {
    let rejectDiff: ((reason: unknown) => void) | undefined
    const pending = new Promise<RpcResponse<GitFileDiff>>((_resolve, reject) => { rejectDiff = reject })
    const { unmount } = render(<ScmDiff {...props({ diff: vi.fn(() => pending) })} />)
    unmount()
    rejectDiff?.(new Error('late'))
  })
})
