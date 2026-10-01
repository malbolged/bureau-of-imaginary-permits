import 'server-only'

import {UserError} from '@bureau/workflows/server'

/** Engine refusals (wrong stage, missing activity) and our own validation become 4xx; anything else is a 500. */
export function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const kind = (error as {kind?: string} | null)?.kind
  if (error instanceof UserError) return Response.json({error: message}, {status: 400})
  if (kind === 'contract-violation' || kind === 'action-disabled' || /not found in current stage|not allowed|disabled/i.test(message)) {
    return Response.json({error: 'That desk is not handling this file right now.', detail: message}, {status: 409})
  }
  console.error(error)
  return Response.json({error: 'The Bureau is experiencing an administrative difficulty.'}, {status: 500})
}
