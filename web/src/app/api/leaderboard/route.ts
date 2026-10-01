import {leaderboard} from '@bureau/workflows/server'

import {errorResponse} from '@/lib/respond'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return Response.json(await leaderboard())
  } catch (error) {
    return errorResponse(error)
  }
}
