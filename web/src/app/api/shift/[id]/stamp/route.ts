import {stampCase} from '@bureau/workflows/server'

import {errorResponse} from '@/lib/respond'

export const maxDuration = 60

export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const {id} = await params
    const {reference, decision} = (await req.json()) as {reference?: string; decision?: string}
    if (decision !== 'approve' && decision !== 'deny') return Response.json({error: 'Choose approve or deny.'}, {status: 400})
    return Response.json(await stampCase(id, String(reference ?? ''), decision))
  } catch (error) {
    return errorResponse(error)
  }
}
