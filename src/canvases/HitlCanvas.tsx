import { useCanvas } from '../hooks/useCanvas'
import type { CanvasProps } from '../lessons/types'
import type { Decision, HNode } from '../data/hitl'
import { HITL_TRAVEL, INTERRUPT_STEP, hitlSteps } from '../data/hitl'
import type { Pt } from '../lib/draw'
import { C, MONO, TAU, chip, easeInOut, glow, prog, rgba, scaleFor, text } from '../lib/draw'
import { bubble, database, gears, nodeLabel, person, robot } from '../lib/icons'

const POS: Record<HNode | 'ckpt', Pt> = {
  user: { x: 0.08, y: 0.4 },
  agent: { x: 0.36, y: 0.4 },
  tools: { x: 0.78, y: 0.4 },
  human: { x: 0.52, y: 0.8 },
  answer: { x: 0.88, y: 0.8 },
  ckpt: { x: 0.18, y: 0.8 },
}

const LINKS: [HNode, HNode][] = [
  ['user', 'agent'],
  ['agent', 'tools'],
  ['agent', 'human'],
  ['human', 'tools'],
  ['agent', 'answer'],
]

const TONE = { ok: C.cyan, warn: C.amber, bad: C.red, call: C.violet }
const DECISION_META: Record<Decision, { label: string; color: string }> = {
  approve: { label: '✓ approved', color: C.green },
  edit: { label: '✎ edited: account → savings', color: C.amber },
  reject: { label: '✗ rejected with feedback', color: C.red },
}

