import { useRef } from 'react'
import { useCanvas } from '../hooks/useCanvas'
import { C, DISPLAY, MONO, TAU, chip, easeInOut, glow, rgba, rrect, scaleFor, text } from '../lib/draw'

export type ChainMode = 'simple' | 'rag'

interface Stage {
  label: string
  sub: string
  x: number
  y: number
  color: string
}

interface KF {
  t: number
  x: number
  y: number
  label?: string
  color?: string
}

interface Layout {
  stages: Stage[]
  tubes: [number, number][][]
  tracks: KF[][]
  ends: { label: string; x: number; y: number }[]
  period: number
  span: number
  forkLabel?: { text: string; x: number; y: number }
}

const LAYOUTS: Record<ChainMode, Layout> = {
  simple: {
    stages: [
      { label: 'PromptTemplate', sub: 'fills in {topic}', x: 0.3, y: 0.56, color: C.violet },
      { label: 'ChatModel', sub: 'any provider', x: 0.55, y: 0.56, color: C.amber },
      { label: 'StrOutputParser', sub: 'message → str', x: 0.8, y: 0.56, color: C.green },
    ],
    tubes: [
      [
        [0.05, 0.56],
        [0.96, 0.56],
      ],
    ],
    tracks: [
      [
        { t: 0, x: 0.05, y: 0.56, label: '{"topic": "agents"}', color: C.cyan },
        { t: 1.0, x: 0.3, y: 0.56 },
        { t: 1.5, x: 0.3, y: 0.56, label: '[System, Human]', color: C.violet },
        { t: 2.4, x: 0.55, y: 0.56 },
        { t: 3.2, x: 0.55, y: 0.56, label: 'AIMessage(…)', color: C.amber },
        { t: 4.1, x: 0.8, y: 0.56 },
        { t: 4.5, x: 0.8, y: 0.56, label: '"Agents are…"', color: C.green },
        { t: 5.4, x: 0.96, y: 0.56 },
      ],
    ],
    ends: [
      { label: 'invoke()', x: 0.05, y: 0.56 },
      { label: 'result', x: 0.96, y: 0.56 },
    ],
    period: 2.9,
    span: 5.4,
  },
  rag: {
    stages: [
      { label: 'Retriever', sub: 'vector search, k=4', x: 0.31, y: 0.24, color: C.blue },
      { label: 'Prompt', sub: 'context + question', x: 0.47, y: 0.66, color: C.violet },
      { label: 'ChatModel', sub: 'grounded answer', x: 0.67, y: 0.66, color: C.amber },
      { label: 'Parser', sub: '→ str', x: 0.86, y: 0.66, color: C.green },
    ],
    tubes: [
      [
        [0.04, 0.66],
        [0.97, 0.66],
      ],
      [
        [0.16, 0.66],
        [0.16, 0.24],
        [0.47, 0.24],
        [0.47, 0.66],
      ],
    ],
    tracks: [
      [
        { t: 0, x: 0.04, y: 0.66, label: '"What is LangGraph?"', color: C.cyan },
        { t: 0.8, x: 0.16, y: 0.66 },
        { t: 2.7, x: 0.47, y: 0.66 },
        { t: 3.1, x: 0.47, y: 0.66, label: '[System, Human]', color: C.violet },
        { t: 3.9, x: 0.67, y: 0.66 },
        { t: 4.6, x: 0.67, y: 0.66, label: 'AIMessage(…)', color: C.amber },
        { t: 5.3, x: 0.86, y: 0.66 },
        { t: 5.6, x: 0.86, y: 0.66, label: '"LangGraph is…"', color: C.green },
        { t: 6.3, x: 0.97, y: 0.66 },
      ],
      [
        { t: 0.8, x: 0.16, y: 0.66, label: 'question', color: C.cyan },
        { t: 1.25, x: 0.16, y: 0.24 },
        { t: 1.6, x: 0.31, y: 0.24 },
        { t: 2.1, x: 0.31, y: 0.24, label: '4 docs', color: C.blue },
        { t: 2.45, x: 0.47, y: 0.24 },
        { t: 2.7, x: 0.47, y: 0.66 },
      ],
    ],
    ends: [
      { label: 'invoke()', x: 0.04, y: 0.66 },
      { label: 'result', x: 0.97, y: 0.66 },
    ],
    period: 3.4,
    span: 6.3,
    forkLabel: { text: 'RunnableParallel', x: 0.16, y: 0.45 },
  },
}

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
      const moving = a.x !== b.x || a.y !== b.y
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, label, color, moving }
    }
  }
  return null
}

