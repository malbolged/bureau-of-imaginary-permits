'use client'

import type {ShiftCase, ShiftStart, StampResult} from '@bureau/workflows/server'
import Link from 'next/link'
import {useCallback, useEffect, useRef, useState} from 'react'

import {isMuted, playBell, playPaper, playPrinter, playThunk, setMuted} from '@/lib/sound'

import {Portrait, Silhouette} from '../portrait'
import {Seal} from '../seal'
import {ApplicationPaper, BulletinPaper, DocumentPaper, formatDate, MemoSlip, RulebookPaper} from './papers'

type Decision = 'approve' | 'deny'
type Phase = 'loading' | 'bulletin' | 'working' | 'end'
type Visit = 'arriving' | 'waiting' | 'leaving' | 'gone'

interface Placed {
  id: string
  x: number
  y: number
  z: number
}

interface Citation {
  key: string
  name: string
  reason: string
}

/** Reading order when papers are stacked on a small screen. */
const ORDER = ['application', 'paper', 'memo', 'rulebook', 'bulletin']

const DAY_START = 6 * 60
const DAY_END = 18 * 60
const GAME_MINUTES_PER_SECOND = 2

/** Where papers land on the desk. Bulletin and rulebook stay put across applicants; handed-over papers arrive near the window. */
function layoutFor(c: ShiftCase, keep: Placed[]): Placed[] {
  const keepIds = new Set(['bulletin', 'rulebook'])
  const kept = keep.filter((p) => keepIds.has(p.id))
  const base: Placed[] = kept.length
    ? kept
    : [
        {id: 'bulletin', x: 16, y: 18, z: 1},
        {id: 'rulebook', x: 40, y: 190, z: 2},
      ]
  const z = Math.max(...base.map((p) => p.z), 2)
  return [
    ...base,
    {id: 'application', x: 350, y: 8, z: z + 1},
    ...c.papers.map((_, i) => ({id: `paper-${i}`, x: 680 + i * 36, y: 24 + i * 150, z: z + 2 + i})),
    {id: 'memo', x: 960, y: 230, z: z + 2 + c.papers.length},
  ]
}

/** The last day with scripted applicants in the dataset. */
const LAST_DAY = 2

