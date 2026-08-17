/**
 * LayoutController: the cross-plugin panel-action face behind ctx.layout.
 * Panel geometry itself lives in the root entry's layout store (stores.ts);
 * the current-session selection lives with the runtime sessions service, and
 * the per-session active view dissolved into ui-conversation's session store
 * (its only consumer). What remains here is the contract other plugins'
 * apply worlds reach for panel transitions (sidebar toggle from ui-sidebar,
 * details open/close from ui-conversation, File from ui-file, Browser from
 * ui-browser, SCM details from ui-scm) — writes
 * stay inside the store's declared action set, delivered as the registration's
 * bound actions.
 */
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type { createLayoutStore, FileSelection, ScmSelection, SidebarView } from './stores.ts'

export type { DetailsView, FileSelection, ScmSelection, SidebarView } from './stores.ts'

/** The layout store's bound action set (framework-baked, draft params peeled). */
export type PanelActions = BoundActions<ReturnType<typeof createLayoutStore>>

/** One application command contributed to the global command palette. */
export interface AppCommand {
  /** Stable command id. */
  id: string
  /** Locale-following command label. */
  title: () => string
  /** Additional locale-following search terms. */
  keywords?: () => readonly string[]
  /** Optional shortcut label shown beside the command. */
  shortcut?: string
  /** Execute the command. */
  run: () => void
}

/**
 * The outward layout face (`ctx.layout`): the panel transitions other
 * plugins may trigger — and exactly what a test fake must supply. The
 * attachPanels wiring hook stays on the concrete class (root-entry assembly
 * only).
 */
export interface ILayout {
  /** Toggle the sidebar panel (closed ⟷ contract default width). */
  toggleSidebar(): void
  /** Open the conversation-tool details panel (no-op when already open). */
  openDetails(): void
  /** Close the details panel. */
  closeDetails(): void
  /** Open the right-column workspace home. */
  openWorkspaceHome(): void
  /** Open the right-column Changes (SCM) list. */
  openChanges(): void
  /** Open the right-column File tree. */
  openFiles(): void
  /**
   * Open the details panel on a workspace file preview.
   * @param selection - workspace-relative path.
   */
  openFileDetails(selection: FileSelection): void
  /** Open the right-column Simple Browser. */
  openBrowser(): void
  /**
   * Open the Simple Browser on one http(s) address.
   * @param href - absolute http(s) URL already accepted by the Browser pane.
   */
  openBrowserPage(href: string): void
  /** Switch the sidebar occupant (`agent` sessions or `scm`). Viewing state. */
  setSidebarView(view: SidebarView): void
  /**
   * Open the details panel on an SCM file diff.
   * @param selection - workspace-relative path and staged/unstaged side.
   */
  openScmDetails(selection: ScmSelection): void
  /**
   * Open an SCM diff with its file navigation order.
   * @param selection - selected staged or unstaged path.
   * @param order - ordered paths captured from the Changes list.
   */
  openScmDetailsInOrder(selection: ScmSelection, order: readonly ScmSelection[]): void
  /** Open the global task center. */
  openTaskCenter(): void
  /** Open the notification inbox. */
  openInbox(): void
  /** Open the application command palette. */
  openCommandPalette(): void
  /** Close the active global overlay. */
  closeGlobalOverlay(): void
  /** Open the File pane and focus quick open. */
  openQuickFile(): void
  /**
   * Register one application command.
   * @param command - command contribution with a stable id.
   * @returns disposer that removes the command.
   */
  registerCommand(command: AppCommand): () => void
}

/** Cross-plugin panel-action face (ctx.layout). */
export class LayoutController implements ILayout {
  #panels: PanelActions | undefined
  #commands = new Map<string, AppCommand>()
  #commandSnapshot: readonly AppCommand[] = []
  #commandListeners = new Set<() => void>()

  /**
   * Read the current application-command contributions.
   * @returns current command contribution snapshot.
   */
  readonly getCommands = (): readonly AppCommand[] => this.#commandSnapshot

