import { useCanvas } from '../hooks/useCanvas'
import type { CanvasProps } from '../lessons/types'
import type { GEdge, GNode } from '../data/graph'
import { GRAPHS, G_TRAVEL } from '../data/graph'
import type { Pt } from '../lib/draw'
import { C, MONO, TAU, arrowHead, chip, easeInOut, glow, quad, quadAngle, rgba, scaleFor, text } from '../lib/draw'
import { bubble, endNode, gears, nodeLabel, robot, startNode } from '../lib/icons'

export default function GraphCanvas({ clock, opts }: CanvasProps) {
  const ref = useCanvas(({ ctx, w, h, t }) => {
    const c = clock.current
    const g = GRAPHS[opts.mode ?? 'agent']
    const script = g.script
    const i = c.step
    const traveling = i > 0 && c.local < G_TRAVEL && !c.waiting
    const done = i === script.length - 1 && !traveling

    const k = scaleFor(w, 640, 0.6)
    const S = Math.min(58 * k, h * 0.1) * (g.scale ?? 1)
    const nodeById = new Map(g.nodes.map((n) => [n.id, n]))
    const sizeOf = (n: GNode) => (n.terminal ? S * 0.42 : S)
    const radii = (n: GNode) => {
      const s = sizeOf(n)
      if (n.terminal) return { rx: s * 0.9, ry: s * 0.9 }
      if (n.kind === 'tools') return { rx: s * 1.0, ry: s * 1.0 }
      if (n.kind === 'bubble') return { rx: s * 0.85, ry: s * 0.8 }
      return { rx: s * 0.98, ry: s * 1.12 }
    }
    const inside = (p: Pt, n: GNode) => {
      const { rx, ry } = radii(n)
      const dx = (p.x - n.x * w) / (rx + 4)
      const dy = (p.y - n.y * h) / (ry + 4)
      return dx * dx + dy * dy < 1
    }

    const geom = (e: GEdge) => {
      const a = nodeById.get(e.from)!
      const b = nodeById.get(e.to)!
      const p0 = { x: a.x * w, y: a.y * h }
      const p1 = { x: b.x * w, y: b.y * h }
      const dx = p1.x - p0.x
      const dy = p1.y - p0.y
      const len = Math.hypot(dx, dy)
      const bend = e.bend ?? 0
      const cp = { x: (p0.x + p1.x) / 2 + (-dy / len) * bend * len, y: (p0.y + p1.y) / 2 + (dx / len) * bend * len }
      let t0 = 0
      let t1 = 1
      for (let s = 0; s <= 200; s++) {
        if (!inside(quad(p0, cp, p1, s / 200), a)) {
          t0 = s / 200
          break
        }
      }
      for (let s = 200; s >= 0; s--) {
        if (!inside(quad(p0, cp, p1, s / 200), b)) {
          t1 = s / 200
          break
        }
      }
      return { p0, cp, p1, t0, t1 }
    }

    const cur = script[i]
    const prev = i > 0 ? script[i - 1] : null
    const travelEdge = traveling && prev ? g.edges.find((e) => e.from === prev.node && e.to === cur.node) : undefined
    const waitEdge = c.waiting && i < script.length - 1 ? g.edges.find((e) => e.from === cur.node && e.to === script[i + 1].node) : undefined

    for (const e of g.edges) {
      const { p0, cp, p1, t0, t1 } = geom(e)
      const active = e === travelEdge || e === waitEdge
      const color = active ? (e === waitEdge ? C.amber : C.cyan) : 'rgba(148,163,255,0.35)'
      ctx.strokeStyle = color
      ctx.lineWidth = active ? 2.2 : 1.4
      const dashed = e.cond !== undefined
      ctx.setLineDash(dashed ? [6, 6] : [])
      ctx.lineDashOffset = dashed ? -t * 16 : 0
      ctx.beginPath()
      for (let s = 0; s <= 40; s++) {
        const p = quad(p0, cp, p1, t0 + ((t1 - t0) * s) / 40)
        if (s) ctx.lineTo(p.x, p.y)
        else ctx.moveTo(p.x, p.y)
      }
      ctx.stroke()
      ctx.setLineDash([])
      const end = quad(p0, cp, p1, t1)
      arrowHead(ctx, end.x, end.y, quadAngle(p0, cp, p1, t1), 10 * k, active ? color : 'rgba(148,163,255,0.6)')
    }

    for (const n of g.nodes) {
      const activeNode = !traveling && cur.node === n.id
      const x = n.x * w
      const y = n.y * h
      const s = sizeOf(n)
      const o = { color: n.color, active: activeNode, t }
      if (n.kind === 'start') startNode(ctx, x, y, s, o)
      else if (n.kind === 'end') endNode(ctx, x, y, s, o)
      else if (n.kind === 'tools') gears(ctx, x, y, s, o)
      else if (n.kind === 'bubble') bubble(ctx, x, y, s, o)
      else robot(ctx, x, y, s, { ...o, accessory: n.kind === 'writer' ? 'pen' : n.kind === 'critic' ? 'lens' : n.kind === 'supervisor' ? 'crown' : undefined })

      if (n.terminal) {
        text(ctx, n.label, x + s + 10 * k, y, { size: 12 * k, weight: 700, font: MONO, color: n.color })
      } else if (n.labelSide === 'right') {
        text(ctx, n.label, x + s * 1.0, y - 7 * k, { size: 14 * k, weight: 600, color: activeNode ? C.text : C.soft })
        if (n.sub) text(ctx, n.sub, x + s * 1.0, y + 11 * k, { size: 10.5 * k, color: C.muted })
      } else {
        nodeLabel(ctx, x, y + s * (n.kind === 'bubble' ? 0.95 : 1.18), n.label, n.sub, k, n.color, activeNode)
      }
    }

    for (const e of g.edges) {
      if (!e.cond) continue
      const { p0, cp, p1, t0, t1 } = geom(e)
      const active = e === travelEdge || e === waitEdge
      const m = quad(p0, cp, p1, (t0 + t1) / 2)
      chip(ctx, e.cond, m.x, m.y, { color: active ? C.cyan : C.muted, size: 10 * k, mono: true, align: 'center', h: 22 * k, fillAlpha: 0.12, strokeAlpha: 0.35 })
    }

    let tok: Pt
    let trail: Pt[] = []
    if (travelEdge) {
      const { p0, cp, p1, t0, t1 } = geom(travelEdge)
      const u = easeInOut(Math.min(1, c.local / G_TRAVEL))
      const at = (uu: number) => quad(p0, cp, p1, t0 + (t1 - t0) * uu)
      tok = at(u)
      trail = Array.from({ length: 12 }, (_, j) => at(Math.max(0, u - j * 0.03)))
    } else {
      const n = nodeById.get(cur.node)!
      const { rx, ry } = radii(n)
      const a = done ? -Math.PI / 2 : t * 2.4
      tok = { x: n.x * w + Math.cos(a) * (rx + 12 * k), y: n.y * h + Math.sin(a) * (ry + 12 * k) }
    }
    ctx.globalCompositeOperation = 'lighter'
    trail.forEach((p, j) => glow(ctx, p.x, p.y, (14 - j) * k, C.cyan, 0.4 * (1 - j / 12)))
    glow(ctx, tok.x, tok.y, 24 * k, C.cyan, 0.75)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(tok.x, tok.y, 3.5 * k, 0, TAU)
    ctx.fill()
    if (travelEdge) chip(ctx, 'state', tok.x, tok.y - 20 * k, { color: C.cyan, size: 10 * k, mono: true, align: 'center', h: 20 * k })

    if (waitEdge) {
      const { p0, cp, p1, t0, t1 } = geom(waitEdge)
      const m = quad(p0, cp, p1, (t0 + t1) / 2)
      const pulse = 0.5 + 0.5 * Math.sin(t * 5)
      glow(ctx, m.x, m.y - 34 * k, 40 * k, C.amber, 0.3 + pulse * 0.3)
      ctx.fillStyle = C.panel
      ctx.strokeStyle = C.amber
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(m.x, m.y - 34 * k, 15 * k, 0, TAU)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = C.amber
      ctx.fillRect(m.x - 5 * k, m.y - 40 * k, 3.5 * k, 12 * k)
      ctx.fillRect(m.x + 1.5 * k, m.y - 40 * k, 3.5 * k, 12 * k)
      text(ctx, 'interrupt_before=["tools"]', m.x, m.y - 62 * k, { size: 10.5 * k, color: C.amber, font: MONO, align: 'center' })
    }

    const ckX = w - 16 * k
    text(ctx, `checkpoint #${i}`, ckX, 18 * k, { size: 10.5 * k, color: C.amber, font: MONO, align: 'right' })
    for (let j = 0; j <= i; j++) {
      ctx.fillStyle = j === i ? C.amber : rgba(C.amber, 0.35)
      ctx.beginPath()
      ctx.arc(ckX - (i - j) * 12 * k - 4 * k, 36 * k, 3.5 * k, 0, TAU)
      ctx.fill()
    }
  })

  return <canvas ref={ref} className="stage-canvas" aria-label="A LangGraph state graph executing step by step" />
}
