import {fileApplication, settle} from '@bureau/workflows/server'
import {after} from 'next/server'

import {errorResponse} from '@/lib/respond'

export const maxDuration = 300

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {permitSlug?: string; applicantName?: string; answers?: Record<string, string>}
    const {reference, instanceId} = await fileApplication({
      permitSlug: String(body.permitSlug ?? ''),
      applicantName: String(body.applicantName ?? ''),
      answers: body.answers ?? {},
    })
    // The clerk takes 8–30 s; answer now and let the file page watch the instance move.
    after(() => settle(instanceId).catch((e) => console.error('[settle]', reference, e)))
    return Response.json({reference})
  } catch (error) {
    return errorResponse(error)
  }
}
