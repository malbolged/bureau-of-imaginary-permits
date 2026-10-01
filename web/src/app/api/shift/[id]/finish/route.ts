import {finishShift} from '@bureau/workflows/server'

import {errorResponse} from '@/lib/respond'

export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params
    const {player} = (await req.json().catch(() => ({}))) as {player?: string}
    return Response.json(await finishShift(id, String(player ?? '')))
  } catch (error) {
    return errorResponse(error)
  }
}
