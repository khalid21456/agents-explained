import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { useCanvas } from '../hooks/useCanvas'
import type { Pt } from '../lib/draw'
import { C, DISPLAY, MONO, TAU, chip, chipWidth, easeInOut, easeOut, glow, lerp, prog, rgba, rrect, scaleFor, text } from '../lib/draw'

interface Mem {
  label: string
  x: number
  y: number
  cluster: number
}

const CLUSTERS = [
  { name: 'TRAVEL', x: 0.17, y: 0.36, color: C.cyan },
  { name: 'FOOD', x: 0.38, y: 0.74, color: C.amber },
  { name: 'WORK', x: 0.76, y: 0.32, color: C.violet },
  { name: 'MUSIC', x: 0.67, y: 0.78, color: C.pink },
]

const MEMS: Mem[] = [
  { label: 'Booked Kyoto trip in May', x: 0.12, y: 0.26, cluster: 0 },
  { label: 'Prefers window seats', x: 0.22, y: 0.4, cluster: 0 },
  { label: 'Hates long layovers', x: 0.05, y: 0.5, cluster: 0 },
  { label: 'Speaks some Japanese', x: 0.26, y: 0.14, cluster: 0 },
  { label: 'Vegetarian', x: 0.33, y: 0.64, cluster: 1 },
  { label: 'Allergic to peanuts', x: 0.45, y: 0.78, cluster: 1 },
  { label: 'Loves ramen', x: 0.29, y: 0.83, cluster: 1 },
  { label: 'Builds agents with LangGraph', x: 0.63, y: 0.16, cluster: 2 },
  { label: 'Deploys on AWS', x: 0.8, y: 0.47, cluster: 2 },
  { label: 'Team of 5 engineers', x: 0.66, y: 0.37, cluster: 2 },
  { label: 'Writes Python', x: 0.83, y: 0.26, cluster: 2 },
  { label: 'Listens to jazz', x: 0.62, y: 0.7, cluster: 3 },
  { label: 'Learning guitar', x: 0.74, y: 0.86, cluster: 3 },
]

const QUERIES = [
  { label: 'Plan dinner on my Kyoto trip', x: 0.2, y: 0.6 },
  { label: 'Why does my agent loop forever?', x: 0.76, y: 0.3 },
  { label: 'Recommend something to listen to', x: 0.6, y: 0.82 },
]

const CYCLE = 7

interface Query {
  label: string
  x: number
  y: number
}

