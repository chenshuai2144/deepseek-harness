# @deepseek-ai/dsh-client-ui-layout

English | [中文](README.zh.md)

Shell plugin: three-column AppFrame (sidebar | conversation | details, drag handles and concession chain) plus the `ctx.layout` panel-geometry service; it registers into the runtime-owned `root` slot and declares `sidebar.agent`, `conversation`, `details`, `details.home`, `details.changes`, `details.files`, `details.file`, `details.browser`, `details.scm`, and `shell.overlay`. The left column is the Agent session list. The right-column home is a task dashboard over existing client projections: it shows Session status and errors, Goal and Plan state, subagent and background-job counts, running tools, queued messages, pending interactions, and the live activity those records identify. Its workspace actions open Changes (SCM), File, and Browser; Terminal stays absent until it has a real occupant. The dashboard issues no RPC and owns no business state. View selection, SCM file selection, File selection, and the Browser address live in the layout store and never enter the session log. The sidebar resize boundary is an invisible hit strip, while the details boundary retains its floating pill; only details shrinks during concession and then auto-closes. A closed sidebar retains a 56px control rail while details closes to zero width. The package also seats the theme presenter: it consumes resolved `ctx.theme` snapshots and projects them onto the document (`html { color-scheme }` for native UA chrome, `body[data-ds-dark-theme]` from the active color scheme, the theme's alias tokens as inline variables on body, and one owned `<meta name="theme-color">` whose content follows the computed body background). Measuring after palette and token application keeps the rendered background as the single color authority; disposing the presenter removes its metadata node with its other global writes.

The frame also owns a global task center, notification inbox, and application command registry. The task center groups non-blank root Sessions as Running, Waiting for me, Completed, or Failed from the existing Session and background-job projections; selecting a row opens that Session. The inbox shows the existing completion edge, pending interaction, and failed-job signals in one place. `Ctrl+K` opens contributed application commands, while `Ctrl+P` opens the File pane's quick-open search. In the Electron shell, new completion and attention edges are forwarded through the sandboxed preload bridge for native operating-system notifications.

AppFrame always mounts the conversation and details columns; a connected Session renders through `SessionProvider`. The transient layout store starts the sidebar and the workspace home at their default widths, and it never reads or writes `localStorage`. Hero and other unselected states derive a zero rendered details width without changing that stored preference. AppFrame retains the last non-blank Session id across those states: the first Session opens the workspace home, returning to the same Session restores its unchanged width, and selecting a different Session returns the column to home before paint. The conversation owner share is empty, while the sidebar owner share contains only `collapsed` and `width`; registrants obtain business data from standard hooks and actions from their own inject faces.

The `/client` exports are the plugin body (`apply`/`inject`), `LayoutController`, and the owner-share interfaces. AppFrame, the panel store, and the concession solver remain package-internal.

## Model Experience

None, as the layout shell manages browser viewing state; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

- **Panel geometry is transient** — reload restores the sidebar default and the workspace home; switching between distinct Session ids returns the right column to home, while unselected surfaces render details at zero width without modifying geometry.
- **Concession-chain auto-close derives a zero width without touching the preferred width** — the panel restores itself when the window widens; consumers must not read the stored details width as the rendered truth.
- **No scroll anchoring during squeeze reflow** — layout changes may move the reader's viewport.
- **The dashboard is a live projection, not a task ledger** — it summarizes the current Session window and list mirrors; settled tool calls and historical jobs remain in Chat, Trajectory, and the existing job list rather than accumulating on the home.
