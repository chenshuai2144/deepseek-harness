/**
 * Layout plugin, browser half: one register() call contributes AppFrame into
 * the runtime's built-in 'root' slot and, in the same breath, declares the
 * workbench child slots (declaration = exclusive render authority), seats the
 * layout store (panel geometry + sidebar occupant), and wires the
 * panel-action service face. ctx.layout is the cross-plugin panel-action
 * contract; navigation state lives with the runtime sessions service. A
 * second effect seats the theme presenter, which projects ctx.theme snapshots
 * onto document.body.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { PanelActions } from './service.ts'
import { AppFrame } from './AppFrame.tsx'
import { createLayoutStore, type FileSelection, type ScmSelection } from './stores.ts'
import { LayoutController } from './service.ts'
import { ThemePresenter } from './theme-presenter.ts'
import { WorkspaceHome } from './WorkspaceHome.tsx'
import { en, NS, zh, type LayoutKey } from './locales.ts'

// Contract exports only (export-convergence rule: cross-package consumers
// keep a symbol exported; test-only/package-internal symbols live off /src).
// ILayout: the ctx.layout face consumers and test fakes type against.
// OwnerShare contracts below are the render-side halves registrants compose
// against; the frame components and the store factory are package-internal.
export { LayoutController } from './service.ts'
export type { AppCommand, ILayout } from './service.ts'
export type { DetailsView, FileSelection, GlobalOverlayView, ScmSelection, SidebarView } from './stores.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** The outward face only; the concrete service stays inside this plugin. */
    layout: import('./service.ts').ILayout
  }
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Task-dashboard and workspace-navigation copy. */
    layout: LayoutKey
  }
  interface SlotMap {
    // The 'root' entry itself is the runtime's built-in slot (declared
    // there); these children are declared by the same register() call that
    // contributes AppFrame. Session owners never pass sessionId: the
    // framework injects it as a standard prop.
    /**
     * Agent sidebar view (workspaces / sessions / settings). OCCUPIED by
     * ui-sidebar's SidebarRoot. The occupant receives the frame's live
     * column state (collapsed, width) and is expected to render the compact
     * control rail while collapsed.
     */
    'sidebar.agent': { kind: 'single'; scope: 'root'; owner: SidebarOwnerProps }
    /**
     * Right-column task dashboard. OCCUPIED by this package's WorkspaceHome.
     * It reads existing Session projections and opens the implemented
     * workspace occupants; Terminal stays absent until it has a real view.
     */
    'details.home': { kind: 'single'; scope: 'session'; owner: DetailsOwnerProps }
    /**
     * Source-control list in the right column. OCCUPIED by ui-scm. Opened
     * from the workspace home Changes tile, not an IDE activity bar.
     */
    'details.changes': { kind: 'single'; scope: 'session'; owner: DetailsOwnerProps }
    /**
     * Workspace file tree in the right column. OCCUPIED by ui-file. Opened
     * from the workspace home File tile.
     */
    'details.files': { kind: 'single'; scope: 'session'; owner: FileListOwnerProps }
    /**
     * Read-only workspace file preview. OCCUPIED by ui-file. The owner
     * passes the current file selection (or null while none is chosen).
     */
    'details.file': { kind: 'single'; scope: 'session'; owner: FileDetailsOwnerProps }
    /**
     * Simple Browser in the right column. OCCUPIED by ui-browser. The owner
     * passes the committed http(s) address (or null before the first Go).
     */
    'details.browser': { kind: 'single'; scope: 'session'; owner: BrowserDetailsOwnerProps }
    /**
     * The whole center column, across both the no-session hero and a live
     * conversation. OCCUPIED by ui-conversation's ConversationRoot, which
     * declares the session body, composer, and input seats inside it —
     * registering here replaces the entire conversation surface (and removes
     * every seat it declares) rather than adding to it.
     *
     * Current-session-optional: the occupant owns both states without
     * changing its React identity, so it keeps its own state across a session
     * switch. It receives no owner props; session facts arrive through the
     * framework hooks of the `session-maybe` scope.
     */
    'conversation': { kind: 'single'; scope: 'session-maybe'; owner: ConvOwnerProps }
    /**
     * The right details column, shown when the layout opens it. OCCUPIED by
     * ui-conversation's DetailsPanel, which declares the tool-details seat
     * inside it — registering here replaces the column and takes that seat
     * with it. Absent an occupant the column renders nothing.
     *
     * No owner props: the framework injects the session id and hooks for the
     * `session` scope, and `ctx.layout` owns whether the column is open.
     */
    'details': { kind: 'single'; scope: 'session'; owner: DetailsOwnerProps }
    /**
     * SCM file-diff body in the details column. OCCUPIED by ui-scm. The owner
     * passes the current SCM selection (or null while none is chosen).
     */
    'details.scm': { kind: 'single'; scope: 'session'; owner: ScmDetailsOwnerProps }
    /**
     * Frame-wide floating layer, above every column and outside their scroll
     * containers. Deliberately generic and unowned by any feature: a badge, a
     * toast stack or a status pill all belong here, and entries order among
     * themselves. The layer itself is click-through — entries opt back into
     * pointer events — so an occupant never blocks the app underneath.
     *
     * This is the additive seat for a frame-wide surface of your own: a fresh
     * `id` is added beside the shipped entries instead of replacing them.
     */
    'shell.overlay': { kind: 'list'; scope: 'root' }
  }
}

// OwnerShare contracts — the render-side share the slot owner supplies at
// renderSlot. Registrants IMPORT these and compose their full component props
// through the four-share intersection (PropsRuntime & PropsRenderSlots &
// PropsStore & I). Conversation business state and actions arrive through
// framework-standard hooks and each registrant's inject face, not owner props.

