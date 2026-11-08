import { useCanvas } from '../hooks/useCanvas'
import type { CanvasProps } from '../lessons/types'
import type { CrewAgentId, CrewProcess, TaskStatus } from '../data/crewai'
import { CREW_AGENTS, CREW_FLOWS, CREW_TASKS, REVISED_OUTPUT, REVISION_NOTE } from '../data/crewai'
import type { Pt } from '../lib/draw'
import { C, FONT, MONO, TAU, chip, easeInOut, glow, lerp, prog, rgba, rrect, scaleFor, text } from '../lib/draw'
import { gears, nodeLabel, robot } from '../lib/icons'

const STATUS_COLOR: Record<TaskStatus, string> = { queued: C.dim, running: C.amber, done: C.green, revising: C.pink }

function fly(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, f: number, color: string, k: number, label?: string) {
  if (f <= 0 || f >= 1) return
  const u = easeInOut(f)
  const p = { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) - Math.sin(u * Math.PI) * 24 * k }
  glow(ctx, p.x, p.y, 20 * k, color, 0.8)
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(p.x, p.y, 3.2 * k, 0, TAU)
  ctx.fill()
  if (label) chip(ctx, label, p.x, p.y - 18 * k, { color, size: 9.5 * k, align: 'center', h: 20 * k, fillAlpha: 0.2 })
}

