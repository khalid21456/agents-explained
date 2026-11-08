import { useCanvas } from '../hooks/useCanvas'
import type { CanvasProps } from '../lessons/types'
import { APPS, MCP_ANSWER, MCP_QUESTION, SERVERS } from '../data/mcp'
import { sp } from '../lib/clock'
import type { Pt } from '../lib/draw'
import { C, MONO, TAU, chip, chipWidth, easeInOut, easeOut, glow, lerp, rgba, scaleFor, text } from '../lib/draw'
import { bubble, mcpHub, mcpServer, nodeLabel, robot } from '../lib/icons'

function dot(ctx: CanvasRenderingContext2D, p: Pt, color: string, k: number) {
  ctx.globalCompositeOperation = 'lighter'
  glow(ctx, p.x, p.y, 20 * k, color, 0.8)
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(p.x, p.y, 3.2 * k, 0, TAU)
  ctx.fill()
}

export default function McpCanvas({ clock }: CanvasProps) {
  const ref = useCanvas(({ ctx, w, h, t }) => {
    const c = clock.current
    const i = c.step
    const k = scaleFor(w, 780, 0.58)
    const S = Math.min(40 * k, h * 0.075)

    if (i <= 1) {
      const appX = w * 0.15
      const toolX = w * 0.85
      const hub: Pt = { x: w * 0.5, y: h * 0.5 }
      const chaos = i === 0 ? 1 : 1 - easeOut(sp(c, 1, 0, 0.8))
      const order = i === 1 ? easeOut(sp(c, 1, 0.5, 1.0)) : 0

      APPS.forEach((a, ai) => {
        SERVERS.forEach((s, si) => {
          const f = i === 0 ? easeOut(sp(c, 0, (ai * 3 + si) * 0.15, 0.4)) : 1
          if (f <= 0 || chaos <= 0) return
          const p0 = { x: appX + S * 0.9, y: h * a.y }
          const p1 = { x: toolX - S * 0.8, y: h * s.y }
          const cx = (p0.x + p1.x) / 2 + Math.sin(ai * 2 + si) * 40 * k
          const cy = (p0.y + p1.y) / 2 + Math.cos(ai + si * 3) * 50 * k
          ctx.strokeStyle = rgba(C.red, 0.45 * chaos)
          ctx.lineWidth = 1.4
          ctx.beginPath()
          ctx.moveTo(p0.x, p0.y)
          ctx.quadraticCurveTo(cx, cy, lerp(p0.x, p1.x, f), lerp(p0.y, p1.y, f))
          ctx.stroke()
          if (f >= 1) {
            const m = { x: 0.25 * p0.x + 0.5 * cx + 0.25 * p1.x, y: 0.25 * p0.y + 0.5 * cy + 0.25 * p1.y }
            ctx.fillStyle = rgba(C.red, 0.8 * chaos)
            ctx.fillRect(m.x - 4 * k, m.y - 4 * k, 8 * k, 8 * k)
          }
        })
      })

      if (order > 0) {
        mcpHub(ctx, hub.x, hub.y, S * 1.1, { color: C.violet, active: true, t })
        text(ctx, 'MCP', hub.x, hub.y + S * 1.15, { size: 14 * k, weight: 700, align: 'center', alpha: order })
        ;[...APPS.map((a) => ({ x: appX + S * 0.9, y: h * a.y })), ...SERVERS.map((s) => ({ x: toolX - S * 0.8, y: h * s.y }))].forEach((p, j) => {
          const f = easeOut(Math.min(1, Math.max(0, order * 1.6 - j * 0.1)))
          ctx.strokeStyle = rgba(C.violet, 0.7)
          ctx.lineWidth = 1.8
          ctx.beginPath()
          ctx.moveTo(hub.x, hub.y)
          ctx.lineTo(lerp(hub.x, p.x, f), lerp(hub.y, p.y, f))
          ctx.stroke()
        })
      }

      APPS.forEach((a) => {
        const p = { x: appX, y: h * a.y }
        if (a.kind === 'robot') robot(ctx, p.x, p.y, S * 0.75, { color: a.color, active: false, t })
        else bubble(ctx, p.x, p.y, S * 0.8, { color: a.color, active: false, t })
        text(ctx, a.label, p.x, p.y + S * 1.0, { size: 11.5 * k, weight: 600, align: 'center', color: C.soft })
      })
      SERVERS.forEach((s) => {
        const p = { x: toolX, y: h * s.y }
        mcpServer(ctx, p.x, p.y, S, { color: s.color, active: false, t, glyph: s.glyph })
        text(ctx, i === 0 ? `${s.id} API` : `${s.id} MCP server`, p.x, p.y + S * 0.95, { size: 11.5 * k, weight: 600, align: 'center', color: C.soft })
      })

      const label = i === 0 ? '3 apps × 3 tools = 9 custom integrations' : '3 + 3 = 6: each side speaks MCP once'
      chip(ctx, label, w / 2, h * 0.94, { color: i === 0 ? C.red : C.green, size: 12 * k, align: 'center', h: 28 * k, fillAlpha: 0.16, weight: 600 })
      return
    }

    const agent: Pt = { x: w * 0.2, y: h * 0.42 }
    const sx = w * 0.8
    const srv = SERVERS.map((s) => ({ ...s, p: { x: sx, y: h * s.y } }))
    const linkStart = { x: agent.x + S * 1.05, y: agent.y }

    srv.forEach((s, j) => {
      const f = easeOut(sp(c, 2, j * 0.2, 0.7))
      const end = { x: s.p.x - S * 0.85, y: s.p.y }
      ctx.strokeStyle = f >= 1 ? rgba(s.color, 0.45) : rgba(C.muted, 0.3)
      ctx.lineWidth = 1.6
      ctx.setLineDash(s.short === 'stdio' ? [] : [6, 5])
      ctx.lineDashOffset = -t * 15
      ctx.beginPath()
      ctx.moveTo(linkStart.x, linkStart.y)
      ctx.lineTo(lerp(linkStart.x, end.x, f), lerp(linkStart.y, end.y, f))
      ctx.stroke()
      ctx.setLineDash([])
      if (f >= 1) {
        const m = { x: lerp(linkStart.x, end.x, 0.55), y: lerp(linkStart.y, end.y, 0.55) }
        chip(ctx, s.short, m.x, m.y, { color: s.color, size: 9.5 * k, mono: true, align: 'center', h: 20 * k, fillAlpha: 0.14, strokeAlpha: 0.5 })
      }
    })

    const busyServer = i === 6 ? 'weather' : i === 7 ? 'filesystem' : ''
    srv.forEach((s) => {
      const working = s.id === busyServer && c.local > 1.0 && c.local < 1.6
      mcpServer(ctx, s.p.x, s.p.y, S, { color: s.color, active: working || (i === 2 && c.local > 1.0 && c.local < 1.6) || (i === 3 && c.local > 1.0 && c.local < 1.6), t, glyph: s.glyph })
      nodeLabel(ctx, s.p.x, s.p.y + S * 0.9, s.id, s.transport, k, s.color, working)
    })

    const thinking = i === 5 || (i >= 6 && c.local > 2.4)
    robot(ctx, agent.x, agent.y, S, { color: C.violet, active: thinking, t })
    nodeLabel(ctx, agent.x, agent.y + S * 1.15, 'agent · MCP host', 'gpt-5 · MultiServerMCPClient', k, C.violet, thinking)

    const allTools = srv.flatMap((s) => s.tools.map((tool) => ({ tool, color: s.color, server: s })))
    const boxX = w * 0.04
    const boxY = h * 0.73
    const boxW = w * 0.4
    text(ctx, 'TOOLBOX  ·  discovered via tools/list', boxX, boxY - 4 * k, { size: 9.5 * k, color: i >= 3 ? C.muted : C.dim, font: MONO })
    let cx = boxX
    let cy = boxY + 16 * k
    allTools.forEach((tl, j) => {
      const cw = chipWidth(ctx, tl.tool, { color: tl.color, size: 10 * k, mono: true })
      if (cx + cw > boxX + boxW) {
        cx = boxX
        cy += 26 * k
      }
      const f = i > 3 ? 1 : i === 3 ? easeInOut(sp(c, 3, 1.4 + j * 0.12, 0.6)) : 0
      if (f > 0) {
        const from = { x: tl.server.p.x - S, y: tl.server.p.y }
        const x = lerp(from.x, cx, f)
        const y = lerp(from.y, cy, f)
        const used = (i >= 6 && tl.tool === 'get_forecast') || (i >= 7 && tl.tool === 'write_file')
        chip(ctx, tl.tool, x, y, { color: tl.color, size: 10 * k, mono: true, h: 22 * k, fillAlpha: used ? 0.32 : 0.14, strokeAlpha: used ? 1 : 0.55 })
      }
      cx += cw + 6 * k
    })

    const pkt = (s: (typeof srv)[number], out: string, back: string, color: string) => {
      const end = { x: s.p.x - S * 0.85, y: s.p.y }
      const go = easeInOut(Math.min(1, c.local / 1.0))
      const ret = easeInOut(Math.min(1, Math.max(0, (c.local - 1.4) / 1.0)))
      if (c.local < 1.0) {
        const p = { x: lerp(linkStart.x, end.x, go), y: lerp(linkStart.y, end.y, go) }
        dot(ctx, p, color, k)
        if (out) chip(ctx, out, p.x, p.y - 18 * k, { color, size: 9.5 * k, mono: true, align: 'center', h: 20 * k, fillAlpha: 0.2 })
      } else if (c.local >= 1.4 && c.local < 2.4) {
        const p = { x: lerp(end.x, linkStart.x, ret), y: lerp(end.y, linkStart.y, ret) }
        dot(ctx, p, C.green, k)
        if (back) chip(ctx, back, p.x, p.y + 18 * k, { color: C.green, size: 9.5 * k, mono: true, align: 'center', h: 20 * k, fillAlpha: 0.2 })
      }
    }

    if (i === 2) srv.forEach((s, j) => pkt(s, j === 1 ? 'initialize' : '', j === 1 ? 'capabilities' : '', C.violet))
    if (i === 3) srv.forEach((s, j) => pkt(s, j === 1 ? 'tools/list' : '', '', C.cyan))
    if (i === 6) pkt(srv[0], 'tools/call get_forecast', 'Rain, 14°C', C.amber)
    if (i === 7) pkt(srv[1], 'tools/call write_file', 'wrote notes.md', C.green)

    if (i >= 4) {
      const a = i === 4 ? easeOut(sp(c, 4, 0, 0.6)) : 1
      text(ctx, 'user', w * 0.04, h * 0.06, { size: 9.5 * k, color: C.dim, font: MONO, alpha: a })
      ctx.font = `600 ${11 * k}px "Inter", sans-serif`
      chip(ctx, MCP_QUESTION, w * 0.04, h * 0.11, { color: C.cyan, size: 11 * k, h: 26 * k, alpha: a, fillAlpha: 0.18, weight: 600 })
    }
    if (i === 5) {
      chip(ctx, 'tool_call → get_forecast(city="Paris")', agent.x + S * 1.2, agent.y - S * 0.9, { color: C.amber, size: 10 * k, mono: true, h: 22 * k, fillAlpha: 0.18, alpha: easeOut(sp(c, 5, 0.8, 0.5)) })
    }
    if (i === 7 && c.local < 1.0) {
      chip(ctx, 'tool_call → write_file(path="notes.md")', agent.x + S * 1.2, agent.y - S * 0.9, { color: C.green, size: 10 * k, mono: true, h: 22 * k, fillAlpha: 0.18 })
    }
    if (i === 8) {
      const a = easeOut(sp(c, 8, 0.3, 0.6))
      chip(ctx, MCP_ANSWER, w * 0.04, h * 0.19, { color: C.pink, size: 11.5 * k, h: 28 * k, alpha: a, fillAlpha: 0.2, weight: 600 })
    }
  })

  return <canvas ref={ref} className="stage-canvas" aria-label="An agent discovering and calling tools on MCP servers" />
}
