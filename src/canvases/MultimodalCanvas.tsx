import { useCanvas } from '../hooks/useCanvas'
import type { CanvasProps } from '../lessons/types'
import type { MmScenario } from '../data/multimodal'
import { MM, MM_PHASES } from '../data/multimodal'
import type { Pt } from '../lib/draw'
import { C, FONT, MONO, TAU, chip, easeInOut, easeOut, glow, lerp, prog, rgba, rrect, scaleFor, text, wrapLines } from '../lib/draw'
import { gears, robot } from '../lib/icons'

type Box = { x: number; y: number; w: number; h: number }

function frame(ctx: CanvasRenderingContext2D, b: Box, color: string, active: boolean, k: number) {
  if (active) glow(ctx, b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h) * 0.65, color, 0.14)
  rrect(ctx, b.x, b.y, b.w, b.h, 12 * k)
  ctx.fillStyle = '#05070f'
  ctx.fill()
  ctx.strokeStyle = rgba(color, active ? 0.75 : 0.3)
  ctx.lineWidth = active ? 1.5 : 1
  ctx.stroke()
}

function drawPackage(ctx: CanvasRenderingContext2D, b: Box, k: number) {
  const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h)
  g.addColorStop(0, '#1e2a44')
  g.addColorStop(1, '#141b2e')
  rrect(ctx, b.x, b.y, b.w, b.h, 8 * k)
  ctx.fillStyle = g
  ctx.fill()
  const cx = b.x + b.w / 2
  const cy = b.y + b.h * 0.56
  const bw = b.w * 0.56
  const bh = b.h * 0.5
  ctx.beginPath()
  ctx.moveTo(cx - bw / 2, cy - bh / 2 + bh * 0.08)
  ctx.lineTo(cx + bw / 2 - bw * 0.22, cy - bh / 2)
  ctx.lineTo(cx + bw / 2 - bw * 0.08, cy - bh / 2 + bh * 0.22)
  ctx.lineTo(cx + bw / 2, cy - bh / 2 + bh * 0.16)
  ctx.lineTo(cx + bw / 2, cy + bh / 2)
  ctx.lineTo(cx - bw / 2, cy + bh / 2)
  ctx.closePath()
  ctx.fillStyle = '#a0703c'
  ctx.fill()
  ctx.strokeStyle = '#6b4520'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.strokeStyle = 'rgba(60,35,15,0.8)'
  ctx.beginPath()
  ctx.moveTo(cx + bw / 2 - bw * 0.22, cy - bh / 2)
  ctx.lineTo(cx + bw / 2 - bw * 0.16, cy - bh / 2 + bh * 0.3)
  ctx.lineTo(cx + bw / 2 - bw * 0.08, cy - bh / 2 + bh * 0.22)
  ctx.stroke()
  rrect(ctx, cx - bw * 0.32, cy - bh * 0.05, bw * 0.4, bh * 0.32, 3)
  ctx.fillStyle = '#f1f1ea'
  ctx.fill()
  text(ctx, '#4512', cx - bw * 0.12, cy + bh * 0.11, { size: 9.5 * k, color: '#222', font: MONO, align: 'center', weight: 700 })
}

function drawChart(ctx: CanvasRenderingContext2D, b: Box, k: number) {
  rrect(ctx, b.x, b.y, b.w, b.h, 8 * k)
  ctx.fillStyle = '#f4f6fb'
  ctx.fill()
  text(ctx, 'Monthly sales (k$)', b.x + 10 * k, b.y + 14 * k, { size: 9 * k, color: '#333', weight: 600 })
  const base = b.y + b.h - 22 * k
  const left = b.x + 22 * k
  const vals = [120, 118, 72]
  const names = ['Jan', 'Feb', 'Mar']
  const bw = (b.w - 44 * k) / 5
  ctx.strokeStyle = '#999'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(left - 4, base)
  ctx.lineTo(b.x + b.w - 12 * k, base)
  ctx.stroke()
  vals.forEach((v, j) => {
    const hgt = (v / 130) * (b.h - 50 * k)
    const x = left + j * bw * 1.6
    ctx.fillStyle = j === 2 ? '#e0556f' : '#4f7fe0'
    ctx.fillRect(x, base - hgt, bw, hgt)
    text(ctx, names[j], x + bw / 2, base + 10 * k, { size: 8.5 * k, color: '#444', align: 'center' })
  })
}

