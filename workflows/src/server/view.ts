import {HUMAN_STAGES, TERMINAL_STAGES} from '../definitions'
import {clients} from './clients'
import {fileStatus, type FileStatus} from './index'

/** Who did what, in words a citizen understands. */
export const AGENTS: Record<string, string> = {
  'clerk-review': 'Clerk Third Class (AI)',
  'weather-review': 'Ministry of Weather (AI)',
}

interface SnapshotStage {
  name: string
  title?: string
  description?: string
  transitions?: {name: string; to: string; title?: string; when?: string}[]
}

interface Actor {
  id: string
  kind: string
}

interface HistoryRow {
  _key: string
  _type: string
  at: string
  actor?: Actor
  executionContext?: {id?: string; kind?: string; runtime?: string}
  stage?: string
  fromStage?: string
  toStage?: string
  transition?: string
  action?: string
  activity?: string
  triggered?: boolean
  effect?: string
  status?: string
  outputs?: Record<string, unknown>
}

export interface TimelineEvent {
  key: string
  at: string
  kind: 'filed' | 'agent' | 'action' | 'transition'
  who: string
  text: string
  rule?: string
}

export interface FileView {
  reference: string
  applicantName: string
  submittedAt: string
  answers: FileStatus['application']['answers']
  memos: FileStatus['application']['memos']
  permit: FileStatus['application']['permit']
  workflow: {name: string; title: string; version: number}
  stage: {name: string; title: string; description?: string}
  terminal: boolean
  waitingOn: 'agent' | 'citizen' | 'official' | null
  workingAgents: string[]
  rail: {name: string; title: string; state: 'done' | 'current' | 'upcoming'}[]
  timeline: TimelineEvent[]
  signatures: {stage: string; name: string; at: string; decision: string}[]
  denialReason?: string
  instanceId: string
}

/**
 * Officials stamp from the App SDK desk under their own Sanity identity, which stays on the
 * (private) instance. The public site only ever shows the role, never a real person's name.
 */
function actorName(actor: Actor | undefined, via?: string): string {
  if (!actor) return 'The Bureau'
  if (via === 'bureau-web') return 'A visiting official (public site)'
  return actor.kind === 'person' ? 'Bureau staff (Stamp Desk)' : 'The Bureau'
}

export async function fileView(reference: string): Promise<FileView> {
  const {application, instance} = await fileStatus(reference)
  const snapshot = JSON.parse(instance.definitionSnapshot) as {name: string; title?: string; version: number; stages: SnapshotStage[]}
  const stages = snapshot.stages
  const current = instance.currentStage
  const history = instance.history as unknown as HistoryRow[]
  const visited = new Set(history.filter((h) => h._type === 'stageEntered').map((h) => h.stage!))
  const stageTitle = (name?: string) => stages.find((s) => s.name === name)?.title ?? name ?? ''

  // The main line: every non-terminal stage except the citizen loop (shown only once used), then the outcome.
  const terminal = (TERMINAL_STAGES as readonly string[]).includes(current)
  const outcome = terminal ? current : 'issued'
  const rail = stages
    .filter((s) => !(TERMINAL_STAGES as readonly string[]).includes(s.name))
    .filter((s) => s.name !== 'awaiting-citizen' || visited.has(s.name))
    .concat(stages.filter((s) => s.name === outcome))
    .map((s) => ({
      name: s.name,
      title: s.title ?? s.name,
      state: (s.name === current ? 'current' : visited.has(s.name) ? 'done' : 'upcoming') as 'done' | 'current' | 'upcoming',
    }))

  const rules = new Map(stages.flatMap((s) => (s.transitions ?? []).map((t) => [`${s.name}:${t.name}`, t.when ?? 'always'] as const)))
  const timeline: TimelineEvent[] = []
  const signatures: FileView['signatures'] = []
  for (const h of history) {
    if (h._type === 'stageEntered' && !h.fromStage) {
      timeline.push({key: h._key, at: h.at, kind: 'filed', who: application.applicantName, text: `Filed. Opened at "${stageTitle(h.stage)}".`})
    } else if (h._type === 'effectCompleted') {
      const verdict = typeof h.outputs?.verdict === 'string' ? h.outputs.verdict : h.status
      timeline.push({key: h._key, at: h.at, kind: 'agent', who: AGENTS[h.effect!] ?? h.effect!, text: `Ruled: ${verdict}.`})
    } else if (h._type === 'actionFired' && !h.triggered) {
      const who = h.action === 'resubmit' ? application.applicantName : actorName(h.actor, h.executionContext?.id)
      const text = h.action === 'resubmit' ? 'Replied with the requested paperwork.' : h.action === 'approve' ? 'Stamped APPROVED.' : h.action === 'deny' ? 'Stamped DENIED.' : `Fired "${h.action}".`
      timeline.push({key: h._key, at: h.at, kind: 'action', who, text})
      if (h.action === 'approve' || h.action === 'deny') signatures.push({stage: stageTitle(h.stage), name: who, at: h.at, decision: h.action})
    } else if (h._type === 'transitionFired') {
      timeline.push({
        key: h._key,
        at: h.at,
        kind: 'transition',
        who: 'Workflow engine',
        text: `Moved from "${stageTitle(h.fromStage)}" to "${stageTitle(h.toStage)}".`,
        rule: rules.get(`${h.fromStage}:${h.transition}`),
      })
    }
  }

  const workingAgents = (instance.pendingEffects ?? []).map((e) => AGENTS[e.name] ?? e.name)
  const waitingOn = terminal
    ? null
    : workingAgents.length || current === 'intake' || current === 'meteorology'
      ? 'agent'
      : current === 'awaiting-citizen'
        ? 'citizen'
        : (HUMAN_STAGES as readonly string[]).includes(current)
          ? 'official'
          : null
  const stage = stages.find((s) => s.name === current)

  return {
    reference: application.reference,
    applicantName: application.applicantName,
    submittedAt: application.submittedAt,
    answers: application.answers ?? [],
    memos: application.memos ?? [],
    permit: application.permit,
    workflow: {name: snapshot.name, title: snapshot.title ?? snapshot.name, version: snapshot.version},
    stage: {name: current, title: stage?.title ?? current, description: stage?.description},
    terminal,
    waitingOn,
    workingAgents,
    rail,
    timeline,
    signatures,
    denialReason: (instance.fields.find((f) => f.name === 'denialReason')?.value as string | null) ?? undefined,
    instanceId: instance._id,
  }
}

