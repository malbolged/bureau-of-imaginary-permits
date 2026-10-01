import {leaderboard} from '@bureau/workflows/server'
import Link from 'next/link'

import {Chrome, Heading} from '@/components/chrome'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
  const board = await leaderboard()
  return (
    <Chrome>
      <Heading kicker="Notice board · Corridor B" title="Inspectors of the month">
        Scored by the Bureau, not by you: every stamp is a real workflow action, and each shift&apos;s credits are worked out on the server from what the engine
        recorded, checked against the truth on file.
      </Heading>
      <div className="paper mt-8 max-w-2xl px-6 py-5">
        {board.length === 0 ? (
          <p className="text-[22px]">No day sheets filed yet.</p>
        ) : (
          <table className="w-full text-left text-[22px] leading-none">
            <thead className="font-tiny text-[10px] uppercase tracking-[0.1em] text-ink-soft">
              <tr className="border-b-2 border-ink">
                <th className="py-2">#</th>
                <th className="py-2">Inspector</th>
                <th className="py-2 text-right">Credits</th>
                <th className="py-2 text-right">Citations</th>
                <th className="py-2 text-right">Files</th>
              </tr>
            </thead>
            <tbody>
              {board.map((b, i) => (
                <tr key={i} className="border-b border-dashed border-ink-soft">
                  <td className="py-2">{i + 1}</td>
                  <td className="py-2">{b.player}</td>
                  <td className="py-2 text-right">{b.credits}</td>
                  <td className={`py-2 text-right ${b.citations ? 'text-deny' : ''}`}>{b.citations}</td>
                  <td className="py-2 text-right">{b.processed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Link href="/shift" className="btn btn-lamp mt-6">
        Work a shift
      </Link>
    </Chrome>
  )
}
