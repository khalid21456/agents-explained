import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Clock, Step } from '../lessons/types'

export interface PlayerUi {
  step: number
  playing: boolean
  waiting: boolean
  speed: number
  loop: boolean
  ended: boolean
}

const PACE = 0.4

export function usePlayer(steps: Step[], gate?: (i: number) => boolean, startAt = 0) {
  const clock = useRef<Clock>({ step: startAt, local: 0, waiting: false })
  const ctl = useRef({ playing: true, speed: 1, loop: false })
  const barRef = useRef<HTMLDivElement | null>(null)
  const stepsRef = useRef(steps)
  const gateRef = useRef(gate)
  const [ui, setUi] = useState<PlayerUi>({ step: startAt, playing: true, waiting: false, speed: 1, loop: false, ended: false })

  useLayoutEffect(() => {
    stepsRef.current = steps
    gateRef.current = gate
  })

  const sync = useCallback(() => {
    const c = clock.current
    const k = ctl.current
    const s = stepsRef.current
    setUi({
      step: c.step,
      playing: k.playing,
      waiting: c.waiting,
      speed: k.speed,
      loop: k.loop,
      ended: c.step === s.length - 1 && c.local >= s[c.step].dur,
    })
  }, [])

  useEffect(() => {
    let raf = 0
    let last = 0
    const frame = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.12) : 0
      last = now
      const c = clock.current
      const k = ctl.current
      const s = stepsRef.current
      if (k.playing) {
        c.local += dt * k.speed * PACE
        const cur = s[c.step]
        if (c.local >= cur.dur) {
          if (c.step < s.length - 1 && gateRef.current?.(c.step)) {
            c.local = cur.dur
            c.waiting = true
            k.playing = false
          } else if (c.step < s.length - 1) {
            c.step += 1
            c.local = 0
          } else if (k.loop) {
            c.step = 0
            c.local = 0
          } else {
            c.local = cur.dur
            k.playing = false
          }
          sync()
        }
      }
      if (barRef.current) {
        let before = 0
        let total = 0
        s.forEach((st, i) => {
          total += st.dur
          if (i < c.step) before += st.dur
        })
        const f = total ? (before + Math.min(c.local, s[c.step].dur)) / total : 0
        barRef.current.style.transform = `scaleX(${f})`
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [sync])

  const actions = useMemo(() => {
    const go = (i: number, mode: 'keep' | 'play') => {
      const s = stepsRef.current
      const c = clock.current
      const k = ctl.current
      c.step = Math.max(0, Math.min(s.length - 1, i))
      c.waiting = false
      if (mode === 'play') {
        k.playing = true
        c.local = 0
      } else if (k.playing) {
        c.local = 0
      } else {
        c.local = s[c.step].dur
        c.waiting = c.step < s.length - 1 && !!gateRef.current?.(c.step)
      }
      sync()
    }
    const play = () => {
      const s = stepsRef.current
      const c = clock.current
      if (c.waiting) {
        go(c.step + 1, 'play')
        return
      }
      if (c.step === s.length - 1 && c.local >= s[c.step].dur) {
        c.step = 0
        c.local = 0
      }
      ctl.current.playing = true
      sync()
    }
    const pause = () => {
      ctl.current.playing = false
      sync()
    }
    return {
      play,
      pause,
      toggle: () => (ctl.current.playing ? pause() : play()),
      next: () => go(clock.current.step + 1, 'keep'),
      prev: () => go(clock.current.step - 1, 'keep'),
      seek: (i: number) => go(i, 'keep'),
      approve: () => go(clock.current.step + 1, 'play'),
      restart: () => go(0, 'play'),
      setSpeed: (v: number) => {
        ctl.current.speed = v
        sync()
      },
      toggleLoop: () => {
        ctl.current.loop = !ctl.current.loop
        sync()
      },
    }
  }, [sync])

  return { clock, ui, barRef, ...actions }
}
