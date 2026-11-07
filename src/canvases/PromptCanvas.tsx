import { useCanvas } from '../hooks/useCanvas'
import type { CanvasProps } from '../lessons/types'
import { BLOCKS, STAGES, TICKETS, USER_BLOCK } from '../data/prompting'
import type { PromptBlock } from '../data/prompting'
import { C, DISPLAY, FONT, MONO, TAU, easeInOut, easeOut, glow, lerp, prog, rgba, rrect, scaleFor, text, wrapLines as wrap } from '../lib/draw'
import { robot } from '../lib/icons'

export default function PromptCanvas({ clock }: CanvasProps) {
  const ref = useCanvas(({ ctx, w, h, t }) => {
    const c = clock.current
    const i = Math.min(c.step, STAGES.length - 1)
    const stage = STAGES[i]
    const prev = STAGES[Math.max(0, i - 1)]
    const local = c.local
    const k = scaleFor(w, 780, 0.58)
    const pad = 18 * k

    const blockIn = i > 0 && i <= BLOCKS.length ? easeOut(prog(local, 0, 0.8)) : 1
    const sendP = easeInOut(prog(local, 0.8, 0.8))
    const thinking = local >= 1.6 && local < 2.2
    const typeP = prog(local, 2.2, 1.1)
    const qP = easeOut(prog(local, 2.2, 1.0))

    const L = { x: pad, y: pad + 20 * k, w: w * 0.36, h: h - pad * 2 - 20 * k }
    text(ctx, 'PROMPT  ·  what the model receives', L.x, pad + 4 * k, { size: 11 * k, color: C.muted, font: MONO })

    const shown: { b: PromptBlock; fresh: boolean }[] = BLOCKS.slice(0, Math.min(i, BLOCKS.length)).map((b, j) => ({ b, fresh: j === i - 1 && i <= BLOCKS.length }))
    const ticket = i === STAGES.length - 1 ? TICKETS[Math.floor(t / 1.6) % TICKETS.length] : USER_BLOCK.text
    shown.push({ b: { ...USER_BLOCK, text: i === STAGES.length - 1 ? `{ticket} = "${ticket}"` : USER_BLOCK.text }, fresh: false })

    const gap = 8 * k
    const bh = Math.min(62 * k, (L.h - gap * 5) / 6)
    let y = L.y
    ctx.font = `500 ${11.5 * k}px ${FONT}`
    shown.forEach(({ b, fresh }) => {
      const a = fresh ? blockIn : 1
      const x = L.x - (fresh ? (1 - blockIn) * 40 * k : 0)
      ctx.save()
      ctx.globalAlpha = a
      if (fresh) glow(ctx, x + L.w / 2, y + bh / 2, L.w * 0.6, b.color, 0.25 * (1 - prog(local, 1.2, 1.2)) + 0.05)
      rrect(ctx, x, y, L.w, bh, 10 * k)
      ctx.fillStyle = C.panel
      ctx.fill()
      ctx.fillStyle = rgba(b.color, fresh ? 0.16 : 0.07)
      ctx.fill()
      ctx.strokeStyle = rgba(b.color, fresh ? 0.9 : 0.35)
      ctx.lineWidth = fresh ? 1.6 : 1
      ctx.stroke()
      ctx.fillStyle = b.color
      rrect(ctx, x, y + 8 * k, 3, bh - 16 * k, 2)
      ctx.fill()
      text(ctx, b.tag, x + 14 * k, y + 14 * k, { size: 9.5 * k, color: b.color, font: MONO, weight: 600 })
      ctx.font = `500 ${11.5 * k}px ${FONT}`
      const lines = wrap(ctx, b.text, L.w - 26 * k).slice(0, bh > 50 * k ? 2 : 1)
      lines.forEach((ln, j) => text(ctx, ln, x + 14 * k, y + 31 * k + j * 15 * k, { size: 11.5 * k, color: C.soft }))
      ctx.restore()
      y += bh + gap
    })
    if (i === 0) {
      text(ctx, 'nothing but the raw ticket…', L.x + L.w / 2, L.y + bh + gap + 30 * k, { size: 12 * k, color: C.dim, align: 'center' })
    }

    const stackBottom = y - gap
    const rx = w * 0.5
    const ry = h * 0.45
    const S = Math.min(46 * k, h * 0.085)
    const from = { x: L.x + L.w + 6 * k, y: (L.y + stackBottom) / 2 }
    const to = { x: rx - S * 1.05, y: ry }
    ctx.strokeStyle = rgba(C.violet, 0.35)
    ctx.lineWidth = 1.4
    ctx.setLineDash([4, 6])
    ctx.lineDashOffset = -t * 20
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.bezierCurveTo(from.x + 40 * k, from.y, to.x - 40 * k, to.y, to.x, to.y)
    ctx.stroke()
    ctx.setLineDash([])
    if (sendP > 0 && sendP < 1) {
      const u = sendP
      const bx = (1 - u) ** 3 * from.x + 3 * (1 - u) ** 2 * u * (from.x + 40 * k) + 3 * (1 - u) * u * u * (to.x - 40 * k) + u ** 3 * to.x
      const by = (1 - u) ** 3 * from.y + 3 * (1 - u) ** 2 * u * from.y + 3 * (1 - u) * u * u * to.y + u ** 3 * to.y
      glow(ctx, bx, by, 24 * k, C.violet, 0.8)
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(bx, by, 3.5 * k, 0, TAU)
      ctx.fill()
    }

    robot(ctx, rx, ry, S, { color: C.violet, active: thinking || (sendP >= 1 && typeP < 1), t })
    text(ctx, 'gpt-5', rx, ry + S * 1.25, { size: 12 * k, color: C.muted, font: MONO, align: 'center' })

    const O = { x: w * 0.62, y: pad + 20 * k, w: w * 0.38 - pad, h: h * 0.56 }
    text(ctx, 'OUTPUT', O.x, pad + 4 * k, { size: 11 * k, color: C.muted, font: MONO })
    const ox = rx + S * 1.05
    ctx.strokeStyle = rgba(C.pink, 0.35)
    ctx.setLineDash([4, 6])
    ctx.beginPath()
    ctx.moveTo(ox, ry)
    ctx.lineTo(O.x - 6 * k, ry)
    ctx.stroke()
    ctx.setLineDash([])

    rrect(ctx, O.x, O.y, O.w, O.h, 12 * k)
    ctx.fillStyle = '#05070f'
    ctx.fill()
    ctx.strokeStyle = rgba(stage.json && typeP > 0 ? C.green : C.pink, 0.4)
    ctx.lineWidth = 1.2
    ctx.stroke()
    const showStage = typeP > 0 ? stage : i > 0 ? prev : null
    if (showStage) {
      const mono = showStage.json
      const fs = (mono ? 11.5 : 12.5) * k
      ctx.font = `${mono ? 500 : 400} ${fs}px ${mono ? MONO : FONT}`
      const full = showStage.output
      const visible = typeP > 0 ? full.slice(0, Math.floor(full.length * typeP)) : full
      const lines = wrap(ctx, visible, O.w - 28 * k, mono)
      const lh = fs * 1.55
      lines.slice(0, Math.floor((O.h - 24 * k) / lh)).forEach((ln, j) => {
        let color: string = C.soft
        if (mono && /"\w+":/.test(ln)) color = '#86efac'
        text(ctx, ln, O.x + 14 * k, O.y + 18 * k + j * lh, { size: fs, font: mono ? MONO : FONT, color, alpha: typeP > 0 ? 1 : 0.35, weight: mono ? 500 : 400 })
      })
      if (typeP > 0 && typeP < 1 && Math.sin(t * 10) > 0) {
        const last = lines[lines.length - 1] ?? ''
        ctx.font = `${mono ? 500 : 400} ${fs}px ${mono ? MONO : FONT}`
        const cx = O.x + 14 * k + ctx.measureText(last).width + 2
        ctx.fillStyle = C.pink
        ctx.fillRect(cx, O.y + 18 * k + (lines.length - 1) * lh - fs * 0.55, 2, fs * 1.1)
      }
    } else {
      text(ctx, 'waiting for the model…', O.x + O.w / 2, O.y + O.h / 2, { size: 12 * k, color: C.dim, align: 'center' })
    }

    const q = lerp(i > 0 ? prev.quality : 0, stage.quality, qP)
    const gx = O.x + 44 * k
    const gy = O.y + O.h + 62 * k
    const gr = 34 * k
    const qColor = q > 0.85 ? C.green : q > 0.5 ? C.amber : C.red
    ctx.lineCap = 'round'
    ctx.lineWidth = 7 * k
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.beginPath()
    ctx.arc(gx, gy, gr, -Math.PI / 2, -Math.PI / 2 + TAU)
    ctx.stroke()
    if (q > 0.005) {
      glow(ctx, gx, gy, gr * 1.8, qColor, 0.15)
      ctx.strokeStyle = qColor
      ctx.beginPath()
      ctx.arc(gx, gy, gr, -Math.PI / 2, -Math.PI / 2 + TAU * q)
      ctx.stroke()
    }
    ctx.lineCap = 'butt'
    text(ctx, `${Math.round(q * 100)}%`, gx, gy, { size: 16 * k, weight: 700, font: DISPLAY, align: 'center' })
    text(ctx, 'OUTPUT QUALITY', gx + gr + 16 * k, gy - 14 * k, { size: 10 * k, color: C.muted, font: MONO })
    const vShow = qP > 0.5 ? stage : i > 0 ? prev : stage
    ctx.font = `500 ${12.5 * k}px ${FONT}`
    const vLines = wrap(ctx, vShow.verdict, O.w - gr * 2 - 40 * k).slice(0, 2)
    vLines.forEach((ln, j) => text(ctx, ln, gx + gr + 16 * k, gy + 4 * k + j * 16 * k, { size: 12.5 * k, color: qColor, weight: 600 }))

    const chipsY = gy + gr + 30 * k
    if (chipsY < h - 10 * k) {
      text(ctx, `technique: ${stage.technique}`, O.x, chipsY, { size: 11 * k, color: C.dim, font: MONO, alpha: qP })
    }
  })

  return <canvas ref={ref} className="stage-canvas" aria-label="A prompt built up technique by technique and its effect on the output" />
}
