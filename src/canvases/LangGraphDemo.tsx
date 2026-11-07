import { useRef, useState } from 'react'
import { useCanvas } from '../hooks/useCanvas'
import type { Pt } from '../lib/draw'
import { C, DISPLAY, MONO, TAU, arrowHead, chip, easeInOut, glow, quad, quadAngle, rgba, rrect, scaleFor, text } from '../lib/draw'
import Toggle from '../components/Toggle'

type GraphMode = 'agent' | 'reflect'
type Role = 'human' | 'ai' | 'tool' | 'critic'

interface Msg {
  role: Role
  text: string
}

interface GNode {
  id: string
  label: string
  sub?: string
  x: number
  y: number
  terminal?: boolean
  color: string
}

interface GEdge {
  from: string
  to: string
  bend?: number
  cond?: string
}

interface Step {
  node: string
  msg?: Msg
}

interface GraphDef {
  nodes: GNode[]
  edges: GEdge[]
  script: Step[]
}

const GRAPHS: Record<GraphMode, GraphDef> = {
  agent: {
    nodes: [
      { id: '__start__', label: 'START', x: 0.3, y: 0.12, terminal: true, color: C.cyan },
      { id: 'agent', label: 'agent', sub: 'LLM with tools bound', x: 0.3, y: 0.48, color: C.violet },
      { id: 'tools', label: 'tools', sub: 'ToolNode', x: 0.74, y: 0.48, color: C.amber },
      { id: '__end__', label: 'END', x: 0.3, y: 0.86, terminal: true, color: C.pink },
    ],
    edges: [
      { from: '__start__', to: 'agent' },
      { from: 'agent', to: 'tools', bend: -0.38, cond: 'has tool_calls' },
      { from: 'tools', to: 'agent', bend: -0.3 },
      { from: 'agent', to: '__end__', cond: 'no tool_calls' },
    ],
    script: [
      { node: '__start__', msg: { role: 'human', text: 'Find a flight to Kyoto on Friday and tell me the weather there.' } },
      { node: 'agent', msg: { role: 'ai', text: 'search_flights(dest="KIX", day="Fri")' } },
      { node: 'tools', msg: { role: 'tool', text: 'JL 61 · 10:40 · $820' } },
      { node: 'agent', msg: { role: 'ai', text: 'get_weather(city="Kyoto", day="Fri")' } },
      { node: 'tools', msg: { role: 'tool', text: 'Rain · 17°C' } },
      { node: 'agent', msg: { role: 'ai', text: 'Take JL 61 at 10:40 ($820). Expect rain and 17°C, so pack an umbrella.' } },
      { node: '__end__' },
    ],
  },
  reflect: {
    nodes: [
      { id: '__start__', label: 'START', x: 0.3, y: 0.12, terminal: true, color: C.cyan },
      { id: 'generate', label: 'generate', sub: 'writer LLM', x: 0.3, y: 0.48, color: C.violet },
      { id: 'reflect', label: 'reflect', sub: 'critic LLM', x: 0.74, y: 0.48, color: C.amber },
      { id: '__end__', label: 'END', x: 0.3, y: 0.86, terminal: true, color: C.pink },
    ],
    edges: [
      { from: '__start__', to: 'generate' },
      { from: 'generate', to: 'reflect', bend: -0.38, cond: 'needs review' },
      { from: 'reflect', to: 'generate', bend: -0.3 },
      { from: 'generate', to: '__end__', cond: 'approved' },
    ],
    script: [
      { node: '__start__', msg: { role: 'human', text: 'Write a tweet announcing our agent framework.' } },
      { node: 'generate', msg: { role: 'ai', text: 'v1: "We made a new framework. Check it out!"' } },
      { node: 'reflect', msg: { role: 'critic', text: 'Too vague. Say what it does and who it is for.' } },
      { node: 'generate', msg: { role: 'ai', text: 'v2: "Build reliable AI agents as graphs, with loops, memory and human review built in."' } },
      { node: 'reflect', msg: { role: 'critic', text: 'Much better. Add a call to action.' } },
      { node: 'generate', msg: { role: 'ai', text: 'v3: "…human review built in. Ship your first agent in 5 minutes →"' } },
      { node: '__end__' },
    ],
  },
}

const ROLE_META: Record<Role, { label: string; color: string }> = {
  human: { label: 'Human', color: C.cyan },
  ai: { label: 'AI', color: C.violet },
  tool: { label: 'Tool', color: C.amber },
  critic: { label: 'Critique', color: C.green },
}

const TRAVEL = 0.95
const DWELL = 1.8
const DONE_HOLD = 4

interface Runner {
  i: number
  phase: 'travel' | 'dwell' | 'wait' | 'done'
  time: number
}

const fresh = (): Runner => ({ i: 0, phase: 'dwell', time: 0 })