function wave(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, t: number, live: boolean) {
  const n = 28
  for (let j = 0; j < n; j++) {
    const amp = (0.25 + 0.75 * Math.abs(Math.sin(j * 1.7) * Math.cos(j * 0.6))) * (live ? 0.6 + 0.4 * Math.sin(t * 9 + j) : 1)
    const bh = Math.max(2, h * amp)
    ctx.fillStyle = color
    ctx.fillRect(x + (j * w) / n, y - bh / 2, Math.max(1.5, w / n - 2), bh)
  }
}

function dot(ctx: CanvasRenderingContext2D, p: Pt, color: string, k: number) {
  glow(ctx, p.x, p.y, 16 * k, color, 0.8)
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(p.x, p.y, 2.6 * k, 0, TAU)
  ctx.fill()
}

export default function MultimodalCanvas({ clock, opts }: CanvasProps) {
  const ref = useCanvas(({ ctx, w, h, t }) => {
    const c = clock.current
    const sc = (opts.scenario === 'chart' ? 'chart' : 'support') as MmScenario
    const d = MM[sc]
    const i = Math.min(c.step, MM_PHASES.length - 1)
    const ph = MM_PHASES[i]
    const L = c.local
    const k = scaleFor(w, 800, 0.55)
    const S = Math.min(34 * k, h * 0.064)
    const RS = Math.min(52 * k, h * 0.1)

    const A: Box = { x: w * 0.03, y: h * 0.05, w: w * 0.24, h: h * 0.4 }
    const Ai: Box = { x: A.x + 8 * k, y: A.y + 24 * k, w: A.w - 16 * k, h: A.h - 32 * k }
    const B: Box = { x: w * 0.03, y: h * 0.5, w: w * 0.24, h: h * 0.2 }
    const R: Pt = { x: w * 0.475, y: h * 0.31 }
    const U: Box = { x: w * 0.31, y: h * 0.63, w: w * 0.35, h: h * 0.3 }
    const T: Pt = { x: w * 0.75, y: h * 0.17 }
    const O: Box = { x: w * 0.69, y: h * 0.42, w: w * 0.28, h: h * 0.51 }

    frame(ctx, A, C.cyan, ph === 'inputs' || ph === 'image', k)
    text(ctx, `IMAGE · ${d.imageName}`, A.x + 10 * k, A.y + 12 * k, { size: 9 * k, color: C.muted, font: MONO, weight: 600 })
    if (sc === 'support') drawPackage(ctx, Ai, k)
    else drawChart(ctx, Ai, k)

    const grid = 4
    const pw = Ai.w / grid
    const phh = Ai.h / grid
    if (ph === 'image') {
      ctx.strokeStyle = rgba(C.cyan, 0.8 * Math.min(1, L * 2))
      ctx.lineWidth = 1
      for (let g = 1; g < grid; g++) {
        ctx.beginPath()
        ctx.moveTo(Ai.x + g * pw, Ai.y)
        ctx.lineTo(Ai.x + g * pw, Ai.y + Ai.h)
        ctx.moveTo(Ai.x, Ai.y + g * phh)
        ctx.lineTo(Ai.x + Ai.w, Ai.y + g * phh)
        ctx.stroke()
      }
      for (let n = 0; n < grid * grid; n++) {
        const f = prog(L, 0.6 + n * 0.09, 0.7)
        if (f <= 0 || f >= 1) continue
        const gx = n % grid
        const gy = Math.floor(n / grid)
        const from = { x: Ai.x + (gx + 0.5) * pw, y: Ai.y + (gy + 0.5) * phh }
        const u = easeInOut(f)
        const x = lerp(from.x, R.x - RS, u)
        const y = lerp(from.y, R.y, u) - Math.sin(u * Math.PI) * 24 * k
        const s = lerp(pw * 0.8, 8 * k, u)
        rrect(ctx, x - s / 2, y - s / 2, s, s, 2)
        ctx.fillStyle = rgba(C.cyan, 0.35)
        ctx.fill()
        ctx.strokeStyle = C.cyan
        ctx.stroke()
      }
      chip(ctx, '16 patches → image tokens', A.x + A.w / 2, A.y + A.h + 14 * k, { color: C.cyan, size: 9.5 * k, mono: true, align: 'center', h: 20 * k, fillAlpha: 0.16, alpha: prog(L, 0.4, 0.4) })
    }

    frame(ctx, B, d.secondKind === 'audio' ? C.pink : C.amber, ph === 'inputs' || ph === 'second', k)
    text(ctx, d.secondKind === 'audio' ? `AUDIO · ${d.secondLabel}` : 'TEXT · typed question', B.x + 10 * k, B.y + 12 * k, { size: 9 * k, color: C.muted, font: MONO, weight: 600 })
    const bodyY = B.y + B.h * 0.58
    if (d.secondKind === 'audio') {
      const transcribed = i > 2 || (ph === 'second' && L > 1.2)
      if (!transcribed) wave(ctx, B.x + 12 * k, bodyY, B.w - 24 * k, B.h * 0.45, C.pink, t, ph === 'second' || ph === 'inputs')
      else {
        ctx.font = `500 ${10.5 * k}px ${FONT}`
        const shown = ph === 'second' ? d.transcript.slice(0, Math.floor(d.transcript.length * prog(L, 1.2, 0.9))) : d.transcript
        wrapLines(ctx, `"${shown}"`, B.w - 24 * k).slice(0, 2).forEach((ln, j) => text(ctx, ln, B.x + 12 * k, bodyY - 6 * k + j * 15 * k, { size: 10.5 * k, color: C.soft }))
      }
    } else {
      ctx.font = `500 ${11 * k}px ${FONT}`
      wrapLines(ctx, d.transcript, B.w - 24 * k).slice(0, 2).forEach((ln, j) => text(ctx, ln, B.x + 12 * k, bodyY - 6 * k + j * 15 * k, { size: 11 * k, color: C.text, weight: 600 }))
    }
    if (ph === 'second') {
      chip(ctx, d.secondKind === 'audio' ? 'speech-to-text → text tokens' : 'text → tokens', B.x + B.w / 2, B.y + B.h + 14 * k, { color: d.secondKind === 'audio' ? C.pink : C.amber, size: 9.5 * k, mono: true, align: 'center', h: 20 * k, fillAlpha: 0.16 })
      for (let n = 0; n < 6; n++) {
        const f = prog(L, 1.6 + n * 0.12, 0.7)
        if (f <= 0 || f >= 1) continue
        const u = easeInOut(f)
        dot(ctx, { x: lerp(B.x + B.w, R.x - RS, u), y: lerp(bodyY, R.y + RS * 0.3, u) - Math.sin(u * Math.PI) * 20 * k }, d.secondKind === 'audio' ? C.pink : C.amber, k)
      }
    }

    const thinking = ph === 'understand' || (ph === 'tools' && L < 2.6) || (ph === 'reply' && L < 0.6) || (ph === 'image' && L > 1.2) || (ph === 'second' && L > 2)
    robot(ctx, R.x, R.y, RS, { color: C.violet, active: thinking, t })
    text(ctx, 'gpt-5', R.x, R.y + RS * 1.05, { size: 13 * k, weight: 600, align: 'center' })
    text(ctx, 'text + images in one context', R.x, R.y + RS * 1.05 + 17 * k, { size: 10.5 * k, color: C.muted, align: 'center' })

    frame(ctx, U, C.violet, ph === 'understand', k)
    text(ctx, 'WHAT THE MODEL UNDERSTOOD', U.x + 10 * k, U.y + 12 * k, { size: 9 * k, color: C.muted, font: MONO, weight: 600 })
    if (i >= 3) {
      d.facts.forEach((f, j) => {
        const a = ph === 'understand' ? easeOut(prog(L, 0.5 + j * 0.5, 0.4)) : 1
        const color = f.icon === 'eye' ? C.cyan : f.icon === 'ear' ? C.pink : C.amber
        const tag = f.icon === 'eye' ? 'vision' : f.icon === 'ear' ? 'audio' : 'text'
        chip(ctx, `${tag} · ${f.text}`, U.x + 10 * k, U.y + 34 * k + j * 26 * k, { color, size: 10 * k, h: 22 * k, fillAlpha: 0.16, alpha: a })
      })
    } else {
      text(ctx, 'waiting for all inputs…', U.x + U.w / 2, U.y + U.h / 2, { size: 10.5 * k, color: C.dim, align: 'center' })
    }

    const toolsActive = ph === 'tools'
    gears(ctx, T.x, T.y, S * 0.7, { color: C.amber, active: toolsActive && L > 0.6 && L < 2.6, t })
    text(ctx, 'tools', T.x + S * 0.95, T.y - 6 * k, { size: 12 * k, weight: 600 })
    text(ctx, d.tools.map((tl) => tl.call.split('(')[0]).join(' · '), T.x + S * 0.95, T.y + 10 * k, { size: 9 * k, color: C.muted, font: MONO })
    if (i >= 4) {
      d.tools.forEach((tl, j) => {
        const start = 0.4 + j * 1.0
        const a = toolsActive ? easeOut(prog(L, start, 0.4)) : 1
        const ra = toolsActive ? easeOut(prog(L, start + 0.6, 0.4)) : 1
        const y = T.y + S * 0.9 + 12 * k + j * 44 * k
        chip(ctx, tl.call, T.x - S * 0.7, y, { color: C.amber, size: 9.5 * k, mono: true, h: 20 * k, fillAlpha: 0.16, alpha: a })
        chip(ctx, `→ ${tl.result}`, T.x - S * 0.7, y + 21 * k, { color: C.green, size: 9.5 * k, h: 20 * k, fillAlpha: 0.14, alpha: ra })
        if (toolsActive) {
          const f = prog(L, start, 0.5)
          if (f > 0 && f < 1) dot(ctx, { x: lerp(R.x + RS, T.x - S * 0.7, easeInOut(f)), y: lerp(R.y - RS * 0.3, T.y, easeInOut(f)) }, C.amber, k)
        }
      })
    }

    frame(ctx, O, C.pink, ph === 'reply', k)
    text(ctx, 'REPLY', O.x + 10 * k, O.y + 12 * k, { size: 9 * k, color: C.muted, font: MONO, weight: 600 })
    if (ph === 'reply') {
      const typed = prog(L, 0.6, 1.4)
      ctx.font = `500 ${10.5 * k}px ${FONT}`
      wrapLines(ctx, d.reply.slice(0, Math.floor(d.reply.length * typed)), O.w - 20 * k).slice(0, 5).forEach((ln, j) => text(ctx, ln, O.x + 10 * k, O.y + 32 * k + j * 15 * k, { size: 10.5 * k, color: C.text }))
      const outY = O.y + O.h - 34 * k
      if (L > 2.0) {
        if (d.outputKind === 'speech') {
          text(ctx, 'text-to-speech · reply.mp3', O.x + 10 * k, outY - 14 * k, { size: 9 * k, color: C.pink, font: MONO })
          wave(ctx, O.x + 10 * k, outY + 8 * k, O.w - 20 * k, 20 * k, C.pink, t, true)
        } else {
          const cb = { x: O.x + 10 * k, y: outY - 22 * k, w: O.w * 0.5, h: 44 * k }
          rrect(ctx, cb.x, cb.y, cb.w, cb.h, 4)
          ctx.fillStyle = '#f4f6fb'
          ctx.fill()
          ;[0.9, 0.88, 0.5].forEach((v, j) => {
            ctx.fillStyle = j === 2 ? '#e0556f' : '#4f7fe0'
            const bh = v * (cb.h - 10 * k)
            ctx.fillRect(cb.x + 8 * k + j * 18 * k, cb.y + cb.h - 5 * k - bh, 11 * k, bh)
          })
          text(ctx, '← EU warehouse closed', cb.x + cb.w + 6 * k, cb.y + cb.h / 2, { size: 9 * k, color: C.pink })
        }
      }
    } else if (i < 5) {
      text(ctx, 'reply after reasoning and tools…', O.x + O.w / 2, O.y + O.h / 2, { size: 10.5 * k, color: C.dim, align: 'center' })
    }
  })

  return <canvas ref={ref} className="stage-canvas" aria-label="A multimodal agent reading an image and voice, then replying" />
}
