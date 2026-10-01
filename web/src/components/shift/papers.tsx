import type {ShiftCase, ShiftStart} from '@bureau/workflows/server'

import {InkStamp} from '../ink-stamp'
import {Portrait} from '../portrait'
import {Seal} from '../seal'

/** Small caps label used on every document. */
function Label({children}: {children: React.ReactNode}) {
  return <span className="font-tiny text-[9px] uppercase tracking-[0.12em] text-ink-soft">{children}</span>
}

export function ApplicationPaper({c, stamp}: {c: ShiftCase; stamp?: 'approve' | 'deny' | null}) {
  return (
    <div className="paper relative w-[300px] px-4 pb-4 pt-3">
      <div className="flex items-center justify-between border-b-2 border-ink pb-1">
        <Label>Application · {c.reference}</Label>
        <Seal className="size-5 text-ink" />
      </div>
      <p className="mt-1 text-[22px] leading-none">{c.permit.title}</p>
      <p className="text-[16px] leading-none text-ink-soft">{c.permit.department}</p>
      <dl className="mt-1.5 space-y-1">
        {c.answers.map((a) => (
          <div key={a.key}>
            <dt>
              <Label>{a.question}</Label>
            </dt>
            <dd className="text-[18px] leading-none">{a.answer || '—'}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-2 border-t-2 border-dashed border-ink-soft pt-1">
        <Label>Signed</Label>
        <p className="text-[22px] italic leading-none">{c.applicantName}</p>
      </div>
      {/* The inspector's box. The stamp lands here. */}
      <div data-stamp-box className="relative mt-2 grid h-[70px] place-items-center border-2 border-dashed border-ink-soft">
        {!stamp && <Label>For official use · stamp here</Label>}
        {stamp && <InkStamp decision={stamp} seed={c.reference} size={26} animate />}
      </div>
    </div>
  )
}

export function DocumentPaper({paper}: {paper: ShiftCase['papers'][number]}) {
  if (paper.kind === 'citizen-card') {
    return (
      <div className="card w-[270px] p-2.5">
        <div className="flex items-center justify-between border-b-2 border-ink pb-1">
          <Label>Citizen Card</Label>
          <Label>I.C.S.</Label>
        </div>
        <div className="mt-2 flex gap-2.5">
          <div className="border-2 border-ink">
            <Portrait seed={paper.portrait ?? ''} className="block h-[86px] w-[72px]" bg="#9fb0bd" />
          </div>
          <dl className="min-w-0 flex-1 space-y-0.5">
            {paper.lines.map((l) => (
              <div key={l.label}>
                <dt className="font-tiny text-[8px] uppercase tracking-[0.12em] text-ink/70">{l.label}</dt>
                <dd className="truncate text-[19px] leading-none">{l.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    )
  }
  return (
    <div className="licence w-[250px] p-3">
      <div className="flex items-center gap-2 border-b-2 border-ink pb-1">
        <Seal className="size-5 text-ink" />
        <Label>Bureau licence</Label>
      </div>
      <p className="mt-1 text-[21px] leading-none">{paper.title}</p>
      <dl className="mt-2 space-y-0.5">
        {paper.lines.map((l) => (
          <div key={l.label} className="flex items-baseline justify-between gap-2">
            <dt className="font-tiny text-[8px] uppercase tracking-[0.12em] text-ink/70">{l.label}</dt>
            <dd className="text-[19px] leading-none">{l.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function RulebookPaper({c}: {c: ShiftCase}) {
  return (
    <div className="paper w-[290px] bg-[#cfc5a6] px-4 py-3">
      <div className="flex items-center justify-between border-b-2 border-ink pb-1">
        <Label>Rulebook</Label>
        <Label>Rules for this permit</Label>
      </div>
      <p className="mt-1 text-[21px] leading-none">{c.permit.title}</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-[18px] leading-[1.05]">
        {c.permit.requirements.map((r) => (
          <li key={r.key}>{r.clerkCheck ?? r.question}</li>
        ))}
        {c.permit.prerequisites.map((p) => (
          <li key={p}>
            Applicant must hold a valid <b>{p}</b> in the same name.
          </li>
        ))}
      </ol>
    </div>
  )
}

export function BulletinPaper({bulletin, day}: {bulletin: ShiftStart['bulletin']; day: number}) {
  return (
    <div className="paper w-[280px] px-4 py-3">
      <div className="flex items-center justify-between border-b-2 border-ink pb-1">
        <Label>Daily bulletin · Day {day}</Label>
        <Label>{formatDate(bulletin.date)}</Label>
      </div>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-[17px] leading-[1.05]">
        {bulletin.rules.map((r) => (
          <li key={r}>{r.startsWith('NEW:') ? <b className="text-deny">{r}</b> : r}</li>
        ))}
      </ol>
    </div>
  )
}

export function MemoSlip({text}: {text: string}) {
  return (
    <div className="memo-slip w-[210px] -rotate-2 px-3 py-2">
      <Label>Clerk Third Class (AI)</Label>
      <p className="mt-0.5 text-[17px] leading-[1.05]">{text}</p>
      <p className="mt-1 text-right font-tiny text-[9px] uppercase tracking-[0.12em] text-approve-dark">Passed ✓</p>
    </div>
  )
}

export function formatDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}
