import {randomUUID} from 'node:crypto'

import {type EffectHandler, extractDocumentId} from '@sanity/workflow-engine'
import {generateText, Output} from 'ai'
import {z} from 'zod'

import {clients} from './clients'
import {model} from './model'

/** Permit numbers double as application references: IP-XXXXXX. */
export const REFERENCE = /\bIP-[A-HJ-NP-Z2-9]{6}\b/g

/** The clerk may send a file back for paperwork this many times; after that it must rule. */
const MAX_FORM_REQUESTS = 2

interface FileForClerk {
  _id: string
  reference: string
  applicantName: string
  answers?: {key: string; question: string; answer: string}[]
  memos?: {from: string; verdict: string; text: string; form?: {code: string; question: string}}[]
  permit: {
    _id: string
    title: string
    summary?: string
    clerkInstructions?: string
    requirements: {key: string; question: string; kind: string; clerkCheck?: string}[]
    department: {name: string; head?: string}
    forms: {_id: string; code: string; title: string; question: string}[]
    prerequisites?: {_id: string; title: string}[]
  }
}

const FILE_QUERY = `*[_type == "application" && _id == $id][0]{
  _id, reference, applicantName, answers, memos[]{from, verdict, text, "form": requestedForm->{code, question}},
  "permit": permitType->{
    _id, title, summary, clerkInstructions, requirements[]{key, question, kind, clerkCheck},
    "department": department->{name, head},
    "forms": forms[]->{_id, code, title, question},
    "prerequisites": prerequisites[]->{_id, title}
  }
}`

async function loadFile(subject: unknown): Promise<FileForClerk> {
  if (typeof subject !== 'string') throw new Error('subject must be a GDR URI')
  const file = await clients().content.fetch<FileForClerk | null>(FILE_QUERY, {id: extractDocumentId(subject)})
  if (!file?.permit) throw new Error('application or its permit type not found')
  return file
}

async function appendMemo(applicationId: string, memo: {from: string; verdict: string; text: string; requestedForm?: string}) {
  await clients()
    .content.patch(applicationId)
    .setIfMissing({memos: []})
    .append('memos', [
      {
        _key: randomUUID().slice(0, 12),
        _type: 'memo',
        at: new Date().toISOString(),
        from: memo.from,
        verdict: memo.verdict,
        text: memo.text,
        ...(memo.requestedForm ? {requestedForm: {_type: 'reference', _ref: memo.requestedForm, _weak: true}} : {}),
      },
    ])
    .commit()
}

/**
 * Prerequisites are checked in code, not by the model: the citizen must quote the number of a
 * permit of the required type, issued to someone of the same name. "Issued" is read from the
 * workflow instance, so the engine's state is the only source of truth.
 */
async function missingPrerequisites(file: FileForClerk, citizenReply: string): Promise<{_id: string; title: string}[]> {
  const prereqs = file.permit.prerequisites ?? []
  if (!prereqs.length) return []
  const text = [...(file.answers ?? []).map((a) => a.answer), citizenReply].join(' ')
  const quoted = [...new Set(text.toUpperCase().match(REFERENCE) ?? [])]
  if (!quoted.length) return prereqs

  const {content, workflow} = clients()
  const held = await content.fetch<{instanceId?: string; permitTypeId: string; applicantName: string}[]>(
    `*[_type == "application" && reference in $refs]{instanceId, "permitTypeId": permitType._ref, applicantName}`,
    {refs: quoted},
  )
  const sameName = held.filter((h) => h.applicantName.trim().toLowerCase() === file.applicantName.trim().toLowerCase())
  const issuedIds = new Set(
    await workflow.fetch<string[]>(`*[_type == "sanity.workflow.instance" && _id in $ids && currentStage == "issued"]._id`, {
      ids: sameName.map((h) => h.instanceId).filter(Boolean),
    }),
  )
  const issuedTypes = new Set(sameName.filter((h) => h.instanceId && issuedIds.has(h.instanceId)).map((h) => h.permitTypeId))
  return prereqs.filter((p) => !issuedTypes.has(p._id))
}

const ClerkRuling = z.object({
  verdict: z.enum(['complete', 'incomplete', 'too-real']),
  memo: z.string().describe('The memo to the applicant, max 60 words.'),
  requestedFormCode: z.string().nullable().describe('When incomplete: the code of ONE form from the list. Otherwise null.'),
})

const CLERK_SYSTEM = `You are Clerk Third Class at the Bureau of Imaginary Permits. You review permit applications for things that do not exist (or barely do).

Rule on the file:
- "complete": every answer satisfies its "clerk checks" rule. Be fair: if a rule is satisfied in spirit, it is satisfied.
- "incomplete": at least one answer clearly fails its rule, or a citizen reply still does not fix it. You must quote the exact answer that fails and the rule it fails. Never cite a rule whose answer already satisfies it (a "Yes" satisfies "must be yes"). Request exactly ONE form from the list provided, the one whose question would best resolve the problem.
- A citizen's reply IS the completed form you last requested: if it answers that form's question, treat the form as filed and never ask for it again.
- "too-real": the application is actually for something real and ordinary (a driving licence, a parking permit, planning permission, a visa), not the imaginary thing on the form. Refer them to a real office.

Write the memo in the voice of a weary, precise, faintly kind civil servant. Dry humour, never mean. Address the applicant by name. Quote the rule that failed when you say "incomplete". Max 60 words. No emoji.`

