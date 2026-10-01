'use client'

/** Synthesised sounds (no audio files): a stamp thunk, a paper shuffle, a counter bell, a printer. */

let ctx: AudioContext | null = null
const KEY = 'bip-muted'

export function isMuted() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(KEY, muted ? '1' : '0')
  } catch {
    // Storage can be unavailable (private mode); sound just stays on for this page.
  }
}

function audio() {
  if (isMuted() || typeof window === 'undefined') return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function noise(a: AudioContext, seconds: number) {
  const buffer = a.createBuffer(1, Math.floor(a.sampleRate * seconds), a.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = a.createBufferSource()
  src.buffer = buffer
  return src
}

export function playThunk() {
  const a = audio()
  if (!a) return
  const t = a.currentTime
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(140, t)
  osc.frequency.exponentialRampToValueAtTime(42, t + 0.14)
  gain.gain.setValueAtTime(0.9, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
  osc.connect(gain).connect(a.destination)
  osc.start(t)
  osc.stop(t + 0.22)

  const n = noise(a, 0.06)
  const filter = a.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 900
  const ng = a.createGain()
  ng.gain.setValueAtTime(0.5, t)
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
  n.connect(filter).connect(ng).connect(a.destination)
  n.start(t)
}

export function playPaper() {
  const a = audio()
  if (!a) return
  const t = a.currentTime
  const n = noise(a, 0.18)
  const filter = a.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 3200
  filter.Q.value = 0.8
  const g = a.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(0.18, t + 0.03)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
  n.connect(filter).connect(g).connect(a.destination)
  n.start(t)
}

export function playBell() {
  const a = audio()
  if (!a) return
  const t = a.currentTime
  for (const [f, delay] of [
    [1046, 0],
    [784, 0.12],
  ] as const) {
    const osc = a.createOscillator()
    const g = a.createGain()
    osc.type = 'square'
    osc.frequency.value = f
    g.gain.setValueAtTime(0.06, t + delay)
    g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.25)
    osc.connect(g).connect(a.destination)
    osc.start(t + delay)
    osc.stop(t + delay + 0.26)
  }
}

export function playPrinter() {
  const a = audio()
  if (!a) return
  const t = a.currentTime
  for (let i = 0; i < 8; i++) {
    const osc = a.createOscillator()
    const g = a.createGain()
    osc.type = 'square'
    osc.frequency.value = 220 + (i % 2) * 40
    g.gain.setValueAtTime(0.035, t + i * 0.1)
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.07)
    osc.connect(g).connect(a.destination)
    osc.start(t + i * 0.1)
    osc.stop(t + i * 0.1 + 0.08)
  }
}
