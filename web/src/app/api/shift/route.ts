import {openWindow, startShift} from '@bureau/workflows/server'
import {after} from 'next/server'

import {errorResponse} from '@/lib/respond'

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const {day} = (await req.json().catch(() => ({}))) as {day?: number}
    const {start, pending} = await startShift(Number(day) || 1)
    // Open the window (start the workflow instances) while the inspector reads the bulletin.
    after(() => openWindow(pending).catch((e) => console.error('[openWindow]', start.shiftId, e)))
    return Response.json(start)
  } catch (error) {
    return errorResponse(error)
  }
}
