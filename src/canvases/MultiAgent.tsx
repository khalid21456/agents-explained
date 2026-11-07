import { useRef, useState } from 'react'
import { useCanvas } from '../hooks/useCanvas'
import type { Pt } from '../lib/draw'
import { C, DISPLAY, MONO, TAU, chip, easeInOut, glow, rgba, scaleFor, text } from '../lib/draw'
import Toggle from '../components/Toggle'

type Mode = 'supervisor' | 'network'
type AgentId = 'user' | 'supervisor' | 'researcher' | 'coder' | 'writer'

interface Hop {
  from: AgentId
  to: AgentId
  msg: string
}

const META: Record<AgentId, { label: string; role: string; color: string; tools: string[] }> = {
  user: { label: 'User', role: 'you', color: C.cyan, tools: [] },
  supervisor: { label: 'Supervisor', role: 'plans & routes', color: C.violet, tools: [] },
  researcher: { label: 'Researcher', role: 'finds facts', color: C.blue, tools: ['search', 'browse'] },
  coder: { label: 'Coder', role: 'writes & runs code', color: C.amber, tools: ['python', 'tests'] },
  writer: { label: 'Writer', role: 'drafts docs', color: C.green, tools: ['docs'] },
}

const LAYOUT: Record<Mode, Partial<Record<AgentId, Pt>>> = {
  supervisor: {
    user: { x: 0.5, y: 0.1 },
    supervisor: { x: 0.5, y: 0.42 },
    researcher: { x: 0.17, y: 0.8 },
    coder: { x: 0.5, y: 0.84 },
    writer: { x: 0.83, y: 0.8 },
  },
  network: {
    user: { x: 0.5, y: 0.1 },
    researcher: { x: 0.18, y: 0.55 },
    coder: { x: 0.5, y: 0.86 },
    writer: { x: 0.82, y: 0.55 },
  },
}

const LINKS: Record<Mode, [AgentId, AgentId][]> = {
  supervisor: [
    ['user', 'supervisor'],
    ['supervisor', 'researcher'],
    ['supervisor', 'coder'],
    ['supervisor', 'writer'],
  ],
  network: [
    ['user', 'researcher'],
    ['user', 'writer'],
    ['researcher', 'coder'],
    ['coder', 'writer'],
    ['researcher', 'writer'],
  ],
}

const HOPS: Record<Mode, Hop[]> = {
  supervisor: [
    { from: 'user', to: 'supervisor', msg: 'Build a dashboard of GitHub stars for our repo.' },
    { from: 'supervisor', to: 'researcher', msg: 'Find a reliable data source for star counts.' },
    { from: 'researcher', to: 'supervisor', msg: 'Use the GitHub REST API: /repos/{owner}/{repo}' },
    { from: 'supervisor', to: 'coder', msg: 'Write the fetch + chart code.' },
    { from: 'coder', to: 'supervisor', msg: 'dashboard.py written, tests pass.' },
    { from: 'supervisor', to: 'writer', msg: 'Write a short README for it.' },
    { from: 'writer', to: 'supervisor', msg: 'README.md done.' },
    { from: 'supervisor', to: 'user', msg: 'Done: code + docs attached.' },
  ],
  network: [
    { from: 'user', to: 'researcher', msg: 'Build a dashboard of GitHub stars for our repo.' },
    { from: 'researcher', to: 'coder', msg: 'Handoff: data is in the GitHub REST API.' },
    { from: 'coder', to: 'writer', msg: 'Handoff: code works, needs docs.' },
    { from: 'writer', to: 'coder', msg: 'Which env var holds the token?' },
    { from: 'coder', to: 'writer', msg: 'GITHUB_TOKEN' },
    { from: 'writer', to: 'user', msg: 'Done: code + docs attached.' },
  ],
}

const TRAVEL = 1.0
const WORK = 1.4
const HOP_T = TRAVEL + WORK
const HOLD = 3

