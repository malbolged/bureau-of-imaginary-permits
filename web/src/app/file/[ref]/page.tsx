import {fileView, UserError} from '@bureau/workflows/server'
import Link from 'next/link'

import {Chrome} from '@/components/chrome'
import {FileTracker} from '@/components/file-tracker'
import {InkStamp} from '@/components/ink-stamp'

export const dynamic = 'force-dynamic'

export default async function FilePage({params}: {params: Promise<{ref: string}>}) {
  const {ref} = await params
  const view = await fileView(decodeURIComponent(ref)).catch((e) => {
    if (e instanceof UserError) return null
    throw e
  })
  return (
    <Chrome>
      {view ? (
        <FileTracker initial={view} />
      ) : (
        <div className="paper mx-auto max-w-lg px-8 py-8 text-center">
          <InkStamp decision="deny" seed={ref} size={26} />
          <p className="mt-5 text-[22px] leading-[1.1]">
            The Bureau has no record of <b>{decodeURIComponent(ref)}</b>. It may not have been imagined yet.
          </p>
          <Link href="/" className="btn mt-5">
            Back to the lobby
          </Link>
        </div>
      )}
    </Chrome>
  )
}
