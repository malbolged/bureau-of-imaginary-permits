import {bureauStats, leaderboard} from '@bureau/workflows/server'
import Link from 'next/link'

import {Chrome} from '@/components/chrome'
import {InkStamp} from '@/components/ink-stamp'
import {Portrait, Silhouette} from '@/components/portrait'
import {TrackForm} from '@/components/track-form'

export const dynamic = 'force-dynamic'

const QUEUE = ['wendell-pike', 'margery-fitch', 'osric-delaney']

export default async function Lobby() {
  const [stats, board] = await Promise.all([bureauStats().catch(() => null), leaderboard().catch(() => [])])

  return (
    <Chrome>
      <section className="frame grid gap-0 overflow-hidden md:grid-cols-[1.1fr_1fr]">
        <div className="p-6 sm:p-10">
          <p className="font-tiny text-[11px] uppercase tracking-[0.14em] text-brass">Now hiring · Inspection window, Day 1</p>
          <h1 className="mt-3 font-pixel text-4xl leading-[0.95] text-text sm:text-6xl">
            Bureau of
            <br />
            Imaginary Permits
          </h1>
          <p className="mt-5 max-w-md font-type text-[24px] leading-[1.1] text-text-dim">
            The AI clerk has passed every file. The clerk is tired. Take the window, read the papers, and stamp what it missed.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/shift" className="btn btn-lamp px-5 py-3 text-[15px]">
              Work a shift
            </Link>
            <Link href="/permits" className="btn px-5 py-3 text-[15px]">
              File a permit
            </Link>
          </div>
        </div>

        {/* The booth, from outside */}
        <div className="relative min-h-[300px] border-t-4 border-booth-dark bg-[#2b3036] md:border-l-4 md:border-t-0" aria-hidden>
          <div className="absolute inset-x-0 bottom-0 h-16 bg-[#3a3f44]" />
          <div className="absolute inset-x-0 bottom-16 h-1 bg-[#23272b]" />
          <div className="absolute bottom-14 left-6 flex items-end gap-3 text-[#15181b]">
            <Silhouette className="h-16 w-10" />
            <Silhouette className="h-16 w-10" />
          </div>
          <div className="absolute bottom-14 right-6 flex items-end gap-2">
            {QUEUE.map((s, i) => (
              <Portrait key={s} seed={s} className={`block ${i === 2 ? 'h-[168px] w-[140px]' : 'h-[120px] w-[100px] opacity-70'}`} bg="transparent" />
            ))}
          </div>
          <div className="paper absolute left-1/2 top-8 w-[220px] -translate-x-1/2 rotate-2 px-4 py-3">
            <p className="font-tiny text-[9px] uppercase tracking-[0.12em] text-ink-soft">Application · IP-7QX2KD</p>
            <p className="text-[20px] leading-none">Permit to Keep a Small Dragon (Indoor)</p>
            <div className="mt-3 grid h-[64px] place-items-center border-2 border-dashed border-ink-soft">
              <InkStamp decision="deny" seed="lobby" size={20} />
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        <div className="frame p-5">
          <h2 className="font-tiny text-[11px] uppercase tracking-[0.12em] text-brass">Inspectors of the month</h2>
          {board.length ? (
            <ol className="mt-3 space-y-1.5 font-type text-[21px] leading-none">
              {board.slice(0, 6).map((b, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="truncate">
                    {i + 1}. {b.player}
                  </span>
                  <span className="text-lamp">{b.credits} cr</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 font-type text-[20px] text-text-dim">No shifts filed yet. Be the first.</p>
          )}
          <Link href="/leaderboard" className="mt-4 inline-block font-tiny text-[10px] uppercase tracking-[0.1em] text-lamp underline underline-offset-4">
            Full leaderboard
          </Link>
        </div>

        <div className="frame p-5">
          <h2 className="font-tiny text-[11px] uppercase tracking-[0.12em] text-brass">Citizen files</h2>
          {stats && (
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                ['Filed', stats.filed],
                ['Issued', stats.issued],
                ['At a desk', stats.waiting],
              ].map(([label, value]) => (
                <div key={label} className="border-4 border-booth-dark bg-booth-dark/50 py-2">
                  <dd className="font-pixel text-3xl text-lamp">{String(value).padStart(3, '0')}</dd>
                  <dt className="font-tiny text-[9px] uppercase tracking-[0.1em] text-text-dim">{label}</dt>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-3 font-type text-[19px] leading-[1.1] text-text-dim">
            Real applications from citizens. The real AI clerk reads them, and real officials stamp them.
          </p>
        </div>

        <div className="frame p-5">
          <h2 className="font-tiny text-[11px] uppercase tracking-[0.12em] text-brass">Track a file</h2>
          <p className="mt-2 font-type text-[19px] leading-[1.1] text-text-dim">Enter the reference on your receipt.</p>
          <div className="mt-3">
            <TrackForm />
          </div>
        </div>
      </section>
    </Chrome>
  )
}
