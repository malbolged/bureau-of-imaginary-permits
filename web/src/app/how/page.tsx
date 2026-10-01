import {deployedDefinitions} from '@bureau/workflows/server'

import {Chrome, Heading} from '@/components/chrome'

export const dynamic = 'force-dynamic'

const AGENT_EFFECTS: Record<string, string> = {'clerk-review': 'Clerk Third Class (AI)', 'weather-review': 'Ministry of Weather (AI)'}

export default async function HowPage() {
  const all = await deployedDefinitions()
  // Keep the latest deployed version of each definition.
  const latest = [...new Map(all.sort((a, b) => a.version - b.version).map((d) => [d.name, d])).values()]

  return (
    <Chrome>
      <Heading kicker="Form 0-1 · Standing orders" title="How a file moves">
        <p>
          Every permit type in Sanity names an approval chain. Each chain is a{' '}
          <a className="text-lamp underline underline-offset-4" href="https://www.sanity.io/docs/workflows/introduction">
            Sanity Workflows
          </a>{' '}
          definition, deployed into the <span className="text-text">workflows</span> dataset as a document. Filing an application starts an instance of that
          definition. The instance is the file&apos;s single source of truth.
        </p>
        <p className="mt-3">
          AI agents run as <span className="text-text">effects</span>: the engine queues them, this site&apos;s server runs them, and their ruling goes back on
          the instance. Every move between stages is a GROQ condition over that state. Humans fire <span className="text-text">actions</span>: citizens resubmit,
          officials stamp, and at the inspection window, you stamp. The engine refuses any action the current stage doesn&apos;t offer.
        </p>
        <p className="mt-3">Below are the four definitions as deployed, read back from the dataset just now.</p>
      </Heading>

      <div className="mt-10 space-y-8">
        {latest.map((d) => (
          <section key={d._id} className="frame">
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b-4 border-booth-dark px-5 py-4">
              <div>
                <h2 className="font-pixel text-2xl leading-none text-text">{d.title}</h2>
                <p className="mt-1 font-type text-[19px] leading-[1.1] text-text-dim">{d.description}</p>
              </div>
              <span className="font-type text-[17px] text-brass">
                {d._id} · starts at {d.initialStage}
              </span>
            </header>
            <ol className="divide-y-4 divide-booth-dark">
              {d.stages.map((s) => {
                const actions =
                  (s as unknown as {activities?: {actions?: {name: string; title?: string; when?: string; effects?: string[]}[]}[]}).activities?.flatMap(
                    (a) => a.actions ?? [],
                  ) ?? []
                const agents = actions.flatMap((a) => a.effects ?? [])
                const human = actions.filter((a) => !a.when)
                return (
                  <li key={s.name} className="grid gap-3 px-5 py-4 md:grid-cols-[15rem_1fr]">
                    <div>
                      <p className="font-pixel text-lg leading-none text-text">{s.title}</p>
                      <p className="font-type text-[16px] text-text-dim">{s.name}</p>
                      <p className="mt-2 flex flex-wrap gap-1.5">
                        {agents.map((e) => (
                          <span key={e} className="bg-lamp px-1.5 py-0.5 font-tiny text-[9px] uppercase tracking-[0.06em] text-ink">
                            AI · {AGENT_EFFECTS[e] ?? e}
                          </span>
                        ))}
                        {human.map((a) => (
                          <span
                            key={a.name}
                            className={`px-1.5 py-0.5 font-tiny text-[9px] uppercase tracking-[0.06em] text-paper ${a.name === 'deny' ? 'bg-deny' : a.name === 'approve' ? 'bg-approve' : 'bg-booth-light'}`}
                          >
                            Human · {a.title}
                          </span>
                        ))}
                      </p>
                    </div>
                    {s.transitions?.length ? (
                      <ul className="space-y-2">
                        {s.transitions.map((t) => (
                          <li key={t.name} className="font-type text-[19px] leading-[1.1]">
                            <span className="text-text">→ {d.stages.find((x) => x.name === t.to)?.title ?? t.to}</span>
                            {t.title && <span className="text-text-dim"> · {t.title}</span>}
                            <code className="mt-1 block break-words bg-night px-2 py-1 font-type text-[16px] text-lamp">when {t.when ?? 'always'}</code>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="font-type text-[19px] text-text-dim">Terminal stage.</p>
                    )}
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
      </div>
    </Chrome>
  )
}
