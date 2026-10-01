import {openWindow, stampCase, startShift} from '../src/server'

const t0 = Date.now()
const ms = () => `${Date.now() - t0}ms`
const {start, pending} = await startShift(1)
console.log('shift', start.shiftId, start.cases.length, 'cases', ms())
await openWindow(pending)
console.log('window open', ms())
// Play perfectly except case 2 (stamp approve on the name mismatch) to test citations.
const plays: ('approve' | 'deny')[] = ['approve', 'approve', 'deny', 'deny', 'deny', 'approve', 'approve']
for (const [i, c] of start.cases.entries()) {
  const r = await stampCase(start.shiftId, c.reference, plays[i])
  console.log(c.applicantName, plays[i], r.correct ? 'OK' : `WRONG: ${r.reason}`, `credits=${r.credits}`, ms())
}
// Deliberately not filing the day sheet, so smoke runs never reach the public leaderboard.
