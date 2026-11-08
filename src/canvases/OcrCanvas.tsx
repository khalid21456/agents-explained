import { useCanvas } from '../hooks/useCanvas'
import type { CanvasProps } from '../lessons/types'
import type { OcrMode } from '../data/ocr'
import { FIXES, RECEIPT, RECEIPT_JSON_LINES, STAGES, truth } from '../data/ocr'
import type { Pt } from '../lib/draw'
import { C, MONO, TAU, chip, chipWidth, easeInOut, easeOut, glow, lerp, mulberry32, prog, rgba, rrect, scaleFor, text } from '../lib/draw'
import { robot } from '../lib/icons'

type Box = { x: number; y: number; w: number; h: number }

const NOISE = (() => {
  const r = mulberry32(7)
  return Array.from({ length: 140 }, () => ({ x: r(), y: r(), s: 0.5 + r() * 1.4, a: 0.15 + r() * 0.35 }))
})()

function lineY(P: Box, j: number) {
  const top = P.y + P.h * 0.1
  if (j < 2) return top + j * P.h * 0.06
  if (j === RECEIPT.length - 1) return P.y + P.h * 0.82
  return top + P.h * 0.2 + (j - 2) * P.h * 0.085
}

function drawReceipt(ctx: CanvasRenderingContext2D, P: Box, angle: number, clean: number, k: number) {
  ctx.save()
  ctx.translate(P.x + P.w / 2, P.y + P.h / 2)
  ctx.rotate(angle)
  ctx.translate(-(P.x + P.w / 2), -(P.y + P.h / 2))
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 18 * k
  ctx.fillStyle = '#e8e2d2'
  ctx.fillRect(P.x, P.y, P.w, P.h)
  ctx.shadowBlur = 0
  if (clean > 0) {
    ctx.globalAlpha = clean
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(P.x, P.y, P.w, P.h)
    ctx.globalAlpha = 1
  }
  if (clean < 1) {
    NOISE.forEach((n) => {
      ctx.fillStyle = `rgba(70,60,40,${n.a * (1 - clean)})`
      ctx.beginPath()
      ctx.arc(P.x + n.x * P.w, P.y + n.y * P.h, n.s, 0, TAU)
      ctx.fill()
    })
  }
  const ink = clean > 0.5 ? '#111111' : '#5a5f70'
  const pad = P.w * 0.08
  RECEIPT.forEach((l, j) => {
    const y = lineY(P, j)
    if (l.header) {
      text(ctx, l.name, P.x + P.w / 2, y, { size: (j === 0 ? 12 : 10) * k, color: ink, font: MONO, align: 'center', weight: j === 0 ? 700 : 500 })
    } else {
      text(ctx, l.name, P.x + pad, y, { size: 10 * k, color: ink, font: MONO, weight: l.name === 'TOTAL' ? 700 : 500 })
      text(ctx, l.price, P.x + P.w - pad, y, { size: 10 * k, color: ink, font: MONO, align: 'right', weight: l.name === 'TOTAL' ? 700 : 500 })
    }
  })
  ctx.strokeStyle = clean > 0.5 ? '#999' : '#a9a28f'
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(P.x + pad, P.y + P.h * 0.75)
  ctx.lineTo(P.x + P.w - pad, P.y + P.h * 0.75)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

function errorText(ctx: CanvasRenderingContext2D, ocr: string, real: string, x: number, y: number, size: number, base: string) {
  ctx.font = `500 ${size}px ${MONO}`
  const cw = ctx.measureText('M').width
  for (let j = 0; j < ocr.length; j++) {
    const bad = ocr[j] !== real[j]
    if (bad) {
      ctx.fillStyle = rgba(C.red, 0.25)
      ctx.fillRect(x + j * cw - 1, y - size * 0.65, cw + 2, size * 1.3)
    }
    text(ctx, ocr[j], x + j * cw, y, { size, color: bad ? C.red : base, font: MONO, weight: bad ? 700 : 500 })
  }
}

export default function OcrCanvas({ clock, opts }: CanvasProps) {
  const ref = useCanvas(({ ctx, w, h, t }) => {
    const c = clock.current
    const mode = (opts.mode === 'vlm' ? 'vlm' : 'classic') as OcrMode
    const stages = STAGES[mode]
    const i = Math.min(c.step, stages.length - 1)
    const L = c.local
    const k = scaleFor(w, 800, 0.55)

    let sx = w * 0.34
    const sy = h * 0.06
    stages.forEach((s, j) => {
      const on = j === i
      const done = j < i
      const cwid = chipWidth(ctx, s, { color: C.cyan, size: 10 * k })
      chip(ctx, s, sx, sy, { color: on ? C.cyan : done ? C.green : C.dim, size: 10 * k, h: 24 * k, fillAlpha: on ? 0.25 : 0.08, strokeAlpha: on ? 1 : 0.4, weight: on ? 700 : 500 })
      sx += cwid + 4 * k
      if (j < stages.length - 1) {
        text(ctx, '→', sx + 3 * k, sy, { size: 11 * k, color: C.dim })
        sx += 16 * k
      }
    })

    const P: Box = { x: w * 0.05, y: h * 0.07, w: w * 0.24, h: h * 0.86 }
    let angle = -0.07
    let clean = 0
    if (mode === 'classic') {
      const pre = i > 1 ? 1 : i === 1 ? easeInOut(prog(L, 0.4, 1.6)) : 0
      angle = lerp(-0.07, 0, pre)
      clean = pre
    }
    drawReceipt(ctx, P, angle, clean, k)
    if (i === 0) {
      chip(ctx, 'tilted · noisy · low contrast', P.x + P.w / 2, P.y + P.h + 2 * k, { color: C.amber, size: 9.5 * k, align: 'center', h: 20 * k, fillAlpha: 0.18 })
    }

    const RC: Box = { x: w * 0.34, y: h * 0.15, w: w * 0.62, h: h * 0.78 }
    const pad = P.w * 0.08

    if (mode === 'classic' && i >= 2 && i <= 3) {
      RECEIPT.forEach((l, j) => {
        const f = i === 2 ? easeOut(prog(L, 0.4 + j * 0.2, 0.3)) : 1
        if (f <= 0) return
        ctx.font = `500 ${(l.header && j === 0 ? 12 : 10) * k}px ${MONO}`
        const tw = l.header ? ctx.measureText(l.name).width : P.w - pad * 2
        const bx = l.header ? P.x + P.w / 2 - tw / 2 : P.x + pad
        const y = lineY(P, j)
        const color = i === 3 ? (l.conf >= 0.9 ? C.green : l.conf >= 0.7 ? C.amber : C.red) : C.cyan
        ctx.strokeStyle = rgba(color, 0.9 * f)
        ctx.lineWidth = 1.5
        ctx.strokeRect(bx - 4 * k, y - 9 * k, (tw + 8 * k) * f, 18 * k)
      })
    }

    if (mode === 'classic') {
      if (i === 1) {
        ;['grayscale', 'deskew −4°', 'binarize (threshold 150)'].forEach((s, j) => {
          const a = easeOut(prog(L, 0.4 + j * 0.6, 0.4))
          chip(ctx, `✓ ${s}`, RC.x, RC.y + 20 * k + j * 34 * k, { color: C.green, size: 11.5 * k, h: 28 * k, fillAlpha: 0.16, alpha: a })
        })
        text(ctx, 'Clean pixels in, better characters out.', RC.x, RC.y + 140 * k, { size: 12 * k, color: C.muted, alpha: prog(L, 2.2, 0.5) })
      } else if (i === 2) {
        text(ctx, 'TEXT DETECTION', RC.x, RC.y + 10 * k, { size: 10 * k, color: C.muted, font: MONO, weight: 600 })
        text(ctx, `${Math.min(RECEIPT.length, Math.floor(prog(L, 0.4, 1.6) * RECEIPT.length + 0.001))} text regions found`, RC.x, RC.y + 40 * k, { size: 18 * k, weight: 700, color: C.cyan })
        text(ctx, 'Each box is a line of text the recognizer will read.', RC.x, RC.y + 70 * k, { size: 12 * k, color: C.muted })
      } else if (i === 3) {
        text(ctx, 'CHARACTER RECOGNITION  ·  confidence', RC.x, RC.y + 10 * k, { size: 10 * k, color: C.muted, font: MONO, weight: 600 })
        RECEIPT.forEach((l, j) => {
          const a = easeOut(prog(L, 0.3 + j * 0.25, 0.3))
          if (a <= 0) return
          const y = RC.y + 36 * k + j * 27 * k
          ctx.save()
          ctx.globalAlpha = a
          errorText(ctx, l.ocr, truth(l), RC.x, y, 11 * k, C.soft)
          const barX = RC.x + RC.w * 0.6
          const barW = RC.w * 0.28
          rrect(ctx, barX, y - 4 * k, barW, 8 * k, 4)
          ctx.fillStyle = 'rgba(255,255,255,0.06)'
          ctx.fill()
          const col = l.conf >= 0.9 ? C.green : l.conf >= 0.7 ? C.amber : C.red
          rrect(ctx, barX, y - 4 * k, barW * l.conf, 8 * k, 4)
          ctx.fillStyle = col
          ctx.fill()
          text(ctx, l.conf.toFixed(2), barX + barW + 8 * k, y, { size: 10 * k, color: col, font: MONO })
          ctx.restore()
        })
      } else if (i === 4) {
        text(ctx, 'RAW TEXT  ·  image_to_string()', RC.x, RC.y + 10 * k, { size: 10 * k, color: C.muted, font: MONO, weight: 600 })
        rrect(ctx, RC.x, RC.y + 24 * k, RC.w * 0.62, RECEIPT.length * 22 * k + 20 * k, 10 * k)
        ctx.fillStyle = '#05070f'
        ctx.fill()
        ctx.strokeStyle = rgba(C.red, 0.4)
        ctx.stroke()
        RECEIPT.forEach((l, j) => errorText(ctx, l.ocr, truth(l), RC.x + 12 * k, RC.y + 44 * k + j * 22 * k, 11 * k, C.soft))
        ;['O read as 0', '5 read as S', 'columns lost', 'no structure'].forEach((p, j) => {
          chip(ctx, p, RC.x + RC.w * 0.66, RC.y + 40 * k + j * 30 * k, { color: C.red, size: 10.5 * k, h: 24 * k, fillAlpha: 0.16, alpha: easeOut(prog(L, 0.6 + j * 0.3, 0.3)) })
        })
      } else {
        const S = Math.min(44 * k, h * 0.085)
        const rp: Pt = { x: RC.x + S * 1.15, y: RC.y + S * 1.5 }
        robot(ctx, rp.x, rp.y, S, { color: C.violet, active: L < 2, t })
        text(ctx, 'gpt-5', rp.x, rp.y + S * 1.08, { size: 12.5 * k, weight: 600, align: 'center' })
        text(ctx, 'fixes + structures', rp.x, rp.y + S * 1.08 + 16 * k, { size: 10.5 * k, color: C.muted, align: 'center' })
        const jx = RC.x + RC.w * 0.3
        RECEIPT_JSON_LINES.forEach((ln, j) => {
          const a = easeOut(prog(L, 0.6 + j * 0.08, 0.3))
          const fixed = ln.includes('Corner') || ln.includes('3.20') || ln.includes('Orange') || ln.includes('"total"')
          text(ctx, ln, jx, RC.y + 14 * k + j * 17 * k, { size: 10.5 * k, color: fixed ? C.green : C.soft, font: MONO, alpha: a, weight: fixed ? 700 : 500 })
        })
        FIXES.forEach((f, j) => {
          chip(ctx, f, RC.x, RC.y + RC.h * 0.62 + j * 27 * k, { color: C.green, size: 10 * k, mono: true, h: 22 * k, fillAlpha: 0.14, alpha: easeOut(prog(L, 1.6 + j * 0.25, 0.3)) })
        })
      }
    } else {
      if (i === 0) {
        text(ctx, 'One model call, straight from pixels.', RC.x, RC.y + 30 * k, { size: 13 * k, color: C.muted })
      } else if (i === 1) {
        const S = Math.min(46 * k, h * 0.09)
        const rp: Pt = { x: RC.x + RC.w * 0.3, y: RC.y + RC.h * 0.38 }
        robot(ctx, rp.x, rp.y, S, { color: C.violet, active: true, t })
        text(ctx, 'gpt-5 reads the image', rp.x, rp.y + S * 1.12, { size: 11.5 * k, weight: 600, align: 'center' })
        text(ctx, 'layout and text together', rp.x, rp.y + S * 1.12 + 15 * k, { size: 9.5 * k, color: C.muted, align: 'center' })
        for (let n = 0; n < 16; n++) {
          const f = prog(L, 0.3 + n * 0.1, 0.8)
          if (f <= 0 || f >= 1) continue
          const gx = n % 4
          const gy = Math.floor(n / 4)
          const from = { x: P.x + (gx + 0.5) * (P.w / 4), y: P.y + (gy + 0.5) * (P.h / 4) }
          const u = easeInOut(f)
          const x = lerp(from.x, rp.x - S, u)
          const y = lerp(from.y, rp.y, u)
          const s = lerp(P.w / 5, 7 * k, u)
          rrect(ctx, x - s / 2, y - s / 2, s, s, 2)
          ctx.fillStyle = rgba(C.cyan, 0.3)
          ctx.fill()
          ctx.strokeStyle = C.cyan
          ctx.stroke()
        }
        chip(ctx, 'image → patches → tokens', RC.x + RC.w * 0.55, RC.y + RC.h * 0.38, { color: C.cyan, size: 10.5 * k, mono: true, h: 24 * k, fillAlpha: 0.16, alpha: prog(L, 0.5, 0.4) })
      } else if (i === 2) {
        text(ctx, 'STRUCTURED OUTPUT  ·  Receipt', RC.x, RC.y + 10 * k, { size: 10 * k, color: C.muted, font: MONO, weight: 600 })
        RECEIPT_JSON_LINES.forEach((ln, j) => {
          const a = easeOut(prog(L, 0.3 + j * 0.12, 0.3))
          text(ctx, ln, RC.x, RC.y + 34 * k + j * 18 * k, { size: 11 * k, color: '#86efac', font: MONO, alpha: a })
        })
        chip(ctx, 'no preprocessing · no boxes · no OCR typos', RC.x + RC.w * 0.5, RC.y + 60 * k, { color: C.green, size: 10 * k, h: 24 * k, fillAlpha: 0.14, alpha: prog(L, 2, 0.5) })
      } else {
        text(ctx, 'VALIDATE WITH A BUSINESS RULE', RC.x, RC.y + 10 * k, { size: 10 * k, color: C.muted, font: MONO, weight: 600 })
        const parts = RECEIPT.filter((l) => l.price && l.name !== 'TOTAL').map((l) => l.price)
        parts.forEach((p, j) => {
          const a = easeOut(prog(L, 0.3 + j * 0.2, 0.3))
          text(ctx, `${j === 0 ? '  ' : '+ '}${p.padStart(5, ' ')}`, RC.x + 20 * k, RC.y + 40 * k + j * 22 * k, { size: 13 * k, color: C.soft, font: MONO, alpha: a })
        })
        const sy2 = RC.y + 40 * k + parts.length * 22 * k
        ctx.strokeStyle = rgba(C.soft, prog(L, 1.4, 0.3))
        ctx.beginPath()
        ctx.moveTo(RC.x + 20 * k, sy2 - 8 * k)
        ctx.lineTo(RC.x + 110 * k, sy2 - 8 * k)
        ctx.stroke()
        text(ctx, '= 45.90', RC.x + 20 * k, sy2 + 8 * k, { size: 13 * k, color: C.text, font: MONO, weight: 700, alpha: prog(L, 1.5, 0.3) })
        if (L > 2) {
          glow(ctx, RC.x + RC.w * 0.55, sy2 - 40 * k, 80 * k, C.green, 0.2)
          chip(ctx, '✓ sum(items) == total (45.90)', RC.x + RC.w * 0.4, sy2 - 40 * k, { color: C.green, size: 12 * k, h: 30 * k, fillAlpha: 0.2, weight: 700 })
          text(ctx, 'Vision models can misread too. Cheap checks catch it.', RC.x + RC.w * 0.4, sy2, { size: 11 * k, color: C.muted })
        }
      }
    }
  })

  return <canvas ref={ref} className="stage-canvas" aria-label="OCR: reading a scanned receipt" />
}
