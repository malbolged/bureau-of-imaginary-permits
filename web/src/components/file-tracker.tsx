'use client'

import type {FileView, TimelineEvent} from '@bureau/workflows/server'
import {useState} from 'react'
import useSWR from 'swr'

import {playThunk} from '@/lib/sound'

import {InkStamp} from './ink-stamp'
import {Portrait} from './portrait'
import {Seal} from './seal'

const fetcher = async (url: string): Promise<FileView> => {
  const res = await fetch(url)
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Could not load the file')
  return body
}

const STATUS: Record<string, {text: string; tone: 'approve' | 'deny' | 'lamp'}> = {
  issued: {text: 'Issued', tone: 'approve'},
  denied: {text: 'Denied', tone: 'deny'},
  referred: {text: 'Referred', tone: 'deny'},
  'awaiting-citizen': {text: 'Returned to you', tone: 'lamp'},
  stamping: {text: 'Awaiting signature', tone: 'lamp'},
  countersign: {text: 'Awaiting countersignature', tone: 'lamp'},
  window: {text: 'At the window', tone: 'lamp'},
}

const time = (iso: string) => new Date(iso).toLocaleString('en-IE', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'})

export function FileTracker({initial}: {initial: FileView}) {
  const {data, mutate} = useSWR(`/api/files/${initial.reference}`, fetcher, {
    fallbackData: initial,
    // Poll while anyone but a human could move the file; slower when it waits on a desk (stamps from the App SDK still show up).
    refreshInterval: (d) => (d?.terminal ? 0 : d?.waitingOn === 'agent' ? 1500 : 4000),
  })
  const view = data ?? initial
  const status = STATUS[view.stage.name]

  return (
    <div className="space-y-8">
      <header className="paper relative px-5 pb-5 pt-4 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-tiny text-[10px] uppercase tracking-[0.12em] text-ink-soft">
              File {view.reference} · {view.permit.department.name}
            </p>
            <h1 className="mt-1 font-pixel text-3xl leading-[1.05]">{view.permit.title}</h1>
            <p className="mt-1 text-[20px] leading-none text-ink-soft">
              Applicant: <span className="text-ink">{view.applicantName}</span> · Filed {time(view.submittedAt)}
            </p>
          </div>
          {view.stage.name === 'issued' || view.stage.name === 'denied' ? (
            <InkStamp decision={view.stage.name === 'issued' ? 'approve' : 'deny'} seed={view.reference} size={26} />
          ) : status ? (
            <span className={`border-4 px-3 py-1 font-tiny text-[12px] uppercase tracking-[0.1em] ${status.tone === 'deny' ? 'border-deny text-deny' : 'border-ink text-ink'}`}>
              {status.text}
            </span>
          ) : (
            <span className="border-4 border-ink px-3 py-1 font-tiny text-[12px] uppercase tracking-[0.1em]">
              Under review<span className="blink">_</span>
            </span>
          )}
        </div>
        <Rail rail={view.rail} />
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_21rem]">
        <div className="space-y-8">
          <ActionPanel view={view} onChange={() => mutate()} />
          {view.stage.name === 'issued' && <Certificate view={view} />}
          <Correspondence view={view} />
        </div>
        <aside className="space-y-6">
          <Timeline events={view.timeline} live={!view.terminal} workflow={view.workflow} />
          <details className="frame p-4">
            <summary className="cursor-pointer select-none font-tiny text-[11px] uppercase tracking-[0.12em] text-brass">The application as filed</summary>
            <dl className="mt-3 space-y-3 font-type text-[19px] leading-[1.1]">
              {view.answers.map((a) => (
                <div key={a.key}>
                  <dt className="text-text-dim">{a.question}</dt>
                  <dd className="whitespace-pre-wrap">{a.answer || '(blank)'}</dd>
                </div>
              ))}
            </dl>
          </details>
        </aside>
      </div>
    </div>
  )
}

function Rail({rail}: {rail: FileView['rail']}) {
  return (
    <ol className="mt-5 flex flex-wrap gap-x-1 gap-y-2" aria-label="Where this file is">
      {rail.map((s, i) => (
        <li key={s.name} className="flex items-center gap-1">
          {i > 0 && <span aria-hidden className={`h-1 w-4 sm:w-6 ${s.state === 'upcoming' ? 'bg-paper-dark' : 'bg-ink'}`} />}
          <span
            aria-current={s.state === 'current' ? 'step' : undefined}
            className={`border-[3px] px-2.5 py-1 font-tiny text-[10px] uppercase tracking-[0.06em] ${
              s.state === 'current' ? 'border-ink bg-ink text-paper' : s.state === 'done' ? 'border-ink text-ink' : 'border-dashed border-paper-dark text-ink-soft'
            }`}
          >
            {s.state === 'done' && '✓ '}
            {s.title}
          </span>
        </li>
      ))}
    </ol>
  )
}

