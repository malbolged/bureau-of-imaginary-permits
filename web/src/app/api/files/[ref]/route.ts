import {fileView} from '@bureau/workflows/server'

import {errorResponse} from '@/lib/respond'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, {params}: {params: Promise<{ref: string}>}) {
  try {
    const {ref} = await params
    return Response.json(await fileView(ref))
  } catch (error) {
    return errorResponse(error)
  }
}
