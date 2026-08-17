/**
 * LayoutController behavior: the cross-plugin panel-action face. Geometry
 * lives in the entry store (layout-store.spec.ts) — here we assert the
 * delegation contract: attachPanels wiring, the three actions forwarding, the
 * unwired fail-loud, and re-attach overwriting a stale action set.
 */
import { describe, expect, it, vi } from 'vitest'
import { LayoutController } from '@deepseek-ai/dsh-client-ui-layout/src/client/service.ts'
import type { PanelActions } from '@deepseek-ai/dsh-client-ui-layout/src/client/service.ts'

function fakePanels(): PanelActions {
  return {
    setSidebar: vi.fn(),
    setDetails: vi.fn(),
    toggleSidebar: vi.fn(),
    setNarrow: vi.fn(),
    openDetails: vi.fn(),
    closeDetails: vi.fn(),
    openWorkspaceHome: vi.fn(),
    openChanges: vi.fn(),
    openFiles: vi.fn(),
    openFileDetails: vi.fn(),
    openBrowser: vi.fn(),
    openBrowserPage: vi.fn(),
    setSidebarView: vi.fn(),
    openScmDetails: vi.fn(),
    openScmDetailsInOrder: vi.fn(),
    openTaskCenter: vi.fn(),
    openInbox: vi.fn(),
    openCommandPalette: vi.fn(),
    closeGlobalOverlay: vi.fn(),
    openQuickFile: vi.fn(),
  }
}

describe('LayoutController', () => {
  it('forwards the three panel actions to the attached set', () => {
    const service = new LayoutController()
    const panels = fakePanels()
    service.attachPanels(panels)

    service.toggleSidebar()
    service.openDetails()
    service.closeDetails()
    service.openWorkspaceHome()
    service.openChanges()
    service.openFiles()
    service.openFileDetails({ path: 'src/a.ts' })
    service.openBrowser()
    service.openBrowserPage('https://example.com/')
    service.setSidebarView('scm')
    service.openScmDetails({ path: 'a.ts', staged: true })
    service.openScmDetailsInOrder({ path: 'b.ts', staged: false }, [{ path: 'b.ts', staged: false }])
    service.openTaskCenter()
    service.openInbox()
    service.openCommandPalette()
    service.closeGlobalOverlay()
    service.openQuickFile()

    expect(panels.toggleSidebar).toHaveBeenCalledTimes(1)
    expect(panels.openDetails).toHaveBeenCalledTimes(1)
    expect(panels.closeDetails).toHaveBeenCalledTimes(1)
    expect(panels.openWorkspaceHome).toHaveBeenCalledTimes(1)
    expect(panels.openChanges).toHaveBeenCalledTimes(1)
    expect(panels.openFiles).toHaveBeenCalledTimes(1)
    expect(panels.openFileDetails).toHaveBeenCalledWith({ path: 'src/a.ts' })
    expect(panels.openBrowser).toHaveBeenCalledTimes(1)
    expect(panels.openBrowserPage).toHaveBeenCalledWith('https://example.com/')
    expect(panels.setSidebarView).toHaveBeenCalledWith('scm')
    expect(panels.openScmDetails).toHaveBeenCalledWith({ path: 'a.ts', staged: true })
    expect(panels.openScmDetailsInOrder).toHaveBeenCalledWith(
      { path: 'b.ts', staged: false },
      [{ path: 'b.ts', staged: false }],
    )
    expect(panels.openTaskCenter).toHaveBeenCalledOnce()
    expect(panels.openInbox).toHaveBeenCalledOnce()
    expect(panels.openCommandPalette).toHaveBeenCalledOnce()
    expect(panels.closeGlobalOverlay).toHaveBeenCalledOnce()
    expect(panels.openQuickFile).toHaveBeenCalledOnce()
    expect(panels.setSidebar).not.toHaveBeenCalled()
    expect(panels.setDetails).not.toHaveBeenCalled()
  })

  it('fails loud before the root entry wired its actions', () => {
    const service = new LayoutController()
    expect(() => { service.toggleSidebar() }).toThrow(/panel actions not wired/)
    expect(() => { service.openDetails() }).toThrow(/panel actions not wired/)
    expect(() => { service.closeDetails() }).toThrow(/panel actions not wired/)
  })

  it('re-attach overwrites the stale action set (entry re-register)', () => {
    const service = new LayoutController()
    const stale = fakePanels()
    const fresh = fakePanels()
    service.attachPanels(stale)
    service.attachPanels(fresh)

    service.toggleSidebar()

    expect(stale.toggleSidebar).not.toHaveBeenCalled()
    expect(fresh.toggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('publishes command registration and removal with duplicate-id protection', () => {
    const service = new LayoutController()
    const listener = vi.fn()
    const offListener = service.subscribeCommands(listener)
    const command = { id: 'test.open', title: () => 'Open', run: vi.fn() }
    const dispose = service.registerCommand(command)

    expect(service.getCommands()).toEqual([command])
    expect(listener).toHaveBeenCalledOnce()
    expect(() => { service.registerCommand(command) }).toThrow(/duplicate application command/)

    dispose()
    dispose()
    expect(service.getCommands()).toEqual([])
    expect(listener).toHaveBeenCalledTimes(2)
    offListener()
  })
})
