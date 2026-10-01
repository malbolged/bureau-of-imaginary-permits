import {useClient, useCurrentUser, useQuery} from '@sanity/sdk-react'
import {extractDocumentId, type ParsedGdr, type WorkflowInstance} from '@sanity/workflow-engine'
import {useWorkflowEngine, useWorkflowInstances, useWorkflowSession} from '@sanity/workflow-sdk'
import {Suspense, useCallback, useState} from 'react'

import {CONTENT_DATASET, PROJECT_ID, WORKFLOW_RESOURCE, WORKFLOW_TAG} from '@bureau/workflows/config'

type Engine = ReturnType<typeof useWorkflowEngine>

const STAGE_TITLE: Record<string, string> = {
  stamping: "Under-Secretary's desk",
  countersign: "Minister's countersignature",
}

/** The application document an instance governs. */
function subjectId(instance: WorkflowInstance): string | null {
  const subject = instance.fields.find((f) => f.name === 'subject')?.value as {id?: string} | null | undefined
  return subject?.id ? extractDocumentId(subject.id) : null
}

export function Desk() {
  const user = useCurrentUser()
  const content = useClient({apiVersion: '2026-04-29', projectId: PROJECT_ID, dataset: CONTENT_DATASET})
  // The engine lives in the `workflows` dataset; subjects (applications) live in `production`.
  const resourceClients = useCallback(
    (gdr: ParsedGdr) => (gdr.scheme === 'dataset' && gdr.dataset === CONTENT_DATASET ? content : undefined),
    [content],
  )
  const engine = useWorkflowEngine({workflowResource: WORKFLOW_RESOURCE, tag: WORKFLOW_TAG, resourceClients})
  const stamping = useWorkflowInstances({engine, filter: {stage: 'stamping'}})
  const countersign = useWorkflowInstances({engine, filter: {stage: 'countersign'}})
  const [selected, setSelected] = useState<string | null>(null)

  const queue = [...(stamping.instances ?? []), ...(countersign.instances ?? [])].sort((a, b) => a.lastChangedAt.localeCompare(b.lastChangedAt))
  const loading = stamping.loading || countersign.loading
  const active = queue.find((i) => i._id === selected) ?? queue[0]

  return (
    <div className="desk">
      <header className="masthead">
        <div>
          <p className="eyebrow">Bureau of Imaginary Permits · Internal</p>
          <h1>Stamp Desk</h1>
        </div>
        <p className="signing">
          Signing as <strong>{user?.name ?? 'an official'}</strong>
        </p>
      </header>

      <div className="layout">
        <section className="queue" aria-label="In-tray">
          <h2>
            In-tray <span className="count">{loading ? '…' : queue.length}</span>
          </h2>
          {!loading && queue.length === 0 && <p className="empty">Nothing awaits your stamp. The clerk is still reading.</p>}
          <ul>
            {queue.map((i) => (
              <li key={i._id}>
                <button className={i._id === active?._id ? 'row selected' : 'row'} onClick={() => setSelected(i._id)}>
                  <Suspense fallback={<span className="muted">{i._id}</span>}>
                    <QueueRow instance={i} />
                  </Suspense>
                </button>
              </li>
            ))}
          </ul>
          {(stamping.error || countersign.error) && <p className="error">Could not read the in-tray.</p>}
        </section>

        <section className="detail">
          {active ? (
            <Suspense fallback={<p className="loading">Fetching the file…</p>}>
              <FileDetail key={active._id} engine={engine} instance={active} />
            </Suspense>
          ) : (
            <p className="empty">Select a file.</p>
          )}
        </section>
      </div>
    </div>
  )
}

interface ApplicationSummary {
  reference: string
  applicantName: string
  permit: string
}

function QueueRow({instance}: {instance: WorkflowInstance}) {
  const id = subjectId(instance)
  const {data} = useQuery<ApplicationSummary | null>({
    query: `*[_id == $id][0]{reference, applicantName, "permit": permitType->title}`,
    params: {id},
    projectId: PROJECT_ID,
    dataset: CONTENT_DATASET,
  })
  return (
    <>
      <span className="ref">{data?.reference ?? '…'}</span>
      <span className="title">{data?.permit}</span>
      <span className="muted">
        {data?.applicantName} · {STAGE_TITLE[instance.currentStage]}
      </span>
    </>
  )
}

interface ApplicationDetail extends ApplicationSummary {
  department: string
  answers: {key: string; question: string; answer: string}[]
  memos: {from: string; verdict: string; text: string; at: string}[]
}

function FileDetail({engine, instance}: {engine: Engine; instance: WorkflowInstance}) {
  const session = useWorkflowSession({engine, instanceId: instance._id})
  const {data: app} = useQuery<ApplicationDetail | null>({
    query: `*[_id == $id][0]{
      reference, applicantName, "permit": permitType->title, "department": permitType->department->name,
      answers[]{key, question, answer}, "memos": coalesce(memos[]{from, verdict, text, at}, [])
    }`,
    params: {id: subjectId(instance)},
    projectId: PROJECT_ID,
    dataset: CONTENT_DATASET,
  })
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // The engine says which actions this official may fire right now; the buttons follow it.
  const stamp = session.evaluation?.currentStage.activities.find((a) => a.activity.name === 'stamp')
  const verdict = (name: string) => stamp?.actions.find((a) => a.action.name === name)

  async function fire(action: 'approve' | 'deny') {
    setBusy(action)
    setError(null)
    try {
      await session.fireAction({activity: 'stamp', action, params: action === 'deny' ? {reason: reason.trim() || 'Insufficiently imaginary.'} : undefined})
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  if (!app) return <p className="error">The application for this file is missing.</p>
  const approve = verdict('approve')
  const deny = verdict('deny')

  return (
    <article className="file">
      <p className="eyebrow">
        File {app.reference} · {app.department}
      </p>
      <h2>{app.permit}</h2>
      <p className="muted">
        Applicant <strong>{app.applicantName}</strong> · {STAGE_TITLE[instance.currentStage]} · workflow{' '}
        <code>
          {instance.definition} v{instance.pinnedVersion}
        </code>
      </p>

      <dl className="answers">
        {app.answers?.map((a) => (
          <div key={a.key}>
            <dt>{a.question}</dt>
            <dd>{a.answer}</dd>
          </div>
        ))}
      </dl>

      <h3>Agent memos</h3>
      <ol className="memos">
        {app.memos.map((m) => (
          <li key={m.at + m.from}>
            <p className="memo-head">
              {m.from === 'clerk' ? 'Clerk Third Class (AI)' : 'Ministry of Weather (AI)'} · {m.verdict}
            </p>
            <p>{m.text}</p>
          </li>
        ))}
      </ol>

      <div className="actions">
        {!session.ready && <p className="muted">Evaluating what you may do…</p>}
        {session.ready && (
          <>
            <button className="stamp-btn approve" disabled={!approve?.allowed || busy !== null} onClick={() => fire('approve')}>
              {busy === 'approve' ? 'Stamping…' : 'Stamp APPROVED'}
            </button>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Grounds for denial" aria-label="Grounds for denial" maxLength={300} />
            <button className="stamp-btn deny" disabled={!deny?.allowed || busy !== null} onClick={() => fire('deny')}>
              {busy === 'deny' ? 'Stamping…' : 'Stamp DENIED'}
            </button>
          </>
        )}
        {approve && !approve.allowed && approve.disabledReason && <p className="muted">Not available: {approve.disabledReason.kind}</p>}
        {error && <p className="error">{error}</p>}
        {session.error && <p className="error">Lost contact with the workflow engine.</p>}
      </div>
    </article>
  )
}
