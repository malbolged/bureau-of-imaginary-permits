'use client'

import {useRouter} from 'next/navigation'
import {useState} from 'react'

/** Look up a file by its reference (IP-XXXXXX). */
export function TrackForm() {
  const router = useRouter()
  const [ref, setRef] = useState('')
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const value = ref.trim().toUpperCase()
        if (value) router.push(`/file/${encodeURIComponent(value)}`)
      }}
    >
      <input
        value={ref}
        onChange={(e) => setRef(e.target.value)}
        placeholder="IP-XXXXXX"
        aria-label="File reference"
        className="field min-w-0 flex-1 uppercase"
      />
      <button className="btn btn-lamp">Go</button>
    </form>
  )
}