  /**
   * Subscribe to command contribution changes.
   * @param listener - callback invoked after the snapshot changes.
   * @returns subscription disposer.
   */
  readonly subscribeCommands = (listener: () => void): (() => void) => {
    this.#commandListeners.add(listener)
    return () => { this.#commandListeners.delete(listener) }
  }

  /**
   * Adopt the root entry's bound store actions. Called from the root
   * registration's inject hook (a sanctioned assembly side effect), so the
   * face is live from the entry's first render; on entry re-register the
   * fresh actions overwrite the stale set.
   * @param actions - bound actions of the entry's layout store instance.
   */
  attachPanels(actions: PanelActions): void {
    this.#panels = actions
  }

  /** Toggle the sidebar panel (closed ⟷ contract default width). */
  toggleSidebar(): void {
    this.#require().toggleSidebar()
  }

  /** Open the conversation-tool details panel (no-op when already open). */
  openDetails(): void {
    this.#require().openDetails()
  }

  /** Close the details panel. */
  closeDetails(): void {
    this.#require().closeDetails()
  }

  /** Open the right-column workspace home. */
  openWorkspaceHome(): void {
    this.#require().openWorkspaceHome()
  }

  /** Open the right-column Changes (SCM) list. */
  openChanges(): void {
    this.#require().openChanges()
  }

  /** Open the right-column File tree. */
  openFiles(): void {
    this.#require().openFiles()
  }

  /**
   * Open the details panel on a workspace file preview.
   * @param selection - workspace-relative path.
   */
  openFileDetails(selection: FileSelection): void {
    this.#require().openFileDetails(selection)
  }

  /** Open the right-column Simple Browser. */
  openBrowser(): void {
    this.#require().openBrowser()
  }

  /**
   * Open the Simple Browser on one http(s) address.
   * @param href - absolute http(s) URL already accepted by the Browser pane.
   */
  openBrowserPage(href: string): void {
    this.#require().openBrowserPage(href)
  }

  /**
   * Switch the sidebar occupant.
   * @param view - `agent` (sessions) or `scm`.
   */
  setSidebarView(view: SidebarView): void {
    this.#require().setSidebarView(view)
  }

  /**
   * Open the details panel on an SCM file diff.
   * @param selection - workspace-relative path and staged/unstaged side.
   */
  openScmDetails(selection: ScmSelection): void {
    this.#require().openScmDetails(selection)
  }

  /**
   * Open an SCM diff with its file navigation order.
   * @param selection - selected staged or unstaged path.
   * @param order - ordered paths captured from the Changes list.
   */
  openScmDetailsInOrder(selection: ScmSelection, order: readonly ScmSelection[]): void {
    this.#require().openScmDetailsInOrder(selection, [...order])
  }

  /** Open the global task center. */
  openTaskCenter(): void { this.#require().openTaskCenter() }

  /** Open the notification inbox. */
  openInbox(): void { this.#require().openInbox() }

  /** Open the application command palette. */
  openCommandPalette(): void { this.#require().openCommandPalette() }

  /** Close the active global overlay. */
  closeGlobalOverlay(): void { this.#require().closeGlobalOverlay() }

  /** Open the File pane and focus quick open. */
  openQuickFile(): void { this.#require().openQuickFile() }

  /**
   * Register one application command.
   * @param command - command contribution with a stable id.
   * @returns disposer that removes the command.
   */
  registerCommand(command: AppCommand): () => void {
    if (this.#commands.has(command.id)) throw new Error(`layout: duplicate application command "${command.id}"`)
    this.#commands.set(command.id, command)
    this.#publishCommands()
    let active = true
    return () => {
      if (!active) return
      active = false
      this.#commands.delete(command.id)
      this.#publishCommands()
    }
  }

  #publishCommands(): void {
    this.#commandSnapshot = [...this.#commands.values()]
    for (const listener of [...this.#commandListeners]) {
      try {
        listener()
      } catch (error) {
        console.error('[ui-layout] command listener threw:', error)
      }
    }
  }

  #require(): PanelActions {
    // Callers are UI gestures, which cannot fire before the root entry
    // rendered (the inject hook runs in its first render) — reaching this
    // unwired is a boot-order bug, not a race to tolerate.
    if (this.#panels === undefined) throw new Error('layout: panel actions not wired (root entry not mounted)')
    return this.#panels
  }
}
