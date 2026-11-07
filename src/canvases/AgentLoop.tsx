import { useCanvas } from '../hooks/useCanvas'
import type { CanvasProps } from '../lessons/types'
import type { LoopNode } from '../data/loop'
import { LOOP_STEPS, LOOP_TRAVEL } from '../data/loop'
import type { Pt } from '../lib/draw'
import { C, DISPLAY, TAU, chip, easeInOut, glow, prog, rgba, scaleFor, text } from '../lib/draw'

const NODE_META: Record<LoopNode, { label: string; color: string }> = {
  user: { label: 'User', color: C.cyan },
  think: { label: 'Reason', color: C.violet },
  act: { label: 'Act', color: C.amber },
  obs: { label: 'Observe', color: C.green },
  answer: { label: 'Answer', color: C.pink },
}

const ANG: Partial<Record<LoopNode, number>> = { think: -90, act: 30, obs: 150 }

export default function AgentLoop({ clock }: CanvasProps) {
  const ref = useCanvas(({ ctx, w, h, t }) => {
    const c = clock.current
    const idx = c.step
    const local = c.local
    const u = idx === 0 ? 1 : easeInOut(prog(local, 0, LOOP_TRAVEL))
    const k = scaleFor(w, 720, 0.58)
    const cx = w / 2
    const cy = h * 0.58
    const R = Math.min(h * 0.3, w * 0.2)

    const nodePos = (id: LoopNode): Pt => {
      const a = ANG[id]
      if (a !== undefined) return { x: cx + R * Math.cos((a * Math.PI) / 180), y: cy + R * Math.sin((a * Math.PI) / 180) }
      const side = id === 'user' ? -1 : 1
      return { x: cx + side * Math.min(R * 2.05, w / 2 - 70 * k), y: cy - R }
    }

    const posAt = (i: number, uu: number): Pt => {
      const to = LOOP_STEPS[i].node
      if (i === 0) return nodePos(to)
      const from = LOOP_STEPS[i - 1].node
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
    ctx.restore()

    const userP = nodePos('user')
    const thinkP = nodePos('think')
    const ansP = nodePos('answer')
    ctx.lineWidth = 1.5
    ctx.strokeStyle = rgba(C.cyan, 0.25)
    ctx.beginPath()
    ctx.moveTo(userP.x, userP.y)
    ctx.lineTo(thinkP.x, thinkP.y)
    ctx.stroke()
    ctx.strokeStyle = rgba(C.pink, 0.25)
    ctx.beginPath()
    ctx.moveTo(thinkP.x, thinkP.y)
    ctx.lineTo(ansP.x, ansP.y)
    ctx.stroke()

    const cur = LOOP_STEPS[idx]
    const atThink = cur.node === 'think' && u >= 1
    const boost = atThink ? 1 : 0
    glow(ctx, cx, cy, R * (0.62 + boost * 0.18), C.violet, 0.18 + boost * 0.2 + (0.5 + 0.5 * Math.sin(t * 3)) * 0.05)
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = rgba(i === 1 ? C.cyan : C.violet, 0.5 + boost * 0.3)
      ctx.lineWidth = 2
      ctx.beginPath()
      const r = R * (0.22 + i * 0.08)
      const s = t * (0.6 + i * 0.35) * (i % 2 ? -1 : 1) * (1 + boost * 1.5)
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

    for (const [a0, a1] of [
      [-90, 30],
      [30, 150],
      [150, 270],
    ]) {
      const a = (((a0 + a1) / 2) * Math.PI) / 180
      ctx.save()
      ctx.translate(cx + R * Math.cos(a), cy + R * Math.sin(a))
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
    text(ctx, iterLabel.toUpperCase(), cx, cy + R + 40 * k, { size: 11 * k, color: C.muted, align: 'center', font: DISPLAY, weight: 600 })

    for (const id of Object.keys(NODE_META) as LoopNode[]) {
      const p = nodePos(id)
      const meta = NODE_META[id]
      const active = cur.node === id && u >= 1
      const visited = id !== 'answer' || (idx === LOOP_STEPS.length - 1 && u >= 1)
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

    if (u >= 1 && cur.node !== 'user') {
      const p = nodePos(cur.node)
      const a = prog(local, LOOP_TRAVEL, 0.4)
      const below = cur.node === 'act' || cur.node === 'obs'
      chip(ctx, cur.text, p.x, p.y + (below ? 40 : -40) * k, {
        color: NODE_META[cur.node].color,
        size: 11.5 * k,
        mono: cur.node === 'act',
        align: 'center',
        h: 26 * k,
        alpha: a,
        fillAlpha: 0.18,
      })
    }

    const color = NODE_META[cur.node].color
    ctx.globalCompositeOperation = 'lighter'
    for (let j = 14; j >= 0; j--) {
      const p = posAt(idx, Math.max(0, u - j * 0.025))
      glow(ctx, p.x, p.y, (12 - j * 0.6) * k, color, 0.5 * (1 - j / 15))
    }
    const p = posAt(idx, u)
    glow(ctx, p.x, p.y, 26 * k, color, 0.7)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(p.x, p.y, 3.2 * k, 0, TAU)
    ctx.fill()
  })

  return <canvas ref={ref} className="stage-canvas" aria-label="The agent loop: reason, act, observe" />
}
