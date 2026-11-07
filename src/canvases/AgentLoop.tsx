import { useRef, useState } from 'react'
import { useCanvas } from '../hooks/useCanvas'
import type { Pt } from '../lib/draw'
import { C, DISPLAY, TAU, chip, easeInOut, glow, prog, rgba, scaleFor, text } from '../lib/draw'

type NodeId = 'user' | 'think' | 'act' | 'obs' | 'answer'
type Kind = 'input' | 'thought' | 'action' | 'observation' | 'final'

interface Step {
  node: NodeId
  kind: Kind
  iter: number
  text: string
}

const STEPS: Step[] = [
  { node: 'user', kind: 'input', iter: 0, text: "What's the weather in Paris, in °F?" },
  { node: 'think', kind: 'thought', iter: 1, text: 'I need live weather data. I will call a tool.' },
  { node: 'act', kind: 'action', iter: 1, text: 'get_weather(city="Paris")' },
  { node: 'obs', kind: 'observation', iter: 1, text: '18°C, cloudy' },
  { node: 'think', kind: 'thought', iter: 2, text: 'That is Celsius. Convert to Fahrenheit.' },
  { node: 'act', kind: 'action', iter: 2, text: 'calculator("18 * 9/5 + 32")' },
  { node: 'obs', kind: 'observation', iter: 2, text: '64.4' },
  { node: 'think', kind: 'thought', iter: 3, text: 'I have everything I need. No more tools.' },
  { node: 'answer', kind: 'final', iter: 3, text: "It's about 64°F and cloudy in Paris." },
]

const KIND_META: Record<Kind, { label: string; color: string }> = {
  input: { label: 'User', color: C.cyan },
  thought: { label: 'Thought', color: C.violet },
  action: { label: 'Action', color: C.amber },
  observation: { label: 'Observation', color: C.green },
  final: { label: 'Final answer', color: C.pink },
}

const NODE_META: Record<NodeId, { label: string; color: string }> = {
  user: { label: 'User', color: C.cyan },
  think: { label: 'Reason', color: C.violet },
  act: { label: 'Act', color: C.amber },
  obs: { label: 'Observe', color: C.green },
  answer: { label: 'Answer', color: C.pink },
}

const ANG: Partial<Record<NodeId, number>> = { think: -90, act: 30, obs: 150 }
const STEP_T = 2.6
const TRAVEL = 1.0
const END_HOLD = 3.5

