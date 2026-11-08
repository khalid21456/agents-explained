import { useCanvas } from '../hooks/useCanvas'
import type { CanvasProps } from '../lessons/types'
import type { TeamMode } from '../data/autogen'
import { TEAMS } from '../data/autogen'
import { sp } from '../lib/clock'
import type { Pt } from '../lib/draw'
import { C, FONT, MONO, TAU, chip, easeInOut, easeOut, glow, lerp, rgba, rrect, scaleFor, text, wrapLines } from '../lib/draw'
import { gears, nodeLabel, person, robot } from '../lib/icons'

export default function AutogenCanvas({ clock, opts }: CanvasProps) {
  const ref = useCanvas(({ ctx, w, h, t }) => {
    const c = clock.current
    const mode = (opts.team === 'selector' ? 'selector' : 'roundrobin') as TeamMode
    const team = TEAMS[mode]
    const turns = team.turns
    const stopStep = turns.length
    const i = c.step
    const k = scaleFor(w, 780, 0.58)
    const S = Math.min(34 * k, h * 0.065)

    const center: Pt = { x: w * 0.3, y: h * 0.45 }
    const R = Math.min(w * 0.2, h * 0.3)
    const n = team.agents.length
    const angles = n === 2 ? [180, 0] : [-90, 30, 150]
    const pos = new Map(team.agents.map((a, j) => [a.id, { x: center.x + Math.cos((angles[j] * Math.PI) / 180) * R, y: center.y + Math.sin((angles[j] * Math.PI) / 180) * R }]))
    const userP: Pt = { x: w * 0.06, y: h * 0.08 }

    const cur = i < stopStep ? turns[i] : null
    const prevAgentIdx = (() => {
      for (let j = Math.min(i, stopStep) - 1; j >= 0; j--) {
        const a = team.agents.findIndex((x) => x.id === turns[j].speaker)
        if (a >= 0) return a
      }
      return -1
    })()
    const curAgentIdx = cur ? team.agents.findIndex((x) => x.id === cur.speaker) : -1

    ctx.strokeStyle = 'rgba(148,163,255,0.14)'
    ctx.setLineDash([3, 6])
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(center.x, center.y, R, 0, TAU)
    ctx.stroke()
    ctx.setLineDash([])

    const pick = cur && curAgentIdx >= 0 ? easeInOut(sp(c, i, 0, 0.8)) : 1
    const targetAngle = curAgentIdx >= 0 ? angles[curAgentIdx] : prevAgentIdx >= 0 ? angles[prevAgentIdx] : -90
    let fromAngle = prevAgentIdx >= 0 ? angles[prevAgentIdx] : -90
    if (mode === 'roundrobin' && targetAngle <= fromAngle && curAgentIdx >= 0 && prevAgentIdx >= 0) fromAngle -= 360
    const ang = (((curAgentIdx >= 0 ? lerp(fromAngle, targetAngle, pick) : targetAngle) as number) * Math.PI) / 180
    const stopped = i >= stopStep

    if (mode === 'roundrobin') {
      const r = S * 0.95
      glow(ctx, center.x, center.y, r * 2, C.cyan, stopped ? 0.08 : 0.22)
      ctx.beginPath()
      ctx.arc(center.x, center.y, r, 0, TAU)
      ctx.fillStyle = C.panel
      ctx.fill()
      ctx.strokeStyle = rgba(C.cyan, 0.7)
      ctx.lineWidth = 1.6
      ctx.stroke()
      ctx.strokeStyle = rgba(C.cyan, 0.5)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(center.x, center.y, r * 0.62, -2.6, 1.2)
      ctx.stroke()
      ctx.fillStyle = rgba(C.cyan, 0.5)
      ctx.beginPath()
      const ax = center.x + Math.cos(1.2) * r * 0.62
      const ay = center.y + Math.sin(1.2) * r * 0.62
      ctx.moveTo(ax + 5 * k, ay - 2 * k)
      ctx.lineTo(ax - 5 * k, ay - 3 * k)
      ctx.lineTo(ax, ay + 5 * k)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = C.cyan
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(center.x, center.y)
      ctx.lineTo(center.x + Math.cos(ang) * r * 1.6, center.y + Math.sin(ang) * r * 1.6)
      ctx.stroke()
      ctx.lineCap = 'butt'
      ctx.fillStyle = C.cyan
      ctx.beginPath()
      ctx.arc(center.x, center.y, 4 * k, 0, TAU)
      ctx.fill()
    } else {
      if (cur && curAgentIdx >= 0) {
        const tp = pos.get(cur.speaker)!
        ctx.strokeStyle = rgba(C.amber, 0.8)
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.lineDashOffset = -t * 20
        ctx.beginPath()
        ctx.moveTo(center.x, center.y)
        ctx.lineTo(lerp(center.x, tp.x, pick * 0.78), lerp(center.y, tp.y, pick * 0.78))
        ctx.stroke()
        ctx.setLineDash([])
      }
      robot(ctx, center.x, center.y, S * 0.85, { color: C.amber, active: !!cur && curAgentIdx >= 0 && pick < 1, t })
    }
    nodeLabel(ctx, center.x, center.y + S * 1.15, team.manager, team.managerSub, k * 0.9, mode === 'roundrobin' ? C.cyan : C.amber, false)

    team.agents.forEach((a) => {
      const p = pos.get(a.id)!
      const speaking = !!cur && cur.speaker === a.id && pick >= 1
      robot(ctx, p.x, p.y, S, { color: a.color, active: speaking, t, accessory: a.accessory })
      nodeLabel(ctx, p.x, p.y + S * 1.15, a.id, a.role, k * 0.9, a.color, speaking)
      if (cur?.tool && cur.speaker === a.id && pick >= 1) {
        const gp = { x: p.x + S * 1.7, y: p.y - S * 0.4 }
        gears(ctx, gp.x, gp.y, S * 0.5, { color: C.amber, active: c.local < 2.0, t })
        chip(ctx, cur.tool.call, gp.x, gp.y - S * 0.85, { color: C.amber, size: 9.5 * k, mono: true, align: 'center', h: 20 * k, fillAlpha: 0.18, alpha: easeOut(sp(c, i, 0.8, 0.4)) })
        if (c.local > 1.6) chip(ctx, `→ ${cur.tool.result}`, gp.x, gp.y + S * 0.75, { color: C.green, size: 9.5 * k, mono: true, align: 'center', h: 20 * k, fillAlpha: 0.18 })
      }
    })

    person(ctx, userP.x, userP.y, S * 0.6, { color: C.cyan, active: i === 0, t })
    text(ctx, 'user', userP.x + S * 0.75, userP.y, { size: 10 * k, color: C.muted, font: MONO })

    const T = { x: w * 0.6, y: h * 0.05, w: w * 0.38, h: h * 0.78 }
    rrect(ctx, T.x, T.y, T.w, T.h, 12 * k)
    ctx.fillStyle = '#05070f'
    ctx.fill()
    ctx.strokeStyle = 'rgba(148,163,255,0.18)'
    ctx.lineWidth = 1
    ctx.stroke()
    text(ctx, 'GROUP CHAT  ·  shared by every agent', T.x + 12 * k, T.y + 14 * k, { size: 9.5 * k, color: C.muted, font: MONO })

    const colorOf = (id: string) => (id === 'user' ? C.cyan : (team.agents.find((a) => a.id === id)?.color ?? C.soft))
    const fs = 11 * k
    const lh = fs * 1.4
    ctx.font = `500 ${fs}px ${FONT}`
    const shown = turns.slice(0, Math.min(i + 1, stopStep)).map((tn, j) => {
      const typing = j === i ? (tn.speaker === 'user' ? sp(c, i, 0.2, 0.8) : sp(c, i, tn.tool ? 1.9 : 0.9, 0.9)) : 1
      const body = tn.text.slice(0, Math.floor(tn.text.length * typing))
      return { tn, lines: wrapLines(ctx, body, T.w - 30 * k), typing }
    })
    const blockH = (b: (typeof shown)[number]) => 16 * k + Math.max(1, b.lines.length) * lh + 10 * k
    let total = shown.reduce((a, b) => a + blockH(b), 0)
    let startIdx = 0
    while (total > T.h - 40 * k && startIdx < shown.length - 1) {
      total -= blockH(shown[startIdx])
      startIdx += 1
    }
    let y = T.y + 30 * k
    shown.slice(startIdx).forEach((b) => {
      if (b.typing <= 0) return
      const col = colorOf(b.tn.speaker)
      ctx.fillStyle = col
      ctx.fillRect(T.x + 12 * k, y + 2 * k, 2.5, blockH(b) - 12 * k)
      text(ctx, b.tn.speaker, T.x + 20 * k, y + 7 * k, { size: 9.5 * k, color: col, font: MONO, weight: 600 })
      b.lines.forEach((ln, j) => {
        const stopHit = ln.includes(team.stopWord) && b.typing >= 1
        text(ctx, ln, T.x + 20 * k, y + 16 * k + lh * (j + 0.5), { size: fs, color: stopHit ? C.green : C.soft })
      })
      y += blockH(b)
    })

    if (cur && curAgentIdx >= 0) {
      const fly = sp(c, i, cur.tool ? 1.6 : 0.8, 0.5)
      if (fly > 0 && fly < 1) {
        const from = pos.get(cur.speaker)!
        const to = { x: T.x, y: Math.min(y, T.y + T.h - 20 * k) }
        const u = easeInOut(fly)
        const px = lerp(from.x, to.x, u)
        const py = lerp(from.y, to.y, u) - Math.sin(u * Math.PI) * 30 * k
        glow(ctx, px, py, 18 * k, colorOf(cur.speaker), 0.8)
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(px, py, 3 * k, 0, TAU)
        ctx.fill()
      }
    }

    const msgCount = Math.min(i + 1, stopStep)
    const term = `terminate when "${team.stopWord}" appears  OR  ${team.maxMessages} messages`
    const by = h * 0.92
    if (stopped) {
      const a = easeOut(sp(c, stopStep, 0, 0.6))
      glow(ctx, w * 0.3, by, w * 0.25, C.green, 0.15 * a)
      chip(ctx, `■ stopped: text "${team.stopWord}" mentioned · ${msgCount} messages`, w * 0.3, by, { color: C.green, size: 11 * k, align: 'center', h: 28 * k, fillAlpha: 0.2, weight: 700, alpha: 0.4 + 0.6 * a })
    } else {
      chip(ctx, term, w * 0.3, by, { color: C.muted, size: 10 * k, mono: true, align: 'center', h: 26 * k, fillAlpha: 0.08, strokeAlpha: 0.35 })
    }
    text(ctx, `messages ${msgCount} / ${team.maxMessages}`, T.x + T.w, h * 0.92, { size: 10.5 * k, color: stopped ? C.green : C.muted, font: MONO, align: 'right', weight: 600 })
  })

  return <canvas ref={ref} className="stage-canvas" aria-label="AutoGen agents taking turns in a group chat" />
}
