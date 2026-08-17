/** Frame-wide task center, notification inbox, and application command palette. */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { SessionId, SessionListState, WorkspaceListState } from '@deepseek-ai/dsh-client-runtime/client'
import {
  IconCheckOutline16,
  IconCloseOutline16,
  IconSearchOutline16,
  StateDot,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SnapshotSelectorHook, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { LayoutController } from './service.ts'
import type { GlobalOverlayView } from './stores.ts'
import { NS } from './locales.ts'
import css from './GlobalWorkbench.module.css'

type TaskState = 'running' | 'waiting' | 'completed' | 'failed'

interface TaskRow {
  id: SessionId
  title: string
  workspace?: string
  state: TaskState
  detail?: string
  updatedAt: number
  unread: boolean
}

/** Props injected by the root workbench. */
export interface GlobalWorkbenchProps {
  view: Exclude<GlobalOverlayView, null>
  useSessions: SnapshotSelectorHook<SessionListState>
  useWorkspaces: SnapshotSelectorHook<WorkspaceListState>
  commands: LayoutController
  openSession: (sessionId: SessionId) => void
  close: () => void
  openTasks: () => void
  openInbox: () => void
  t: TranslateNS<typeof NS>
}

function taskRows(sessions: SessionListState, workspaces: WorkspaceListState): TaskRow[] {
  const workspaceBySession = new Map<SessionId, string>()
  for (const workspace of workspaces.items) {
    for (const id of workspace.sessionIds) workspaceBySession.set(id, workspace.title)
  }
  return sessions.ids
    .flatMap((id): TaskRow[] => {
      const summary = sessions.byId[id]
      if (summary === undefined || summary.blank || summary.origin === 'subagent') return []
      const jobs = sessions.jobsBySession[summary.id] ?? []
      const failed = jobs.find(job => job.status === 'failed')
      const liveJob = jobs.find(job => job.status === 'running' || job.status === 'stopping')
      const state: TaskState = summary.pendingInteraction !== undefined
        ? 'waiting'
        : failed !== undefined
          ? 'failed'
          : summary.running || liveJob !== undefined
            ? 'running'
            : 'completed'
      const workspace = workspaceBySession.get(summary.id)
      const detail = summary.pendingInteraction ?? failed?.label ?? liveJob?.label
      return [{
        id: summary.id,
        title: summary.displayTitle,
        ...(workspace === undefined ? {} : { workspace }),
        state,
        ...(detail === undefined ? {} : { detail }),
        updatedAt: summary.updatedAt,
        unread: summary.completed === true || summary.pendingInteraction !== undefined || failed !== undefined,
      }]
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

function stateDot(state: TaskState) {
  if (state === 'running') return <StateDot state="ongoing" />
  if (state === 'waiting') return <StateDot state="warning" />
  if (state === 'failed') return <StateDot state="error" />
  return <StateDot state="done" />
}

function TaskPanel(props: GlobalWorkbenchProps) {
  const sessions = props.useSessions(value => value)
  const workspaces = props.useWorkspaces(value => value)
  const rows = useMemo(() => taskRows(sessions, workspaces), [sessions, workspaces])
  const visible = props.view === 'inbox' ? rows.filter(row => row.unread) : rows
  const counts = {
    running: rows.filter(row => row.state === 'running').length,
    waiting: rows.filter(row => row.state === 'waiting').length,
    completed: rows.filter(row => row.state === 'completed').length,
    failed: rows.filter(row => row.state === 'failed').length,
  }

  return (
    <div className={css.panel} role="dialog" aria-modal="true" aria-label={props.t(props.view === 'inbox' ? 'global.inbox' : 'global.tasks')}>
      <header className={css.header}>
        <div>
          <h1>{props.t(props.view === 'inbox' ? 'global.inbox' : 'global.tasks')}</h1>
          <p>{props.t(props.view === 'inbox' ? 'global.inboxDescription' : 'global.tasksDescription')}</p>
        </div>
        <button type="button" className={css.close} aria-label={props.t('global.close')} onClick={props.close}>
          <IconCloseOutline16 />
        </button>
      </header>
      <nav className={css.tabs}>
        <button type="button" aria-current={props.view === 'tasks'} onClick={props.openTasks}>{props.t('global.tasks')}</button>
        <button type="button" aria-current={props.view === 'inbox'} onClick={props.openInbox}>
          {props.t('global.inbox')}
          {rows.some(row => row.unread) ? <span className={css.badge}>{rows.filter(row => row.unread).length}</span> : null}
        </button>
      </nav>
      {props.view === 'tasks' ? (
        <div className={css.metrics}>
          {(['running', 'waiting', 'completed', 'failed'] as const).map(state => (
            <div key={state}><strong>{counts[state]}</strong><span>{props.t(`global.state.${state}`)}</span></div>
          ))}
        </div>
      ) : null}
      <div className={css.taskList}>
        {visible.length === 0 ? (
          <div className={css.empty}>
            <IconCheckOutline16 size={22} />
            <span>{props.t(props.view === 'inbox' ? 'global.inboxEmpty' : 'global.tasksEmpty')}</span>
          </div>
        ) : visible.map(row => (
          <button
            type="button"
            key={row.id}
            className={css.taskRow}
            onClick={() => { props.openSession(row.id); props.close() }}
          >
            <span className={css.state}>{stateDot(row.state)}</span>
            <span className={css.taskText}>
              <strong>{row.title}</strong>
              <span>{row.workspace ?? props.t('global.noWorkspace')}</span>
            </span>
            <span className={css.taskMeta}>
              <span data-state={row.state}>{props.t(`global.state.${row.state}`)}</span>
              {row.detail === undefined ? null : <small title={row.detail}>{row.detail}</small>}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function CommandPalette(props: GlobalWorkbenchProps) {
  const commands = useSyncExternalStore(props.commands.subscribeCommands, props.commands.getCommands, props.commands.getCommands)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { input.current?.focus() }, [])
  const normalized = query.trim().toLocaleLowerCase()
  const matches = commands.filter((command) => {
    if (normalized === '') return true
    return [command.title(), ...(command.keywords?.() ?? [])]
      .some(value => value.toLocaleLowerCase().includes(normalized))
  })
  useEffect(() => { setActive(0) }, [query])

  const execute = (index: number) => {
    const command = matches[index]
    if (command === undefined) return
    props.close()
    command.run()
  }
  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive(value => Math.min(value + 1, Math.max(0, matches.length - 1)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(value => Math.max(0, value - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      execute(active)
    }
  }

  return (
    <div className={`${css.panel} ${css.commandPanel}`} role="dialog" aria-modal="true" aria-label={props.t('command.title')}>
      <div className={css.commandSearch}>
        <IconSearchOutline16 />
        <input
          ref={input}
          value={query}
          placeholder={props.t('command.placeholder')}
          aria-label={props.t('command.placeholder')}
          onChange={(event) => { setQuery(event.target.value) }}
          onKeyDown={onKeyDown}
        />
        <kbd>Esc</kbd>
      </div>
      <div className={css.commandList} role="listbox">
        {matches.length === 0 ? <p className={css.commandEmpty}>{props.t('command.empty')}</p> : matches.map((command, index) => (
          <button
            type="button"
            key={command.id}
            role="option"
            aria-selected={index === active}
            className={index === active ? css.commandActive : undefined}
            onMouseEnter={() => { setActive(index) }}
            onClick={() => { execute(index) }}
          >
            <span>{command.title()}</span>
            {command.shortcut === undefined ? null : <kbd>{command.shortcut}</kbd>}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Render the selected global workbench overlay. */
export function GlobalWorkbench(props: GlobalWorkbenchProps) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') props.close() }
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('keydown', close) }
  }, [props.close])
  return (
    <div className={css.overlay} data-global-workbench={props.view}>
      <button type="button" className={css.mask} aria-label={props.t('global.close')} onClick={props.close} />
      {props.view === 'commands' ? <CommandPalette {...props} /> : <TaskPanel {...props} />}
    </div>
  )
}
