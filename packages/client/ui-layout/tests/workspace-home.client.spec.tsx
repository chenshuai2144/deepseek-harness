// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type {
  ConversationSnapshot,
  SessionId,
  SessionListState,
} from '@deepseek-ai/dsh-client-runtime/client'
import { WorkspaceHome, type WorkspaceHomeProps } from '../src/client/WorkspaceHome.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
})

const t: WorkspaceHomeProps['t'] = makeTranslate(zh)
const sessionId = 'session' as SessionId

const baseConversation = {
  running: false,
  removed: false,
  pending: [],
  queue: [],
  runningCalls: [],
  lastAgentError: null,
  promptError: null,
  openError: null,
} as unknown as ConversationSnapshot

const baseSessions = {
  ids: [sessionId],
  byId: {
    [sessionId]: {
      id: sessionId,
      displayTitle: 'Session',
      running: false,
      blank: false,
      updatedAt: 1,
    },
  },
  current: sessionId,
  phase: 'ready',
  subagentsByParent: {},
  jobsBySession: {},
  currentAddress: undefined,
} as SessionListState

function home(input: {
  conversation?: ConversationSnapshot
  sessions?: SessionListState
  projections?: Record<string, unknown>
  props?: Partial<WorkspaceHomeProps>
} = {}): WorkspaceHomeProps {
  const conversation = input.conversation ?? baseConversation
  const sessions = input.sessions ?? baseSessions
  const projections = input.projections ?? {}
  return {
    sessionId,
    useSession: selector => selector(conversation),
    useSessions: selector => selector(sessions),
    useWorkspaces: () => { throw new Error('unused') },
    useProjection: (key: string) => Reflect.get(projections, key) as never,
    openChanges: vi.fn(),
    openFiles: vi.fn(),
    openBrowser: vi.fn(),
    openWorkspaceHome: vi.fn(),
    closeDetails: vi.fn(),
    t,
    ...input.props,
  } as WorkspaceHomeProps
}

describe('WorkspaceHome', () => {
  it('renders the ready dashboard and opens workspace tools', () => {
    const openChanges = vi.fn()
    const openFiles = vi.fn()
    const openBrowser = vi.fn()
    const closeDetails = vi.fn()
    render(<WorkspaceHome {...home({ props: { openChanges, openFiles, openBrowser, closeDetails } })} />)

    expect(screen.getByText(zh['status.ready'])).toBeTruthy()
    expect(screen.getByText(zh['activity.empty'])).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: zh['tile.changes'] }))
    expect(openChanges).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: zh['tile.files'] }))
    expect(openFiles).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: zh['tile.browser'] }))
    expect(openBrowser).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: zh['home.close'] }))
    expect(closeDetails).toHaveBeenCalledOnce()
  })

  it('summarizes goal, plan, descendants, jobs, tools, queue, and pending input', () => {
    const child = 'child' as SessionId
    const conversation = {
      ...baseConversation,
      running: true,
      pending: [{ key: 'approval:1', kind: 'approval' }],
      queue: [{ id: 'message' }],
      runningCalls: [{ callId: 'call', name: 'bash' }],
    } as unknown as ConversationSnapshot
    const sessions = {
      ...baseSessions,
      byId: {
        ...baseSessions.byId,
        [child]: {
          id: child,
          displayTitle: 'Child',
          origin: 'subagent',
          parentId: sessionId,
          running: true,
          blank: false,
          updatedAt: 1,
        },
      },
      jobsBySession: {
        [sessionId]: [{ id: 'job', label: 'Build preview', kind: 'process', status: 'running', startedAt: 1 }],
      },
    } as unknown as SessionListState
    render(<WorkspaceHome {...home({
      conversation,
      sessions,
      projections: {
        goal: {
          goal: { id: 'goal', revision: 1, objective: 'Ship the dashboard', phase: 'active', maxGoalRounds: 4 },
          roundsStarted: 2,
          createdAt: 1,
          updatedAt: 1,
        },
        plan: { active: true, pending: false },
      },
    })} />)

    expect(screen.getByText(zh['status.attention'])).toBeTruthy()
    expect(screen.getByText(zh['plan.active'])).toBeTruthy()
    expect(screen.getByText('Ship the dashboard')).toBeTruthy()
    expect(screen.getByText('第 2/4 轮')).toBeTruthy()
    const metrics = screen.getByRole('region', { name: zh['metrics.section'] })
    expect(within(metrics).getByText(zh['metric.agents']).previousElementSibling?.textContent).toBe('1')
    expect(within(metrics).getByText(zh['metric.jobs']).previousElementSibling?.textContent).toBe('1')
    expect(within(metrics).getByText(zh['metric.tools']).previousElementSibling?.textContent).toBe('1')
    expect(within(metrics).getByText(zh['metric.queue']).previousElementSibling?.textContent).toBe('1')
    expect(screen.getByText(zh['activity.approval'])).toBeTruthy()
    expect(screen.getByText('bash')).toBeTruthy()
    expect(screen.getByText('Build preview')).toBeTruthy()
  })

  it('shows the highest-priority error while idle', () => {
    const conversation = {
      ...baseConversation,
      lastAgentError: 'provider disconnected',
    } as unknown as ConversationSnapshot
    render(<WorkspaceHome {...home({ conversation })} />)
    expect(screen.getByText(zh['status.error'])).toBeTruthy()
    expect(screen.getByText('provider disconnected')).toBeTruthy()
  })

  it('the plus control returns to task overview', () => {
    const openWorkspaceHome = vi.fn()
    render(<WorkspaceHome {...home({ props: { openWorkspaceHome } })} />)
    fireEvent.click(screen.getByRole('button', { name: zh['home.open'] }))
    expect(openWorkspaceHome).toHaveBeenCalledOnce()
  })
})
