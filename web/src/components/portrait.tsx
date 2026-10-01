/**
 * Procedural pixel portraits. A seed (usually the applicant's name) picks skin, hair, hat,
 * glasses, facial hair and coat; the face is drawn on a 20×24 grid as crisp SVG rects.
 * Same seed, same face: a card photo with a different seed is a mismatched photo.
 */

function rng(seed: string) {
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    h ^= h >>> 16
    return (h >>> 0) / 4294967296
  }
}

const SKIN = [
  ['#f0c8a0', '#d9a77e'],
  ['#e2b088', '#c48e66'],
  ['#c98e62', '#a8714a'],
  ['#9c6a45', '#7d5233'],
  ['#6e4a32', '#563824'],
  ['#e8bfa8', '#cf9f86'],
]
const HAIR = ['#2a211b', '#4a3222', '#7a5a34', '#b08a4a', '#8e8e86', '#d8d2c4', '#6b2f22']
const COAT = ['#4f5a4a', '#5a4d3f', '#3e4a5a', '#6a5a3a', '#5a3e3e', '#4a4a52']
const HAT = ['#2e2a26', '#4a3f34', '#3b4450', '#5c4630']

type Px = [x: number, y: number, w: number, h: number, fill: string]

export function portraitPixels(seed: string): Px[] {
  const r = rng(seed.toLowerCase())
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)]
  const [skin, shade] = pick(SKIN)
  const hair = pick(HAIR)
  const coat = pick(COAT)
  const hairStyle = Math.floor(r() * 5) // 0 bald, 1 short, 2 long, 3 bun, 4 side part
  const hat = r() < 0.28 ? pick(HAT) : null
  const glasses = r() < 0.3
  const beard = r() < 0.22
  const moustache = !beard && r() < 0.25
  const wide = r() < 0.5 ? 1 : 0
  const px: Px[] = []
  const p = (x: number, y: number, w: number, h: number, fill: string) => px.push([x, y, w, h, fill])

  // Shoulders and coat, with a lapel line and a collar.
  p(2, 19, 16, 5, coat)
  p(1, 21, 18, 3, coat)
  p(8, 19, 4, 2, '#d8d0bc')
  p(9, 20, 2, 4, '#1f1b17')
  p(5, 19, 1, 5, 'rgb(0 0 0 / 0.25)')
  p(14, 19, 1, 5, 'rgb(0 0 0 / 0.25)')
  // Neck.
  p(8, 16, 4, 3, shade)
  // Head.
  p(5 - wide, 6, 10 + wide * 2, 10, skin)
  p(6 - wide, 5, 8 + wide * 2, 1, skin)
  p(6 - wide, 16, 8 + wide * 2, 1, skin)
  p(14 + wide, 7, 1, 8, shade)
  // Ears.
  p(4 - wide, 10, 1, 3, shade)
  p(15 + wide, 10, 1, 3, shade)
  // Hair.
  if (hairStyle === 1) {
    p(5 - wide, 4, 10 + wide * 2, 3, hair)
  } else if (hairStyle === 2) {
    p(4 - wide, 4, 12 + wide * 2, 3, hair)
    p(4 - wide, 7, 2, 10, hair)
    p(14 + wide, 7, 2, 10, hair)
  } else if (hairStyle === 3) {
    p(5 - wide, 4, 10 + wide * 2, 3, hair)
    p(8, 1, 4, 3, hair)
  } else if (hairStyle === 4) {
    p(5 - wide, 4, 10 + wide * 2, 2, hair)
    p(5 - wide, 6, 4, 2, hair)
  }
  if (hat) {
    p(3 - wide, 5, 14 + wide * 2, 1, hat)
    p(5 - wide, 1, 10 + wide * 2, 4, hat)
    p(5 - wide, 4, 10 + wide * 2, 1, '#8a2f24')
  }
  // Brows and eyes.
  p(6, 9, 3, 1, hair === '#d8d2c4' ? '#8e8e86' : hair)
  p(11, 9, 3, 1, hair === '#d8d2c4' ? '#8e8e86' : hair)
  p(7, 10, 1, 1, '#1b1714')
  p(12, 10, 1, 1, '#1b1714')
  if (glasses) {
    p(6, 10, 3, 1, 'rgb(255 255 255 / 0.18)')
    p(11, 10, 3, 1, 'rgb(255 255 255 / 0.18)')
    p(5, 9, 1, 3, '#1b1714')
    p(9, 9, 2, 1, '#1b1714')
    p(14, 9, 1, 3, '#1b1714')
    p(5, 11, 4, 1, '#1b1714')
    p(10, 11, 4, 1, '#1b1714')
  }
  // Nose and mouth.
  p(10, 11, 1, 2, shade)
  p(8, 14, 4, 1, '#6a3a2e')
  if (moustache) p(7, 13, 6, 1, hair)
  if (beard) {
    p(6 - wide, 13, 8 + wide * 2, 4, hair)
    p(8, 14, 4, 1, '#6a3a2e')
  }
  return px
}

export function Portrait({seed, className, bg = '#4a433a'}: {seed: string; className?: string; bg?: string}) {
  return (
    <svg viewBox="0 0 20 24" className={`pixel ${className ?? ''}`} role="img" aria-label="Portrait">
      <rect width="20" height="24" fill={bg} />
      {portraitPixels(seed).map(([x, y, w, h, fill], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
      ))}
    </svg>
  )
}

/** A queue silhouette, for the people waiting outside. */
export function Silhouette({className}: {className?: string}) {
  return (
    <svg viewBox="0 0 10 16" className={`pixel ${className ?? ''}`} aria-hidden>
      <rect x="3" y="0" width="4" height="4" fill="currentColor" />
      <rect x="2" y="4" width="6" height="7" fill="currentColor" />
      <rect x="1" y="5" width="1" height="5" fill="currentColor" />
      <rect x="8" y="5" width="1" height="5" fill="currentColor" />
      <rect x="2" y="11" width="2" height="5" fill="currentColor" />
      <rect x="6" y="11" width="2" height="5" fill="currentColor" />
    </svg>
  )
}