/** Effect `clerk-review`: the AI clerk rules on the paperwork. */
export const clerkReview: EffectHandler = async (params) => {
  const file = await loadFile(params.subject)
  const citizenReply = typeof params.citizenReply === 'string' ? params.citizenReply : ''
  const formsRequested = (file.memos ?? []).filter((m) => m.from === 'clerk' && m.verdict === 'incomplete').length

  const missing = await missingPrerequisites(file, citizenReply)
  if (missing.length) {
    const memo = `${file.applicantName}, this permit requires you to already hold: ${missing.map((p) => p.title).join(', ')}. Apply for it, then reply here quoting its permit number (it looks like IP-XXXXXX). The Bureau apologises for the circularity, which is intentional.`
    await appendMemo(file._id, {from: 'clerk', verdict: 'incomplete', text: memo})
    return {outputs: {verdict: 'incomplete', memo, requestedForm: ''}}
  }

  const forms = file.permit.forms ?? []
  const prompt = [
    `PERMIT: ${file.permit.title} (${file.permit.department.name})`,
    file.permit.summary && `About: ${file.permit.summary}`,
    file.permit.clerkInstructions && `Standing instructions: ${file.permit.clerkInstructions}`,
    file.permit.prerequisites?.length && `Prerequisite permits: verified as held.`,
    `APPLICANT: ${file.applicantName}`,
    `ANSWERS:`,
    ...file.permit.requirements.map((r) => {
      const a = file.answers?.find((x) => x.key === r.key)?.answer?.trim()
      return `- Q: ${r.question}\n  A: ${a || '(blank)'}\n  Clerk checks: ${r.clerkCheck ?? 'a sincere answer'}`
    }),
    file.memos?.length && `EARLIER MEMOS ON THIS FILE:\n${file.memos.map((m) => `- [${m.from}, ${m.verdict}] ${m.text}${m.form ? ` (requested Form ${m.form.code}: "${m.form.question}")` : ''}`).join('\n')}`,
    citizenReply && `CITIZEN'S REPLY TO THE LAST REQUEST: ${citizenReply}`,
    `FORMS YOU MAY REQUEST (use the code exactly):\n${forms.map((f) => `- ${f.code}: ${f.title}, asks "${f.question}"`).join('\n')}`,
  ]
    .filter(Boolean)
    .join('\n')

  const {output} = await generateText({model: model(), system: CLERK_SYSTEM, prompt, output: Output.object({schema: ClerkRuling})})

  let {verdict, memo} = output
  // Guardrails: the model may only request a form that exists on this permit, and may not loop forever.
  let form = verdict === 'incomplete' ? (forms.find((f) => f.code === output.requestedFormCode) ?? forms[0]) : undefined
  if (verdict === 'incomplete' && formsRequested >= MAX_FORM_REQUESTS) {
    verdict = 'complete'
    form = undefined
    memo = `${memo} However, this file has already been returned ${formsRequested} times and the Bureau's patience is a finite resource. Passed for stamping out of sheer fatigue.`
  }

  await appendMemo(file._id, {from: 'clerk', verdict, text: memo, requestedForm: form?._id})
  return {outputs: {verdict, memo, requestedForm: form?.code ?? ''}}
}

const WeatherRuling = z.object({
  verdict: z.enum(['favourable', 'unfavourable']),
  memo: z.string().describe('The Ministry opinion, max 50 words.'),
})

const WEATHER_SYSTEM = `You are the duty forecaster at the Ministry of Weather, consulted on every permit involving the sky.
Rule "favourable" unless the request would plainly interfere with other people's weather, involves a major celestial body (the Sun, the Moon, a famous named star), or proposes using weather as a weapon.
Write a short, oddly specific opinion (max 50 words) in the voice of a shipping forecast. No emoji.`

/** Effect `weather-review`: a second agent, the Ministry of Weather, rules on sky permits. */
export const weatherReview: EffectHandler = async (params) => {
  const file = await loadFile(params.subject)
  const prompt = [
    `PERMIT: ${file.permit.title}`,
    `APPLICANT: ${file.applicantName}`,
    ...(file.answers ?? []).map((a) => `- ${a.question}: ${a.answer}`),
  ].join('\n')
  const {output} = await generateText({model: model(), system: WEATHER_SYSTEM, prompt, output: Output.object({schema: WeatherRuling})})
  await appendMemo(file._id, {from: 'ministry-of-weather', verdict: output.verdict, text: output.memo})
  return {outputs: {verdict: output.verdict, memo: output.memo}}
}

export const effectHandlers: Record<string, EffectHandler> = {
  'clerk-review': clerkReview,
  'weather-review': weatherReview,
}
