import {resubmit, settle} from '@bureau/workflows/server'
import {after} from 'next/server'

import {errorResponse} from '@/lib/respond'

export const maxDuration = 300

export async function POST(req: Request, {params}: {params: Promise<{ref: string}>}) {
  try {
    const {ref} = await params
    const {reply} = (await req.json()) as {reply?: string}
    const instanceId = await resubmit(ref, String(reply ?? ''))
    after(() => settle(instanceId).catch((e) => console.error('[settle]', ref, e)))
    return Response.json({ok: true})
  } catch (error) {
    return errorResponse(error)
  }
}
