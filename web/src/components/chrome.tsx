import Link from 'next/link'

import {Seal} from './seal'

const NAV = [
  {href: '/shift', label: 'Work a shift'},
  {href: '/permits', label: 'File a permit'},
  {href: '/desk', label: 'Officials’ desk'},
  {href: '/leaderboard', label: 'Leaderboard'},
  {href: '/how', label: 'How it works'},
]

/** Header and footer for every page except the shift itself, which is full-screen. */
export function Chrome({children}: {children: React.ReactNode}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="no-print border-b-4 border-booth-dark bg-booth-dark">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Seal className="size-8 text-brass" />
            <span className="font-pixel text-lg leading-none text-text sm:text-xl">Bureau of Imaginary Permits</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 font-tiny text-[11px] uppercase tracking-[0.08em] text-text-dim">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-lamp">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <footer className="no-print mx-auto w-full max-w-6xl px-4 pb-8 font-type text-[18px] leading-tight text-text-dim sm:px-6">
        A work of fiction for the DEV Sanity Challenge. Permits are valid nowhere, including here. Every file runs on{' '}
        <a className="text-lamp underline underline-offset-4" href="https://www.sanity.io/docs/workflows/introduction">
          Sanity Workflows
        </a>
        . Project <span className="text-text">e23lrcxv</span>.
      </footer>
    </div>
  )
}

/** A section heading in the booth style: pixel caps over a hard rule. */
export function Heading({kicker, title, children}: {kicker?: string; title: string; children?: React.ReactNode}) {
  return (
    <div className="max-w-3xl">
      {kicker && <p className="font-tiny text-[11px] uppercase tracking-[0.14em] text-brass">{kicker}</p>}
      <h1 className="mt-1 font-pixel text-3xl leading-[1.05] text-text sm:text-4xl">{title}</h1>
      {children && <div className="mt-3 font-type text-[21px] leading-[1.15] text-text-dim">{children}</div>}
    </div>
  )
}