export default function MemoryCanvas() {
  const st = useRef({ time: 0, qi: 0, q: QUERIES[0] as Query, custom: false })
  const area = useRef({ x: 0, y: 0, w: 1, h: 1 })

  const ref = useCanvas(({ ctx, w, h, dt, t, mouse }) => {
    const s = st.current
    s.time += dt
    if (s.time > CYCLE) {
      s.time = 0
      s.qi = s.custom ? s.qi : (s.qi + 1) % QUERIES.length
      s.custom = false
      s.q = QUERIES[s.qi]
    }
    const tt = s.time
    const k = scaleFor(w, 760, 0.58)
    const pad = 18 * k
    const A = { x: pad, y: pad + 22 * k, w: w - pad * 2, h: h * 0.7 - pad - 22 * k }
    area.current = A
    const toPx = (x: number, y: number): Pt => ({ x: A.x + x * A.w, y: A.y + y * A.h })

    text(ctx, 'LONG-TERM MEMORY  ·  embedding space', pad, pad + 4 * k, { size: 11 * k, color: C.muted, font: MONO })
    text(ctx, 'click to search', w - pad, pad + 4 * k, { size: 11 * k, color: mouse.inside ? C.cyan : C.dim, font: MONO, align: 'right' })

    rrect(ctx, A.x, A.y, A.w, A.h, 14)
    ctx.fillStyle = 'rgba(255,255,255,0.015)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(148,163,255,0.1)'
    ctx.stroke()
    ctx.save()
    ctx.clip()
    ctx.fillStyle = 'rgba(148,163,255,0.08)'
    for (let x = A.x + 20; x < A.x + A.w; x += 28) for (let y = A.y + 20; y < A.y + A.h; y += 28) ctx.fillRect(x, y, 1, 1)

    for (const c of CLUSTERS) {
      const p = toPx(c.x, c.y)
      glow(ctx, p.x, p.y, Math.min(A.w, A.h) * 0.32, c.color, 0.09)
      text(ctx, c.name, p.x, p.y - A.h * 0.24, { size: 10 * k, color: c.color, align: 'center', font: DISPLAY, weight: 700, alpha: 0.5 })
    }

    const pts = MEMS.map((m, i) => {
      const p = toPx(m.x, m.y)
      return { x: p.x + Math.sin(t * 0.7 + i * 1.7) * 3, y: p.y + Math.cos(t * 0.6 + i * 2.3) * 3 }
    })
    const qp = toPx(s.q.x, s.q.y)
    const ranked = pts.map((p, i) => ({ i, d: Math.hypot(p.x - qp.x, p.y - qp.y) })).sort((a, b) => a.d - b.d)
    const top = ranked.slice(0, 3)
    const ringTarget = top[2].d + 14 * k
    const ringR = ringTarget * easeOut(prog(tt, 0.5, 1.2))
    const hitSet = new Set(top.map((r) => r.i))

    if (tt > 0.5) {
      ctx.strokeStyle = rgba(C.cyan, 0.6 * (1 - prog(tt, 6.2, 0.6)))
      ctx.setLineDash([4, 5])
      ctx.lineDashOffset = -t * 20
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.arc(qp.x, qp.y, ringR, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = rgba(C.cyan, 0.04)
      ctx.fill()
    }

    top.forEach((r, j) => {
      const f = easeOut(prog(tt, 1.3 + j * 0.2, 0.4)) * (1 - prog(tt, 6.2, 0.6))
      if (f <= 0) return
      const p = pts[r.i]
      ctx.strokeStyle = rgba(C.cyan, 0.8 * f)
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(qp.x, qp.y)
      ctx.lineTo(lerp(qp.x, p.x, f), lerp(qp.y, p.y, f))
      ctx.stroke()
      const sim = Math.max(0.5, 1 - r.d / (A.w * 0.8))
      if (f > 0.9) text(ctx, sim.toFixed(2), (qp.x + p.x) / 2, (qp.y + p.y) / 2 - 8, { size: 10 * k, color: C.cyan, font: MONO, align: 'center' })
    })

    MEMS.forEach((m, i) => {
      const p = pts[i]
      const color = CLUSTERS[m.cluster].color
      const hit = hitSet.has(i) && tt > 1.3
      if (hit) glow(ctx, p.x, p.y, 26 * k, color, 0.55)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(p.x, p.y, (hit ? 5 : 3.5) * k, 0, TAU)
      ctx.fill()
      const right = p.x < A.x + A.w - 170 * k
      text(ctx, m.label, p.x + (right ? 9 : -9) * k, p.y, {
        size: 11 * k,
        color: hit ? C.text : C.muted,
        align: right ? 'left' : 'right',
        alpha: hit ? 1 : 0.75,
        weight: hit ? 600 : 400,
      })
    })

    const pop = easeOut(prog(tt, 0, 0.5))
    glow(ctx, qp.x, qp.y, 34 * k * pop, C.cyan, 0.6)
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(qp.x, qp.y, 5 * k * pop, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = C.cyan
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(qp.x, qp.y, 9 * k * pop, 0, TAU)
    ctx.stroke()
    ctx.restore()

    const qlW = chipWidth(ctx, s.q.label, { color: C.cyan, size: 12 * k, weight: 600 })
    const qlX = Math.min(Math.max(qp.x, A.x + qlW / 2 + 4), A.x + A.w - qlW / 2 - 4)
    const qlY = qp.y - 26 * k < A.y + 16 * k ? qp.y + 26 * k : qp.y - 26 * k
    chip(ctx, s.q.label, qlX, qlY, { color: C.cyan, size: 12 * k, align: 'center', alpha: pop, fillAlpha: 0.25, strokeAlpha: 0.9, weight: 600, h: 28 * k })

    const B = { x: pad, y: h * 0.765, w: w - pad * 2, h: h * 0.235 - pad }
    text(ctx, 'SHORT-TERM MEMORY  ·  context window sent to the LLM', pad, B.y - 10 * k, { size: 11 * k, color: C.muted, font: MONO })
    rrect(ctx, B.x, B.y + 4 * k, B.w, B.h - 4 * k, 14)
    ctx.fillStyle = rgba(C.violet, 0.05)
    ctx.fill()
    ctx.strokeStyle = rgba(C.violet, 0.35)
    ctx.stroke()

    const items: { text: string; color: string; at: number; from?: Pt }[] = [
      { text: 'System prompt', color: C.muted, at: 0 },
      { text: `User: ${s.q.label}`, color: C.cyan, at: 0.3 },
      ...top.map((r, j) => ({ text: `memory: ${MEMS[r.i].label}`, color: CLUSTERS[MEMS[r.i].cluster].color, at: 2.1 + j * 0.25, from: pts[r.i] })),
    ]
    const chipH = 26 * k
    let cx = B.x + 12 * k
    let cy = B.y + 4 * k + 12 * k + chipH / 2
    let filled = 0
    for (const it of items) {
      const cw = chipWidth(ctx, it.text, { color: it.color, size: 11 * k })
      if (cx + cw > B.x + B.w - 12 * k) {
        cx = B.x + 12 * k
        cy += chipH + 8 * k
      }
      const f = easeInOut(prog(tt, it.at, it.from ? 0.9 : 0.4))
      if (f > 0) {
        let x = cx
        let y = cy
        if (it.from && f < 1) {
          x = lerp(it.from.x, cx, f)
          y = lerp(it.from.y, cy, f) - Math.sin(f * Math.PI) * 30 * k
          glow(ctx, x + cw / 2, y, 40 * k, it.color, 0.3)
        }
        chip(ctx, it.text, x, y, { color: it.color, size: 11 * k, h: chipH, alpha: it.from ? 1 : f, fillAlpha: 0.16 })
        if (f >= 1) filled += 1
      }
      cx += cw + 8 * k
    }

    const gx = B.x + B.w - 130 * k
    const gy = B.y + B.h - 16 * k
    const used = filled / 5
    text(ctx, `${Math.round(18 + used * 41)}% of window`, gx - 8 * k, gy, { size: 10 * k, color: C.muted, font: MONO, align: 'right' })
    rrect(ctx, gx, gy - 4 * k, 118 * k, 8 * k, 4)
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fill()
    rrect(ctx, gx, gy - 4 * k, 118 * k * (0.18 + used * 0.41), 8 * k, 4)
    ctx.fillStyle = C.violet
    ctx.fill()
  })

  const onClick = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const A = area.current
    const x = (e.clientX - r.left - A.x) / A.w
    const y = (e.clientY - r.top - A.y) / A.h
    if (x < 0 || x > 1 || y < 0 || y > 1) return
    st.current = { ...st.current, time: 0, q: { label: 'Your query', x, y }, custom: true }
  }

  return <canvas ref={ref} onPointerDown={onClick} className="stage-canvas tall clickable" aria-label="Vector memory retrieval: click to place a query" />
}