export interface DeskItem {
  reference: string
  applicantName: string
  permit: string
  stage: string
  since: string
}

/** Files waiting on a human official, for the public visiting desk. */
export async function deskQueue(): Promise<DeskItem[]> {
  const {content, workflow} = clients()
  const instances = await workflow.fetch<{_id: string; currentStage: string; lastChangedAt: string}[]>(
    `*[_type == "sanity.workflow.instance" && tag == "prod" && definition != "booth-inspection" && currentStage in $stages && !defined(abortedAt)] | order(lastChangedAt asc)[0...50]{_id, currentStage, lastChangedAt}`,
    {stages: [...HUMAN_STAGES]},
  )
  if (!instances.length) return []
  const apps = await content.fetch<{reference: string; applicantName: string; permit: string; instanceId: string}[]>(
    `*[_type == "application" && instanceId in $ids]{reference, applicantName, "permit": permitType->title, instanceId}`,
    {ids: instances.map((i) => i._id)},
  )
  const byInstance = new Map(apps.map((a) => [a.instanceId, a]))
  return instances.flatMap((i) => {
    const a = byInstance.get(i._id)
    return a ? [{reference: a.reference, applicantName: a.applicantName, permit: a.permit, stage: i.currentStage === 'countersign' ? "Minister's countersignature" : "Under-Secretary's desk", since: i.lastChangedAt}] : []
  })
}

/** Live counts for the lobby display. */
export async function bureauStats() {
  const {workflow} = clients()
  return workflow.fetch<{filed: number; issued: number; denied: number; waiting: number; inFlight: number}>(
    `{
      "filed": count(*[_type == "sanity.workflow.instance" && tag == "prod" && definition != "booth-inspection"]),
      "issued": count(*[_type == "sanity.workflow.instance" && tag == "prod" && definition != "booth-inspection" && currentStage == "issued"]),
      "denied": count(*[_type == "sanity.workflow.instance" && tag == "prod" && definition != "booth-inspection" && currentStage in ["denied", "referred"]]),
      "waiting": count(*[_type == "sanity.workflow.instance" && tag == "prod" && definition != "booth-inspection" && currentStage in $human]),
      "inFlight": count(*[_type == "sanity.workflow.instance" && tag == "prod" && definition != "booth-inspection" && !(currentStage in ["issued", "denied", "referred"])])
    }`,
    {human: [...HUMAN_STAGES]},
  )
}

/** The deployed definitions, read back from the workflows dataset, for the "How it works" page. */
export async function deployedDefinitions() {
  const {workflow} = clients()
  return workflow.fetch<{_id: string; name: string; title: string; description?: string; version: number; initialStage: string; stages: SnapshotStage[]}[]>(
    `*[_type == "sanity.workflow.definition" && tag == "prod"] | order(name asc){_id, name, title, description, version, initialStage, stages[]{name, title, description, transitions[]{name, to, title, when}, "activities": activities[]{name, title, "actions": actions[]{name, title, when, "effects": effects[].name}}}}`,
  )
}
