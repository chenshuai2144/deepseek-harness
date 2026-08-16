// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { FsDirEntryView, RpcResponse, SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import { FilePanel, type FilePanelProps } from '../src/client/FilePanel.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
})

const SESSION = 'session' as SessionId
const t: FilePanelProps['t'] = makeTranslate(zh)

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

function entry(name: string, type: FsDirEntryView['type'], path = name): FsDirEntryView {
  return { name, type, path }
}

function props(over: Partial<FilePanelProps> & { sessions?: SessionListState } = {}): FilePanelProps {
  const state = over.sessions ?? list(SESSION, '/repo')
  return {
    sessionId: SESSION,
    useSessions: <T,>(select: (snapshot: SessionListState) => T) => select(state),
    useWorkspaces: () => { throw new Error('unused') },
    listDir: over.listDir ?? vi.fn(() => ok({ path: '', entries: [] })),
    openFileDetails: over.openFileDetails ?? vi.fn(),
    showHome: over.showHome ?? vi.fn(),
    closeDetails: over.closeDetails ?? vi.fn(),
    t,
    ...over,
  } as FilePanelProps
}

describe('FilePanel', () => {
  it('returns to the workspace home from the back control and closes from the header', async () => {
    const showHome = vi.fn()
    const closeDetails = vi.fn()
    render(<FilePanel {...props({ showHome, closeDetails })} />)
    await waitFor(() => { expect(screen.getByText(zh.title)).toBeTruthy() })
    fireEvent.click(screen.getByRole('button', { name: zh['action.back'] }))
    expect(showHome).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: zh['action.close'] }))
    expect(closeDetails).toHaveBeenCalledOnce()
  })

  it('lists the workspace root and opens a file', async () => {
    const openFileDetails = vi.fn()
    const listDir = vi.fn((payload: { path?: string }) => ok({
      path: payload.path ?? '',
      entries: payload.path === 'src'
        ? [entry('a.ts', 'file', 'src/a.ts')]
        : [entry('src', 'directory'), entry('README.md', 'file')],
    }))
    render(<FilePanel {...props({ listDir, openFileDetails })} />)
    await waitFor(() => { expect(screen.getByText('README.md')).toBeTruthy() })
    fireEvent.click(screen.getByRole('button', { name: 'README.md' }))
    expect(openFileDetails).toHaveBeenCalledWith({ path: 'README.md' })
    fireEvent.click(screen.getByRole('button', { name: zh['action.expand'] }))
    await waitFor(() => { expect(screen.getByText('a.ts')).toBeTruthy() })
    fireEvent.click(screen.getByRole('button', { name: 'a.ts' }))
    expect(openFileDetails).toHaveBeenCalledWith({ path: 'src/a.ts' })
  })

  it('renders an unavailable empty state', async () => {
    render(<FilePanel {...props({ listDir: vi.fn(() => err('fs-unavailable')) })} />)
    await waitFor(() => { expect(screen.getByText(zh['error.unavailable'])).toBeTruthy() })
  })

  it('renders no-workspace when the session has no cwd', () => {
    render(<FilePanel {...props({ sessions: list(SESSION) })} />)
    expect(screen.getByText(zh['empty.noWorkspace'])).toBeTruthy()
  })

  it('renders no-session when the session row is gone', () => {
    render(<FilePanel {...props({ sessions: list(undefined) })} />)
    expect(screen.getByText(zh['empty.noSession'])).toBeTruthy()
  })

  it('shows loading while the root listing is in flight', () => {
    render(<FilePanel {...props({
      listDir: () => new Promise<RpcResponse<{ path: string; entries: [] }>>(() => {}),
    })} />)
    expect(screen.getByText(zh.loading)).toBeTruthy()
  })

  it('renders an empty directory and ignores a cancelled root listing', async () => {
    render(<FilePanel {...props({ listDir: vi.fn(() => err('cancelled')) })} />)
    await waitFor(() => { expect(screen.getByText(zh['empty.directory'])).toBeTruthy() })
  })

  it('keeps the root listing when a child listing fails and disables other entries', async () => {
    const listDir = vi.fn((payload: { path?: string }) => {
      if (payload.path === 'src') return err('fs-permission-denied')
      return ok({
        path: '',
        entries: [entry('src', 'directory'), entry('sock', 'other')],
      })
    })
    render(<FilePanel {...props({ listDir })} />)
    await waitFor(() => { expect(screen.getByText('src')).toBeTruthy() })
    expect((screen.getByRole('button', { name: 'sock' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: zh['action.expand'] }))
    await waitFor(() => { expect(screen.getByText(zh['error.denied'])).toBeTruthy() })
    fireEvent.click(screen.getByRole('button', { name: zh['action.collapse'] }))
    expect(screen.queryByRole('button', { name: zh['action.collapse'] })).toBeNull()
  })

  it('surfaces a thrown listing failure', async () => {
    render(<FilePanel {...props({
      listDir: vi.fn(() => Promise.reject(new Error('boom'))),
    })} />)
    await waitFor(() => { expect(screen.getByText('boom')).toBeTruthy() })
  })

  it('surfaces a non-Error thrown root listing', async () => {
    render(<FilePanel {...props({
      listDir: vi.fn(() => Promise.reject('nope')),
    })} />)
    await waitFor(() => { expect(screen.getByText(zh['error.failed'])).toBeTruthy() })
  })

  it('toggles a directory from its name, reuses a loaded listing, and ignores other entries', async () => {
    const listDir = vi.fn((payload: { path?: string }) => ok({
      path: payload.path ?? '',
      entries: payload.path === 'src'
        ? [entry('a.ts', 'file', 'src/a.ts')]
        : [entry('src', 'directory'), entry('sock', 'other')],
    }))
    render(<FilePanel {...props({ listDir })} />)
    await waitFor(() => { expect(screen.getByText('src')).toBeTruthy() })
    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => { expect(screen.getByText('a.ts')).toBeTruthy() })
    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    expect(screen.queryByText('a.ts')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    expect(screen.getByText('a.ts')).toBeTruthy()
    expect(listDir).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('button', { name: 'sock' }))
  })

  it('surfaces a thrown child listing and a non-Error throw', async () => {
    const listDir = vi.fn((payload: { path?: string }) => {
      if (payload.path === 'src') return Promise.reject(new Error('child'))
      if (payload.path === 'lib') return Promise.reject('nope')
      return ok({
        path: '',
        entries: [entry('src', 'directory'), entry('lib', 'directory')],
      })
    })
    render(<FilePanel {...props({ listDir })} />)
    await waitFor(() => { expect(screen.getByText('src')).toBeTruthy() })
    fireEvent.click(screen.getByRole('button', { name: 'src' }))
    await waitFor(() => { expect(screen.getByText('child')).toBeTruthy() })
    fireEvent.click(screen.getByRole('button', { name: 'lib' }))
    await waitFor(() => { expect(screen.getByText(zh['error.failed'])).toBeTruthy() })
  })

  it('drops an in-flight listing after unmount', async () => {
    let resolveList: ((value: RpcResponse<{ path: string; entries: [] }>) => void) | undefined
    const { unmount } = render(<FilePanel {...props({
      listDir: () => new Promise((resolve) => { resolveList = resolve }),
    })} />)
    unmount()
    resolveList?.({ rpcId: 'rpc' as RpcResponse<{ path: string; entries: [] }>['rpcId'], result: { ok: true, value: { path: '', entries: [] } } })
  })

  it('drops a thrown listing after unmount', async () => {
    let rejectList: ((reason: unknown) => void) | undefined
    const { unmount } = render(<FilePanel {...props({
      listDir: () => new Promise((_, reject) => { rejectList = reject }),
    })} />)
    unmount()
    rejectList?.(new Error('late'))
  })
})
