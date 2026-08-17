# Agent Note: Client task dashboard

Status: implemented

English | [中文](2026-08-17-client-task-dashboard.zh.md)

## Problem

The Web client exposes Session status, goals, plan mode, subagents, background jobs, tool execution, pending interaction, and queued input through separate controls. A person can inspect each fact, but the right-column workspace home previously contained only navigation tiles, so following a task required moving between the conversation header, composer, sidebar, and Trajectory.

The missing product view is a compact current-task summary. It must not introduce another task state model or infer outcomes that the existing records do not establish.

## Decision

The `details.home` occupant is the task dashboard. It reads the current `ConversationSnapshot`, Session list mirrors, and the existing `goal` and `plan` projections through framework-standard hooks. It issues no RPC, appends no Session event, and owns no business state.

The status line uses a closed priority: removed Session, answerable interaction, error, running turn, queued input, then ready. This order makes a required human action visible even while the Agent still reports running. The dashboard displays the first available Agent, prompt, or open error without classifying it further.

Four metrics report subagent descendants, live background jobs, running root tool calls, and queued inputs. Subagent totals use the runtime's ordinary-fork-aware lineage index. Jobs count only `running` and `stopping`; settled jobs remain available from the existing header list. Tool rows use the current in-flight call projection, and activity rows remain bounded so the narrow details column does not become a second transcript.

The Goal block renders the durable objective, phase, and admitted round count. The Plan chip renders the folded effective target (`pending ? !active : active`). Capability absence omits each block instead of rendering an unavailable placeholder.

Changes, File, and Browser remain workspace actions below the summary. Switching Sessions returns the right column to this dashboard through the existing layout behavior.

The same layout owner provides three root overlays. The task center derives one row per non-blank, non-subagent Session and applies this priority: pending interaction, failed background job, running Session or live job, then completed. The notification inbox filters those rows to existing completion edges, pending interactions, and failed jobs. Selecting either row calls the existing Session open action; neither overlay persists read state or introduces another status record.

`LayoutController` also owns a disposable application-command registry. Layout contributes Task Center, Notifications, Changes, File, quick file, and Browser commands; Settings contributes Settings and Plugins. `Ctrl+K` opens the command palette and `Ctrl+P` invokes quick file. Contributions use locale-following label functions so a locale change does not require re-registration.

Quick file builds a bounded recursive filename index through the existing `fs.listDir` RPC, excluding `.git` and `node_modules`. Ranking prefers basename prefixes, basename substrings, path substrings, then subsequences. The layout store keeps eight recent workspace-relative paths, while previews provide breadcrumbs and path copying. These are frame-local viewing records rather than Session events.

The Changes list obtains aggregate line counts through the existing per-file `git.diff` RPC and reads file count and upstream distance from `git.status`. It carries the visible change order into SCM details for previous and next navigation. Stage all, unstage all, and commit continue through the existing Git API; a successful commit renders its abbreviated id.

The Electron preload bridge exposes one additional `notify` call. The main process validates and bounds renderer strings before constructing an Electron `Notification`; clicking it reveals and focuses the workbench window. The renderer detects only absent-to-present attention and incomplete-to-complete transitions after its initial Session-list baseline, so application startup does not replay old notifications.

## Alternatives considered

**Add a task aggregate to the Host.** Rejected because every displayed fact already has an authoritative client projection. A Host aggregate would duplicate ordering and freshness rules and would make the UI change alter a product protocol.

**Create a separate dashboard package and slot.** Rejected because `details.home` already owns the exact placement and navigation lifecycle. A second occupant would add a view-selection state for the same home responsibility.

**Render complete historical activity.** Rejected because Chat and Trajectory own durable history. Duplicating it in the dashboard would require pagination, event interpretation, and another navigation model; the dashboard therefore shows live work only.

**Add Host RPCs for task groups, notification read state, file search, or Git summaries.** Rejected because each requested view can be computed from existing client projections and privileged APIs. New Host records would duplicate Session lifecycle facts and expand the protocol for presentation-only behavior.

## Consequences

Opening the right column gives one view of the task's current collaboration state and workspace actions without changing model input, persistence, or Host behavior. Status and metrics update from the same push-driven stores as their specialized controls.

The dashboard cannot distinguish subagent completion, failure, and cancellation beyond the existing running state, and it does not preserve settled activity. Those limits are visible properties of the source projections rather than dashboard-specific fallback guesses.

The global Failed group reflects failed background jobs because `SessionSummary` has no dormant-session error field. Opening a Session still exposes its complete conversation error projection. Quick-file scanning is bounded to 5,000 files and rebuilt on demand rather than maintained by a watcher. Native notifications exist only when the Electron bridge and operating-system notification support are present; web behavior is unchanged.
