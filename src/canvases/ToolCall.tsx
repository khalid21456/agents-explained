import { useCanvas } from '../hooks/useCanvas'
import type { CanvasProps } from '../lessons/types'
import { QUESTIONS, TOOLS, TOOL_SCALE, TOOL_STARTS } from '../data/tools'
import { timeline } from '../lib/clock'
import type { Pt } from '../lib/draw'
import { C, DISPLAY, MONO, TAU, chip, easeInOut, easeOut, glow, prog, quad, rgba, rrect, scaleFor, text } from '../lib/draw'

export default function ToolCall({ clock, opts }: CanvasProps) {
  const ref = useCanvas(({ ctx, w, h, t }) => {
    const tt = timeline(clock.current, TOOL_STARTS, TOOL_SCALE)
    const q = QUESTIONS[Number(opts.q ?? 0)]
    const k = scaleFor(w, 760, 0.58)
    const pad = 22 * k

    const llm: Pt = { x: Math.max(w * 0.22, 90 * k), y: h * 0.5 }
    const llmR = 48 * k
    const cardW = 150 * k
    const cardH = 46 * k
    const toolX = w - pad - cardW
    const toolPos = TOOLS.map((_, i) => ({ x: toolX, y: h * (0.2 + i * 0.2) }))

    const thinking = tt > 0.7 && tt < 1.9
    const scan = thinking ? Math.floor(prog(tt, 0.7, 1.2) * (TOOLS.length + q.tool + 1)) % TOOLS.length : -1
    const chosen = tt >= 1.9

    const curve = (i: number) => {
      const p0 = { x: llm.x + llmR, y: llm.y }
      const p1 = { x: toolPos[i].x, y: toolPos[i].y }
      return { p0, c: { x: (p0.x + p1.x) / 2, y: p1.y }, p1 }
    }

    for (let i = 0; i < TOOLS.length; i++) {
      const { p0, c, p1 } = curve(i)
      const on = (chosen && i === q.tool && tt < 5.2) || i === scan
      ctx.strokeStyle = on ? rgba(TOOLS[i].color, 0.75) : 'rgba(148,163,255,0.14)'
      ctx.lineWidth = on ? 2 : 1.2
      ctx.setLineDash(on ? [] : [4, 6])
      ctx.beginPath()
      ctx.moveTo(p0.x, p0.y)
      ctx.quadraticCurveTo(c.x, c.y, p1.x, p1.y)
      ctx.stroke()
      ctx.setLineDash([])
    }

    const think = thinking ? 1 : tt > 5.1 && tt < 5.8 ? 0.6 : 0
    glow(ctx, llm.x, llm.y, llmR * 2.2, C.violet, 0.25 + think * 0.25)
    rrect(ctx, llm.x - llmR, llm.y - llmR, llmR * 2, llmR * 2, 22 * k)
    ctx.fillStyle = C.panel
    ctx.fill()
    ctx.strokeStyle = rgba(C.violet, 0.7)
    ctx.lineWidth = 1.5
    ctx.stroke()
    for (let i = 0; i < 2; i++) {
      ctx.strokeStyle = rgba(i ? C.cyan : C.violet, 0.8)
      ctx.lineWidth = 2
      const s = t * (1.2 + think * 3) * (i ? -1 : 1)
      ctx.beginPath()
      ctx.arc(llm.x, llm.y, llmR * (0.55 + i * 0.17), s, s + 2)
      ctx.stroke()
    }
    text(ctx, 'LLM', llm.x, llm.y, { size: 18 * k, weight: 700, font: DISPLAY, align: 'center' })

    TOOLS.forEach((tool, i) => {
      const p = toolPos[i]
      const active = chosen && i === q.tool && tt < 5.2
      const running = i === q.tool && tt > 3.1 && tt < 4.0
      if (active) glow(ctx, p.x + cardW / 2, p.y, cardW * 0.8, tool.color, 0.25)
      rrect(ctx, p.x, p.y - cardH / 2, cardW, cardH, 12 * k)
      ctx.fillStyle = C.panel
      ctx.fill()
      ctx.fillStyle = rgba(tool.color, active ? 0.16 : 0.05)
      ctx.fill()
      ctx.strokeStyle = rgba(tool.color, active || i === scan ? 0.95 : 0.3)
      ctx.lineWidth = 1.3
      ctx.stroke()
      text(ctx, tool.name, p.x + 14 * k, p.y - 7 * k, { size: 13 * k, font: MONO, weight: 600 })
      text(ctx, tool.desc, p.x + 14 * k, p.y + 10 * k, { size: 11 * k, color: C.muted })
      if (running) {
        const s = t * 8
        ctx.strokeStyle = tool.color
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(p.x + cardW - 20 * k, p.y, 9 * k, s, s + 4)
        ctx.stroke()
      } else if (i === q.tool && tt >= 4.0) {
        ctx.fillStyle = C.green
        ctx.beginPath()
        ctx.arc(p.x + cardW - 20 * k, p.y, 5 * k, 0, TAU)
        ctx.fill()
      }
    })

    const qa = easeOut(prog(tt, 0, 0.7))
    text(ctx, 'user', pad, h * 0.1 - 26 * k, { size: 10 * k, color: C.dim, font: MONO, alpha: qa })
    chip(ctx, `“${q.ask}”`, pad + (1 - qa) * -60, h * 0.1, { color: C.cyan, size: 13 * k, h: 32 * k, alpha: qa })

    const { p0, c, p1 } = curve(q.tool)
    const tool = TOOLS[q.tool]
    if (tt > 1.9 && tt < 3.1) {
      const u = easeInOut(prog(tt, 1.9, 1.2))
      const p = quad(p0, c, p1, u)
      glow(ctx, p.x, p.y, 30 * k, C.amber, 0.5)
      const label = `${tool.name}({"${tool.param}": "${q.arg.length > 14 ? q.arg.slice(0, 13) + '…' : q.arg}"})`
      chip(ctx, label, p.x, p.y - 22 * k, { color: C.amber, size: 11 * k, mono: true, align: 'center', h: 26 * k, alpha: 1 - prog(u, 0.72, 0.25) })
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3.5 * k, 0, TAU)
      ctx.fill()
    }
    if (tt > 4.0 && tt < 5.1) {
      const u = easeInOut(prog(tt, 4.0, 1.1))
      const p = quad(p1, c, p0, u)
      glow(ctx, p.x, p.y, 30 * k, C.green, 0.5)
      chip(ctx, q.result, p.x, p.y + 22 * k, { color: C.green, size: 12 * k, mono: true, align: 'center', h: 26 * k, alpha: prog(u, 0.05, 0.2) })
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 3.5 * k, 0, TAU)
      ctx.fill()
    }

    if (tt > 5.1) {
      const a = easeOut(prog(tt, 5.1, 0.6))
      text(ctx, 'assistant', pad, h * 0.9 - 26 * k, { size: 10 * k, color: C.dim, font: MONO, alpha: a })
      chip(ctx, q.answer, pad, h * 0.9, { color: C.pink, size: 13 * k, h: 32 * k, alpha: a, fillAlpha: 0.18 })
    }
  })

  return <canvas ref={ref} className="stage-canvas" aria-label="A tool call from the LLM to a tool and back" />
}
