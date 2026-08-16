/**
 * LayoutController: the cross-plugin panel-action face behind ctx.layout.
 * Panel geometry itself lives in the root entry's layout store (stores.ts);
 * the current-session selection lives with the runtime sessions service, and
 * the per-session active view dissolved into ui-conversation's session store
 * (its only consumer). What remains here is the contract other plugins'
 * apply worlds reach for panel transitions (sidebar toggle from ui-sidebar,
 * details open/close from ui-conversation, SCM details from ui-scm) — writes
 * stay inside the store's declared action set, delivered as the registration's
 * bound actions.
 */
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type { createLayoutStore, ScmSelection, SidebarView } from './stores.ts'

export type { DetailsView, ScmSelection, SidebarView } from './stores.ts'

/** The layout store's bound action set (framework-baked, draft params peeled). */
export type PanelActions = BoundActions<ReturnType<typeof createLayoutStore>>

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
  /** Switch the sidebar occupant (`agent` sessions or `scm`). Viewing state. */
  setSidebarView(view: SidebarView): void
  /**
   * Open the details panel on an SCM file diff.
   * @param selection - workspace-relative path and staged/unstaged side.
   */
  openScmDetails(selection: ScmSelection): void
}

/** Cross-plugin panel-action face (ctx.layout). */
export class LayoutController implements ILayout {
  #panels: PanelActions | undefined

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

  #require(): PanelActions {
    // Callers are UI gestures, which cannot fire before the root entry
    // rendered (the inject hook runs in its first render) — reaching this
    // unwired is a boot-order bug, not a race to tolerate.
    if (this.#panels === undefined) throw new Error('layout: panel actions not wired (root entry not mounted)')
    return this.#panels
  }
}