export default function CrewCanvas({ clock, opts }: CanvasProps) {
  const ref = useCanvas(({ ctx, w, h, t }) => {
    const c = clock.current
    const proc = (opts.process === 'hierarchical' ? 'hierarchical' : 'sequential') as CrewProcess
    const flow = CREW_FLOWS[proc]
    const i = Math.min(c.step, flow.length - 1)
    const st = flow[i]
    const prev = i > 0 ? flow[i - 1] : null
    const L = c.local
    const k = scaleFor(w, 800, 0.55)
    const S = Math.min(30 * k, h * 0.058)
    const hier = proc === 'hierarchical'

    const agentY = hier ? h * 0.6 : h * 0.4
    const agentPos: Record<CrewAgentId, Pt> = {
      researcher: { x: w * 0.1, y: agentY },
      writer: { x: w * 0.3, y: agentY + (hier ? h * 0.05 : 0) },
      editor: { x: w * 0.5, y: agentY },
    }
    const manager: Pt = { x: w * 0.3, y: h * 0.17 }

    const cardX = w * 0.6
    const cardW = w * 0.38
    const cardH = h * 0.22
    const cardY = (j: number) => h * 0.05 + j * (cardH + h * 0.03)
    const cardIn = (j: number): Pt => ({ x: cardX, y: cardY(j) + cardH / 2 })

    const active = st.task
    const working = (st.kind === 'task' || st.kind === 'review') && active !== undefined
    const phase = working ? (L < 0.9 ? 'assign' : L < 2.3 ? 'work' : 'return') : 'idle'

    if (hier) {
      CREW_AGENTS.forEach((a) => {
        const p = agentPos[a.id]
        ctx.strokeStyle = 'rgba(148,163,255,0.2)'
        ctx.lineWidth = 1.3
        ctx.beginPath()
        ctx.moveTo(manager.x, manager.y + S * 0.9)
        ctx.lineTo(p.x, p.y - S * 1.15)
        ctx.stroke()
      })
    } else {
      for (let j = 0; j < 2; j++) {
        const a = agentPos[CREW_AGENTS[j].id]
        const b = agentPos[CREW_AGENTS[j + 1].id]
        const passed = st.done[j]
        ctx.strokeStyle = passed ? rgba(C.cyan, 0.6) : 'rgba(148,163,255,0.2)'
        ctx.lineWidth = 1.6
        ctx.setLineDash([5, 5])
        ctx.lineDashOffset = -t * 16
        ctx.beginPath()
        ctx.moveTo(a.x + S * 1.1, a.y)
        ctx.lineTo(b.x - S * 1.1, b.y)
        ctx.stroke()
        ctx.setLineDash([])
        chip(ctx, 'context', (a.x + b.x) / 2, a.y - 14 * k, { color: passed ? C.cyan : C.dim, size: 9 * k, mono: true, align: 'center', h: 18 * k, fillAlpha: 0.1, strokeAlpha: 0.3 })
      }
    }

    if (hier) {
      const mActive = st.kind === 'kickoff' || st.kind === 'final' || phase === 'assign' || (st.kind === 'review' && L > 0.3)
      robot(ctx, manager.x, manager.y, S, { color: C.amber, active: mActive, t, accessory: 'crown' })
      nodeLabel(ctx, manager.x, manager.y + S * 1.12, 'Manager', 'manager_llm · gpt-5', k * 0.9, C.amber, mActive)
    }

    CREW_AGENTS.forEach((a) => {
      const p = agentPos[a.id]
      const busy = working && CREW_TASKS[active!].agent === a.id && phase === 'work'
      const revisionTarget = st.kind === 'review' && a.id === 'writer' && L > 1.6
      robot(ctx, p.x, p.y, S, { color: a.color, active: busy || revisionTarget, t, accessory: a.accessory })
      nodeLabel(ctx, p.x, p.y + S * 1.12, a.role, a.id, k * 0.88, a.color, busy)
      if (busy && a.id === 'researcher' && st.kind === 'task') {
        gears(ctx, p.x + S * 1.4, p.y - S * 0.9, S * 0.45, { color: C.amber, active: true, t })
        chip(ctx, 'SerperDevTool', p.x + S * 1.4, p.y - S * 1.6, { color: C.amber, size: 9 * k, mono: true, align: 'center', h: 18 * k, fillAlpha: 0.16 })
      }
    })

    CREW_TASKS.forEach((task, j) => {
      const y = cardY(j)
      const isActive = working && active === j
      let status: TaskStatus
      if (isActive && st.kind === 'review') status = L > 1.6 && L < 2.9 ? 'revising' : 'done'
      else if (isActive) status = L > 2.8 ? 'done' : 'running'
      else if (st.kind === 'kickoff' || st.kind === 'final') status = st.statuses[j]
      else status = prev ? prev.statuses[j] : 'queued'
      const sc = STATUS_COLOR[status]
      const agent = CREW_AGENTS.find((a) => a.id === task.agent)!
      if (isActive) glow(ctx, cardX + cardW / 2, y + cardH / 2, cardW * 0.55, sc, 0.12)
      rrect(ctx, cardX, y, cardW, cardH, 10 * k)
      ctx.fillStyle = '#05070f'
      ctx.fill()
      ctx.strokeStyle = rgba(sc, isActive ? 0.8 : 0.35)
      ctx.lineWidth = isActive ? 1.6 : 1
      ctx.stroke()
      ctx.fillStyle = agent.color
      ctx.fillRect(cardX, y + 10 * k, 3, cardH - 20 * k)
      const px = cardX + 12 * k
      text(ctx, `TASK ${j + 1} · ${task.name}`, px, y + 14 * k, { size: 10 * k, color: C.text, font: MONO, weight: 700 })
      chip(ctx, status, cardX + cardW - 10 * k, y + 14 * k, { color: sc, size: 9 * k, mono: true, align: 'right', h: 18 * k, fillAlpha: 0.16 })
      text(ctx, hier ? `delegated by manager → ${agent.role}` : `agent: ${agent.role}`, px, y + 32 * k, { size: 9.5 * k, color: agent.color, font: FONT })
      ctx.font = `400 ${10 * k}px ${FONT}`
      let desc = task.description
      while (ctx.measureText(desc).width > cardW - 24 * k && desc.length > 4) desc = desc.slice(0, -2)
      if (desc !== task.description) desc += '…'
      text(ctx, desc, px, y + 48 * k, { size: 10 * k, color: C.soft })
      text(ctx, `expected: ${task.expected}`, px, y + 63 * k, { size: 9 * k, color: C.dim })
      const showOut = status === 'done' || status === 'revising'
      if (showOut) {
        const revised = hier && j === 1 && (i > 3 || (st.kind === 'review' && L >= 2.9))
        const out = revised ? REVISED_OUTPUT : task.output
        chip(ctx, out.length > 46 ? out.slice(0, 45) + '…' : out, px, y + cardH - 16 * k, { color: status === 'revising' ? C.pink : C.green, size: 9.5 * k, h: 20 * k, fillAlpha: 0.16 })
      }
    })

    if (working) {
      const task = CREW_TASKS[active!]
      const ap = agentPos[task.agent]
      if (st.kind === 'review') {
        fly(ctx, cardIn(1), { x: manager.x + S, y: manager.y }, prog(L, 0, 0.8), C.violet, k, 'draft')
        if (L > 1.6) fly(ctx, { x: manager.x, y: manager.y + S }, { x: ap.x, y: ap.y - S }, prog(L, 1.6, 0.9), C.pink, k, 'revise')
        if (L > 0.9 && L < 3.2) chip(ctx, REVISION_NOTE, manager.x + S * 1.3, manager.y - S * 0.2, { color: C.pink, size: 9.5 * k, h: 22 * k, fillAlpha: 0.18, alpha: prog(L, 0.9, 0.3) })
      } else {
        if (hier) {
          fly(ctx, cardIn(active!), { x: manager.x + S, y: manager.y }, prog(L, 0, 0.45), C.amber, k)
          fly(ctx, { x: manager.x, y: manager.y + S }, { x: ap.x, y: ap.y - S }, prog(L, 0.45, 0.45), C.amber, k, 'delegate')
        } else {
          fly(ctx, cardIn(active!), { x: ap.x + S, y: ap.y - S * 0.4 }, prog(L, 0, 0.9), C.amber, k, task.name)
        }
        const back = hier ? { x: manager.x + S, y: manager.y } : cardIn(active!)
        fly(ctx, { x: ap.x + S, y: ap.y }, back, prog(L, 2.3, hier ? 0.5 : 0.8), C.green, k, 'output')
        if (hier) fly(ctx, { x: manager.x + S, y: manager.y }, cardIn(active!), prog(L, 2.8, 0.4), C.green, k)
      }
    }

    const by = h * 0.92
    if (st.kind === 'final') {
      chip(ctx, 'CrewOutput · raw: "The Battery That Could Double Your Range…" · 3 tasks', w * 0.03, by, { color: C.pink, size: 10.5 * k, h: 28 * k, fillAlpha: 0.2, weight: 600 })
    } else {
      chip(ctx, 'crew.kickoff(inputs={"topic": "solid-state batteries"})', w * 0.03, by, { color: C.cyan, size: 10 * k, mono: true, h: 26 * k, fillAlpha: st.kind === 'kickoff' ? 0.22 : 0.08, strokeAlpha: st.kind === 'kickoff' ? 0.9 : 0.35 })
    }
    text(ctx, hier ? 'PROCESS · hierarchical' : 'PROCESS · sequential', w * 0.03, h * 0.05, { size: 10 * k, color: C.muted, font: MONO, weight: 600 })
  })

  return <canvas ref={ref} className="stage-canvas" aria-label="A CrewAI crew working through its tasks" />
}
