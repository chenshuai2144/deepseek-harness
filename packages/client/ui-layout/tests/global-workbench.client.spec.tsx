// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { SessionId, SessionListState, WorkspaceListState } from '@deepseek-ai/dsh-client-runtime/client'
import { GlobalWorkbench, type GlobalWorkbenchProps } from '../src/client/GlobalWorkbench.tsx'
import { LayoutController } from '../src/client/service.ts'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

const sid = (id: string) => id as SessionId

function props(view: GlobalWorkbenchProps['view']): GlobalWorkbenchProps {
  const ids = ['running', 'waiting', 'completed', 'failed'].map(sid)
  const sessions = {
    ids,
    byId: Object.fromEntries(ids.map((id, index) => [id, {
      id,
      displayTitle: id,
      updatedAt: 10 - index,
      running: id === sid('running'),
      blank: false,
      ...(id === sid('waiting') ? { pendingInteraction: 'question' as const } : {}),
      ...(id === sid('completed') ? { completed: true } : {}),
    }])),
    current: sid('running'),
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: {
      [sid('failed')]: [{ id: 'job' as never, kind: 'test', label: 'build', status: 'failed', startedAt: 1 }],
    },
    currentAddress: undefined,
  } as SessionListState
  const workspaces = {
    items: [{
      workspaceId: 'workspace' as never,
      path: '/repo',
      title: 'Repo',
      sessionIds: ids,
      createdAt: '2026-08-17T00:00:00.000Z',
      updatedAt: '2026-08-17T00:00:00.000Z',
    }],
    archivedSessionIds: [],
    state: 'idle',
    phase: 'ready',
    error: null,
    baselinesReady: true,
    recentWorkspaceId: undefined,
  } as WorkspaceListState
  return {
    view,
    useSessions: selector => selector(sessions),
    useWorkspaces: selector => selector(workspaces),
    commands: new LayoutController(),
    openSession: vi.fn(),
    close: vi.fn(),
    openTasks: vi.fn(),
    openInbox: vi.fn(),
    t: makeTranslate(zh),
  }
}

describe('GlobalWorkbench', () => {
  it('groups all root tasks and opens the selected session', () => {
    const input = props('tasks')
    render(<GlobalWorkbench {...input} />)

    expect(screen.getAllByText(zh['global.state.running'])).toHaveLength(2)
    expect(screen.getAllByText(zh['global.state.waiting'])).toHaveLength(2)
    expect(screen.getAllByText(zh['global.state.completed'])).toHaveLength(2)
    expect(screen.getAllByText(zh['global.state.failed'])).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: /waitingRepo/ }))
    expect(input.openSession).toHaveBeenCalledWith(sid('waiting'))
    expect(input.close).toHaveBeenCalledOnce()
  })

  it('keeps running tasks without a notification out of the inbox', () => {
    render(<GlobalWorkbench {...props('inbox')} />)
    expect(screen.queryByText('running')).toBeNull()
    expect(screen.getByText('waiting')).toBeDefined()
    expect(screen.getByText('completed')).toBeDefined()
    expect(screen.getByText('failed')).toBeDefined()
  })

  it('filters and executes contributed commands', () => {
    const input = props('commands')
    const run = vi.fn()
    input.commands.registerCommand({ id: 'test.settings', title: () => 'Open settings', run })
    render(<GlobalWorkbench {...input} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'settings' } })
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
    expect(run).toHaveBeenCalledOnce()
    expect(input.close).toHaveBeenCalledOnce()
  })
})