export function ShiftGame({day = 1}: {day?: number}) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [shift, setShift] = useState<ShiftStart | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [visit, setVisit] = useState<Visit>('gone')
  const [speech, setSpeech] = useState('')
  const [placed, setPlaced] = useState<Placed[]>([])
  const [stamp, setStamp] = useState<Decision | null>(null)
  const [pressing, setPressing] = useState<Decision | null>(null)
  const [trayOpen, setTrayOpen] = useState(false)
  const [results, setResults] = useState<Record<string, StampResult>>({})
  const [credits, setCredits] = useState(0)
  const [citations, setCitations] = useState<Citation[]>([])
  const [printing, setPrinting] = useState<Citation | null>(null)
  const [clock, setClock] = useState(DAY_START)
  const [muted, setMutedState] = useState(false)
  const [thud, setThud] = useState(0)
  const [compact, setCompact] = useState(false)
  const pending = useRef<Record<string, Promise<StampResult | null>>>({})
  const deskRef = useRef<HTMLDivElement>(null)

  const current = shift?.cases[index]

  // Start a shift: creates the applications on the server and opens the workflow instances.
  // Exactly once per page, including under StrictMode's double effect run.
  const started = useRef(false)
  useEffect(() => {
    setMutedState(isMuted())
    if (started.current) return
    started.current = true
    fetch('/api/shift', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({day})})
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? 'The booth is closed.')
        setShift(body)
        setPhase('bulletin')
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [day])

  // Below desktop width there is no room to drag papers around: stack them and pin the stamps to the bottom.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const update = () => setCompact(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // The shift clock.
  useEffect(() => {
    if (phase !== 'working') return
    const t = setInterval(() => setClock((m) => Math.min(DAY_END, m + GAME_MINUTES_PER_SECOND)), 1000)
    return () => clearInterval(t)
  }, [phase])

  const callNext = useCallback(
    (i: number) => {
      if (!shift) return
      const c = shift.cases[i]
      if (!c) {
        setPhase('end')
        return
      }
      setIndex(i)
      setStamp(null)
      setTrayOpen(false)
      setPlaced((prev) => layoutFor(c, prev))
      setSpeech('')
      setVisit('arriving')
      playBell()
      setTimeout(() => {
        setVisit('waiting')
        setSpeech(c.greeting)
        playPaper()
      }, 720)
    },
    [shift],
  )

  function openWindow() {
    setPhase('working')
    callNext(0)
  }

  function bringToFront(id: string) {
    setPlaced((ps) => {
      const top = Math.max(...ps.map((p) => p.z))
      return ps.map((p) => (p.id === id ? {...p, z: top + 1} : p))
    })
  }

  function move(id: string, x: number, y: number) {
    setPlaced((ps) => ps.map((p) => (p.id === id ? {...p, x, y} : p)))
  }

  function press(decision: Decision) {
    if (!current || !shift || stamp || pressing || visit !== 'waiting') return
    bringToFront('application')
    setPressing(decision)
    // Impact: ink, sound, shake. Fire the real workflow action at the same moment.
    setTimeout(() => {
      setStamp(decision)
      setThud((n) => n + 1)
      playThunk()
      const reference = current.reference
      const name = current.applicantName
      pending.current[reference] = fetch(`/api/shift/${shift.shiftId}/stamp`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({reference, decision}),
      })
        .then(async (res) => {
          const body = await res.json()
          if (!res.ok) throw new Error(body.error ?? 'The stamp did not take.')
          const result = body as StampResult
          setResults((r) => ({...r, [reference]: result}))
          setCredits(result.credits)
          if (!result.correct) {
            const citation = {key: reference, name, reason: `${result.truth === 'approve' ? 'Wrongly denied.' : 'Wrongly approved.'} ${result.reason}`}
            setCitations((cs) => [...cs, citation])
            setPrinting(citation)
            playPrinter()
            setTimeout(() => setPrinting((p) => (p?.key === reference ? null : p)), 7000)
          }
          return result
        })
        .catch((e) => {
          setSpeech(`(The stamping machine jammed: ${e instanceof Error ? e.message : e})`)
          setStamp(null)
          return null
        })
    }, 290)
    setTimeout(() => setPressing(null), 540)
  }

  async function handBack() {
    if (!current || !stamp || visit !== 'waiting') return
    playPaper()
    setTrayOpen(false)
    setSpeech('…')
    const result = await Promise.race([pending.current[current.reference], new Promise<null>((r) => setTimeout(() => r(null), 6000))])
    setSpeech(result?.reply || (stamp === 'approve' ? 'Thank you.' : 'Very well.'))
    setTimeout(() => setVisit('leaving'), 1700)
    setTimeout(() => {
      setVisit('gone')
      setPlaced((ps) => ps.filter((p) => p.id === 'bulletin' || p.id === 'rulebook'))
    }, 2400)
    setTimeout(() => callNext(index + 1), 2900)
  }

  function toggleMute() {
    setMuted(!muted)
    setMutedState(!muted)
  }

  if (error) return <BoothMessage title="The booth is closed" text={error} />
  if (phase === 'loading' || !shift) return <BoothMessage title="Reporting for duty" text="Collecting today's bulletin…" />
  if (phase === 'end') return <EndOfDay shift={shift} results={results} credits={credits} citations={citations} pending={pending.current} />

  function renderPaper(id: string) {
    if (!shift || !current) return null
    if (id === 'bulletin') return <BulletinPaper bulletin={shift.bulletin} day={shift.day} />
    if (id === 'rulebook') return <RulebookPaper c={current} />
    if (id === 'application') return <ApplicationPaper c={current} stamp={stamp} />
    if (id === 'memo') return <MemoSlip text={current.clerkMemo} />
    return <DocumentPaper paper={current.papers[Number(id.split('-')[1])]} />
  }

  const hh = String(Math.floor(clock / 60)).padStart(2, '0')
  const mm = String(clock % 60).padStart(2, '0')

  return (
    <div className="flex h-dvh min-h-[640px] flex-col overflow-hidden select-none">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3 border-b-4 border-booth-dark bg-booth-dark px-3 py-1.5 font-tiny text-[11px] uppercase tracking-[0.1em] sm:px-5">
        <Link href="/" className="flex items-center gap-2 text-text-dim hover:text-text">
          <Seal className="size-5 text-brass" /> <span className="hidden sm:inline">Bureau of Imaginary Permits</span>
        </Link>
        <div className="flex items-center gap-3 whitespace-nowrap sm:gap-6">
          <span>
            Day {shift.day}
            <span className="hidden sm:inline"> · {formatDate(shift.bulletin.date)}</span>
          </span>
          {/* The clock is atmosphere, not a timer: the day ends when the queue does, and running late is only overtime. */}
          <span className={clock >= DAY_END ? 'text-deny' : 'text-lamp'}>
            {clock >= DAY_END ? 'Overtime' : `${hh}:${mm}`}
          </span>
          <span>
            Credits <b className="text-lamp">{credits}</b>
          </span>
          <span>
            Citations <b className={citations.length ? 'text-deny' : ''}>{citations.length}</b>
          </span>
          <span className="hidden md:inline">
            Applicant {Math.min(index + 1, shift.cases.length)}/{shift.cases.length}
          </span>
          <button onClick={toggleMute} className="text-text-dim hover:text-text" aria-pressed={muted} aria-label={muted ? 'Sound off' : 'Sound on'}>
            {muted ? '♪ off' : '♪ on'}
          </button>
        </div>
      </header>

      {/* Booth: the queue outside and the window */}
      <section className="relative flex h-[clamp(170px,27vh,260px)] shrink-0 border-b-8 border-booth-dark bg-booth" aria-label="Inspection window">
        <div className="relative hidden w-[38%] overflow-hidden bg-[#2b3036] md:block" aria-hidden>
          <div className="absolute inset-x-0 bottom-0 h-10 bg-[#3a3f44]" />
          <div className="absolute inset-x-0 bottom-10 h-1 bg-[#23272b]" />
          <div className="absolute bottom-8 left-4 flex items-end gap-3 text-[#15181b]">
            {Array.from({length: Math.max(0, shift.cases.length - index - 1)}).map((_, i) => (
              <Silhouette key={i} className="h-16 w-10" />
            ))}
          </div>
          <p className="absolute left-4 top-3 font-tiny text-[10px] uppercase tracking-[0.12em] text-text-dim">Queue</p>
        </div>

        <div className="relative flex flex-1 items-end justify-end overflow-hidden bg-[#3d4a52] pr-[8%] sm:pr-[14%]">
          {/* Window glass and frame */}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0_46%,rgb(255_255_255/0.05)_46%_52%,transparent_52%)]" />
          {current && visit !== 'gone' && (
            <div className={visit === 'arriving' ? 'walk-in' : visit === 'leaving' ? 'walk-out' : ''}>
              <Portrait seed={current.portrait} className="block aspect-[20/24] h-[clamp(160px,26vh,250px)]" bg="transparent" />
            </div>
          )}
          {speech && visit !== 'gone' && (
            <div className="paper absolute left-3 top-4 max-w-[min(24rem,52%)] px-3 py-2 text-[20px] leading-[1.05] sm:left-6">
              <span className="font-tiny text-[9px] uppercase tracking-[0.12em] text-ink-soft">{current?.applicantName}</span>
              <p>{speech}</p>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 border-t-4 border-booth-dark bg-booth-light" />
        </div>
      </section>

      {compact && current && (
        <section className={`desk flex-1 overflow-y-auto pb-32 ${thud ? 'thud' : ''}`} key={`c${thud}`} aria-label="Desk">
          <div className="flex flex-col items-center gap-5 px-3 py-4">
            {placed
              .slice()
              .sort((x, y) => ORDER.indexOf(x.id.split('-')[0]) - ORDER.indexOf(y.id.split('-')[0]))
              .map((p) => (
                <div key={p.id + current.reference}>{renderPaper(p.id)}</div>
              ))}
          </div>
        </section>
      )}
      {compact && (
        <div className="fixed inset-x-0 bottom-0 z-[700] flex gap-2 border-t-4 border-booth-dark bg-booth p-3">
          {stamp && visit === 'waiting' ? (
            <button onClick={handBack} className="btn btn-lamp flex-1">
              Hand back the papers ↑
            </button>
          ) : (
            <>
              <button onClick={() => press('approve')} disabled={!!stamp || visit !== 'waiting'} className="btn btn-approve flex-1">
                Approved
              </button>
              <button onClick={() => press('deny')} disabled={!!stamp || visit !== 'waiting'} className="btn btn-deny flex-1">
                Denied
              </button>
            </>
          )}
        </div>
      )}

      {/* Desk */}
      {!compact && (
      <section ref={deskRef} key={thud} className={`desk relative flex-1 overflow-hidden ${thud ? 'thud' : ''}`} aria-label="Desk">
        {current &&
          placed.map((p) => (
            <Draggable key={p.id + current.reference} placed={p} onFront={bringToFront} onMove={move} bounds={deskRef}>
              {renderPaper(p.id)}
            </Draggable>
          ))}

        {/* The stamp head, dropping onto the application */}
        {pressing && current && (
          <StampHead decision={pressing} placed={placed.find((p) => p.id === 'application')} />
        )}

        {/* Stamp tray */}
        <div
          className={`absolute right-0 top-4 z-[500] flex transition-transform duration-200 ease-[steps(4)] ${trayOpen ? 'translate-x-0' : 'translate-x-[calc(100%-44px)]'}`}
        >
          <button
            onClick={() => setTrayOpen((o) => !o)}
            className="flex w-11 flex-col items-center justify-center gap-1 border-4 border-r-0 border-ink bg-brass py-4 font-tiny text-[10px] uppercase text-ink [writing-mode:vertical-rl]"
            aria-expanded={trayOpen}
          >
            Stamps
          </button>
          <div className="frame flex flex-col gap-3 p-3">
            <StampButton decision="approve" disabled={!!stamp || visit !== 'waiting'} onPress={press} />
            <StampButton decision="deny" disabled={!!stamp || visit !== 'waiting'} onPress={press} />
          </div>
        </div>

        {/* Hand back */}
        {stamp && visit === 'waiting' && (
          <button onClick={handBack} className="btn btn-lamp absolute bottom-4 left-1/2 z-[500] -translate-x-1/2 text-[14px]">
            Hand back the papers ↑
          </button>
        )}
        {!stamp && visit === 'waiting' && (
          <p className="pointer-events-none absolute bottom-3 right-4 z-[400] hidden max-w-[17rem] bg-booth-dark/85 px-3 py-1 text-right font-tiny text-[10px] uppercase leading-snug tracking-[0.1em] text-text-dim lg:block">
            Drag papers to compare · open the stamp tray → · stamp the application
          </p>
        )}

        {/* Citation printout */}
        {printing && (
          <div className="print paper absolute bottom-0 left-4 z-[600] w-[300px] border-deny bg-[#efe6cf] px-4 py-3" role="alert">
            <p className="font-tiny text-[10px] uppercase tracking-[0.14em] text-deny">Citation · Protocol breach</p>
            <p className="mt-1 text-[19px] leading-[1.05]">
              {printing.name}: {printing.reason}
            </p>
            <p className="mt-1 text-[16px] text-ink-soft">{citations.length > 1 ? 'Penalty: 5 credits.' : 'First warning. No penalty.'}</p>
          </div>
        )}
      </section>
      )}

      {/* Citation printout on small screens sits above the stamp bar */}
      {compact && printing && (
        <div className="print paper fixed inset-x-3 bottom-20 z-[800] border-deny bg-[#efe6cf] px-4 py-3" role="alert">
          <p className="font-tiny text-[10px] uppercase tracking-[0.14em] text-deny">Citation · Protocol breach</p>
          <p className="mt-1 text-[19px] leading-[1.05]">
            {printing.name}: {printing.reason}
          </p>
        </div>
      )}

      {phase === 'bulletin' && <BulletinOverlay shift={shift} onOpen={openWindow} />}
    </div>
  )
}

