// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { RpcResponse, SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import { FilePreview, type FilePreviewProps } from '../src/client/FilePreview.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
})

const SESSION = 'session' as SessionId
const t: FilePreviewProps['t'] = makeTranslate(zh)

function ok<T>(value: T): Promise<RpcResponse<T>> {
  return Promise.resolve({ rpcId: 'rpc' as RpcResponse<T>['rpcId'], result: { ok: true, value } })
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

function list(cwd = '/repo'): SessionListState {
  return {
    ids: [SESSION],
    byId: { [SESSION]: summary(cwd) },
    current: SESSION,
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
  }
}

function props(over: Partial<FilePreviewProps> = {}): FilePreviewProps {
  return {
    sessionId: SESSION,
    selection: { path: 'src/a.ts' },
    useSessions: <T,>(select: (snapshot: SessionListState) => T) => select(list()),
    useWorkspaces: () => { throw new Error('unused') },
    readText: over.readText ?? vi.fn(() => ok({ path: 'src/a.ts', text: 'export const x = 1\n', truncated: false })),
    showFiles: over.showFiles ?? vi.fn(),
    showHome: over.showHome ?? vi.fn(),
    closeDetails: over.closeDetails ?? vi.fn(),
    t,
    ...over,
  } as FilePreviewProps
}

describe('FilePreview', () => {
  it('renders the file text and returns to the tree or home', async () => {
    const showFiles = vi.fn()
    const showHome = vi.fn()
    const closeDetails = vi.fn()
    render(<FilePreview {...props({ showFiles, showHome, closeDetails })} />)
    await waitFor(() => { expect(screen.getByText('src/a.ts')).toBeTruthy() })
    expect(screen.getByRole('code').textContent).toBe('export const x = 1')
    fireEvent.click(screen.getByRole('button', { name: zh['action.backToFiles'] }))
    expect(showFiles).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: zh['action.back'] }))
    expect(showHome).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: zh['action.close'] }))
    expect(closeDetails).toHaveBeenCalledOnce()
  })

  it('shows the truncation notice', async () => {
    render(<FilePreview {...props({
      readText: vi.fn(() => ok({ path: 'src/a.ts', text: 'partial', truncated: true })),
    })} />)
    await waitFor(() => { expect(screen.getByText(zh['preview.truncated'])).toBeTruthy() })
  })

  it('asks the user to pick a file when none is selected', () => {
    render(<FilePreview {...props({ selection: null })} />)
    expect(screen.getByText(zh['empty.preview'])).toBeTruthy()
  })

  it('renders no preview when the session has no workspace', () => {
    render(<FilePreview {...props({
      useSessions: <T,>(select: (snapshot: SessionListState) => T) => select({
        ids: [SESSION],
        byId: { [SESSION]: summary() },
        current: SESSION,
        phase: 'ready',
        subagentsByParent: {},
        jobsBySession: {},
        currentAddress: undefined,
      }),
    })} />)
    expect(screen.getByText(zh['empty.preview'])).toBeTruthy()
  })

  it('ignores a cancelled read and stays on the empty preview', async () => {
    render(<FilePreview {...props({
      readText: vi.fn(() => Promise.resolve({
        rpcId: 'rpc' as RpcResponse<never>['rpcId'],
        result: { ok: false, error: { code: 'cancelled', message: 'x', details: {} } },
      } as RpcResponse<never>)),
    })} />)
    await waitFor(() => { expect(screen.getByText(zh['empty.preview'])).toBeTruthy() })
  })

  it('shows loading while the file is in flight', () => {
    render(<FilePreview {...props({
      readText: () => new Promise<RpcResponse<{ path: string; text: string; truncated: boolean }>>(() => {}),
    })} />)
    expect(screen.getByText(zh['preview.loading'])).toBeTruthy()
  })

  it('renders a mapped read failure and a thrown failure', async () => {
    const { rerender } = render(<FilePreview {...props({
      readText: vi.fn(() => Promise.resolve({
        rpcId: 'rpc' as RpcResponse<never>['rpcId'],
        result: { ok: false, error: { code: 'fs-not-text', message: 'x', details: {} } },
      } as RpcResponse<never>)),
    })} />)
    await waitFor(() => { expect(screen.getByText(zh['error.notText'])).toBeTruthy() })
    rerender(<FilePreview {...props({
      readText: vi.fn(() => Promise.reject(new Error('boom'))),
    })} />)
    await waitFor(() => { expect(screen.getByText('boom')).toBeTruthy() })
  })

  it('surfaces a non-Error thrown read', async () => {
    render(<FilePreview {...props({
      readText: vi.fn(() => Promise.reject('nope')),
    })} />)
    await waitFor(() => { expect(screen.getByText(zh['error.failed'])).toBeTruthy() })
  })

  it('drops an in-flight read after unmount', async () => {
    let resolveRead: ((value: RpcResponse<{ path: string; text: string; truncated: boolean }>) => void) | undefined
    const { unmount } = render(<FilePreview {...props({
      readText: () => new Promise((resolve) => { resolveRead = resolve }),
    })} />)
    unmount()
    resolveRead?.({
      rpcId: 'rpc' as RpcResponse<{ path: string; text: string; truncated: boolean }>['rpcId'],
      result: { ok: true, value: { path: 'src/a.ts', text: 'x', truncated: false } },
    })
  })

  it('drops a thrown read after unmount', async () => {
    let rejectRead: ((reason: unknown) => void) | undefined
    const { unmount } = render(<FilePreview {...props({
      readText: () => new Promise((_, reject) => { rejectRead = reject }),
    })} />)
    unmount()
    rejectRead?.(new Error('late'))
  })
})
