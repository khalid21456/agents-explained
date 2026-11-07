import { useCanvas } from '../hooks/useCanvas'
import type { CanvasProps } from '../lessons/types'
import type { GNodeId, GuardId } from '../data/guardrails'
import { GUARD_TRAVEL, SCENARIOS } from '../data/guardrails'
import type { Pt } from '../lib/draw'
import { C, MONO, TAU, chip, easeInOut, glow, prog, quad, rgba, scaleFor, text } from '../lib/draw'
import type { ShieldState } from '../lib/icons'
import { bubble, gears, nodeLabel, person, robot, shield } from '../lib/icons'

const POS: Record<GNodeId, Pt> = {
  user: { x: 0.07, y: 0.4 },
  in: { x: 0.27, y: 0.4 },
  agent: { x: 0.5, y: 0.4 },
  out: { x: 0.73, y: 0.4 },
  resp: { x: 0.93, y: 0.4 },
  tg: { x: 0.5, y: 0.68 },
  tools: { x: 0.5, y: 0.89 },
}

const LINKS: [GNodeId, GNodeId][] = [
  ['user', 'in'],
  ['in', 'agent'],
  ['agent', 'out'],
  ['out', 'resp'],
  ['agent', 'tg'],
  ['tg', 'tools'],
]

const TONE = { ok: C.cyan, warn: C.amber, bad: C.red }

