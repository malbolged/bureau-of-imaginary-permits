import {settle, visitorStamp} from '@bureau/workflows/server'

import {errorResponse} from '@/lib/respond'

export const maxDuration = 60

export async function POST(req: Request, {params}: {params: Promise<{ref: string}>}) {
  try {
    const {ref} = await params
    const {decision, reason} = (await req.json()) as {decision?: string; reason?: string}
    if (decision !== 'approve' && decision !== 'deny') return Response.json({error: 'Choose approve or deny.'}, {status: 400})
    const instanceId = await visitorStamp(ref, decision, reason)
    // A stamp queues no agent work today, but settle anyway so a future chain with a post-stamp agent just works.
    await settle(instanceId)
    return Response.json({ok: true})
  } catch (error) {
    return errorResponse(error)
  }
}
