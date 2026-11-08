import { useCanvas } from '../hooks/useCanvas'
import type { CanvasProps } from '../lessons/types'
import type { ArNode, ArScenario } from '../data/agenticRag'
import { AR_TRAVEL, SCENARIOS } from '../data/agenticRag'
import type { Pt } from '../lib/draw'
import { C, FONT, MONO, TAU, arrowHead, chip, easeInOut, glow, prog, quad, quadAngle, rgba, rrect, scaleFor, text } from '../lib/draw'
import { database, doc, endNode, nodeLabel, robot, startNode } from '../lib/icons'

const POS: Record<ArNode, Pt> = {
  __start__: { x: 0.06, y: 0.3 },
  agent: { x: 0.24, y: 0.3 },
  retrieve: { x: 0.48, y: 0.3 },
  grade: { x: 0.72, y: 0.3 },
  __end__: { x: 0.94, y: 0.3 },
  rewrite: { x: 0.48, y: 0.64 },
  generate: { x: 0.72, y: 0.64 },
}

interface Edge {
  from: ArNode
  to: ArNode
  bend?: number
  cond?: string
}

const EDGES: Edge[] = [
  { from: '__start__', to: 'agent' },
  { from: 'agent', to: 'retrieve', cond: 'tool call' },
  { from: 'agent', to: '__end__', bend: -0.32, cond: 'answer directly' },
  { from: 'retrieve', to: 'grade' },
  { from: 'grade', to: 'generate', cond: 'relevant' },
  { from: 'grade', to: 'rewrite', cond: 'not relevant' },
  { from: 'rewrite', to: 'agent' },
  { from: 'generate', to: '__end__' },
]

const META: Record<ArNode, { label: string; sub?: string; color: string }> = {
  __start__: { label: 'START', color: C.cyan },
  agent: { label: 'agent', sub: 'retrieve or answer?', color: C.violet },
  retrieve: { label: 'retrieve', sub: 'vector search tool', color: C.blue },
  grade: { label: 'grade_documents', sub: 'relevant?', color: C.amber },
  rewrite: { label: 'rewrite_query', sub: 'better search terms', color: C.cyan },
  generate: { label: 'generate', sub: 'answer with citations', color: C.green },
  __end__: { label: 'END', color: C.pink },
}

