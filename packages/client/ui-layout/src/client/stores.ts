/**
 * The root entry's transient layout store: panel geometry as plain widths in
 * px (0 = closed), plus which sidebar occupant is showing, which workspace
 * occupant the right column shows, and the SCM / File selections.
 * Module level exports the factory only — a module-level handle would pin the
 * store's identity in the module cache (a de-facto singleton surviving plugin
 * reloads). register() receives the factory (exclusive use: the framework
 * instantiates per entry), AppFrame derives its PropsStore share from the
 * return type, and the service face receives the bound actions through the
 * registration's inject hook.
 */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'
import {
  clampWidth, DETAILS_DEFAULT, DETAILS_MAX, DETAILS_MIN,
  SIDEBAR_DEFAULT, SIDEBAR_MAX, SIDEBAR_MIN,
} from './columns.ts'

/** Sidebar occupant. The frame is an Agent workbench, not an IDE activity bar. */
export type SidebarView = 'agent' | 'scm'

/** Which details occupant the frame renders while the panel is open. */
export type DetailsView = 'home' | 'changes' | 'files' | 'file' | 'conversation' | 'scm'

/** SCM file the details column should show; viewing state, not a session event. */
export interface ScmSelection {
  /** Workspace-relative path. */
  path: string
  /** True when the row is the staged copy. */
  staged: boolean
}

/** Workspace file the details column should show; viewing state, not a session event. */
export interface FileSelection {
  /** Workspace-relative path using `/`. */
  path: string
}

/**
 * Layout store state: panel width preferences in px (0 = closed), plus the
 * narrow-viewport pair — `narrow` mirrors AppFrame's breakpoint reading
 * (viewport < SIDEBAR_AUTO_COLLAPSE) so toggleSidebar can pick semantics, and
 * `narrowExpanded` is the manual override that re-expands the auto-collapsed
 * sidebar over the squeezed center without rewriting the width preference.
 * `sidebarView` / `detailsView` / `scmSelection` / `fileSelection` are viewing
 * state and never enter the session log.
 */
export type LayoutState = {
  sidebar: number
  details: number
  narrow: boolean
  narrowExpanded: boolean
  sidebarView: SidebarView
  detailsView: DetailsView
  scmSelection: ScmSelection | null
  fileSelection: FileSelection | null
}

/**
 * Annotation twin of the actions literal below (the export needs a declared
 * return type); drift fails assignability at the defineStore call.
 */
type LayoutActions = {
  setSidebar: (draft: LayoutState, px: number) => void
  setDetails: (draft: LayoutState, px: number) => void
  toggleSidebar: (draft: LayoutState) => void
  setNarrow: (draft: LayoutState, narrow: boolean) => void
  openDetails: (draft: LayoutState) => void
  closeDetails: (draft: LayoutState) => void
  openWorkspaceHome: (draft: LayoutState) => void
  openChanges: (draft: LayoutState) => void
  openFiles: (draft: LayoutState) => void
  openFileDetails: (draft: LayoutState, selection: FileSelection) => void
  setSidebarView: (draft: LayoutState, view: SidebarView) => void
  openScmDetails: (draft: LayoutState, selection: ScmSelection) => void
}

/**
 * Create the layout panel store handle. The preference IS the width, so
 * closing a panel forgets its drag width — reopening restores the contract
 * default. Actions are the complete write set: drag writes clamp
 * into the panel's contract range and never cross the open/closed line;
 * open/close transitions write 0 / the default explicitly. Below the
 * auto-collapse breakpoint (AppFrame feeds setNarrow) the sidebar toggle
 * flips the narrowExpanded override instead of the preference.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export function createLayoutStore(): EngineStoreHandle<LayoutState, LayoutActions>  {
  const handle = defineStore({
    init: (): LayoutState => ({
      sidebar: SIDEBAR_DEFAULT,
      details: DETAILS_DEFAULT,
      narrow: false,
      narrowExpanded: false,
      sidebarView: 'agent',
      detailsView: 'home',
      scmSelection: null,
      fileSelection: null,
    }),
    actions: {
      setSidebar: (d, px: number) => { d.sidebar = clampWidth(px, SIDEBAR_MIN, SIDEBAR_MAX) },
      setDetails: (d, px: number) => { d.details = clampWidth(px, DETAILS_MIN, DETAILS_MAX) },
      // Narrow toggles flip only the override: the width preference survives
      // untouched, so re-widening restores the pre-squeeze layout.
      toggleSidebar: (d) => {
        if (d.narrow) d.narrowExpanded = !d.narrowExpanded
        else d.sidebar = d.sidebar === 0 ? SIDEBAR_DEFAULT : 0
      },
      // Crossing the breakpoint in either direction drops the override: the
      // narrow default is auto-collapsed, the wide state is the preference.
      setNarrow: (d, narrow: boolean) => {
        if (d.narrow === narrow) return
        d.narrow = narrow
        d.narrowExpanded = false
      },
      openDetails: (d) => {
        d.detailsView = 'conversation'
        if (d.details === 0) d.details = DETAILS_DEFAULT
      },
      closeDetails: (d) => { d.details = 0 },
      openWorkspaceHome: (d) => {
        d.detailsView = 'home'
        if (d.details === 0) d.details = DETAILS_DEFAULT
      },
      openChanges: (d) => {
        d.detailsView = 'changes'
        if (d.details === 0) d.details = DETAILS_DEFAULT
      },
      openFiles: (d) => {
        d.detailsView = 'files'
        if (d.details === 0) d.details = DETAILS_DEFAULT
      },
      openFileDetails: (d, selection: FileSelection) => {
        d.fileSelection = selection
        d.detailsView = 'file'
        if (d.details === 0) d.details = DETAILS_DEFAULT
      },
      setSidebarView: (d, view: SidebarView) => { d.sidebarView = view },
      openScmDetails: (d, selection: ScmSelection) => {
        d.scmSelection = selection
        d.detailsView = 'scm'
        if (d.details === 0) d.details = DETAILS_DEFAULT
      },
    },
  })
  return handle
}