export default function LangGraphDemo() {
  const [mode, setMode] = useState<GraphMode>('agent')
  const [hitl, setHitl] = useState(false)
  const [step, setStep] = useState(0)
  const [waiting, setWaiting] = useState(false)
  const run = useRef<Runner>(fresh())

  const g = GRAPHS[mode]

  const reset = () => {
    run.current = fresh()
    setStep(0)
    setWaiting(false)
  }

  const approve = () => {
    const r = run.current
    if (r.phase !== 'wait') return
    run.current = { i: r.i + 1, phase: 'travel', time: 0 }
    setWaiting(false)
  }

  const ref = useCanvas(({ ctx, w, h, dt, t }) => {
    const r = run.current
    const script = g.script
    r.time += dt
    if (r.phase === 'travel' && r.time >= TRAVEL) {
      r.phase = 'dwell'
      r.time = 0
      setStep(r.i)
    } else if (r.phase === 'dwell' && r.time >= DWELL) {
      if (r.i >= script.length - 1) {
        r.phase = 'done'
        r.time = 0
      } else if (hitl && script[r.i + 1].node === 'tools') {
        r.phase = 'wait'
        r.time = 0
        setWaiting(true)
      } else {
        r.i += 1
        r.phase = 'travel'
        r.time = 0
      }
    } else if (r.phase === 'done' && r.time >= DONE_HOLD) {
      run.current = fresh()
      setStep(0)
      return
    }

    const k = scaleFor(w, 640, 0.6)
    const nodeById = new Map(g.nodes.map((n) => [n.id, n]))
    const rectOf = (n: GNode) => {
      const nw = n.terminal ? 84 * k : 150 * k
      const nh = n.terminal ? 34 * k : 60 * k
      return { x: n.x * w - nw / 2, y: n.y * h - nh / 2, w: nw, h: nh }
    }
    const inside = (p: Pt, rc: { x: number; y: number; w: number; h: number }) =>
      p.x > rc.x - 4 && p.x < rc.x + rc.w + 4 && p.y > rc.y - 4 && p.y < rc.y + rc.h + 4

    const geom = (e: GEdge) => {
      const a = nodeById.get(e.from)!
      const b = nodeById.get(e.to)!
      const p0 = { x: a.x * w, y: a.y * h }
      const p1 = { x: b.x * w, y: b.y * h }
      const dx = p1.x - p0.x
      const dy = p1.y - p0.y
      const len = Math.hypot(dx, dy)
      const bend = e.bend ?? 0
      const c = { x: (p0.x + p1.x) / 2 + (-dy / len) * bend * len, y: (p0.y + p1.y) / 2 + (dx / len) * bend * len }
      const ra = rectOf(a)
      const rb = rectOf(b)
      let t0 = 0
      let t1 = 1
      for (let i = 0; i <= 100; i++) {
        if (!inside(quad(p0, c, p1, i / 100), ra)) {
          t0 = i / 100
          break
        }
      }
      for (let i = 100; i >= 0; i--) {
        if (!inside(quad(p0, c, p1, i / 100), rb)) {
          t1 = i / 100
          break
        }
      }
      return { p0, c, p1, t0, t1 }
    }

    const cur = script[r.i]
    const prev = r.i > 0 ? script[r.i - 1] : null
    const travelEdge = r.phase === 'travel' && prev ? g.edges.find((e) => e.from === prev.node && e.to === cur.node) : undefined
    const waitEdge = r.phase === 'wait' ? g.edges.find((e) => e.from === cur.node && e.to === script[r.i + 1].node) : undefined

    for (const e of g.edges) {
      const { p0, c, p1, t0, t1 } = geom(e)
      const active = e === travelEdge || e === waitEdge
      const color = active ? (e === waitEdge ? C.amber : C.cyan) : 'rgba(148,163,255,0.35)'
      ctx.strokeStyle = color
      ctx.lineWidth = active ? 2.2 : 1.4
      ctx.setLineDash(e.cond ? [6, 6] : [])
      ctx.lineDashOffset = e.cond ? -t * 16 : 0
      ctx.beginPath()
      for (let i = 0; i <= 40; i++) {
        const p = quad(p0, c, p1, t0 + ((t1 - t0) * i) / 40)
        if (i) ctx.lineTo(p.x, p.y)
        else ctx.moveTo(p.x, p.y)
      }
      ctx.stroke()
      ctx.setLineDash([])
      const end = quad(p0, c, p1, t1)
      arrowHead(ctx, end.x, end.y, quadAngle(p0, c, p1, t1), 10 * k, active ? color : 'rgba(148,163,255,0.6)')
      if (e.cond) {
        const m = quad(p0, c, p1, (t0 + t1) / 2)
        chip(ctx, e.cond, m.x, m.y, { color: active ? C.cyan : C.muted, size: 10 * k, mono: true, align: 'center', h: 22 * k, fillAlpha: 0.12, strokeAlpha: 0.35 })
      }
    }

    for (const n of g.nodes) {
      const rc = rectOf(n)
      const activeNode = (r.phase === 'dwell' || r.phase === 'wait' || r.phase === 'done') && cur.node === n.id
      if (activeNode) glow(ctx, n.x * w, n.y * h, rc.w * 0.9, n.color, 0.35)
      rrect(ctx, rc.x, rc.y, rc.w, rc.h, n.terminal ? rc.h / 2 : 14 * k)
      ctx.fillStyle = C.panel
      ctx.fill()
      ctx.fillStyle = rgba(n.color, activeNode ? 0.22 : 0.07)
      ctx.fill()
      ctx.strokeStyle = rgba(n.color, activeNode ? 1 : 0.5)
      ctx.lineWidth = activeNode ? 2 : 1.2
      ctx.stroke()
      if (activeNode && !n.terminal && r.phase === 'dwell') {
        ctx.save()
        rrect(ctx, rc.x - 5, rc.y - 5, rc.w + 10, rc.h + 10, 18 * k)
        ctx.setLineDash([5, 7])
        ctx.lineDashOffset = -t * 24
        ctx.strokeStyle = rgba(n.color, 0.6)
        ctx.lineWidth = 1.2
        ctx.stroke()
        ctx.restore()
      }
      if (n.terminal) {
        text(ctx, n.label, n.x * w, n.y * h, { size: 12 * k, weight: 700, font: MONO, align: 'center', color: n.color })
      } else {
        text(ctx, n.label, n.x * w, n.y * h - 9 * k, { size: 16 * k, weight: 600, font: DISPLAY, align: 'center' })
        text(ctx, n.sub ?? '', n.x * w, n.y * h + 13 * k, { size: 10.5 * k, color: C.muted, align: 'center' })
      }
    }

    let tok: Pt
    let trail: Pt[] = []
    if (travelEdge) {
      const { p0, c, p1, t0, t1 } = geom(travelEdge)
      const u = easeInOut(Math.min(1, r.time / TRAVEL))
      const at = (uu: number) => quad(p0, c, p1, t0 + (t1 - t0) * uu)
      tok = at(u)
      trail = Array.from({ length: 12 }, (_, j) => at(Math.max(0, u - j * 0.03)))
    } else {
      const n = nodeById.get(cur.node)!
      const rc = rectOf(n)
      const a = t * 2.4
      tok = { x: n.x * w + Math.cos(a) * (rc.w / 2 + 10 * k) * 0.95, y: n.y * h + Math.sin(a) * (rc.h / 2 + 10 * k) }
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
      const { p0, c, p1, t0, t1 } = geom(waitEdge)
      const m = quad(p0, c, p1, (t0 + t1) / 2)
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

    if (r.phase === 'done') {
      text(ctx, 'graph finished, restarting…', w - 14 * k, h - 14 * k, { size: 10.5 * k, color: C.dim, font: MONO, align: 'right', baseline: 'bottom' })
    }
  })

  const shownSteps = g.script.slice(0, step + 1)
  const messages = shownSteps.filter((s) => s.msg).map((s) => s.msg!)
  const pending = waiting ? g.script[step]?.msg?.text : undefined

  return (
    <div className="stage">
      <div className="stage-controls">
        <Toggle<GraphMode>
          value={mode}
          onChange={(m) => {
            setMode(m)
            reset()
          }}
          options={[
            { value: 'agent', label: 'Tool-calling agent' },
            { value: 'reflect', label: 'Reflection loop' },
          ]}
        />
        <label className={`switch ${mode !== 'agent' ? 'disabled' : ''}`}>
          <input
            type="checkbox"
            checked={hitl}
            disabled={mode !== 'agent'}
            onChange={(e) => {
              setHitl(e.target.checked)
              if (!e.target.checked) approve()
            }}
          />
          <span className="switch-track" />
          Human approval before tools
        </label>
        <button type="button" className="ghost-btn" onClick={reset}>
          ↺ Restart
        </button>
      </div>
      <div className="stage-split inner">
        <div className="stage-canvas-wrap">
          <canvas ref={ref} className="stage-canvas tall" aria-label="LangGraph state graph executing step by step" />
        </div>
        <aside className="side-panel">
          <div className="panel-title">
            <span className="live-dot" />
            State <code>messages</code>
          </div>
          <ul className="msgs">
            {messages.map((m, i) => (
              <li key={`${mode}-${i}`} style={{ borderColor: ROLE_META[m.role].color }}>
                <span className="msg-role" style={{ color: ROLE_META[m.role].color }}>
                  {ROLE_META[m.role].label}
                  {m.role === 'ai' && /^\w+\(/.test(m.text) ? ' · tool_call' : ''}
                </span>
                <span className={m.role === 'ai' && /^\w+\(/.test(m.text) ? 'mono' : ''}>{m.text}</span>
              </li>
            ))}
          </ul>
          {waiting && (
            <div className="hitl">
              <div>
                <b>Paused for approval.</b> The agent wants to run <code>{pending}</code>
              </div>
              <button type="button" className="primary-btn" onClick={approve}>
                Approve ✓
              </button>
            </div>
          )}
          <div className="panel-title small">Checkpoints (one per super-step)</div>
          <div className="ckpts">
            {shownSteps.map((s, i) => (
              <span key={`${mode}-${i}`} className="ckpt">
                <b>#{i}</b> {s.node.replace(/__/g, '')}
              </span>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
