// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { ScmEntry, type ScmEntryProps } from '../src/client/ScmEntry.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
})

const t: ScmEntryProps['t'] = makeTranslate(zh)

function entry(over: Partial<ScmEntryProps> = {}): ScmEntryProps {
  return {
    wide: true,
    showScmView: vi.fn(),
    useSessions: () => { throw new Error('unused') },
    useWorkspaces: () => { throw new Error('unused') },
    t,
    ...over,
  }
}

describe('ScmEntry', () => {
  it('opens the SCM view from the agent sidebar foot', () => {
    const showScmView = vi.fn()
    render(<ScmEntry {...entry({ showScmView })} />)
    fireEvent.click(screen.getByRole('button', { name: zh.title }))
    expect(showScmView).toHaveBeenCalledOnce()
    expect(screen.getByText(zh.title)).toBeTruthy()
  })

  it('hides the label on the collapsed rail', () => {
    render(<ScmEntry {...entry({ wide: false })} />)
    expect(screen.queryByText(zh.title)).toBeNull()
    expect(screen.getByRole('button', { name: zh.title })).toBeTruthy()
  })
})
