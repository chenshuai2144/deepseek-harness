// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import { BrowserPanel, type BrowserPanelProps } from '../src/client/BrowserPanel.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
})

const SESSION = 'session' as SessionId
const t: BrowserPanelProps['t'] = makeTranslate(zh)

function props(over: Partial<BrowserPanelProps> = {}): BrowserPanelProps {
  return {
    sessionId: SESSION,
    href: null,
    useSession: () => { throw new Error('unused') },
    useSessions: () => { throw new Error('unused') },
    useWorkspaces: () => { throw new Error('unused') },
    openPage: vi.fn(),
    showHome: vi.fn(),
    closeDetails: vi.fn(),
    productOrigin: 'https://workbench.test',
    t,
    ...over,
  } as BrowserPanelProps
}

describe('BrowserPanel', () => {
  it('returns to the workspace home from the back control and closes from the header', () => {
    const showHome = vi.fn()
    const closeDetails = vi.fn()
    render(<BrowserPanel {...props({ showHome, closeDetails })} />)
    fireEvent.click(screen.getByRole('button', { name: zh['action.back'] }))
    expect(showHome).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: zh['action.close'] }))
    expect(closeDetails).toHaveBeenCalledOnce()
    expect(screen.getByText(zh.empty)).toBeTruthy()
  })

  it('opens an accepted address and shows the iframe', () => {
    const openPage = vi.fn()
    const { rerender } = render(<BrowserPanel {...props({ openPage })} />)
    fireEvent.change(screen.getByRole('textbox', { name: zh.address }), {
      target: { value: 'example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: zh['action.go'] }))
    expect(openPage).toHaveBeenCalledWith('https://example.com/')
    rerender(<BrowserPanel {...props({ openPage, href: 'https://example.com/' })} />)
    const frame = screen.getByTitle(zh.frame)
    expect(frame.getAttribute('src')).toBe('https://example.com/')
    expect(frame.getAttribute('sandbox')).toContain('allow-scripts')
  })

  it('reports a refused address and does not open a page', () => {
    const openPage = vi.fn()
    render(<BrowserPanel {...props({ openPage })} />)
    fireEvent.change(screen.getByRole('textbox', { name: zh.address }), {
      target: { value: 'javascript:alert(1)' },
    })
    fireEvent.submit(screen.getByRole('textbox', { name: zh.address }).closest('form')!)
    expect(openPage).not.toHaveBeenCalled()
    expect(screen.getByText(zh['error.protocol'])).toBeTruthy()
  })

  it('maps each remaining refusal onto pane copy', () => {
    const openPage = vi.fn()
    const { rerender } = render(<BrowserPanel {...props({ openPage })} />)
    fireEvent.change(screen.getByRole('textbox', { name: zh.address }), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: zh['action.go'] }))
    expect(screen.getByText(zh['error.empty'])).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: zh.address }), {
      target: { value: 'https://user:pass@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: zh['action.go'] }))
    expect(screen.getByText(zh['error.invalid'])).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: zh.address }), {
      target: { value: 'https://127.0.0.1/' },
    })
    fireEvent.click(screen.getByRole('button', { name: zh['action.go'] }))
    expect(screen.getByText(zh['error.loopback'])).toBeTruthy()
    expect(openPage).not.toHaveBeenCalled()
    rerender(<BrowserPanel {...props({ href: 'https://example.com/' })} />)
    expect(screen.queryByText(zh['error.loopback'])).toBeNull()
  })
})
