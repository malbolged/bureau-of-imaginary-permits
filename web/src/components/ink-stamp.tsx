/** The mark a stamp leaves. Rotation comes from a seed so the same file always shows the same crooked stamp. */
export function InkStamp({decision, seed = '', size = 28, animate = false}: {decision: 'approve' | 'deny'; seed?: string; size?: number; animate?: boolean}) {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0
  const rot = ((Math.abs(h) % 13) - 6) * 1.1
  return (
    <span
      className={`ink ${decision === 'approve' ? 'ink-approve' : 'ink-deny'} ${animate ? 'ink-in' : ''}`}
      style={{fontSize: size, transform: `rotate(${rot}deg)`, ['--rot' as string]: `rotate(${rot}deg)`}}
    >
      <small>Bureau of Imaginary Permits</small>
      {decision === 'approve' ? 'Approved' : 'Denied'}
    </span>
  )
}
