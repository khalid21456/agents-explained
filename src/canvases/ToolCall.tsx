import { useRef, useState } from 'react'
import { useCanvas } from '../hooks/useCanvas'
import type { Pt } from '../lib/draw'
import { C, DISPLAY, MONO, TAU, chip, easeInOut, easeOut, glow, prog, quad, rgba, rrect, scaleFor, text } from '../lib/draw'
import CodeBlock from '../components/CodeBlock'

interface Tool {
  name: string
  desc: string
  color: string
}

const TOOLS: Tool[] = [
  { name: 'calculator', desc: 'exact math', color: C.amber },
  { name: 'web_search', desc: 'fresh info', color: C.blue },
  { name: 'sql_query', desc: 'your database', color: C.green },
  { name: 'get_weather', desc: 'live API', color: C.pink },
]

interface Q {
  ask: string
  tool: number
  args: string
  argsJson: string
  result: string
  answer: string
}

const QUESTIONS: Q[] = [
  { ask: "What's 23 × 47?", tool: 0, args: '{"expression":"23*47"}', argsJson: '{"expression": "23 * 47"}', result: '1081', answer: '23 × 47 = 1,081' },
  { ask: 'Latest LangGraph release?', tool: 1, args: '{"query":"LangGraph release"}', argsJson: '{"query": "LangGraph latest release"}', result: '3 results', answer: 'Here is what changed in the latest release…' },
  { ask: 'Orders last week?', tool: 2, args: '{"sql":"SELECT COUNT(*)…"}', argsJson: '{"sql": "SELECT COUNT(*) FROM orders WHERE …"}', result: '1284', answer: 'You had 1,284 orders last week.' },
  { ask: 'Weather in Tokyo?', tool: 3, args: '{"city":"Tokyo"}', argsJson: '{"city": "Tokyo"}', result: '22°C, clear', answer: "It's 22°C and clear in Tokyo." },
]

const TOTAL = 7.4

export default function ToolCall() {
  const [qi, setQi] = useState(0)
  const time = useRef(0)

  const ref = useCanvas(({ ctx, w, h, dt, t }) => {
    time.current += dt
    if (time.current > TOTAL) {
      time.current = 0
      setQi((v) => (v + 1) % QUESTIONS.length)
      return
    }
    const tt = time.current
    const q = QUESTIONS[qi]
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
      const c = { x: (p0.x + p1.x) / 2, y: p1.y }
      return { p0, c, p1 }
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
      text(ctx, tool.name, p.x + 14 * k, p.y - 7 * k, { size: 13 * k, font: MONO, weight: 600, color: C.text })
      text(ctx, tool.desc, p.x + 14 * k, p.y + 10 * k, { size: 11 * k, color: C.muted })
      if (running) {
        const s = t * 8
        ctx.strokeStyle = tool.color
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(p.x + cardW - 20 * k, p.y, 9 * k, s, s + 4)
        ctx.stroke()
      } else if (active && tt >= 4.0) {
        ctx.fillStyle = C.green
        ctx.beginPath()
        ctx.arc(p.x + cardW - 20 * k, p.y, 5 * k, 0, TAU)
        ctx.fill()
      }
    })

    const qa = easeOut(prog(tt, 0, 0.7))
    if (tt < 6.9) {
      chip(ctx, `“${q.ask}”`, pad + (1 - qa) * -60, h * 0.1, {
        color: C.cyan,
        size: 13 * k,
        h: 32 * k,
        alpha: qa * (1 - prog(tt, 6.5, 0.4)),
      })
      text(ctx, 'user', pad, h * 0.1 - 26 * k, { size: 10 * k, color: C.dim, font: MONO, alpha: qa })
    }

    const { p0, c, p1 } = curve(q.tool)
    if (tt > 1.9 && tt < 3.1) {
      const u = easeInOut(prog(tt, 1.9, 1.2))
      const p = quad(p0, c, p1, u)
      glow(ctx, p.x, p.y, 30 * k, C.amber, 0.5)
      chip(ctx, `${TOOLS[q.tool].name}(${q.args})`, p.x, p.y - 22 * k, { color: C.amber, size: 11 * k, mono: true, align: 'center', h: 26 * k, alpha: 1 - prog(u, 0.72, 0.25) })
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

    const phase =
      tt < 0.7 ? 'question arrives' : tt < 1.9 ? 'model chooses a tool' : tt < 3.1 ? 'emits a tool call (JSON)' : tt < 4.0 ? 'YOUR code runs the tool' : tt < 5.1 ? 'result goes back as a message' : 'model writes the answer'
    text(ctx, phase.toUpperCase(), llm.x, llm.y + llmR + 26 * k, { size: 10.5 * k, color: C.muted, align: 'center', font: MONO })

    if (tt > 5.1) {
      const a = easeOut(prog(tt, 5.1, 0.6)) * (1 - prog(tt, 6.9, 0.4))
      chip(ctx, q.answer, pad, h * 0.9, { color: C.pink, size: 13 * k, h: 32 * k, alpha: a, fillAlpha: 0.18 })
      text(ctx, 'assistant', pad, h * 0.9 - 26 * k, { size: 10 * k, color: C.dim, font: MONO, alpha: a })
    }
  })

  const q = QUESTIONS[qi]
  const snippet = `AIMessage(
    content="",
    tool_calls=[{
        "name": "${TOOLS[q.tool].name}",
        "args": ${q.argsJson},
        "id": "call_7f3a",
    }],
)

ToolMessage(
    content="${q.result}",
    tool_call_id="call_7f3a",
)`

  return (
    <div className="stage stage-split">
      <div className="stage-canvas-wrap">
        <canvas ref={ref} className="stage-canvas" aria-label="Animated tool call from LLM to a tool and back" />
      </div>
      <aside className="side-panel">
        <div className="panel-title">Ask the agent</div>
        <div className="q-list">
          {QUESTIONS.map((x, i) => (
            <button
              key={x.ask}
              type="button"
              className={`q-btn ${i === qi ? 'on' : ''}`}
              onClick={() => {
                time.current = 0
                setQi(i)
              }}
            >
              {x.ask}
            </button>
          ))}
        </div>
        <div className="panel-title small">What actually goes over the wire</div>
        <CodeBlock code={snippet} file="messages" />
      </aside>
    </div>
  )
}