function Draggable({
  placed,
  onFront,
  onMove,
  bounds,
  children,
}: {
  placed: Placed
  onFront: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
  bounds: React.RefObject<HTMLDivElement | null>
  children: React.ReactNode
}) {
  const start = useRef<{px: number; py: number; x: number; y: number} | null>(null)
  return (
    <div
      className="absolute cursor-grab touch-none active:cursor-grabbing"
      style={{left: placed.x, top: placed.y, zIndex: placed.z}}
      onPointerDown={(e) => {
        onFront(placed.id)
        start.current = {px: e.clientX, py: e.clientY, x: placed.x, y: placed.y}
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (!start.current) return
        const rect = bounds.current?.getBoundingClientRect()
        const w = e.currentTarget.offsetWidth
        const maxX = (rect?.width ?? 1200) - 60
        const maxY = (rect?.height ?? 600) - 40
        const x = Math.max(-w + 60, Math.min(maxX, start.current.x + e.clientX - start.current.px))
        const y = Math.max(0, Math.min(maxY, start.current.y + e.clientY - start.current.py))
        onMove(placed.id, x, y)
      }}
      onPointerUp={() => {
        start.current = null
      }}
    >
      {children}
    </div>
  )
}

function StampButton({decision, disabled, onPress}: {decision: Decision; disabled: boolean; onPress: (d: Decision) => void}) {
  const approve = decision === 'approve'
  return (
    <button
      onClick={() => onPress(decision)}
      disabled={disabled}
      className={`group flex w-[150px] flex-col items-center disabled:opacity-50 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      aria-label={approve ? 'Stamp approved' : 'Stamp denied'}
    >
      {/* Handle */}
      <span className="h-5 w-10 border-4 border-ink bg-desk-light" />
      <span className="h-3 w-4 border-x-4 border-ink bg-desk-dark" />
      {/* Block */}
      <span
        className={`flex h-14 w-full items-center justify-center border-4 border-ink font-tiny text-[13px] font-bold uppercase tracking-[0.1em] text-[#f1ecd8] group-enabled:group-hover:-translate-y-0.5 ${approve ? 'bg-approve' : 'bg-deny'}`}
      >
        {approve ? 'Approved' : 'Denied'}
      </span>
    </button>
  )
}

function StampHead({decision, placed}: {decision: Decision; placed?: Placed}) {
  if (!placed) return null
  // The stamp box sits at the foot of the application form; read its live position so a dragged form still gets hit.
  const box = typeof document !== 'undefined' ? document.querySelector<HTMLElement>('[data-stamp-box]') : null
  const desk = box?.closest('section')?.getBoundingClientRect()
  const r = box?.getBoundingClientRect()
  const left = r && desk ? r.left - desk.left + r.width / 2 - 80 : placed.x + 70
  const top = r && desk ? r.top - desk.top + r.height - 160 : placed.y + 110
  return (
    <div className="pointer-events-none absolute z-[450]" style={{left, top}}>
      <div className="stamp-press flex flex-col items-center">
        <span className="h-10 w-16 border-4 border-ink bg-desk-light" />
        <span className="h-6 w-6 border-x-4 border-ink bg-desk-dark" />
        <span className={`h-16 w-[160px] border-4 border-ink ${decision === 'approve' ? 'bg-approve' : 'bg-deny'}`} />
      </div>
    </div>
  )
}

function BulletinOverlay({shift, onOpen}: {shift: ShiftStart; onOpen: () => void}) {
  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center bg-night/85 p-4">
      <div className="paper w-full max-w-lg px-6 py-5">
        <p className="font-tiny text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          Day {shift.day} · {formatDate(shift.bulletin.date)}
        </p>
        <h1 className="mt-1 font-pixel text-3xl leading-none">{shift.bulletin.title}</h1>
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-[21px] leading-[1.05]">
          {shift.bulletin.rules.map((r) => (
            <li key={r}>{r.startsWith('NEW:') ? <b className="text-deny">{r}</b> : r}</li>
          ))}
        </ol>
        <p className="mt-4 text-[18px] leading-[1.05] text-ink-soft">
          {shift.cases.length} applicants are waiting. Correct stamps earn 5 credits. Your first mistake is a warning; after that, each costs 5.
        </p>
        <button onClick={onOpen} className="btn btn-lamp mt-5 w-full text-[15px]">
          Open the window
        </button>
      </div>
    </div>
  )
}

function BoothMessage({title, text}: {title: string; text: string}) {
  return (
    <div className="grid min-h-dvh place-items-center p-4">
      <div className="frame max-w-md px-6 py-6 text-center">
        <Seal className="mx-auto size-12 text-brass" />
        <h1 className="mt-3 font-pixel text-2xl">{title}</h1>
        <p className="mt-2 font-type text-[20px] text-text-dim">
          {text}
          <span className="blink">_</span>
        </p>
        <Link href="/" className="btn mt-5">
          Back to the lobby
        </Link>
      </div>
    </div>
  )
}

function EndOfDay({
  shift,
  results,
  credits,
  citations,
  pending,
}: {
  shift: ShiftStart
  results: Record<string, StampResult>
  credits: number
  citations: Citation[]
  pending: Record<string, Promise<StampResult | null>>
}) {
  const [name, setName] = useState('')
  const [saved, setSaved] = useState<{credits: number; citations: number} | null>(null)
  const [board, setBoard] = useState<{player: string; credits: number; citations: number; processed: number}[] | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    // Let any stamp still in flight land before the shift is closed.
    await Promise.all(Object.values(pending))
    const res = await fetch(`/api/shift/${shift.shiftId}/finish`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({player: name})})
    setSaved(await res.json())
    setBoard(await (await fetch('/api/leaderboard')).json())
    setBusy(false)
  }

  return (
    <div className="mx-auto grid min-h-dvh max-w-4xl content-center gap-6 p-4 md:grid-cols-[1fr_18rem]">
      <div className="paper px-6 py-5">
        <p className="font-tiny text-[10px] uppercase tracking-[0.14em] text-ink-soft">
          End of day {shift.day} · {formatDate(shift.bulletin.date)}
        </p>
        <h1 className="mt-1 font-pixel text-3xl leading-none">The window is closed</h1>
        <table className="mt-4 w-full text-left text-[19px] leading-[1.05]">
          <tbody>
            {shift.cases.map((c) => {
              const r = results[c.reference]
              return (
                <tr key={c.reference} className="border-b border-dashed border-ink-soft align-top">
                  <td className="py-1.5 pr-2">{c.applicantName}</td>
                  <td className="py-1.5 pr-2 font-tiny text-[10px] uppercase">
                    {r ? <span className={r.decision === 'approve' ? 'text-approve' : 'text-deny'}>{r.decision === 'approve' ? 'Approved' : 'Denied'}</span> : 'Not seen'}
                  </td>
                  <td className="py-1.5 text-ink-soft">{r ? (r.correct ? '✓ Correct' : `✗ ${r.truth === 'approve' ? 'Wrongly denied.' : 'Wrongly approved.'} ${r.reason}`) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="mt-4 text-[22px]">
          Credits: <b>{saved?.credits ?? credits}</b> · Citations: <b>{saved?.citations ?? citations.length}</b>
        </p>
      </div>

      <div className="frame flex flex-col gap-3 p-4">
        {!saved ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void submit()
            }}
          >
            <label className="block font-tiny text-[10px] uppercase tracking-[0.12em] text-text-dim">
              Sign the day sheet
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder="Inspector name" className="field mt-1" />
            </label>
            <button disabled={busy} className="btn btn-lamp w-full">
              {busy ? 'Filing…' : 'File the day sheet'}
            </button>
          </form>
        ) : (
          <div>
            <p className="font-tiny text-[10px] uppercase tracking-[0.12em] text-text-dim">Inspectors of the month</p>
            <ol className="mt-2 space-y-1 font-type text-[20px] leading-none">
              {board?.map((b, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate">
                    {i + 1}. {b.player}
                  </span>
                  <span className="text-lamp">{b.credits}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {shift.day < LAST_DAY && (
          <a href={`/shift?day=${shift.day + 1}`} className="btn btn-lamp">
            Report for day {shift.day + 1}
          </a>
        )}
        <a href={`/shift?day=${shift.day}`} className="btn">
          Work day {shift.day} again
        </a>
        <Link href="/" className="btn">
          Back to the lobby
        </Link>
      </div>
    </div>
  )
}