function ActionPanel({view, onChange}: {view: FileView; onChange: () => void}) {
  if (view.waitingOn === 'agent') {
    const who = view.workingAgents[0] ?? (view.stage.name === 'meteorology' ? 'Ministry of Weather (AI)' : 'Clerk Third Class (AI)')
    return (
      <Panel title={view.stage.title}>
        <p>
          {who} is reading your file. This usually takes 10 to 30 seconds<span className="blink">_</span>
        </p>
      </Panel>
    )
  }
  if (view.waitingOn === 'citizen') return <ReplyPanel view={view} onChange={onChange} />
  if (view.waitingOn === 'official') return <DeskPanel view={view} onChange={onChange} />
  if (view.stage.name === 'denied')
    return (
      <Panel title="Denied" tone="deny">
        <p>{view.denialReason ? `Grounds: ${view.denialReason}` : 'The Ministry of Weather found the sky already spoken for.'}</p>
      </Panel>
    )
  if (view.stage.name === 'referred')
    return (
      <Panel title="Referred elsewhere" tone="deny">
        <p>The clerk believes the thing you asked for really exists. The Bureau only licenses the imaginary. Please try a real office.</p>
      </Panel>
    )
  return null
}

function ReplyPanel({view, onChange}: {view: FileView; onChange: () => void}) {
  const memo = [...view.memos].reverse().find((m) => m.verdict === 'incomplete')
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/files/${view.reference}/reply`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({reply})})
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return setError(body.error ?? 'The reply was not accepted.')
    setReply('')
    onChange()
  }

  return (
    <Panel title={memo?.form ? `Form ${memo.form.code}: ${memo.form.title}` : 'The clerk needs more from you'} tone="lamp">
      {memo?.form ? <p>{memo.form.question}</p> : <p>Read the clerk&apos;s memo below, then reply here.</p>}
      <form
        className="mt-3 space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <textarea value={reply} onChange={(e) => setReply(e.target.value)} required rows={3} maxLength={1200} aria-label="Your reply" placeholder="Your answer" className="field resize-y" />
        <button disabled={busy} className="btn btn-lamp">
          {busy ? 'Sending…' : 'Resubmit to the clerk'}
        </button>
        {error && <p className="text-deny">{error}</p>}
      </form>
    </Panel>
  )
}

/** The visiting official's desk: the same stamps, the same animation, firing the same workflow actions. */
function DeskPanel({view, onChange}: {view: FileView; onChange: () => void}) {
  const [pressing, setPressing] = useState<'approve' | 'deny' | null>(null)
  const [inked, setInked] = useState<'approve' | 'deny' | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  function stamp(decision: 'approve' | 'deny') {
    if (pressing || inked) return
    setError(null)
    setPressing(decision)
    setTimeout(() => {
      setInked(decision)
      playThunk()
      void fetch(`/api/files/${view.reference}/stamp`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({decision, reason})})
        .then(async (res) => {
          const body = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(body.error ?? 'The stamp did not take.')
          onChange()
        })
        .catch((e) => {
          setInked(null)
          setError(e instanceof Error ? e.message : String(e))
        })
    }, 290)
    setTimeout(() => setPressing(null), 540)
  }

  return (
    <Panel title={view.stage.title}>
      <p>
        The clerk passed the paperwork. This file now waits for a human official. Staff stamp it in the Bureau&apos;s Stamp Desk, an App SDK app, under their own
        name. No account? Stamp it here as a visiting official.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-6">
        <div className="paper relative grid h-[96px] w-[260px] place-items-center overflow-visible">
          {!inked && <span className="font-tiny text-[10px] uppercase tracking-[0.12em] text-ink-soft">For official use · stamp here</span>}
          {inked && <InkStamp decision={inked} seed={view.reference} size={26} animate />}
          {pressing && (
            <div className="pointer-events-none absolute -top-[86px] left-1/2 -translate-x-1/2">
              <div className="stamp-press flex flex-col items-center">
                <span className="h-8 w-14 border-4 border-ink bg-desk-light" />
                <span className="h-5 w-5 border-x-4 border-ink bg-desk-dark" />
                <span className={`h-12 w-[150px] border-4 border-ink ${pressing === 'approve' ? 'bg-approve' : 'bg-deny'}`} />
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <button onClick={() => stamp('approve')} disabled={!!inked} className="btn btn-approve w-44">
            Stamp approved
          </button>
          <button onClick={() => stamp('deny')} disabled={!!inked} className="btn btn-deny w-44">
            Stamp denied
          </button>
        </div>
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} aria-label="Grounds for denial" placeholder="Grounds for denial (optional)" className="field max-w-xs" />
      </div>
      {error && <p className="mt-2 text-deny">{error}</p>}
    </Panel>
  )
}

function Panel({title, tone, children}: {title: string; tone?: 'lamp' | 'deny'; children: React.ReactNode}) {
  return (
    <section className={`frame p-5 font-type text-[21px] leading-[1.1] ${tone === 'deny' ? 'border-deny' : tone === 'lamp' ? 'border-brass' : ''}`}>
      <h2 className="mb-2 font-pixel text-2xl leading-none text-lamp">{title}</h2>
      {children}
    </section>
  )
}

function Correspondence({view}: {view: FileView}) {
  if (!view.memos.length) return null
  return (
    <section>
      <h2 className="mb-3 font-tiny text-[11px] uppercase tracking-[0.12em] text-brass">Correspondence</h2>
      <ol className="space-y-4">
        {[...view.memos].reverse().map((m) => (
          <li key={m.at + m.from} className="memo-slip px-4 py-3">
            <div className="flex flex-wrap justify-between gap-2 font-tiny text-[9px] uppercase tracking-[0.1em] text-ink-soft">
              <span>
                Memo · {m.from === 'clerk' ? 'Clerk Third Class (AI)' : 'Ministry of Weather (AI)'} · {m.verdict}
              </span>
              <span>{time(m.at)}</span>
            </div>
            <p className="mt-1 text-[21px] leading-[1.1]">{m.text}</p>
            {m.form && (
              <p className="mt-2 border-t-2 border-dashed border-ink-soft pt-1 text-[18px] text-ink-soft">
                Enclosed: Form {m.form.code}, {m.form.title}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

const EVENT_TAG: Record<TimelineEvent['kind'], string> = {filed: 'Citizen', agent: 'AI agent', action: 'Human', transition: 'Engine'}

function Timeline({events, live, workflow}: {events: TimelineEvent[]; live: boolean; workflow: FileView['workflow']}) {
  return (
    <section className="frame p-4">
      <h2 className="font-tiny text-[11px] uppercase tracking-[0.12em] text-brass">Movement log</h2>
      <p className="mt-1 font-type text-[17px] leading-[1.1] text-text-dim">
        Read from the workflow instance, pinned to {workflow.name} v{workflow.version}
        {live && (
          <>
            {' '}
            · live<span className="blink">_</span>
          </>
        )}
      </p>
      <ol className="mt-3 space-y-3">
        {events.map((e) => (
          <li key={e.key} className="font-type text-[18px] leading-[1.1]">
            <p>
              <span className={`mr-1.5 inline-block px-1 font-tiny text-[8px] uppercase tracking-[0.08em] ${e.kind === 'transition' ? 'bg-booth-light text-text' : 'bg-lamp text-ink'}`}>
                {EVENT_TAG[e.kind]}
              </span>
              <span className="text-text">{e.who}</span> <span className="text-text-dim">{e.text}</span>
            </p>
            {e.rule && <code className="mt-1 block break-words bg-night px-2 py-1 font-type text-[15px] leading-[1.1] text-lamp">when {e.rule}</code>}
            <p className="text-[14px] text-text-dim">{time(e.at)}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Certificate({view}: {view: FileView}) {
  return (
    <section className="licence relative overflow-hidden px-6 py-8 text-center sm:px-10">
      <div className="mx-auto flex w-fit items-center gap-4">
        <Seal className="size-14 text-ink" />
        <div className="border-4 border-ink">
          <Portrait seed={view.applicantName} className="block h-[72px] w-[60px]" bg="#d9c58f" />
        </div>
      </div>
      <p className="mt-3 font-tiny text-[10px] uppercase tracking-[0.16em] text-ink-soft">Bureau of Imaginary Permits · Permit no. {view.reference}</p>
      <h2 className="mt-2 font-pixel text-3xl leading-[1.05]">{view.permit.title}</h2>
      <p className="mt-3 text-[22px]">
        is hereby granted to <span className="italic">{view.applicantName}</span>
      </p>
      <p className="mt-1 text-[18px] text-ink-soft">Issued under the {view.workflow.title.toLowerCase()} procedure by the {view.permit.department.name}.</p>
      {view.signatures.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-8 text-left">
          {view.signatures.map((s) => (
            <div key={s.at}>
              <p className="border-b-2 border-ink pb-1 text-[21px] italic">{s.name}</p>
              <p className="mt-1 font-tiny text-[9px] uppercase tracking-[0.1em] text-ink-soft">{s.stage}</p>
            </div>
          ))}
        </div>
      )}
      <div className="absolute right-5 top-5">
        <InkStamp decision="approve" seed={view.reference + 'cert'} size={18} />
      </div>
      <button onClick={() => window.print()} className="btn no-print mt-6">
        Print for your wall
      </button>
    </section>
  )
}
