import type {Metadata} from 'next'

import {ShiftGame} from '@/components/shift/game'

export const metadata: Metadata = {title: 'Inspection window · Bureau of Imaginary Permits'}

export default async function ShiftPage({searchParams}: {searchParams: Promise<{day?: string}>}) {
  const {day} = await searchParams
  const n = Math.max(1, Math.min(2, Number(day) || 1))
  return <ShiftGame key={n} day={n} />
}
