/**
 * Right-column task dashboard and workspace navigation home. It projects the
 * current Session, goal, plan, subagents, and background jobs without issuing
 * RPCs or owning durable state.
 */
import type {} from '@deepseek-ai/dsh-goal/client'
import type {} from '@deepseek-ai/dsh-plan-mode/client'
import { indexSubagentDescendants } from '@deepseek-ai/dsh-client-runtime/client'
import {
  IconBranchOutline16,
  IconFolderOpenOutline16,
  IconGlobeOutline14,
  StateDot,
  type StateDotState,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from './locales.ts'
import css from './WorkspaceHome.module.css'

/** Injected layout writes for the workspace home. */
export interface WorkspaceHomeInjected {
  /** Open the Changes (SCM) list. */
  openChanges: () => void
  /** Open the File tree. */
  openFiles: () => void
  /** Open the Simple Browser. */
  openBrowser: () => void
  /** Return this column to the workspace home. */
  openWorkspaceHome: () => void
  /** Close the details column. */
  closeDetails: () => void
}

/** Full props for the workspace home occupant. */
export type WorkspaceHomeProps =
  PropsRuntime<'details.home'> & PropsLocale<typeof NS> & WorkspaceHomeInjected

type DashboardStatus = 'removed' | 'attention' | 'error' | 'running' | 'queued' | 'ready'

const STATUS_DOT: Record<DashboardStatus, StateDotState> = {
  removed: 'warning',
  attention: 'warning',
  error: 'error',
  running: 'ongoing',
  queued: 'ongoing',
  ready: 'done',
}

/** Closed status priority for one Session dashboard. */
function dashboardStatus(input: {
  removed: boolean
  pendingCount: number
  error: string | null
  running: boolean
  queuedCount: number
}): DashboardStatus {
  if (input.removed) return 'removed'
  if (input.pendingCount > 0) return 'attention'
  if (input.error !== null) return 'error'
  if (input.running) return 'running'
  if (input.queuedCount > 0) return 'queued'
  return 'ready'
}

/** One activity row from an already-materialized client projection. */
function ActivityRow({ state, label, detail }: { state: StateDotState; label: string; detail?: string }) {
  return (
    <li className={css.activityRow}>
      <StateDot state={state} className={css.activityDot} />
      <span className={css.activityLabel}>{label}</span>
      {detail === undefined ? null : <span className={css.activityDetail} title={detail}>{detail}</span>}
    </li>
  )
}

/** Metric cell with a stable label/value reading order. */
function Metric({ label, value, active = false }: { label: string; value: number; active?: boolean }) {
  return (
    <div className={active ? `${css.metric} ${css.metricActive}` : css.metric}>
      <span className={css.metricValue}>{value}</span>
      <span className={css.metricLabel}>{label}</span>
    </div>
  )
}

/** Human label for an answerable interaction kind. */
function pendingLabel(kind: string, t: TranslateNS<typeof NS>): string {
  switch (kind) {
    case 'approval': return t('activity.approval')
    case 'question': return t('activity.question')
    default: return t('activity.review')
  }
}

/**
 * Task dashboard: current collaboration state, live activity, and workspace tools.
 * @param props - session projections, locale, and layout writes.
 * @returns the dashboard body.
 */
export function WorkspaceHome({
  sessionId,
  useSession,
  useSessions,
  useProjection,
  openChanges,
  openFiles,
  openBrowser,
  openWorkspaceHome,
  closeDetails,
  t,
}: WorkspaceHomeProps) {
  const running = useSession(snapshot => snapshot.running)
  const removed = useSession(snapshot => snapshot.removed)
  const pending = useSession(snapshot => snapshot.pending)
  const queue = useSession(snapshot => snapshot.queue)
  const runningCalls = useSession(snapshot => snapshot.runningCalls)
  const lastAgentError = useSession(snapshot => snapshot.lastAgentError)
  const promptError = useSession(snapshot => snapshot.promptError?.error.message ?? null)
  const openError = useSession(snapshot => snapshot.openError?.message ?? null)
  const summaries = useSessions(state => state.byId)
  const jobs = useSessions(state => state.jobsBySession[sessionId] ?? [])
  const goal = useProjection('goal')
  const plan = useProjection('plan')

  const descendants = indexSubagentDescendants(summaries).get(sessionId)
    ?? { count: 0, runningCount: 0 }
  const liveJobs = jobs.filter(job => job.status === 'running' || job.status === 'stopping')
  const error = lastAgentError ?? promptError ?? openError
  const status = dashboardStatus({
    removed,
    pendingCount: pending.length,
    error,
    running,
    queuedCount: queue.length,
  })
  const planTarget = plan === undefined ? false : plan.pending ? !plan.active : plan.active
  const goalView = goal == null ? undefined : { snapshot: goal.goal, roundsStarted: goal.roundsStarted }
  const hasActivity = pending.length > 0 || runningCalls.length > 0 || liveJobs.length > 0 || queue.length > 0

  return (
    <div className={css.root} data-testid="workspace-home">
      <div className={css.header}>
        <button
          type="button"
          className={css.iconButton}
          aria-label={t('home.open')}
          onClick={() => { openWorkspaceHome() }}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <div className={css.title}>{t('home.title')}</div>
        <button
          type="button"
          className={css.iconButton}
          aria-label={t('home.close')}
          onClick={() => { closeDetails() }}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className={css.scroll}>
        <section className={css.statusCard} aria-label={t('status.section')}>
          <div className={css.statusLine}>
            <StateDot state={STATUS_DOT[status]} />
            <span className={css.statusLabel}>{t(`status.${status}`)}</span>
            {planTarget ? <span className={css.planChip}>{t(plan?.pending ? 'plan.pending' : 'plan.active')}</span> : null}
          </div>
          {error === null ? null : <p className={css.errorText} title={error}>{error}</p>}
          {goalView === undefined ? null : (
            <div className={css.goal}>
              <span className={css.eyebrow}>{t(`goal.${goalView.snapshot.phase}`)}</span>
              <span className={css.goalText} title={goalView.snapshot.objective}>{goalView.snapshot.objective}</span>
              <span className={css.goalRounds}>{t('goal.rounds', { current: goalView.roundsStarted, max: goalView.snapshot.maxGoalRounds })}</span>
            </div>
          )}
        </section>

        <section className={css.metrics} aria-label={t('metrics.section')}>
          <Metric label={t('metric.agents')} value={descendants.count} active={descendants.runningCount > 0} />
          <Metric label={t('metric.jobs')} value={liveJobs.length} active={liveJobs.length > 0} />
          <Metric label={t('metric.tools')} value={runningCalls.length} active={runningCalls.length > 0} />
          <Metric label={t('metric.queue')} value={queue.length} active={queue.length > 0} />
        </section>

        <section className={css.section} aria-label={t('activity.section')}>
          <h2 className={css.sectionTitle}>{t('activity.title')}</h2>
          {hasActivity ? (
            <ul className={css.activityList}>
              {pending.slice(0, 2).map(wait => (
                <ActivityRow key={wait.key} state="warning" label={pendingLabel(wait.kind, t)} />
              ))}
              {runningCalls.slice(0, 3).map(call => (
                <ActivityRow key={call.callId} state="ongoing" label={t('activity.tool')} detail={call.name} />
              ))}
              {liveJobs.slice(0, 3).map(job => (
                <ActivityRow key={job.id} state={job.status === 'stopping' ? 'warning' : 'ongoing'} label={t('activity.job')} detail={job.label} />
              ))}
              {queue.length === 0 ? null : (
                <ActivityRow state="ongoing" label={t('activity.queued')} detail={t('activity.queuedCount', { count: queue.length })} />
              )}
            </ul>
          ) : <p className={css.emptyActivity}>{t('activity.empty')}</p>}
        </section>

        <section className={css.section} aria-label={t('tools.section')}>
          <h2 className={css.sectionTitle}>{t('tools.title')}</h2>
          <div className={css.tiles}>
            <button type="button" className={css.tile} onClick={() => { openChanges() }}>
              <IconBranchOutline16 size={22} />
              <span>{t('tile.changes')}</span>
            </button>
            <button type="button" className={css.tile} onClick={() => { openFiles() }}>
              <IconFolderOpenOutline16 size={22} />
              <span>{t('tile.files')}</span>
            </button>
            <button type="button" className={css.tile} onClick={() => { openBrowser() }}>
              <IconGlobeOutline14 size={22} />
              <span>{t('tile.browser')}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