export default function MultiAgent() {
  const [mode, setMode] = useState<Mode>('supervisor')
  const [shown, setShown] = useState(-1)
  const time = useRef(0)
  const last = useRef(-1)

  const ref = useCanvas(({ ctx, w, h, dt, t }) => {
    const hops = HOPS[mode]
    time.current += dt
    if (time.current > hops.length * HOP_T + HOLD) time.current = 0
    const tt = time.current
    const idx = Math.min(hops.length - 1, Math.floor(tt / HOP_T))
    const local = tt - idx * HOP_T
    const arrived = local >= TRAVEL ? idx : idx - 1
    if (arrived !== last.current) {
      last.current = arrived
      setShown(arrived)
    }

    const k = scaleFor(w, 640, 0.6)
    const L = LAYOUT[mode]
    const P = (id: AgentId): Pt => ({ x: L[id]!.x * w, y: L[id]!.y * h })
    const hop = hops[idx]
    const working = local >= TRAVEL && tt < hops.length * HOP_T ? hop.to : null

    for (const [a, b] of LINKS[mode]) {
      const pa = P(a)
      const pb = P(b)
      const on = (hop.from === a && hop.to === b) || (hop.from === b && hop.to === a)
      ctx.strokeStyle = on && local < TRAVEL ? rgba(META[hop.from].color, 0.8) : 'rgba(148,163,255,0.16)'
      ctx.lineWidth = on && local < TRAVEL ? 2 : 1.2
      ctx.setLineDash(mode === 'network' ? [5, 6] : [])
      ctx.beginPath()
      ctx.moveTo(pa.x, pa.y)
      ctx.lineTo(pb.x, pb.y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    const ids = Object.keys(L) as AgentId[]
    for (const id of ids) {
      const p = P(id)
      const m = META[id]
      const r = (id === 'supervisor' ? 50 : id === 'user' ? 28 : 46) * k
      const busy = working === id
      if (busy) glow(ctx, p.x, p.y, r * 2.6, m.color, 0.4)
      ctx.fillStyle = C.panel
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, TAU)
      ctx.fill()
      ctx.fillStyle = rgba(m.color, busy ? 0.25 : 0.08)
      ctx.fill()
      ctx.strokeStyle = rgba(m.color, busy ? 1 : 0.55)
      ctx.lineWidth = busy ? 2.2 : 1.4
      ctx.stroke()
      if (busy) {
        for (let j = 0; j < 3; j++) {
          const a = t * 3 + (j * TAU) / 3
          ctx.fillStyle = m.color
          ctx.beginPath()
          ctx.arc(p.x + Math.cos(a) * (r + 9 * k), p.y + Math.sin(a) * (r + 9 * k), 2.6 * k, 0, TAU)
          ctx.fill()
        }
      }
      text(ctx, m.label, p.x, p.y - (id === 'user' ? 0 : 7 * k), { size: (id === 'supervisor' ? 13.5 : 12.5) * k, weight: 600, font: DISPLAY, align: 'center' })
      if (id !== 'user') text(ctx, m.role, p.x, p.y + 10 * k, { size: 9.5 * k, color: C.muted, align: 'center' })
      m.tools.forEach((tool, j) => {
        const ang = Math.PI / 2 + (j - (m.tools.length - 1) / 2) * 0.9
        const tx = p.x + Math.cos(ang) * (r + 18 * k)
        const ty = p.y + Math.sin(ang) * (r + 14 * k)
        if (ty < h - 8 * k) chip(ctx, tool, tx, ty, { color: m.color, size: 9 * k, mono: true, align: 'center', h: 18 * k, fillAlpha: 0.1, strokeAlpha: 0.3, alpha: 0.85 })
      })
    }

    if (local < TRAVEL && tt < hops.length * HOP_T) {
      const a = P(hop.from)
      const b = P(hop.to)
      const u = easeInOut(local / TRAVEL)
      const color = META[hop.from].color
      ctx.globalCompositeOperation = 'lighter'
      for (let j = 10; j >= 0; j--) {
        const uj = Math.max(0, u - j * 0.03)
        glow(ctx, a.x + (b.x - a.x) * uj, a.y + (b.y - a.y) * uj, (12 - j) * k, color, 0.5 * (1 - j / 11))
      }
      ctx.globalCompositeOperation = 'source-over'
      const x = a.x + (b.x - a.x) * u
      const y = a.y + (b.y - a.y) * u
      ctx.save()
      ctx.translate(x, y)
      ctx.fillStyle = C.panel
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(-11 * k, -8 * k, 22 * k, 16 * k, 3)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-11 * k, -8 * k)
      ctx.lineTo(0, 1 * k)
      ctx.lineTo(11 * k, -8 * k)
      ctx.stroke()
      ctx.restore()
    }

    const label = mode === 'supervisor' ? 'one boss routes every message' : 'agents hand off directly'
    text(ctx, label.toUpperCase(), 14 * k, h - 14 * k, { size: 10 * k, color: C.dim, font: MONO, baseline: 'bottom' })
  })

  const hops = HOPS[mode]

  return (
    <div className="stage">
      <div className="stage-controls">
        <Toggle<Mode>
          value={mode}
          onChange={(m) => {
            setMode(m)
            time.current = 0
            last.current = -1
            setShown(-1)
          }}
          options={[
            { value: 'supervisor', label: 'Supervisor' },
            { value: 'network', label: 'Network (handoffs)' },
          ]}
        />
      </div>
      <div className="stage-split inner">
        <div className="stage-canvas-wrap">
          <canvas ref={ref} className="stage-canvas tall" aria-label="Multiple agents passing messages" />
        </div>
        <aside className="side-panel">
          <div className="panel-title">
            <span className="live-dot" />
            Message bus
          </div>
          <ol className="trace hops">
            {hops.map((hp, i) => (
              <li key={`${mode}-${i}`} className={`${i <= shown ? 'in' : ''} ${i === shown ? 'now' : ''}`}>
                <span className="trace-kind">
                  <i style={{ color: META[hp.from].color }}>{META[hp.from].label}</i>
                  <em>→</em>
                  <i style={{ color: META[hp.to].color }}>{META[hp.to].label}</i>
                </span>
                <span className="trace-text">{hp.msg}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  )
}