export default function AgenticRagCanvas({ clock, opts }: CanvasProps) {
  const ref = useCanvas(({ ctx, w, h, t }) => {
    const c = clock.current
    const sc = (opts.scenario === 'first' || opts.scenario === 'direct' ? opts.scenario : 'rewrite') as ArScenario
    const steps = SCENARIOS[sc]
    const i = Math.min(c.step, steps.length - 1)
    const st = steps[i]
    const prev = i > 0 ? steps[i - 1] : null
    const traveling = !!prev && c.local < AR_TRAVEL
    const k = scaleFor(w, 780, 0.58)
    const S = Math.min(32 * k, h * 0.062)
    const P = (id: ArNode): Pt => ({ x: POS[id].x * w, y: POS[id].y * h })
    const radius = (id: ArNode) => (id === '__start__' || id === '__end__' ? S * 0.5 : S * 1.05)

    const geom = (e: Edge) => {
      const p0 = P(e.from)
      const p1 = P(e.to)
      const dx = p1.x - p0.x
      const dy = p1.y - p0.y
      const len = Math.hypot(dx, dy)
      const b = e.bend ?? 0
      const cp = { x: (p0.x + p1.x) / 2 + (-dy / len) * b * len, y: (p0.y + p1.y) / 2 + (dx / len) * b * len }
      let t0 = 0
      let t1 = 1
      for (let s = 0; s <= 100; s++) {
        const q = quad(p0, cp, p1, s / 100)
        if (Math.hypot(q.x - p0.x, q.y - p0.y) > radius(e.from)) {
          t0 = s / 100
          break
        }
      }
      for (let s = 100; s >= 0; s--) {
        const q = quad(p0, cp, p1, s / 100)
        if (Math.hypot(q.x - p1.x, q.y - p1.y) > radius(e.to)) {
          t1 = s / 100
          break
        }
      }
      return { p0, cp, p1, t0, t1 }
    }

    const travelEdge = traveling && prev ? EDGES.find((e) => e.from === prev.node && e.to === st.node) : undefined
    const visited = new Set<string>()
    steps.slice(1, i + 1).forEach((s, j) => visited.add(`${steps[j].node}>${s.node}`))

    for (const e of EDGES) {
      const { p0, cp, p1, t0, t1 } = geom(e)
      const active = e === travelEdge
      const used = visited.has(`${e.from}>${e.to}`)
      ctx.strokeStyle = active ? C.cyan : used ? rgba(C.violet, 0.6) : 'rgba(148,163,255,0.22)'
      ctx.lineWidth = active ? 2.4 : used ? 1.8 : 1.3
      ctx.setLineDash(e.cond ? [6, 5] : [])
      ctx.lineDashOffset = -t * 16
      ctx.beginPath()
      for (let s = 0; s <= 30; s++) {
        const q = quad(p0, cp, p1, t0 + ((t1 - t0) * s) / 30)
        if (s) ctx.lineTo(q.x, q.y)
        else ctx.moveTo(q.x, q.y)
      }
      ctx.stroke()
      ctx.setLineDash([])
      const end = quad(p0, cp, p1, t1)
      arrowHead(ctx, end.x, end.y, quadAngle(p0, cp, p1, t1), 9 * k, active ? C.cyan : used ? rgba(C.violet, 0.8) : 'rgba(148,163,255,0.45)')
    }

    const nodes = Object.keys(POS) as ArNode[]
    for (const id of nodes) {
      const p = P(id)
      const m = META[id]
      const active = !traveling && st.node === id
      const o = { color: m.color, active, t }
      if (id === '__start__') startNode(ctx, p.x, p.y, S * 0.5, o)
      else if (id === '__end__') endNode(ctx, p.x, p.y, S * 0.5, o)
      else if (id === 'retrieve') database(ctx, p.x, p.y, S * 0.85, o)
      else if (id === 'rewrite') doc(ctx, p.x, p.y, S * 0.85, o)
      else robot(ctx, p.x, p.y, S, { ...o, accessory: id === 'grade' ? 'lens' : id === 'generate' ? 'pen' : undefined })
      if (id === '__start__' || id === '__end__') text(ctx, m.label, p.x, p.y + S * 0.85, { size: 10.5 * k, color: m.color, font: MONO, weight: 700, align: 'center' })
      else nodeLabel(ctx, p.x, p.y + S * (id === 'retrieve' || id === 'rewrite' ? 0.85 : 1.15), m.label, m.sub, k * 0.9, m.color, active)
    }

    for (const e of EDGES) {
      if (!e.cond) continue
      const { p0, cp, p1, t0, t1 } = geom(e)
      const m = quad(p0, cp, p1, (t0 + t1) / 2)
      const active = e === travelEdge
      chip(ctx, e.cond, m.x, m.y, { color: active ? C.cyan : C.muted, size: 9.5 * k, mono: true, align: 'center', h: 20 * k, fillAlpha: 0.12, strokeAlpha: 0.35 })
    }

    if (travelEdge) {
      const { p0, cp, p1, t0, t1 } = geom(travelEdge)
      const u = easeInOut(prog(c.local, 0, AR_TRAVEL))
      const q = quad(p0, cp, p1, t0 + (t1 - t0) * u)
      ctx.globalCompositeOperation = 'lighter'
      glow(ctx, q.x, q.y, 22 * k, C.cyan, 0.8)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(q.x, q.y, 3.4 * k, 0, TAU)
      ctx.fill()
      if (prev?.packet) chip(ctx, prev.packet.length > 30 ? prev.packet.slice(0, 29) + '…' : prev.packet, q.x, q.y - 18 * k, { color: C.cyan, size: 9.5 * k, mono: true, align: 'center', h: 20 * k, fillAlpha: 0.2 })
    }

    const B = { x: w * 0.03, y: h * 0.8, w: w * 0.94, h: h * 0.17 }
    rrect(ctx, B.x, B.y, B.w, B.h, 10 * k)
    ctx.fillStyle = '#05070f'
    ctx.fill()
    ctx.strokeStyle = 'rgba(148,163,255,0.15)'
    ctx.lineWidth = 1
    ctx.stroke()
    const qy = B.y + 16 * k
    text(ctx, 'QUERY', B.x + 12 * k, qy, { size: 9 * k, color: C.muted, font: MONO, weight: 600 })
    const show = !traveling ? st : prev ?? st
    if (show.query) {
      chip(ctx, show.query, B.x + 60 * k, qy, { color: show.rewritten ? C.cyan : C.soft, size: 10.5 * k, mono: true, h: 22 * k, fillAlpha: show.rewritten ? 0.2 : 0.08 })
      if (show.rewritten) text(ctx, '↻ rewritten', B.x + B.w - 12 * k, qy, { size: 10 * k, color: C.cyan, font: MONO, align: 'right' })
    }
    const dy = B.y + B.h - 22 * k
    text(ctx, show.answer ? 'ANSWER' : 'DOCS', B.x + 12 * k, dy, { size: 9 * k, color: C.muted, font: MONO, weight: 600 })
    if (show.answer) {
      ctx.font = `500 ${11 * k}px ${FONT}`
      chip(ctx, show.answer.length > 96 ? show.answer.slice(0, 95) + '…' : show.answer, B.x + 60 * k, dy, { color: C.green, size: 11 * k, h: 24 * k, fillAlpha: 0.18, weight: 600 })
    } else if (show.docs) {
      let x = B.x + 60 * k
      const maxW = (B.w - 72 * k) / 3 - 6 * k
      show.docs.forEach((d, j) => {
        const g = show.grades?.[j]
        const color = g === undefined ? C.blue : g ? C.green : C.red
        ctx.font = `500 ${10 * k}px ${FONT}`
        let label = (g === undefined ? '' : g ? '✓ ' : '✗ ') + d
        while (ctx.measureText(label).width > maxW - 16 * k && label.length > 4) label = label.slice(0, -2)
        if (label.length < d.length + (g === undefined ? 0 : 2)) label += '…'
        const wv = chip(ctx, label, x, dy, { color, size: 10 * k, h: 22 * k, fillAlpha: 0.14 })
        x += wv + 6 * k
      })
    } else {
      text(ctx, 'none yet', B.x + 60 * k, dy, { size: 10.5 * k, color: C.dim })
    }
  })

  return <canvas ref={ref} className="stage-canvas" aria-label="Agentic RAG: retrieve, grade, rewrite and generate" />
}
