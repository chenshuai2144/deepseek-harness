// @vitest-environment jsdom
/**
 * createLayoutStore unit account: init shape, the action write set (clamp
 * inside actions), and the absence of browser persistence. Uses the
 * test-sanctioned path: factory self-call + .create() gives the
 * real engine instance (same create path as production).
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createLayoutStore } from '@deepseek-ai/dsh-client-ui-layout/src/client/stores.ts'
import {
  DETAILS_DEFAULT, DETAILS_MAX, DETAILS_MIN,
  SIDEBAR_DEFAULT, SIDEBAR_MAX, SIDEBAR_MIN,
} from '@deepseek-ai/dsh-client-ui-layout/src/client/columns.ts'

const PERSIST_KEY = 'dsh.layout.panels'

beforeEach(() => { localStorage.clear() })

describe('createLayoutStore', () => {
  it('initializes the sidebar and workspace home at their default widths', () => {
    const { store } = createLayoutStore().create()
    expect(store.getSnapshot()).toEqual({
      sidebar: SIDEBAR_DEFAULT, details: DETAILS_DEFAULT, narrow: false, narrowExpanded: false,
      sidebarView: 'agent', detailsView: 'home', scmSelection: null, fileSelection: null, browserHref: null,
      scmOrder: [], recentFiles: [], quickFileRequest: 0, globalOverlay: null,
    })
  })

  it('each create() is an independent instance (factory is not a singleton)', () => {
    const a = createLayoutStore().create()
    const b = createLayoutStore().create()
    a.actions.setSidebar(400)
    expect(b.store.getSnapshot().sidebar).toBe(SIDEBAR_DEFAULT)
  })

  it('setSidebar/setDetails clamp into the contract ranges', () => {
    const { store, actions } = createLayoutStore().create()
    actions.setSidebar(1)
    expect(store.getSnapshot().sidebar).toBe(SIDEBAR_MIN)
    actions.setSidebar(9999)
    expect(store.getSnapshot().sidebar).toBe(SIDEBAR_MAX)
    actions.setDetails(1)
    expect(store.getSnapshot().details).toBe(DETAILS_MIN)
    actions.setDetails(9999)
    expect(store.getSnapshot().details).toBe(DETAILS_MAX)
  })

  it('toggleSidebar flips closed <-> contract default (drag width forgotten)', () => {
    const { store, actions } = createLayoutStore().create()
    actions.setSidebar(400)
    actions.toggleSidebar()
    expect(store.getSnapshot().sidebar).toBe(0)
    actions.toggleSidebar()
    expect(store.getSnapshot().sidebar).toBe(SIDEBAR_DEFAULT)
  })

  it('narrow toggleSidebar flips only the re-expand override; the width preference survives', () => {
    const { store, actions } = createLayoutStore().create()
    actions.setSidebar(400)
    actions.setNarrow(true)
    actions.toggleSidebar()
    expect(store.getSnapshot()).toMatchObject({ sidebar: 400, details: DETAILS_DEFAULT, narrow: true, narrowExpanded: true })
    actions.toggleSidebar()
    expect(store.getSnapshot().narrowExpanded).toBe(false)
    expect(store.getSnapshot().sidebar).toBe(400)
  })

  it('crossing the breakpoint drops the override; a same-value setNarrow keeps it', () => {
    const { store, actions } = createLayoutStore().create()
    actions.setNarrow(true)
    actions.toggleSidebar()
    expect(store.getSnapshot().narrowExpanded).toBe(true)
    actions.setNarrow(true)
    expect(store.getSnapshot().narrowExpanded).toBe(true)
    actions.setNarrow(false)
    expect(store.getSnapshot()).toMatchObject({ narrow: false, narrowExpanded: false })
    actions.setNarrow(true)
    expect(store.getSnapshot().narrowExpanded).toBe(false)
  })

  it('openDetails uses the contract default, preserves an open width, and closeDetails zeroes', () => {
    const { store, actions } = createLayoutStore().create()
    actions.openDetails()
    expect(store.getSnapshot().details).toBe(DETAILS_DEFAULT)
    actions.setDetails(500)
    actions.openDetails()
    expect(store.getSnapshot().details).toBe(500)
    actions.closeDetails()
    expect(store.getSnapshot().details).toBe(0)
  })

  it('setSidebarView writes the sidebar occupant without touching geometry', () => {
    const { store, actions } = createLayoutStore().create()
    actions.setSidebarView('scm')
    expect(store.getSnapshot()).toMatchObject({
      sidebarView: 'scm', sidebar: SIDEBAR_DEFAULT, details: DETAILS_DEFAULT,
    })
  })

  it('openWorkspaceHome and openChanges switch the details occupant and reopen a closed panel', () => {
    const { store, actions } = createLayoutStore().create()
    actions.closeDetails()
    actions.openChanges()
    expect(store.getSnapshot()).toMatchObject({ detailsView: 'changes', details: DETAILS_DEFAULT })
    actions.openWorkspaceHome()
    expect(store.getSnapshot()).toMatchObject({ detailsView: 'home', details: DETAILS_DEFAULT })
  })

  it('openFiles and openFileDetails switch the details occupant and record the file', () => {
    const { store, actions } = createLayoutStore().create()
    actions.closeDetails()
    actions.openFiles()
    expect(store.getSnapshot()).toMatchObject({ detailsView: 'files', details: DETAILS_DEFAULT })
    actions.openFileDetails({ path: 'src/a.ts' })
    expect(store.getSnapshot()).toMatchObject({
      detailsView: 'file',
      fileSelection: { path: 'src/a.ts' },
      details: DETAILS_DEFAULT,
    })
  })

  it('openBrowser and openBrowserPage switch the details occupant and record the address', () => {
    const { store, actions } = createLayoutStore().create()
    actions.closeDetails()
    actions.openBrowser()
    expect(store.getSnapshot()).toMatchObject({ detailsView: 'browser', details: DETAILS_DEFAULT, browserHref: null })
    actions.openBrowserPage('https://example.com/')
    expect(store.getSnapshot()).toMatchObject({
      detailsView: 'browser',
      browserHref: 'https://example.com/',
      details: DETAILS_DEFAULT,
    })
  })

  it('openScmDetails records the file, switches the details occupant, and opens the panel', () => {
    const { store, actions } = createLayoutStore().create()
    actions.openScmDetails({ path: 'src/a.ts', staged: false })
    expect(store.getSnapshot()).toMatchObject({
      detailsView: 'scm',
      scmSelection: { path: 'src/a.ts', staged: false },
      details: DETAILS_DEFAULT,
    })
    actions.openDetails()
    expect(store.getSnapshot().detailsView).toBe('conversation')
    expect(store.getSnapshot().details).toBe(DETAILS_DEFAULT)
  })

  it('does not persist panel geometry', () => {
    const first = createLayoutStore().create()
    first.actions.setSidebar(400)
    first.actions.openDetails()
    first.actions.setDetails(500)
    expect(localStorage.getItem(PERSIST_KEY)).toBeNull()

    const second = createLayoutStore().create()
    expect(second.store.getSnapshot()).toEqual({
      sidebar: SIDEBAR_DEFAULT,
      details: DETAILS_DEFAULT,
      narrow: false,
      narrowExpanded: false,
      sidebarView: 'agent',
      detailsView: 'home',
      scmSelection: null,
      scmOrder: [],
      fileSelection: null,
      recentFiles: [],
      quickFileRequest: 0,
      browserHref: null,
      globalOverlay: null,
    })
  })
})
