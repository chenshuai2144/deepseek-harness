// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { WorkspaceHomeAction, type WorkspaceHomeActionProps } from '../src/client/skeleton/WorkspaceHomeAction.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
})

const t: WorkspaceHomeActionProps['t'] = makeTranslate(zh)

describe('WorkspaceHomeAction', () => {
  it('reopens the workspace home from the session header', () => {
    const openWorkspaceHome = vi.fn()
    render(<WorkspaceHomeAction
      sessionId={'session' as WorkspaceHomeActionProps['sessionId']}
      useSession={() => { throw new Error('unused') }}
      useSessions={() => { throw new Error('unused') }}
      useWorkspaces={() => { throw new Error('unused') }}
      openWorkspaceHome={openWorkspaceHome}
      t={t}
    />)
    fireEvent.click(screen.getByRole('button', { name: zh['workspace.open'] }))
    expect(openWorkspaceHome).toHaveBeenCalledOnce()
  })
})
