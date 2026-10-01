import {randomInt, randomUUID} from 'node:crypto'

import {refDataset} from '@sanity/workflow-engine'

import {CONTENT_DATASET, PROJECT_ID} from '../config'
import {clients} from './clients'
import {engine, UserError} from './index'

/**
 * The inspector game. A shift turns the day's scripted cases into real applications, each governed
 * by a `booth-inspection` workflow instance that starts at the window. The player's stamp is a real
 * workflow action; the score is computed here, from the instance, against the truth stored on the case.
 */

const CREDITS_PER_CORRECT = 5
const FREE_CITATIONS = 1
const PENALTY = 5

export interface ShiftCase {
  reference: string
  permit: {title: string; department: string; requirements: {key: string; question: string; clerkCheck?: string}[]; prerequisites: string[]}
  applicantName: string
  portrait: string
  greeting: string
  answers: {key: string; question: string; answer: string}[]
  papers: {kind: string; title: string; portrait?: string; lines: {label: string; value: string}[]}[]
  clerkMemo: string
}

export interface ShiftStart {
  shiftId: string
  day: number
  bulletin: {title: string; date: string; rules: string[]}
  cases: ShiftCase[]
}

interface CaseDoc {
  _id: string
  applicantName: string
  portrait?: string
  greeting?: string
  answers?: {key: string; answer: string}[]
  papers?: ShiftCase['papers']
  clerkMemo?: string
  permit: {_id: string; title: string; department: string; requirements: ShiftCase['permit']['requirements']; prerequisites: string[] | null}
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const newReference = () => `IP-${Array.from({length: 6}, () => ALPHABET[randomInt(ALPHABET.length)]).join('')}`

export async function startShift(day = 1): Promise<{start: ShiftStart; pending: {reference: string; applicationId: string}[]}> {
  const {content} = clients()
  const {bulletin, cases} = await content.fetch<{bulletin: ShiftStart['bulletin'] | null; cases: CaseDoc[]}>(
    `{
      "bulletin": *[_type == "bulletin" && day == $day][0]{title, date, rules},
      "cases": *[_type == "case" && day == $day] | order(order asc){
        _id, applicantName, portrait, greeting, answers[]{key, answer}, papers[]{kind, title, portrait, lines[]{label, value}}, clerkMemo,
        "permit": permitType->{_id, title, "department": department->name, requirements[]{key, question, clerkCheck}, "prerequisites": prerequisites[]->title}
      }
    }`,
    {day},
  )
  if (!bulletin || !cases.length) throw new UserError(`There is no shift for day ${day}.`)

  const shiftId = `shift-${randomUUID()}`
  const now = new Date().toISOString()
  const queue = cases.map((c) => ({reference: newReference(), caseId: c._id}))
  const tx = content.transaction()
  tx.create({_id: shiftId, _type: 'shift', day, status: 'open', startedAt: now, results: [], queue: queue.map((q) => ({_key: q.reference, ...q}))})
  cases.forEach((c, i) => {
    const {reference} = queue[i]
    tx.create({
      _id: `application-${reference}`,
      _type: 'application',
      reference,
      permitType: {_type: 'reference', _ref: c.permit._id},
      applicantName: c.applicantName,
      fromCase: {_type: 'reference', _ref: c._id, _weak: true},
      answers: c.permit.requirements.map((r) => ({
        _key: r.key,
        _type: 'answer',
        key: r.key,
        question: r.question,
        answer: c.answers?.find((a) => a.key === r.key)?.answer ?? '',
      })),
      submittedAt: now,
      memos: c.clerkMemo ? [{_key: 'clerk', _type: 'memo', at: now, from: 'clerk', verdict: 'complete', text: c.clerkMemo}] : [],
    })
  })
  await tx.commit()

  return {
    start: {
      shiftId,
      day,
      bulletin,
      cases: cases.map((c, i) => ({
        reference: queue[i].reference,
        permit: {title: c.permit.title, department: c.permit.department, requirements: c.permit.requirements, prerequisites: c.permit.prerequisites ?? []},
        applicantName: c.applicantName,
        portrait: c.portrait ?? c.applicantName,
        greeting: c.greeting ?? '',
        answers: c.permit.requirements.map((r) => ({key: r.key, question: r.question, answer: c.answers?.find((a) => a.key === r.key)?.answer ?? ''})),
        papers: c.papers ?? [],
        clerkMemo: c.clerkMemo ?? '',
      })),
    },
    pending: queue.map((q) => ({reference: q.reference, applicationId: `application-${q.reference}`})),
  }
}

/** Start the workflow instances for a fresh shift. Runs after the response, so the bulletin shows while this happens. */
export async function openWindow(pending: {reference: string; applicationId: string}[]) {
  const {content} = clients()
  // In parallel: seven windows one after another took ~24 s; the player reads the bulletin meanwhile, but not for that long.
  await Promise.all(pending.map(async (p) => {
    const started = await engine().startInstance({
      definition: 'booth-inspection',
      initialFields: [
        {type: 'subject', name: 'subject', value: refDataset({projectId: PROJECT_ID, dataset: CONTENT_DATASET, documentId: p.applicationId, type: 'application'})},
      ],
    })
    await content.patch(p.applicationId).set({instanceId: started.instance._id}).commit()
  }))
}

async function waitForInstance(reference: string): Promise<string> {
  const {content} = clients()
  for (let i = 0; i < 40; i++) {
    const id = await content.fetch<string | null>(`*[_type == "application" && reference == $reference][0].instanceId`, {reference})
    if (id) return id
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('The window did not open in time.')
}

export interface StampResult {
  correct: boolean
  decision: 'approve' | 'deny'
  truth: 'approve' | 'deny'
  reason: string
  reply: string
  credits: number
  citations: number
}

export async function stampCase(shiftId: string, reference: string, decision: 'approve' | 'deny'): Promise<StampResult> {
  const {content} = clients()
  const shift = await content.fetch<{status: string; queue: {reference: string; caseId: string}[]; results: {reference: string; correct: boolean}[] | null} | null>(
    `*[_type == "shift" && _id == $shiftId][0]{status, queue, results}`,
    {shiftId},
  )
  if (!shift || shift.status !== 'open') throw new UserError('This shift is over.')
  const slot = shift.queue.find((q) => q.reference === reference)
  if (!slot) throw new UserError('That applicant is not in your queue.')
  if (shift.results?.some((r) => r.reference === reference)) throw new UserError('You already stamped this one.')

  const [instanceId, theCase] = await Promise.all([
    waitForInstance(reference),
    content.fetch<{truth: 'approve' | 'deny'; reason: string; onApproved?: string; onDenied?: string}>(
      `*[_type == "case" && _id == $id][0]{truth, reason, onApproved, onDenied}`,
      {id: slot.caseId},
    ),
  ])
  const {instance} = await engine().fireAction({
    instanceId,
    activity: 'stamp',
    action: decision,
    params: decision === 'deny' ? {reason: 'Discrepancy found at the inspection window.'} : undefined,
    idempotencyKey: `${shiftId}:${reference}`,
  })

  // Score from what the engine recorded, not from what the browser said.
  // `windowDecision` is declared on the stage, so it lives on the window's stage entry.
  const windowStage = [...instance.stages].reverse().find((s) => s.name === 'window')
  const recorded = windowStage?.fields?.find((f) => f.name === 'windowDecision')?.value
  if (recorded !== 'approve' && recorded !== 'deny') throw new Error('The stamp was not recorded.')
  const correct = recorded === theCase.truth
  await content
    .patch(shiftId)
    .setIfMissing({results: []})
    .append('results', [{_key: reference, _type: 'result', case: {_type: 'reference', _ref: slot.caseId, _weak: true}, reference, decision: recorded, correct}])
    .commit()

  const results = [...(shift.results ?? []), {reference, correct}]
  return {
    correct,
    decision: recorded,
    truth: theCase.truth,
    reason: theCase.reason,
    reply: (recorded === 'approve' ? theCase.onApproved : theCase.onDenied) ?? '',
    ...score(results),
  }
}

function score(results: {correct: boolean}[]) {
  const right = results.filter((r) => r.correct).length
  const citations = results.length - right
  return {credits: right * CREDITS_PER_CORRECT - Math.max(0, citations - FREE_CITATIONS) * PENALTY, citations}
}

export async function finishShift(shiftId: string, player: string) {
  const {content} = clients()
  const shift = await content.fetch<{status: string; results: {correct: boolean}[] | null} | null>(`*[_type == "shift" && _id == $shiftId][0]{status, results}`, {shiftId})
  if (!shift) throw new UserError('No such shift.')
  const totals = score(shift.results ?? [])
  if (shift.status === 'open') {
    const name = player.replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, 20) || 'Anonymous Inspector'
    await content.patch(shiftId).set({status: 'done', player: name, finishedAt: new Date().toISOString(), ...totals, processed: shift.results?.length ?? 0}).commit()
  }
  return totals
}

export function leaderboard() {
  return clients().content.fetch<{player: string; credits: number; citations: number; processed: number; day: number; finishedAt: string}[]>(
    `*[_type == "shift" && status == "done"] | order(credits desc, citations asc, finishedAt asc)[0...10]{player, credits, citations, "processed": count(results), day, finishedAt}`,
  )
}
