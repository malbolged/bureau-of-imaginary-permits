import {deskQueue} from '@bureau/workflows/server'
import Link from 'next/link'

import {Chrome, Heading} from '@/components/chrome'
import {Portrait} from '@/components/portrait'

export const dynamic = 'force-dynamic'

export default async function DeskPage() {
  const queue = await deskQueue()
  return (
    <Chrome>
      <Heading kicker="Officials only (and visitors)" title="The officials’ desk">
        Real citizen files that the AI clerk has passed, waiting for a human stamp. Bureau staff work this in-tray in the Stamp Desk, an App SDK app inside the
        Sanity dashboard, where every stamp is recorded under their own name. Visitors can stamp a file from its page.
      </Heading>

      {queue.length === 0 ? (
        <div className="paper mt-8 max-w-2xl px-6 py-6 text-[22px] leading-[1.1]">
          The in-tray is empty. File a standard or sky permit and it lands here once the clerk is satisfied. Or{' '}
          <Link href="/shift" className="underline underline-offset-4">
            work a shift
          </Link>{' '}
          at the inspection window.
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {queue.map((f) => (
            <li key={f.reference}>
              <Link href={`/file/${f.reference}`} className="paper group flex gap-3 px-4 py-3 transition-transform hover:-translate-y-0.5">
                <div className="shrink-0 border-[3px] border-ink">
                  <Portrait seed={f.applicantName} className="block h-[72px] w-[60px]" bg="#bcb293" />
                </div>
                <div className="min-w-0">
                  <p className="font-tiny text-[9px] uppercase tracking-[0.1em] text-ink-soft">{f.reference}</p>
                  <p className="text-[21px] leading-none group-hover:underline group-hover:underline-offset-4">{f.permit}</p>
                  <p className="mt-1 text-[18px] leading-none text-ink-soft">{f.applicantName}</p>
                  <p className="mt-1 font-tiny text-[9px] uppercase tracking-[0.1em] text-deny">{f.stage}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Chrome>
  )
}
