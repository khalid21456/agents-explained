import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { useCanvas } from '../hooks/useCanvas'
import type { CanvasProps } from '../lessons/types'
import { CLUSTERS, MEMS, rank, resolveQuery } from '../data/memory'
import { sp } from '../lib/clock'
import type { Pt } from '../lib/draw'
import { C, DISPLAY, MONO, TAU, chip, chipWidth, easeInOut, easeOut, glow, lerp, rgba, rrect, scaleFor, text } from '../lib/draw'

export default function MemoryCanvas({ clock, opts, setOpt }: CanvasProps) {
  const area = useRef({ x: 0, y: 0, w: 1, h: 1 })

  const ref = useCanvas(({ ctx, w, h, t, mouse }) => {
    const c = clock.current
    const q = resolveQuery(opts.query)
    const k = scaleFor(w, 760, 0.58)
    const pad = 18 * k
    const A = { x: pad, y: pad + 22 * k, w: w - pad * 2, h: h * 0.68 - pad - 22 * k }
    area.current = A
    const toPx = (x: number, y: number): Pt => ({ x: A.x + x * A.w, y: A.y + y * A.h })

    text(ctx, 'LONG-TERM MEMORY  ·  embedding space', pad, pad + 4 * k, { size: 11 * k, color: C.muted, font: MONO })
    text(ctx, 'click anywhere to search', w - pad, pad + 4 * k, { size: 11 * k, color: mouse.inside ? C.cyan : C.dim, font: MONO, align: 'right' })

    rrect(ctx, A.x, A.y, A.w, A.h, 14)
    ctx.fillStyle = 'rgba(255,255,255,0.015)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(148,163,255,0.1)'
    ctx.stroke()
    ctx.save()
    ctx.clip()
    ctx.fillStyle = 'rgba(148,163,255,0.08)'
    for (let x = A.x + 20; x < A.x + A.w; x += 28) for (let y = A.y + 20; y < A.y + A.h; y += 28) ctx.fillRect(x, y, 1, 1)

    for (const cl of CLUSTERS) {
      const p = toPx(cl.x, cl.y)
      glow(ctx, p.x, p.y, Math.min(A.w, A.h) * 0.32, cl.color, 0.09)
      text(ctx, cl.name, p.x, p.y - A.h * 0.24, { size: 10 * k, color: cl.color, align: 'center', font: DISPLAY, weight: 700, alpha: 0.5 })
    }

    const pts = MEMS.map((m, i) => {
      const p = toPx(m.x, m.y)
      return { x: p.x + Math.sin(t * 0.7 + i * 1.7) * 3, y: p.y + Math.cos(t * 0.6 + i * 2.3) * 3 }
    })
    const qp = toPx(q.x, q.y)
    const top = rank(q).slice(0, 3)
    const ringTarget = Math.max(...top.map((r) => Math.hypot(pts[r.i].x - qp.x, pts[r.i].y - qp.y))) + 14 * k
    const ringR = ringTarget * easeOut(sp(c, 1, 0, 1.2))
    const hitSet = new Set(top.map((r) => r.i))
    const lit = c.step >= 2

    if (ringR > 1) {
      ctx.strokeStyle = rgba(C.cyan, 0.6)
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
      const f = easeOut(sp(c, 2, j * 0.25, 0.4))
      if (f <= 0) return
      const p = pts[r.i]
      ctx.strokeStyle = rgba(C.cyan, 0.8 * f)
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(qp.x, qp.y)
      ctx.lineTo(lerp(qp.x, p.x, f), lerp(qp.y, p.y, f))
      ctx.stroke()
      if (f > 0.9) text(ctx, r.score.toFixed(2), (qp.x + p.x) / 2, (qp.y + p.y) / 2 - 8, { size: 10 * k, color: C.cyan, font: MONO, align: 'center' })
    })

    MEMS.forEach((m, i) => {
      const p = pts[i]
      const color = CLUSTERS[m.cluster].color
      const hit = hitSet.has(i) && lit
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

    const pop = easeOut(sp(c, 0, 0, 0.5))
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

    const qlW = chipWidth(ctx, q.label, { color: C.cyan, size: 12 * k, weight: 600 })
    const qlX = Math.min(Math.max(qp.x, A.x + qlW / 2 + 4), A.x + A.w - qlW / 2 - 4)
    const qlY = qp.y - 26 * k < A.y + 16 * k ? qp.y + 26 * k : qp.y - 26 * k
    chip(ctx, q.label, qlX, qlY, { color: C.cyan, size: 12 * k, align: 'center', alpha: pop, fillAlpha: 0.25, strokeAlpha: 0.9, weight: 600, h: 28 * k })

    const B = { x: pad, y: h * 0.77, w: w - pad * 2, h: h * 0.23 - pad }
    text(ctx, 'SHORT-TERM MEMORY  ·  context window sent to the LLM', pad, B.y - 10 * k, { size: 11 * k, color: C.muted, font: MONO })
    const send = sp(c, 4, 0, 1.4)
    rrect(ctx, B.x, B.y + 4 * k, B.w, B.h - 4 * k, 14)
    ctx.fillStyle = rgba(C.violet, 0.05 + send * 0.06)
    ctx.fill()
    ctx.strokeStyle = rgba(send > 0 ? C.pink : C.violet, 0.35 + send * 0.4)
    ctx.stroke()

    const items: { text: string; color: string; f: number; from?: Pt }[] = [
      { text: 'System prompt', color: C.muted, f: easeOut(sp(c, 0, 0.1, 0.4)) },
      { text: `User: ${q.label}`, color: C.cyan, f: easeOut(sp(c, 0, 0.4, 0.4)) },
      ...top.map((r, j) => ({
        text: `memory: ${MEMS[r.i].label}`,
        color: CLUSTERS[MEMS[r.i].cluster].color,
        f: easeInOut(sp(c, 3, j * 0.25, 0.9)),
        from: pts[r.i],
      })),
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
      if (it.f > 0) {
        let x = cx
        let y = cy
        if (it.from && it.f < 1) {
          x = lerp(it.from.x, cx, it.f)
          y = lerp(it.from.y, cy, it.f) - Math.sin(it.f * Math.PI) * 30 * k
          glow(ctx, x + cw / 2, y, 40 * k, it.color, 0.3)
        }
        chip(ctx, it.text, x, y, { color: it.color, size: 11 * k, h: chipH, alpha: it.from ? 1 : it.f, fillAlpha: 0.16 })
        if (it.f >= 1) filled += 1
      }
      cx += cw + 8 * k
    }

    const gx = B.x + B.w - 130 * k
    const gy = B.y + B.h - 14 * k
    const used = filled / 5
    text(ctx, `${Math.round(18 + used * 41)}% of window`, gx - 8 * k, gy, { size: 10 * k, color: C.muted, font: MONO, align: 'right' })
    rrect(ctx, gx, gy - 4 * k, 118 * k, 8 * k, 4)
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fill()
    rrect(ctx, gx, gy - 4 * k, 118 * k * (0.18 + used * 0.41), 8 * k, 4)
    ctx.fillStyle = C.violet
    ctx.fill()

    if (send > 0) {
      const sx = B.x + B.w * easeInOut(send)
      glow(ctx, sx, B.y + B.h / 2, 60 * k, C.pink, 0.35 * (1 - send * 0.5))
      if (send >= 1) {
        const a = Math.min(1, (c.local - 1.4) * 3)
        chip(ctx, `LLM → ${q.answer}`, B.x + 12 * k, gy, { color: C.pink, size: 11 * k, h: 24 * k, alpha: a, fillAlpha: 0.2 })
      }
    }
  })

  const onClick = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const A = area.current
    const x = (e.clientX - r.left - A.x) / A.w
    const y = (e.clientY - r.top - A.y) / A.h
    if (x < 0 || x > 1 || y < 0 || y > 1) return
    setOpt('query', `${x.toFixed(3)},${y.toFixed(3)}`)
  }

  return <canvas ref={ref} onPointerDown={onClick} className="stage-canvas clickable" aria-label="Vector memory retrieval; click to place a query" />
}