export default function HitlCanvas({ clock, opts }: CanvasProps) {
  const ref = useCanvas(({ ctx, w, h, t }) => {
    const c = clock.current
    const decision = (opts.decision ?? 'approve') as Decision
    const steps = hitlSteps(decision)
    const i = Math.min(c.step, steps.length - 1)
    const st = steps[i]
    const local = c.waiting ? 99 : c.local
    const u = easeInOut(prog(local, 0, HITL_TRAVEL))
    const arrived = local >= HITL_TRAVEL
    const k = scaleFor(w, 760, 0.58)
    const S = Math.min(44 * k, h * 0.085)
    const P = (id: HNode | 'ckpt'): Pt => ({ x: POS[id].x * w, y: POS[id].y * h })
    const paused = c.waiting || (i === INTERRUPT_STEP && arrived)
    const resumed = i > INTERRUPT_STEP

    for (const [a, b] of LINKS) {
      const pa = P(a)
      const pb = P(b)
      const on = (st.from === a && st.to === b) || (st.from === b && st.to === a)
      const color = on && !arrived ? TONE[st.tone] : 'rgba(148,163,255,0.22)'
      ctx.strokeStyle = on && !arrived ? rgba(color, 0.85) : color
      ctx.lineWidth = on && !arrived ? 2.2 : 1.4
      ctx.setLineDash(a === 'agent' && b === 'human' ? [6, 6] : [])
      ctx.lineDashOffset = -t * 18
      ctx.beginPath()
      ctx.moveTo(pa.x, pa.y)
      ctx.lineTo(pb.x, pb.y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    const ck = P('ckpt')
    const hu = P('human')
    ctx.strokeStyle = paused || resumed ? rgba(C.amber, paused ? 0.7 : 0.35) : 'rgba(148,163,255,0.15)'
    ctx.lineWidth = 1.4
    ctx.setLineDash([3, 5])
    ctx.lineDashOffset = paused ? -t * 25 : 0
    ctx.beginPath()
    ctx.moveTo(ck.x + S * 0.7, ck.y)
    ctx.lineTo(hu.x - S * 0.8, hu.y)
    ctx.stroke()
    ctx.setLineDash([])

    person(ctx, P('user').x, P('user').y, S * 0.85, { color: C.cyan, active: i === 0 && !arrived, t })
    nodeLabel(ctx, P('user').x, P('user').y + S * 0.95, 'User', undefined, k, C.cyan, false)

    const agentBusy = arrived && st.to === 'agent'
    robot(ctx, P('agent').x, P('agent').y, S, { color: C.violet, active: agentBusy && !paused, t: paused ? 0 : t })
    nodeLabel(ctx, P('agent').x, P('agent').y + S * 1.15, 'agent', paused ? 'paused' : 'gpt-5', k, C.violet, agentBusy)

    gears(ctx, P('tools').x, P('tools').y, S * 0.85, { color: C.amber, active: arrived && st.to === 'tools', t })
    nodeLabel(ctx, P('tools').x, P('tools').y + S * 1.0, 'tools', 'read_bill · pay_bill', k, C.amber, arrived && st.to === 'tools')

    database(ctx, ck.x, ck.y, S * 0.6, { color: C.amber, active: paused, t })
    nodeLabel(ctx, ck.x, ck.y + S * 0.85, 'checkpoint', 'thread bills-42', k, C.amber, paused)
    if (paused) chip(ctx, 'state saved', ck.x, ck.y - S * 0.95, { color: C.amber, size: 10 * k, align: 'center', h: 22 * k, fillAlpha: 0.18 })
    else if (resumed && i === INTERRUPT_STEP + 1 && !arrived) chip(ctx, 'state loaded ↺', ck.x, ck.y - S * 0.95, { color: C.green, size: 10 * k, align: 'center', h: 22 * k, fillAlpha: 0.18 })

    if (paused) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 4)
      glow(ctx, hu.x, hu.y, S * 2.2, C.amber, 0.25 + pulse * 0.25)
      ctx.strokeStyle = rgba(C.amber, 0.4 + pulse * 0.5)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(hu.x, hu.y, S * (1.05 + pulse * 0.15), 0, TAU)
      ctx.stroke()
    }
    person(ctx, hu.x, hu.y, S * 0.9, { color: C.amber, active: paused || (i === INTERRUPT_STEP + 1 && !arrived), t })
    nodeLabel(ctx, hu.x, hu.y + S * 1.0, 'human reviewer', paused ? 'awaiting decision' : 'interrupt()', k, C.amber, paused)
    if (resumed) {
      const d = DECISION_META[decision]
      chip(ctx, d.label, hu.x, hu.y - S * 1.15, { color: d.color, size: 10.5 * k, align: 'center', h: 24 * k, fillAlpha: 0.2, weight: 600 })
    }

    bubble(ctx, P('answer').x, P('answer').y, S * 0.85, { color: C.pink, active: arrived && st.to === 'answer', t })
    nodeLabel(ctx, P('answer').x, P('answer').y + S * 0.95, 'answer', undefined, k, C.pink, arrived && st.to === 'answer')

    const from = P(st.from)
    const to = P(st.to)
    const pos = { x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u }
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
    const label = st.packet.length > 44 ? st.packet.slice(0, 43) + '…' : st.packet
    const anchor = arrived ? to : pos
    let cy = anchor.y - S * (arrived ? 1.6 : 0.7)
    if (arrived && st.to === 'human') cy = anchor.y - S * 1.65
    if (arrived && st.to === 'answer') cy = anchor.y - S * 1.3
    const cx = Math.min(Math.max(anchor.x, 150 * k), w - 150 * k)
    if (!(arrived && st.to === 'human' && resumed)) {
      chip(ctx, label, cx, cy, { color, size: 11 * k, mono: st.tone === 'call' || st.tone === 'warn', align: 'center', h: 24 * k, fillAlpha: 0.2 })
    }

    if (paused) {
      text(ctx, '⏸ GRAPH PAUSED', w - 16 * k, h - 16 * k, { size: 11 * k, color: C.amber, font: MONO, align: 'right', weight: 600 })
    }
  })

  return <canvas ref={ref} className="stage-canvas" aria-label="Human-in-the-loop: the agent pauses for a human decision" />
}