export default function AgentLoop() {
  const time = useRef(0)
  const lastIdx = useRef(-1)
  const [shown, setShown] = useState(0)

  const ref = useCanvas(({ ctx, w, h, dt, t }) => {
    time.current += dt
    if (time.current > STEPS.length * STEP_T + END_HOLD) time.current = 0
    const tt = time.current
    const idx = Math.min(STEPS.length - 1, Math.floor(tt / STEP_T))
    const local = tt - idx * STEP_T
    const u = idx === 0 ? 1 : easeInOut(prog(local, 0, TRAVEL))
    const arrived = u >= 1 ? idx : idx - 1
    if (arrived !== lastIdx.current) {
      lastIdx.current = arrived
      setShown(arrived)
    }

    const k = scaleFor(w, 720, 0.58)
    const cx = w / 2
    const cy = h * 0.56
    const R = Math.min(h * 0.32, w * 0.2)

    const nodePos = (id: NodeId): Pt => {
      const a = ANG[id]
      if (a !== undefined) return { x: cx + R * Math.cos((a * Math.PI) / 180), y: cy + R * Math.sin((a * Math.PI) / 180) }
      const side = id === 'user' ? -1 : 1
      return { x: cx + side * Math.min(R * 2.05, w / 2 - 70 * k), y: cy - R }
    }

    const posAt = (i: number, uu: number): Pt => {
      const to = STEPS[i].node
      if (i === 0) return nodePos(to)
      const from = STEPS[i - 1].node
      const a0 = ANG[from]
      let a1 = ANG[to]
      if (a0 !== undefined && a1 !== undefined) {
        if (a1 <= a0) a1 += 360
        const a = ((a0 + (a1 - a0) * uu) * Math.PI) / 180
        return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }
      }
      const p0 = nodePos(from)
      const p1 = nodePos(to)
      return { x: p0.x + (p1.x - p0.x) * uu, y: p0.y + (p1.y - p0.y) * uu }
    }

    ctx.save()
    ctx.setLineDash([3, 7])
    ctx.lineDashOffset = -t * 18
    ctx.strokeStyle = rgba(C.violet, 0.35)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    const userP = nodePos('user')
    const thinkP = nodePos('think')
    const ansP = nodePos('answer')
    ctx.strokeStyle = rgba(C.cyan, 0.25)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(userP.x, userP.y)
    ctx.lineTo(thinkP.x, thinkP.y)
    ctx.stroke()
    ctx.strokeStyle = rgba(C.pink, 0.25)
    ctx.beginPath()
    ctx.moveTo(thinkP.x, thinkP.y)
    ctx.lineTo(ansP.x, ansP.y)
    ctx.stroke()

    const cur = STEPS[idx]
    const atThink = cur.node === 'think' && u >= 1
    const coreBoost = atThink ? 1 : 0
    const pulse = 0.5 + 0.5 * Math.sin(t * 3)
    glow(ctx, cx, cy, R * (0.62 + coreBoost * 0.18), C.violet, 0.18 + coreBoost * 0.2 + pulse * 0.05)
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = rgba(i === 1 ? C.cyan : C.violet, 0.5 + coreBoost * 0.3)
      ctx.lineWidth = 2
      ctx.beginPath()
      const r = R * (0.22 + i * 0.08)
      const s = t * (0.6 + i * 0.35) * (i % 2 ? -1 : 1) * (1 + coreBoost * 1.5)
      ctx.arc(cx, cy, r, s, s + Math.PI * (0.7 + i * 0.25))
      ctx.stroke()
    }
    text(ctx, 'LLM', cx, cy, { size: 20 * k, weight: 700, font: DISPLAY, align: 'center' })
    if (atThink) {
      ctx.strokeStyle = rgba(C.violet, 0.6)
      ctx.setLineDash([4, 5])
      ctx.lineDashOffset = t * 30
      ctx.beginPath()
      ctx.moveTo(cx, cy - R * 0.45)
      ctx.lineTo(thinkP.x, thinkP.y + 20 * k)
      ctx.stroke()
      ctx.setLineDash([])
    }

    const mids: [number, number][] = [
      [-90, 30],
      [30, 150],
      [150, 270],
    ]
    for (const [a0, a1] of mids) {
      const a = (((a0 + a1) / 2) * Math.PI) / 180
      const x = cx + R * Math.cos(a)
      const y = cy + R * Math.sin(a)
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(a + Math.PI / 2)
      ctx.fillStyle = rgba(C.violet, 0.8)
      ctx.beginPath()
      ctx.moveTo(6, 0)
      ctx.lineTo(-4, -5)
      ctx.lineTo(-4, 5)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    const iterLabel = cur.iter > 0 ? `iteration ${cur.iter}` : 'input'
    text(ctx, iterLabel.toUpperCase(), cx, cy + R + 44 * k, { size: 11 * k, color: C.muted, align: 'center', font: DISPLAY, weight: 600 })

    for (const id of Object.keys(NODE_META) as NodeId[]) {
      const p = nodePos(id)
      const meta = NODE_META[id]
      const active = cur.node === id && u >= 1
      const visited = id !== 'answer' || (idx === STEPS.length - 1 && u >= 1)
      if (active) glow(ctx, p.x, p.y, 60 * k, meta.color, 0.45)
      chip(ctx, meta.label, p.x, p.y, {
        color: meta.color,
        size: 14 * k,
        h: 36 * k,
        padX: 18 * k,
        align: 'center',
        weight: 600,
        radius: 18,
        fillAlpha: active ? 0.3 : 0.1,
        strokeAlpha: active ? 1 : 0.45,
        alpha: visited ? 1 : 0.45,
      })
    }

    if (!(idx === 0 && local < 0.2)) {
      const color = NODE_META[cur.node].color
      ctx.globalCompositeOperation = 'lighter'
      for (let j = 14; j >= 0; j--) {
        const uj = Math.max(0, u - j * 0.025)
        const p = posAt(idx, uj)
        glow(ctx, p.x, p.y, (12 - j * 0.6) * k, color, 0.5 * (1 - j / 15))
      }
      const p = posAt(idx, u)
      glow(ctx, p.x, p.y, 26 * k, color, 0.7)
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3.2 * k, 0, TAU)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    }

    if (idx === STEPS.length - 1 && u >= 1) {
      const a = prog(local, TRAVEL, 0.5)
      const p = nodePos('answer')
      text(ctx, 'loop exits: no tool call', p.x, p.y + 34 * k, { size: 11 * k, color: C.pink, align: 'center', alpha: a })
    }
  })

  return (
    <div className="stage stage-split">
      <div className="stage-canvas-wrap">
        <canvas ref={ref} className="stage-canvas" aria-label="Animated agent loop: reason, act, observe" />
      </div>
      <aside className="side-panel">
        <div className="panel-title">
          <span className="live-dot" />
          ReAct trace
        </div>
        <ol className="trace">
          {STEPS.map((s, i) => {
            const m = KIND_META[s.kind]
            const newIter = i > 0 && s.iter !== STEPS[i - 1].iter
            return (
              <li key={i} className={`${i <= shown ? 'in' : ''} ${i === shown ? 'now' : ''} ${newIter ? 'sep' : ''}`}>
                <span className="trace-kind" style={{ color: m.color }}>
                  {m.label}
                </span>
                <span className={s.kind === 'action' ? 'trace-text mono' : 'trace-text'}>{s.text}</span>
              </li>
            )
          })}
        </ol>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => {
            time.current = 0
          }}
        >
          ↺ Replay
        </button>
      </aside>
    </div>
  )
}
