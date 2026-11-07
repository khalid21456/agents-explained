import { useRef } from 'react'
import { useCanvas } from '../hooks/useCanvas'
import { C, MONO, chip, chipWidth, clamp, easeInOut, easeOut, glow, lerp, prog, rgba, rrect, scaleFor, text } from '../lib/draw'

const BASE = ['An', 'AI', 'agent', 'is', 'a']

const STEPS: { c: [string, number][]; pick: number }[] = [
  { c: [['system', 0.46], ['program', 0.28], ['model', 0.14], ['loop', 0.07]], pick: 0 },
  { c: [['that', 0.58], ['which', 0.21], ['designed', 0.12], ['built', 0.05]], pick: 0 },
  { c: [['uses', 0.41], ['lets', 0.33], ['helps', 0.14], ['allows', 0.08]], pick: 1 },
  { c: [['an', 0.52], ['the', 0.27], ['its', 0.12], ['a', 0.05]], pick: 0 },
  { c: [['LLM', 0.63], ['AI', 0.18], ['model', 0.11], ['agent', 0.04]], pick: 0 },
  { c: [['decide', 0.44], ['choose', 0.29], ['call', 0.15], ['plan', 0.08]], pick: 0 },
  { c: [['what', 0.57], ['which', 0.2], ['how', 0.14], ['when', 0.06]], pick: 0 },
  { c: [['to', 0.71], ['it', 0.12], ['actions', 0.09], ['next', 0.04]], pick: 0 },
  { c: [['do', 0.66], ['call', 0.14], ['say', 0.1], ['try', 0.06]], pick: 0 },
]

const D = 3.0
const TAIL = 3.2
const TOTAL = STEPS.length * D + TAIL
const ALL = [...BASE, ...STEPS.map((s) => s.c[s.pick][0])]