export default function GuardCanvas({ clock, opts }: CanvasProps) {
  const ref = useCanvas(({ ctx, w, h, t }) => {
    const c = clock.current
    const sc = SCENARIOS[opts.scenario ?? 'safe'] ?? SCENARIOS.safe
    const steps = sc.steps
    const i = Math.min(c.step, steps.length - 1)
    const st = steps[i]
    const local = c.waiting ? 99 : c.local
    const u = easeInOut(prog(local, 0, GUARD_TRAVEL))
    const arrived = local >= GUARD_TRAVEL
    const k = scaleFor(w, 760, 0.58)
    const S = Math.min(44 * k, h * 0.085)
    const P = (id: GNodeId): Pt => ({ x: POS[id].x * w, y: POS[id].y * h })
    const bypass = sc.steps.some((s) => s.from === 'in' && s.to === 'resp')

    for (const [a, b] of LINKS) {
      const pa = P(a)
      const pb = P(b)
      const on = (st.from === a && st.to === b) || (st.from === b && st.to === a)
      ctx.strokeStyle = on && !arrived ? rgba(TONE[st.tone], 0.85) : 'rgba(148,163,255,0.22)'
      ctx.lineWidth = on && !arrived ? 2.2 : 1.4
      ctx.setLineDash(a === 'agent' && b === 'tg' ? [5, 6] : [])
      ctx.beginPath()
      ctx.moveTo(pa.x, pa.y)
      ctx.lineTo(pb.x, pb.y)
      ctx.stroke()
      ctx.setLineDash([])
    }
    const pin = P('in')
    const pres = P('resp')
    const arcC = { x: (pin.x + pres.x) / 2, y: pin.y - h * 0.42 }
    if (bypass) {
      const on = st.from === 'in' && st.to === 'resp'
      ctx.strokeStyle = on ? rgba(C.red, 0.85) : rgba(C.red, 0.3)
      ctx.lineWidth = on ? 2.2 : 1.4
      ctx.setLineDash([6, 6])
      ctx.lineDashOffset = -t * 20
      ctx.beginPath()
      ctx.moveTo(pin.x, pin.y - S * 0.8)
      ctx.quadraticCurveTo(arcC.x, arcC.y, pres.x, pres.y - S * 0.7)
      ctx.stroke()
      ctx.setLineDash([])
      const m = quad({ x: pin.x, y: pin.y - S * 0.8 }, arcC, { x: pres.x, y: pres.y - S * 0.7 }, 0.5)
      chip(ctx, 'jump_to: "end"', m.x, m.y, { color: C.red, size: 10 * k, mono: true, align: 'center', h: 22 * k, fillAlpha: 0.14, strokeAlpha: 0.5 })
    }

    const verdicts: Partial<Record<GuardId, ShieldState>> = {}
    steps.forEach((s, j) => {
      if (!s.verdict) return
      const g = s.to as GuardId
      if (j < i || (j === i && local >= GUARD_TRAVEL + 0.6)) verdicts[g] = s.verdict.state
      else if (j === i && arrived) verdicts[g] = 'checking'
    })

    const busy = (id: GNodeId) => arrived && st.to === id

    person(ctx, P('user').x, P('user').y, S * 0.9, { color: C.cyan, active: i === 0 && !arrived, t })
    nodeLabel(ctx, P('user').x, P('user').y + S * 1.0, 'User', undefined, k, C.cyan, false)

    robot(ctx, P('agent').x, P('agent').y, S, { color: C.violet, active: busy('agent'), t })
    nodeLabel(ctx, P('agent').x, P('agent').y + S * 1.15, 'agent', 'gpt-5', k, C.violet, busy('agent'))

    gears(ctx, P('tools').x, P('tools').y, S * 0.8, { color: C.amber, active: busy('tools'), t })
    text(ctx, 'tools', P('tools').x + S * 1.05, P('tools').y - 6 * k, { size: 14 * k, weight: 600 })
    text(ctx, 'search_orders · send_email', P('tools').x + S * 1.05, P('tools').y + 12 * k, { size: 10.5 * k, color: C.muted })

    bubble(ctx, P('resp').x, P('resp').y, S * 0.9, { color: C.pink, active: busy('resp'), t })
    nodeLabel(ctx, P('resp').x, P('resp').y + S * 1.0, 'Response', undefined, k, C.pink, busy('resp'))

    const guards: { id: GuardId; title: string; sub: string; side: 'below' | 'right' }[] = [
      { id: 'in', title: 'Input guard', sub: 'injection · PII', side: 'below' },
      { id: 'out', title: 'Output guard', sub: 'safety · secrets', side: 'below' },
      { id: 'tg', title: 'Tool guard', sub: 'allowlist · approval', side: 'right' },
    ]
    for (const g of guards) {
      const p = P(g.id)
      const state = verdicts[g.id] ?? 'idle'
      shield(ctx, p.x, p.y, S * 0.85, state, t)
      if (g.side === 'below') nodeLabel(ctx, p.x, p.y + S * 0.95, g.title, g.sub, k, C.cyan, state !== 'idle')
      else {
        text(ctx, g.title, p.x + S * 0.9, p.y - 6 * k, { size: 14 * k, weight: 600 })
        text(ctx, g.sub, p.x + S * 0.9, p.y + 12 * k, { size: 10.5 * k, color: C.muted })
      }
      const done = steps.find((s, j) => s.to === g.id && s.verdict && (j < i || (j === i && local >= GUARD_TRAVEL + 0.6)))
      if (done?.verdict) {
        const ny = g.side === 'below' ? p.y - S * 1.15 : p.y + S * 0.95
        const nx = g.side === 'below' ? p.x : p.x + S * 0.9
        chip(ctx, done.verdict.note, nx, ny, {
          color: done.verdict.state === 'pass' ? C.green : done.verdict.state === 'block' ? C.red : done.verdict.state === 'replace' ? C.pink : C.amber,
          size: 10 * k,
          align: g.side === 'below' ? 'center' : 'left',
          h: 22 * k,
          fillAlpha: 0.16,
        })
      }
    }

    const from = P(st.from)
    const to = P(st.to)
    let pos: Pt
    if (st.from === 'in' && st.to === 'resp') pos = quad({ x: pin.x, y: pin.y - S * 0.8 }, arcC, { x: pres.x, y: pres.y - S * 0.7 }, u)
    else pos = { x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u }
    const color = TONE[st.tone]
    if (!arrived) {
      ctx.globalCompositeOperation = 'lighter'
      glow(ctx, pos.x, pos.y, 26 * k, color, 0.8)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 3.5 * k, 0, TAU)
      ctx.fill()
    }
    const label = st.packet.length > 38 ? st.packet.slice(0, 37) + '…' : st.packet
    const vertical = st.from === 'tg' || st.to === 'tg' || st.from === 'tools'
    const chipX = Math.min(Math.max(pos.x, 140 * k), w - 140 * k)
    const chipY = vertical ? pos.y : pos.y - S * (arrived ? 1.75 : 0.75)
    chip(ctx, label, vertical ? pos.x - S * 0.9 : chipX, chipY, {
      color,
      size: 11 * k,
      mono: true,
      align: vertical ? 'right' : 'center',
      h: 24 * k,
      fillAlpha: 0.2,
    })

    const calls = steps.slice(0, i + 1).filter((s, j) => s.to === 'agent' && (j < i || arrived)).length
    text(ctx, 'ModelCallLimitMiddleware', w - 16 * k, 18 * k, { size: 10 * k, color: C.dim, font: MONO, align: 'right' })
    text(ctx, `model calls ${calls} / 10`, w - 16 * k, 36 * k, { size: 12 * k, color: calls ? C.violet : C.muted, font: MONO, align: 'right', weight: 600 })
  })

  return <canvas ref={ref} className="stage-canvas" aria-label="Guardrails checking input, tool calls and output" />
}