export default function ChainCanvas({ mode }: { mode: ChainMode }) {
  const time = useRef(0)
  const lastMode = useRef(mode)

  const ref = useCanvas(({ ctx, w, h, dt, t }) => {
    if (lastMode.current !== mode) {
      lastMode.current = mode
      time.current = 0
    }
    time.current += dt
    const L = LAYOUTS[mode]
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
    if (L.forkLabel) {
      text(ctx, L.forkLabel.text, X(L.forkLabel.x) - 10 * k, Y(L.forkLabel.y), { size: 10.5 * k, color: C.muted, font: MONO, align: 'right' })
    }

    const packets: { x: number; y: number; label: string; color: string; moving: boolean }[] = []
    const first = Math.max(0, Math.floor((time.current - L.span) / L.period))
    const lastRun = Math.floor(time.current / L.period)
    for (let r = first; r <= lastRun; r++) {
      const local = time.current - r * L.period
      for (const tr of L.tracks) {
        const p = sample(tr, local)
        if (p) packets.push(p)
      }
    }

    const bw = 132 * k
    const bh = 58 * k
    for (const s of L.stages) {
      const busy = packets.some((p) => !p.moving && Math.abs(p.x - s.x) < 0.01 && Math.abs(p.y - s.y) < 0.01)
      const cx = X(s.x)
      const cy = Y(s.y)
      if (busy) glow(ctx, cx, cy, bw, s.color, 0.3)
      rrect(ctx, cx - bw / 2, cy - bh / 2, bw, bh, 14 * k)
      ctx.fillStyle = C.panel
      ctx.fill()
      const g = ctx.createLinearGradient(cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2)
      g.addColorStop(0, rgba(s.color, busy ? 0.28 : 0.12))
      g.addColorStop(1, rgba(s.color, 0.02))
      ctx.fillStyle = g
      ctx.fill()
      ctx.strokeStyle = rgba(s.color, busy ? 1 : 0.5)
      ctx.lineWidth = busy ? 2 : 1.2
      ctx.stroke()
      text(ctx, s.label, cx, cy - 8 * k, { size: 13.5 * k, weight: 600, align: 'center', font: DISPLAY })
      text(ctx, s.sub, cx, cy + 12 * k, { size: 10.5 * k, color: C.muted, align: 'center' })
      if (busy) {
        const a = t * 6
        ctx.strokeStyle = s.color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx + bw / 2 - 12 * k, cy - bh / 2 + 12 * k, 5 * k, a, a + 4)
        ctx.stroke()
      }
    }

    for (const p of packets) {
      const x = X(p.x)
      const y = Y(p.y)
      if (p.moving) {
        glow(ctx, x, y, 22 * k, p.color, 0.7)
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(x, y, 3.5 * k, 0, TAU)
        ctx.fill()
      }
      const off = p.moving ? 24 * k : bh / 2 + 18 * k
      chip(ctx, p.label, x, y - off, { color: p.color, size: 11 * k, mono: true, align: 'center', h: 24 * k, fillAlpha: 0.2 })
    }

    const pipe = mode === 'simple' ? 'prompt | model | parser' : '{"context": retriever, "question": passthrough} | prompt | model | parser'
    text(ctx, pipe, w / 2, h - 18 * k, { size: 12 * k, color: C.soft, align: 'center', font: MONO })
  })

  return <canvas ref={ref} className="stage-canvas wide" aria-label="Data flowing through a LangChain pipeline" />
}
