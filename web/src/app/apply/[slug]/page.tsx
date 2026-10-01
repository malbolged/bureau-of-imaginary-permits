import Link from 'next/link'
import {notFound} from 'next/navigation'

import {ApplicationForm} from '@/components/application-form'
import {Chrome} from '@/components/chrome'
import {Seal} from '@/components/seal'
import {CHAINS, getPermit} from '@/lib/catalogue'

export const dynamic = 'force-dynamic'

export default async function ApplyPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params
  const permit = await getPermit(slug)
  if (!permit) notFound()
  const chain = CHAINS[permit.workflow]

  return (
    <Chrome>
      <Link href="/permits" className="font-tiny text-[11px] uppercase tracking-[0.1em] text-text-dim hover:text-lamp">
        ← All permits
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_19rem]">
        <article className="paper">
          <header className="flex items-start justify-between gap-4 border-b-4 border-ink px-5 py-4 sm:px-8">
            <div>
              <p className="font-tiny text-[10px] uppercase tracking-[0.12em] text-ink-soft">Application · {permit.department.name}</p>
              <h1 className="mt-1 font-pixel text-3xl leading-[1.05]">{permit.title}</h1>
              <p className="mt-1 text-[20px] leading-[1.05] text-ink-soft">{permit.summary}</p>
            </div>
            <Seal className="size-12 shrink-0 text-ink" />
          </header>
          <ApplicationForm slug={permit.slug} requirements={permit.requirements} />
        </article>

        <aside className="space-y-5">
          <Box title="Approval chain">
            <ol className="space-y-2 font-type text-[20px] leading-none">
              {chain.steps.map((s, i) => (
                <li key={s} className="flex items-center gap-2.5">
                  <span className="grid size-7 shrink-0 place-items-center border-2 border-lamp font-tiny text-[11px] text-lamp">{i + 1}</span>
                  <span>{s}</span>
                  <span className="font-tiny text-[9px] uppercase text-text-dim">{/AI|Ministry/.test(s) ? 'agent' : 'human'}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 font-type text-[17px] leading-[1.1] text-text-dim">
              Runs as the <span className="text-text">{permit.workflow}</span> workflow.{' '}
              <Link href="/how" className="text-lamp underline underline-offset-4">
                See the rules
              </Link>
            </p>
          </Box>
          <Box title="Particulars">
            <dl className="space-y-1.5 font-type text-[19px] leading-none">
              <Row term="Fee" value={permit.fee ? `${permit.fee} imaginary crowns` : 'Free of charge'} />
              <Row term="Valid" value={permit.validity} />
              <Row term="Queue at" value={permit.department.floor} />
              <Row term="Signed by" value={permit.department.head} />
            </dl>
          </Box>
          {permit.prerequisites.length > 0 && (
            <Box title="You must already hold">
              <ul className="space-y-1 font-type text-[20px]">
                {permit.prerequisites.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/apply/${p.slug}`} className="text-lamp underline underline-offset-4">
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-2 font-type text-[17px] leading-[1.1] text-text-dim">Quote its permit number (IP-XXXXXX) in your answers, or when the clerk asks.</p>
            </Box>
          )}
          <Box title="Forms the clerk may request">
            <ul className="space-y-1 font-type text-[19px] leading-none">
              {permit.forms.map((f) => (
                <li key={f.code}>
                  <span className="text-lamp">{f.code}</span> {f.title}
                </li>
              ))}
            </ul>
          </Box>
        </aside>
      </div>
    </Chrome>
  )
}

function Box({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <section className="frame p-4">
      <h2 className="mb-3 font-tiny text-[11px] uppercase tracking-[0.12em] text-brass">{title}</h2>
      {children}
    </section>
  )
}

function Row({term, value}: {term: string; value?: string}) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      <dt className="text-text-dim">{term}</dt>
      <dd>{value}</dd>
    </div>
  )
}