export default function TokenCanvas() {
  const time = useRef(0)

  const ref = useCanvas(({ ctx, w, h, dt, t }) => {
    time.current = (time.current + dt) % TOTAL
    const tt = time.current
    const k = scaleFor(w, 720, 0.6)
    const pad = 26 * k
    const fs = 15 * k
    const chipH = 32 * k
    const gap = 8 * k

    const inTail = tt >= STEPS.length * D
    const si = Math.min(STEPS.length - 1, Math.floor(tt / D))
    const local = inTail ? D : tt - si * D
    const committed = BASE.length + (inTail ? STEPS.length : si + (local >= 2.2 ? 1 : 0))

    text(ctx, 'CONTEXT  ·  what the model has seen so far', pad, pad, { size: 11 * k, color: C.muted, font: MONO, weight: 500 })
    const stepLabel = inTail ? 'done' : `step ${si + 1} / ${STEPS.length}`
    text(ctx, stepLabel, w - pad, pad, { size: 11 * k, color: C.dim, font: MONO, align: 'right' })

    const pos: { x: number; y: number; w: number }[] = []
    let cx = pad
    let cy = pad + 22 * k + chipH / 2
    for (const tok of ALL) {
      const cw = chipWidth(ctx, tok, { color: C.cyan, size: fs })
      if (cx + cw > w - pad) {
        cx = pad
        cy += chipH + gap
      }
      pos.push({ x: cx, y: cy, w: cw })
      cx += cw + gap
    }

    const tailFade = inTail ? 1 - prog(tt, TOTAL - 0.6, 0.6) : 1
    for (let i = 0; i < committed; i++) {
      const isBase = i < BASE.length
      const isNewest = !isBase && i === committed - 1 && !inTail
      chip(ctx, ALL[i], pos[i].x, pos[i].y, {
        color: isBase ? C.muted : C.cyan,
        size: fs,
        h: chipH,
        fillAlpha: isBase ? 0.08 : isNewest ? 0.28 : 0.14,
        strokeAlpha: isBase ? 0.25 : isNewest ? 0.9 : 0.5,
        textColor: isBase ? C.soft : C.text,
        alpha: tailFade,
      })
    }

    if (committed < ALL.length) {
      const p = pos[committed]
      if (Math.sin(t * 6) > 0) {
        ctx.fillStyle = C.cyan
        ctx.fillRect(p.x + 2, p.y - chipH * 0.32, 2, chipH * 0.64)
      }
    }

    const barsTop = Math.max(h * 0.46, cy + chipH + 34 * k)
    const rowH = Math.min(46 * k, (h - barsTop - pad - 18 * k) / 4)
    text(ctx, 'NEXT-TOKEN PROBABILITIES', pad, barsTop, { size: 11 * k, color: C.muted, font: MONO })

    if (inTail) {
      const a = easeOut(prog(tt, STEPS.length * D, 0.6)) * tailFade
      text(ctx, '…and that is the whole trick.', w / 2, barsTop + rowH * 1.6, { size: 22 * k, color: C.text, align: 'center', weight: 600, alpha: a })
      text(ctx, 'One token at a time, thousands of times per answer.', w / 2, barsTop + rowH * 2.4, { size: 14 * k, color: C.muted, align: 'center', alpha: a })
      return
    }

    const step = STEPS[si]
    const grow = easeOut(prog(local, 0, 0.9))
    const sampleP = prog(local, 0.9, 0.6)
    const n = step.c.length
    const totalHops = 2 * n + step.pick
    const hl = local < 0.9 ? -1 : local < 1.5 ? Math.floor(easeOut(sampleP) * totalHops) % n : step.pick
    const lblW = 96 * k
    const pctW = 54 * k
    const barX = pad + lblW
    const barMax = w - pad - pctW - barX
    const fadeBars = 1 - prog(local, 2.5, 0.5)

    for (let i = 0; i < n; i++) {
      const [tok, p] = step.c[i]
      const y = barsTop + 22 * k + rowH * (i + 0.5)
      const isHl = i === hl
      const chosen = local >= 1.5 && i === step.pick
      ctx.save()
      ctx.globalAlpha = fadeBars
      if (isHl) {
        rrect(ctx, pad - 8 * k, y - rowH * 0.42, w - pad * 2 + 16 * k, rowH * 0.84, 10)
        ctx.fillStyle = rgba(chosen ? C.cyan : C.violet, 0.1)
        ctx.fill()
        ctx.strokeStyle = rgba(chosen ? C.cyan : C.violet, 0.6)
        ctx.stroke()
      }
      const flying = chosen && local < 2.2
      if (!(chosen && local >= 1.5)) {
        text(ctx, tok, pad + 4 * k, y, { size: fs, font: MONO, color: isHl ? C.text : C.soft })
      } else if (!flying) {
        text(ctx, tok, pad + 4 * k, y, { size: fs, font: MONO, color: C.dim })
      }
      rrect(ctx, barX, y - rowH * 0.16, barMax, rowH * 0.32, 6)
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      ctx.fill()
      const bw = Math.max(4, barMax * p * grow)
      const g = ctx.createLinearGradient(barX, 0, barX + bw, 0)
      g.addColorStop(0, rgba(C.violet, 0.9))
      g.addColorStop(1, rgba(chosen ? C.cyan : C.blue, 0.95))
      rrect(ctx, barX, y - rowH * 0.16, bw, rowH * 0.32, 6)
      ctx.fillStyle = g
      ctx.fill()
      text(ctx, `${Math.round(p * 100 * grow)}%`, w - pad, y, { size: 12 * k, font: MONO, color: C.muted, align: 'right' })
      ctx.restore()
    }

    if (step.pick !== 0 && local > 1.5 && local < 2.9) {
      text(ctx, 'sampled the 2nd choice, temperature adds variety', w - pad, barsTop, {
        size: 11 * k,
        font: MONO,
        color: C.amber,
        align: 'right',
        alpha: clamp((local - 1.5) * 3),
      })
    }

    if (local >= 1.5 && local < 2.2) {
      const f = easeInOut(prog(local, 1.5, 0.7))
      const target = pos[BASE.length + si]
      const fromY = barsTop + 22 * k + rowH * (step.pick + 0.5)
      const x = lerp(pad, target.x, f)
      const y = lerp(fromY, target.y, f) - Math.sin(f * Math.PI) * 40 * k
      glow(ctx, x + target.w / 2, y, 50 * k, C.cyan, 0.35)
      chip(ctx, step.c[step.pick][0], x, y, { color: C.cyan, size: fs, h: chipH, fillAlpha: 0.3, strokeAlpha: 1 })
    }
  })

  return <canvas ref={ref} className="stage-canvas" aria-label="Animation of an LLM predicting the next token" />
}
