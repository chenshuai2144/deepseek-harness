# Agent Note: Right-column workspace pane — home and Changes

Status: implemented

English | [中文](2026-08-16-right-column-workspace-pane.zh.md)

## Problem

The right column was a tool-call details panel that started closed. Users looking at an Agent workbench expect a workspace pane they can open without first clicking a tool card. The [workbench note](2026-08-14-opensumi-like-workbench-agent-scm.md) put SCM in the left sidebar foot so the frame would not grow an activity bar. That kept Git reachable, but it replaced the session list and left the right column empty until a tool or a file was selected.

## Decision

The right column is a workspace pane. [`ui-layout`](../../../../packages/client/ui-layout/README.md) owns `details.home` (this package's `WorkspaceHome`) and `details.changes`. A connected Session opens the home at the contract default width. The home renders only live tiles; the first tile is Changes. [`ui-scm`](../../../../packages/client/ui-scm/README.md) occupies `details.changes` and still occupies `details.scm` for a file diff. Tool-call details still occupy `details` through `openDetails()`. `+` on the home, Changes, file-diff, and tool-details occupants returns to home; close still writes `details` to zero. The session-header workspace control reopens a closed pane. Switching Session ids returns the column to home. The left column stays the Agent session list; `sidebar.scm` and the sidebar-foot SCM control are gone.

`detailsView` is `'home' | 'changes' | 'conversation' | 'scm'`. Viewing state stays in the layout store and never enters the session log. File, Terminal, and Browser tiles stay off the home until each has a Host surface and a real occupant.

This note owns the pane location. The workbench note still owns the homemade-shell, no-OpenSumi, and Git capability-seam decisions.

## Alternatives considered

**Keep SCM in the sidebar foot and leave the right column as tool details.** That matches the earlier workbench note, but it is not a workspace pane: the session list disappears when Git is open, and the right column stays empty until a tool card or a file click.

**Ship a 2×2 home with File, Terminal, and Browser tiles that do nothing.** The workbench rule forbids empty IDE seats. Those three need new privileged RPC, a human PTY GUI, or an Electron webview.

**Open the workspace pane only after an explicit click.** A connected Session already has a workspace; hiding the pane until the user hunts for a control repeats the closed-details problem.

## Consequences

A Session shows the workspace home without a tool click. Closing the pane is still allowed; reopening is the session-header control or `openWorkspaceHome` / `openChanges` / `openDetails`. File, Terminal, and Browser remain later PRs. Narrow viewports still auto-close details through the existing concession chain.
