import {randomInt, randomUUID} from 'node:crypto'

import {createEngine, type Engine, refDataset, type WorkflowInstance} from '@sanity/workflow-engine'

import {CONTENT_DATASET, PROJECT_ID, WORKFLOW_RESOURCE, WORKFLOW_TAG} from '../config'
import {effectHandlers} from './agents'
import {clients} from './clients'

export {REFERENCE} from './agents'
export {clients} from './clients'

let cachedEngine: Engine | undefined

/**
 * The runtime. The engine is a library: nothing moves unless code calls it. This server is the
 * runtime for agent work (the clerk and the Ministry of Weather) and for citizen actions; the
 * stamp desk (App SDK) fires human actions with the official's own token.
 */
export function engine(): Engine {
  if (cachedEngine) return cachedEngine
  const {content, workflow} = clients()
  cachedEngine = createEngine({
    client: workflow,
    workflowResource: WORKFLOW_RESOURCE,
    tag: WORKFLOW_TAG,
    effects: {handlers: effectHandlers, leaseMs: 120_000},
    resourceClients: (gdr) => (gdr.scheme === 'dataset' && gdr.dataset === CONTENT_DATASET ? content : undefined),
    executionContext: {kind: 'server', id: 'bureau-web'},
  })
  return cachedEngine
}

/** Drain queued agent work until the instance stops producing more (an agent's ruling can queue the next agent). */
export async function settle(instanceId: string) {
  const e = engine()
  for (let round = 0; round < 6; round++) {
    const pending = await e.listPendingEffects({instanceId})
    if (!pending.length) break
    await e.drainEffects({instanceId})
  }
  return e.getInstance({instanceId})
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const newReference = () => `IP-${Array.from({length: 6}, () => ALPHABET[randomInt(ALPHABET.length)]).join('')}`

interface PermitForFiling {
  _id: string
  title: string
  workflow: string
  requirements: {key: string; question: string}[]
}

/** A citizen files an application: content doc first, then a workflow instance governing it. */
export async function fileApplication(input: {permitSlug: string; applicantName: string; answers: Record<string, string>}) {
  const {content} = clients()
  const permit = await content.fetch<PermitForFiling | null>(
    `*[_type == "permitType" && slug.current == $slug][0]{_id, title, workflow, requirements[]{key, question}}`,
    {slug: input.permitSlug},
  )
  if (!permit) throw new UserError('No such permit.')
  const name = input.applicantName.trim().slice(0, 80)
  if (!name) throw new UserError('The Bureau requires a name.')

  const reference = newReference()
  const _id = `application-${reference}`
  await content.create({
    _id,
    _type: 'application',
    reference,
    permitType: {_type: 'reference', _ref: permit._id},
    applicantName: name,
    answers: permit.requirements.map((r) => ({
      _key: r.key,
      _type: 'answer',
      key: r.key,
      question: r.question,
      answer: String(input.answers[r.key] ?? '').slice(0, 1200),
    })),
    submittedAt: new Date().toISOString(),
    memos: [],
  })

  const started = await engine().startInstance({
    definition: permit.workflow,
    initialFields: [
      {
        type: 'subject',
        name: 'subject',
        value: refDataset({projectId: PROJECT_ID, dataset: CONTENT_DATASET, documentId: _id, type: 'application'}),
      },
    ],
  })
  const instanceId = started.instance._id
  await content.patch(_id).set({instanceId}).commit()
  return {reference, instanceId}
}

export class UserError extends Error {}

async function instanceFor(reference: string): Promise<string> {
  const id = await clients().content.fetch<string | null>(`*[_type == "application" && reference == $reference][0].instanceId`, {
    reference: reference.toUpperCase(),
  })
  if (!id) throw new UserError('No application with that reference.')
  return id
}

/** The citizen answers the clerk's request. The engine refuses it unless the file is actually waiting on them. */
export async function resubmit(reference: string, reply: string) {
  const instanceId = await instanceFor(reference)
  const text = reply.trim().slice(0, 1200)
  if (!text) throw new UserError('The Bureau cannot accept a blank reply.')
  await engine().fireAction({instanceId, activity: 'supply', action: 'resubmit', params: {reply: text}, idempotencyKey: randomUUID()})
  return instanceId
}

/**
 * The visiting-official desk on the public site, so people without a Sanity account can close the loop.
 * Real officials use the App SDK stamp desk, which fires the same actions under their own identity.
 */
export async function visitorStamp(reference: string, decision: 'approve' | 'deny', reason?: string) {
  const instanceId = await instanceFor(reference)
  await engine().fireAction({
    instanceId,
    activity: 'stamp',
    action: decision,
    params: decision === 'deny' ? {reason: (reason || 'Insufficiently imaginary.').slice(0, 300)} : undefined,
    idempotencyKey: randomUUID(),
  })
  return instanceId
}

export interface FileStatus {
  application: {
    reference: string
    applicantName: string
    submittedAt: string
    answers: {key: string; question: string; answer: string}[]
    memos: {at: string; from: string; verdict: string; text: string; form?: {code: string; title: string; question: string}}[]
    permit: {title: string; slug: string; workflow: string; department: {name: string; floor?: string; head?: string}}
  }
  instance: WorkflowInstance
}

export async function fileStatus(reference: string): Promise<FileStatus> {
  const application = await clients().content.fetch<(FileStatus['application'] & {instanceId: string}) | null>(
    `*[_type == "application" && reference == $reference][0]{
      reference, applicantName, submittedAt, answers[]{key, question, answer}, instanceId,
      "memos": coalesce(memos[]{at, from, verdict, text, "form": requestedForm->{code, title, question}}, []),
      "permit": permitType->{title, "slug": slug.current, workflow, "department": department->{name, floor, head}}
    }`,
    {reference: reference.toUpperCase()},
  )
  if (!application) throw new UserError('No application with that reference.')
  const instance = await engine().getInstance({instanceId: application.instanceId})
  return {application, instance}
}
export * from './view'
export * from './shift'
