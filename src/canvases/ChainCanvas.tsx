import { useCanvas } from '../hooks/useCanvas'
import type { CanvasProps } from '../lessons/types'
import type { KF } from '../data/chain'
import { CHAINS, CHAIN_SCALE } from '../data/chain'
import { timeline } from '../lib/clock'
import { C, MONO, TAU, chip, easeInOut, glow, rgba, scaleFor, text } from '../lib/draw'
import { database, doc, funnel, nodeLabel, robot } from '../lib/icons'

function sample(kfs: KF[], t: number) {
  if (t < kfs[0].t || t > kfs[kfs.length - 1].t) return null
  let label = kfs[0].label ?? ''
  let color = kfs[0].color ?? C.cyan
  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i]
    const b = kfs[i + 1]
    if (a.label) label = a.label
    if (a.color) color = a.color
    if (t >= a.t && t <= b.t) {
      const u = easeInOut((t - a.t) / Math.max(0.0001, b.t - a.t))
      const moving = (a.x !== b.x || a.y !== b.y) && u > 0 && u < 1
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, label, color, moving }
    }
  }
  return null
}

export default function ChainCanvas({ clock, opts }: CanvasProps) {
  const ref = useCanvas(({ ctx, w, h, t }) => {
    const L = CHAINS[opts.mode ?? 'simple']
    const tt = timeline(clock.current, L.starts, CHAIN_SCALE)
    const k = scaleFor(w, 820, 0.55)
    const X = (x: number) => x * w
    const Y = (y: number) => y * h

    for (const tube of L.tubes) {
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = 'rgba(148,163,255,0.1)'
      ctx.lineWidth = 12 * k
      ctx.beginPath()
      tube.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))))
      ctx.stroke()
      ctx.strokeStyle = rgba(C.cyan, 0.4)
      ctx.lineWidth = 1.5
      ctx.setLineDash([2, 10])
      ctx.lineDashOffset = -t * 30
      ctx.stroke()
      ctx.setLineDash([])
    }

    for (const e of L.ends) {
      ctx.fillStyle = C.panel
      ctx.strokeStyle = rgba(C.cyan, 0.6)
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(X(e.x), Y(e.y), 7 * k, 0, TAU)
      ctx.fill()
      ctx.stroke()
      text(ctx, e.label, X(e.x), Y(e.y) + 24 * k, { size: 11 * k, color: C.muted, font: MONO, align: 'center' })
    }
    if (L.forkLabel) text(ctx, L.forkLabel.text, X(L.forkLabel.x) - 10 * k, Y(L.forkLabel.y), { size: 10.5 * k, color: C.muted, font: MONO, align: 'right' })

    const packets = L.tracks.map((tr) => sample(tr, tt)).filter((p) => p !== null)

    const S = Math.min(52 * k, h * 0.095)
    for (const s of L.stages) {
      const busy = packets.some((p) => !p.moving && Math.abs(p.x - s.x) < 0.01 && Math.abs(p.y - s.y) < 0.01)
      const cx = X(s.x)
      const cy = Y(s.y)
      const o = { color: s.color, active: busy, t }
      if (s.icon === 'robot') robot(ctx, cx, cy, S, o)
      else if (s.icon === 'doc') doc(ctx, cx, cy, S, o)
      else if (s.icon === 'funnel') funnel(ctx, cx, cy, S, o)
      else database(ctx, cx, cy, S, o)
      nodeLabel(ctx, cx, cy + S * (s.icon === 'robot' ? 1.15 : 1.05), s.label, s.sub, k * 0.92, s.color, busy)
    }

    for (const p of packets) {
      const x = X(p.x)
      const y = Y(p.y)
      const inStage = L.stages.some((s) => Math.abs(p.x - s.x) < 0.01 && Math.abs(p.y - s.y) < 0.01)
      if (!inStage) {
        glow(ctx, x, y, 22 * k, p.color, 0.7)
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(x, y, 3.5 * k, 0, TAU)
        ctx.fill()
      }
      const off = inStage ? S * 1.6 : 24 * k
      chip(ctx, p.label, x, y - off, { color: p.color, size: 11 * k, mono: true, align: 'center', h: 24 * k, fillAlpha: 0.2 })
    }

    text(ctx, L.pipe, w / 2, h - 18 * k, { size: 12 * k, color: C.soft, align: 'center', font: MONO })
  })

  return <canvas ref={ref} className="stage-canvas" aria-label="Data flowing through a LangChain pipeline" />
}
