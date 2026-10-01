/** The Bureau's seal as pixel art: a stepped ring around a key. Inherits colour from `currentColor`. */
const RING = [
  '....XXXXXX....',
  '..XX......XX..',
  '.X..........X.',
  '.X....XX....X.',
  'X....X..X....X',
  'X....X..X....X',
  'X.....XX.....X',
  'X......X.....X',
  'X......XX....X',
  'X......X.....X',
  '.X.....XX...X.',
  '.X..........X.',
  '..XX......XX..',
  '....XXXXXX....',
]

export function Seal({className}: {className?: string}) {
  return (
    <svg viewBox="0 0 14 14" className={`pixel ${className ?? ''}`} aria-hidden>
      {RING.flatMap((row, y) => [...row].map((c, x) => (c === 'X' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" /> : null)))}
    </svg>
  )
}
