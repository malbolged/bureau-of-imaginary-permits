import Link from 'next/link'

import {Chrome, Heading} from '@/components/chrome'
import {CHAINS, getDepartments} from '@/lib/catalogue'

export const dynamic = 'force-dynamic'

export default async function PermitsPage() {
  const departments = await getDepartments()
  return (
    <Chrome>
      <Heading kicker="Form 1-A · For citizens" title="Apply for a permit">
        Choose a permit and fill in the form. Clerk Third Class, an AI, reads every word. Some files go on to the Ministry of Weather, and to human officials who stamp
        them. You can watch your file move from desk to desk.
      </Heading>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        {departments.map((d) => (
          <section key={d._id} className="frame p-5" aria-labelledby={d._id}>
            <div className="border-b-4 border-booth-dark pb-2">
              <h2 id={d._id} className="font-pixel text-2xl leading-none text-text">
                {d.name}
              </h2>
              <p className="mt-1 font-type text-[18px] leading-none text-text-dim">
                {d.floor} · <i>{d.motto}</i>
              </p>
            </div>
            <ul className="mt-3 space-y-3">
              {d.permits.map((p) => (
                <li key={p._id}>
                  <Link href={`/apply/${p.slug}`} className="paper group block px-4 py-3 transition-transform hover:-translate-y-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[22px] leading-none group-hover:underline group-hover:underline-offset-4">{p.title}</p>
                      <span className="shrink-0 text-[20px] leading-none">{p.fee ? `${p.fee} cr` : 'Free'}</span>
                    </div>
                    <p className="mt-1 text-[18px] leading-[1.05] text-ink-soft">{p.summary}</p>
                    <p className="mt-2 flex flex-wrap items-center gap-1.5 font-tiny text-[9px] uppercase tracking-[0.08em]">
                      <span className="bg-ink px-1.5 py-0.5 text-paper">{CHAINS[p.workflow].label}</span>
                      <span className="text-ink-soft">{CHAINS[p.workflow].steps.join(' → ')}</span>
                      {p.prerequisites.length > 0 && (
                        <span className="bg-deny px-1.5 py-0.5 text-paper">Requires {p.prerequisites.map((x) => x.title).join(', ')}</span>
                      )}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Chrome>
  )
}