/** Sidebar owner share: live column state from the frame's concession solve. */
export interface SidebarOwnerProps {
  /** True when the sidebar is closed (the column renders the compact control rail). */
  collapsed: boolean
  /** Rendered column width in px (SIDEBAR_COLLAPSED when collapsed). */
  width: number
}

/** Conversation owner share: business state and actions belong to the registrant. */
export interface ConvOwnerProps {}

/** Details owner share: empty — Session hooks and id arrive as framework-standard props. */
export interface DetailsOwnerProps {}

/** File-list owner share: root viewing state retained across File-pane visits. */
export interface FileListOwnerProps {
  /** Most recently previewed workspace-relative paths. */
  recentFiles: readonly string[]
  /** Monotonic request that asks the File pane to focus quick open. */
  quickFileRequest: number
}

/** SCM details owner share: the file the SCM panel selected. */
export interface ScmDetailsOwnerProps {
  /** Selected path and staged/unstaged side, or null while none is chosen. */
  selection: ScmSelection | null
  /** File order captured from the Changes list for previous/next navigation. */
  order: readonly ScmSelection[]
}

/** File preview owner share: the workspace file the tree selected. */
export interface FileDetailsOwnerProps {
  /** Selected workspace-relative path, or null while none is chosen. */
  selection: FileSelection | null
}

/** Browser owner share: the committed page address. */
export interface BrowserDetailsOwnerProps {
  /** Absolute http(s) URL, or null before the first accepted Go. */
  href: string | null
}

/** Required services (cordis fiber inject — the loader passes all module exports as an object plugin). */
export const inject = ['slots', 'theme', 'locale', 'sessions']

/**
 * Client plugin body: provide ctx.layout, then one register() call — AppFrame
 * into 'root' with the workbench child-slot declarations, the layout store
 * seat, the workspace-home occupant, and the inject hook that hands the
 * store's bound actions to the service.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-layout: dictionaries')
  const layout = new LayoutController()
  ctx.effect(() => {
    const disposeService = ctx.reflect.provide('layout', layout)
    const disposeRegistration = ctx.slots.register({
      name: 'root',
      children: {
        'sidebar.agent': { kind: 'single', scope: 'root' },
        'conversation': { kind: 'single', scope: 'session-maybe' },
        'details': { kind: 'single', scope: 'session' },
        'details.home': { kind: 'single', scope: 'session' },
        'details.changes': { kind: 'single', scope: 'session' },
        'details.files': { kind: 'single', scope: 'session' },
        'details.file': { kind: 'single', scope: 'session' },
        'details.browser': { kind: 'single', scope: 'session' },
        'details.scm': { kind: 'single', scope: 'session' },
        'shell.overlay': { kind: 'list', scope: 'root' },
      },
      // Exclusive store: the factory itself — the framework instantiates per
      // entry and delivers useStore/actions to AppFrame as standard props.
      store: createLayoutStore,
      locale: NS,
      // The hook's only side effect connects the root store to ctx.layout;
      // conversation business actions belong to their registrants.
      inject: (actions: PanelActions) => {
        layout.attachPanels(actions)
        return {
          commands: layout,
          openSession: (sessionId: Parameters<typeof ctx.sessions.open>[0]) => { ctx.sessions.open(sessionId) },
        }
      },
    }, AppFrame)
    const disposeHome = ctx.slots.register({
      name: 'details.home',
      locale: NS,
      inject: () => ({
        openChanges: () => { layout.openChanges() },
        openFiles: () => { layout.openFiles() },
        openBrowser: () => { layout.openBrowser() },
        openWorkspaceHome: () => { layout.openWorkspaceHome() },
        closeDetails: () => { layout.closeDetails() },
      }),
    }, WorkspaceHome)
    return () => {
      disposeHome()
      disposeRegistration()
      // provide()'s disposer settles asynchronously; teardown is synchronous fire-and-forget.
      void disposeService()
    }
  }, 'ui-layout: service + root registration')

  const t = ctx.locale.bind(NS)
  ctx.effect(function* () {
    yield layout.registerCommand({
      id: 'workbench.tasks', title: () => t('command.tasks'), keywords: () => [t('global.tasks')],
      run: () => { layout.openTaskCenter() },
    })
    yield layout.registerCommand({
      id: 'workbench.inbox', title: () => t('command.inbox'), keywords: () => [t('global.inbox')],
      run: () => { layout.openInbox() },
    })
    yield layout.registerCommand({
      id: 'workbench.changes', title: () => t('command.changes'), keywords: () => [t('tile.changes')],
      run: () => { layout.openChanges() },
    })
    yield layout.registerCommand({
      id: 'workbench.files', title: () => t('command.files'), keywords: () => [t('tile.files')],
      run: () => { layout.openFiles() },
    })
    yield layout.registerCommand({
      id: 'workbench.quickFile', title: () => t('command.quickFile'), shortcut: 'Ctrl+P',
      keywords: () => [t('tile.files')], run: () => { layout.openQuickFile() },
    })
    yield layout.registerCommand({
      id: 'workbench.browser', title: () => t('command.browser'), keywords: () => [t('tile.browser')],
      run: () => { layout.openBrowser() },
    })
  }, 'ui-layout: built-in application commands')

  // Theme presentation: pure DOM writes from resolved snapshots — initial
  // state through the getter once, then event-driven only; no React path.
  ctx.effect(() => {
    const presenter = new ThemePresenter()
    presenter.apply(ctx.theme.getTheme())
    const off = ctx.on('theme/change', (snapshot) => { presenter.apply(snapshot) })
    return () => {
      off()
      presenter.dispose()
    }
  }, 'ui-layout: theme presenter')
}
