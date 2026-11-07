import type { Clock } from '../lessons/types'
import { clamp } from './draw'

export function sp(c: Clock, k: number, start = 0, dur = 1) {
  if (c.step > k) return 1
  if (c.step < k) return 0
  return clamp((c.local - start) / dur)
}

export function timeline(c: Clock, starts: number[], scale: number) {
  return starts[Math.min(c.step, starts.length - 1)] + c.local / scale
}
