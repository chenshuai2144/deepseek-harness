// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { WorkspaceHome, type WorkspaceHomeProps } from '../src/client/WorkspaceHome.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
})

const t: WorkspaceHomeProps['t'] = makeTranslate(zh)

function home(over: Partial<WorkspaceHomeProps> = {}): WorkspaceHomeProps {
  return {
    sessionId: 'session' as WorkspaceHomeProps['sessionId'],
    useSession: () => { throw new Error('unused') },
    useSessions: () => { throw new Error('unused') },
    useWorkspaces: () => { throw new Error('unused') },
    openChanges: vi.fn(),
    openWorkspaceHome: vi.fn(),
    closeDetails: vi.fn(),
    t,
    ...over,
  } as WorkspaceHomeProps
}

describe('WorkspaceHome', () => {
  it('opens Changes from the live tile and closes from the header', () => {
    const openChanges = vi.fn()
    const closeDetails = vi.fn()
    render(<WorkspaceHome {...home({ openChanges, closeDetails })} />)
    fireEvent.click(screen.getByRole('button', { name: zh['tile.changes'] }))
    expect(openChanges).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: zh['home.close'] }))
    expect(closeDetails).toHaveBeenCalledOnce()
  })

  it('the plus control returns to workspace home', () => {
    const openWorkspaceHome = vi.fn()
    render(<WorkspaceHome {...home({ openWorkspaceHome })} />)
    fireEvent.click(screen.getByRole('button', { name: zh['home.open'] }))
    expect(openWorkspaceHome).toHaveBeenCalledOnce()
  })
})
