import {deskQueue} from '@bureau/workflows/server'

import {errorResponse} from '@/lib/respond'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return Response.json(await deskQueue())
  } catch (error) {
    return errorResponse(error)
  }
}
