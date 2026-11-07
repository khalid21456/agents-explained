import { useCanvas } from '../hooks/useCanvas'
import type { CanvasProps } from '../lessons/types'
import type { Experiment } from '../data/evaluation'
import { DATASET, METRICS, RUNS, checks, fmtMetric, scores } from '../data/evaluation'
import { sp } from '../lib/clock'
import type { Pt } from '../lib/draw'
import { C, MONO, TAU, chip, easeInOut, easeOut, glow, lerp, rgba, rrect, scaleFor, text } from '../lib/draw'
import { robot } from '../lib/icons'

function fit(ctx: CanvasRenderingContext2D, s: string, maxW: number) {
  if (ctx.measureText(s).width <= maxW) return s
  let out = s
  while (out.length > 1 && ctx.measureText(out + '…').width > maxW) out = out.slice(0, -1)
  return out + '…'
}

export default function EvalCanvas({ clock, opts }: CanvasProps) {
  const ref = useCanvas(({ ctx, w, h, t }) => {
    const c = clock.current
    const exp = (opts.experiment === 'v1' ? 'v1' : 'v2') as Experiment
    const run = RUNS[exp]
    const res = checks(exp)
    const k = scaleFor(w, 800, 0.55)
    const pad = 14 * k
    const fs = 10.5 * k

    const T = { x: pad, y: h * 0.06, w: w * 0.64 - pad }
    const cols = [0.04, 0.33, 0.2, 0.21, 0.07, 0.07, 0.08]
    const ab = (u: string) => (u === 'medium' ? 'med' : u)
    const colX: number[] = []
    let acc = T.x
    cols.forEach((cw) => {
      colX.push(acc)
      acc += cw * T.w
    })
    const colW = (j: number) => cols[j] * T.w
    const rowH = Math.min(30 * k, h * 0.066)
    const headY = T.y + 10 * k
    const rowY = (r: number) => headY + 22 * k + r * rowH

    text(ctx, `DATASET  support-triage  ·  experiment ${run.prefix}`, T.x, T.y - 2 * k, { size: 10 * k, color: C.muted, font: MONO })
    const heads = ['#', 'input ticket', 'expected', 'output', 'cat', 'urg', 'judge']
    const headOn = [c.step === 0, c.step === 0, c.step === 0, c.step === 1, c.step === 2, c.step === 2, c.step === 3]
    heads.forEach((hd, j) => text(ctx, hd.toUpperCase(), colX[j] + 4 * k, headY + 8 * k, { size: 9 * k, color: headOn[j] ? C.cyan : C.dim, font: MONO, weight: 600 }))
    ctx.strokeStyle = 'rgba(148,163,255,0.15)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(T.x, headY + 17 * k)
    ctx.lineTo(T.x + T.w, headY + 17 * k)
    ctx.stroke()

    const appP: Pt = { x: w * 0.83, y: h * 0.17 }
    const judgeP: Pt = { x: w * 0.83, y: h * 0.42 }
    const S = Math.min(30 * k, h * 0.055)

    const appRow = c.step === 1 ? Math.min(DATASET.length - 1, Math.floor(Math.max(0, c.local - 0.2) / 0.45)) : -1
    const judgeRow = c.step === 3 ? Math.min(DATASET.length - 1, Math.floor(Math.max(0, c.local - 0.2) / 0.45)) : -1

    DATASET.forEach((ex, r) => {
      const y = rowY(r) + rowH / 2
      const appear = easeOut(sp(c, 0, r * 0.3, 0.4))
      if (appear <= 0) return
      ctx.save()
      ctx.globalAlpha = appear
      const busy = r === appRow || r === judgeRow
      const regression = c.step === 5 && r === 4
      const fixed = c.step === 5 && r === 1
      if (busy || regression || fixed) {
        rrect(ctx, T.x - 4 * k, y - rowH / 2 + 2, T.w + 8 * k, rowH - 4, 6 * k)
        ctx.fillStyle = regression ? rgba(C.amber, 0.12) : fixed ? rgba(C.green, 0.1) : rgba(C.violet, 0.12)
        ctx.fill()
        if (regression || fixed) {
          ctx.strokeStyle = rgba(regression ? C.amber : C.green, 0.7)
          ctx.stroke()
        }
      }
      ctx.font = `500 ${fs}px "Inter", sans-serif`
      text(ctx, String(r + 1), colX[0] + 4 * k, y, { size: fs, color: C.dim, font: MONO })
      ctx.font = `500 ${fs}px "Inter", sans-serif`
      text(ctx, fit(ctx, ex.ticket, colW(1) - 8 * k), colX[1] + 4 * k, y, { size: fs, color: C.soft })
      ctx.font = `500 ${fs * 0.92}px "JetBrains Mono", monospace`
      text(ctx, fit(ctx, `${ex.category} · ${ab(ex.urgency)}`, colW(2) - 6 * k), colX[2] + 4 * k, y, { size: fs * 0.92, color: C.muted, font: MONO })

      const outAt = 0.2 + r * 0.45 + 0.4
      const outShown = c.step > 1 || (c.step === 1 && c.local >= outAt)
      if (outShown) {
        const o = run.outputs[r]
        const okC = o.category === ex.category
        const okU = o.urgency === ex.urgency
        ctx.font = `500 ${fs * 0.92}px "JetBrains Mono", monospace`
        const catW = ctx.measureText(o.category).width
        text(ctx, o.category, colX[3] + 4 * k, y, { size: fs * 0.92, color: c.step >= 2 && !okC ? C.red : C.text, font: MONO })
        text(ctx, ` · ${ab(o.urgency)}`, colX[3] + 4 * k + catW, y, { size: fs * 0.92, color: c.step >= 2 && !okU ? C.red : C.text, font: MONO })
      }
      const mark = (ok: boolean, x: number, f: number) => {
        if (f <= 0) return
        ctx.save()
        ctx.globalAlpha *= f
        ctx.fillStyle = rgba(ok ? C.green : C.red, 0.16)
        ctx.beginPath()
        ctx.arc(x, y, 9 * k, 0, TAU)
        ctx.fill()
        text(ctx, ok ? '✓' : '✗', x, y + 0.5, { size: 11 * k, color: ok ? C.green : C.red, align: 'center', weight: 700 })
        ctx.restore()
      }
      mark(res[r].category, colX[4] + colW(4) / 2, easeOut(sp(c, 2, r * 0.3, 0.3)))
      mark(res[r].urgency, colX[5] + colW(5) / 2, easeOut(sp(c, 2, 0.15 + r * 0.3, 0.3)))
      const jAt = 0.2 + r * 0.45 + 0.4
      if (c.step > 3 || (c.step === 3 && c.local >= jAt)) {
        const v = res[r].judge
        const col = v >= 0.8 ? C.green : v >= 0.6 ? C.amber : C.red
        text(ctx, v.toFixed(2), colX[6] + 4 * k, y, { size: fs, color: col, font: MONO, weight: 600 })
      }
      ctx.restore()
    })
    if (c.step === 5) {
      const y5 = rowY(4) + rowH / 2
      const y2 = rowY(1) + rowH / 2
      const tx = T.x + T.w + 6 * k
      text(ctx, '← v1 ✓, v2 ✗: regression', tx, y5, { size: 9.5 * k, color: C.amber, weight: 600 })
      text(ctx, '← v1 ✗, v2 ✓: fixed', tx, y2, { size: 9.5 * k, color: C.green, weight: 600 })
    }

    const packet = (from: Pt, mid: Pt, to: Pt, f: number, color: string) => {
      const u = easeInOut(f)
      const p = u < 0.5 ? { x: lerp(from.x, mid.x, u * 2), y: lerp(from.y, mid.y, u * 2) } : { x: lerp(mid.x, to.x, u * 2 - 1), y: lerp(mid.y, to.y, u * 2 - 1) }
      glow(ctx, p.x, p.y, 16 * k, color, 0.8)
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 2.8 * k, 0, TAU)
      ctx.fill()
    }
    if (c.step === 1 || c.step === 3) {
      const r = c.step === 1 ? appRow : judgeRow
      const f = Math.min(1, Math.max(0, (c.local - 0.2 - r * 0.45) / 0.4))
      const y = rowY(r) + rowH / 2
      if (f > 0 && f < 1) {
        if (c.step === 1) packet({ x: colX[1] + colW(1) * 0.6, y }, { x: appP.x - S, y: appP.y }, { x: colX[3] + 30 * k, y }, f, C.violet)
        else packet({ x: colX[3] + 30 * k, y }, { x: judgeP.x - S, y: judgeP.y }, { x: colX[6] + 12 * k, y }, f, C.amber)
      }
    }

    robot(ctx, appP.x, appP.y, S, { color: C.violet, active: c.step === 1 && c.local < 3.0, t })
    text(ctx, 'target app', appP.x, appP.y + S * 1.15, { size: 11.5 * k, weight: 600, align: 'center' })
    text(ctx, `triage ${exp}`, appP.x, appP.y + S * 1.15 + 14 * k, { size: 9.5 * k, color: C.muted, font: MONO, align: 'center' })

    robot(ctx, judgeP.x, judgeP.y, S, { color: C.amber, active: c.step === 3 && c.local < 3.0, t, accessory: 'lens' })
    text(ctx, 'LLM judge', judgeP.x, judgeP.y + S * 1.15, { size: 11.5 * k, weight: 600, align: 'center' })
    text(ctx, 'gpt-5', judgeP.x, judgeP.y + S * 1.15 + 14 * k, { size: 9.5 * k, color: C.muted, font: MONO, align: 'center' })

    if (c.step === 2) {
      chip(ctx, 'correct_category()  correct_urgency()', appP.x, h * 0.31, { color: C.cyan, size: 9.5 * k, mono: true, align: 'center', h: 22 * k, fillAlpha: 0.15, alpha: easeOut(sp(c, 2, 0, 0.4)) })
    }

    const B = { x: pad, y: h * 0.6, w: w * 0.6, h: h * 0.36 }
    const G = { x: w * 0.66, y: h * 0.6, w: w * 0.34 - pad, h: h * 0.36 }
    if (c.step < 4) {
      rrect(ctx, B.x, B.y, B.w, B.h, 12 * k)
      ctx.setLineDash([4, 6])
      ctx.strokeStyle = 'rgba(148,163,255,0.15)'
      ctx.stroke()
      ctx.setLineDash([])
      text(ctx, 'aggregate scores appear after evaluation', B.x + B.w / 2, B.y + B.h / 2, { size: 11 * k, color: C.dim, align: 'center' })
    } else {
      const comparing = c.step >= 5
      const s1 = scores('v1')
      const s2 = scores('v2')
      const cur = scores(exp)
      text(ctx, comparing ? 'COMPARE EXPERIMENTS' : `SCORES  ·  ${run.label}`, B.x, B.y + 6 * k, { size: 10 * k, color: C.muted, font: MONO, weight: 600 })
      if (comparing) {
        text(ctx, '■ v1', B.x + B.w - 90 * k, B.y + 6 * k, { size: 10 * k, color: rgba(C.muted, 0.9), font: MONO })
        text(ctx, '■ v2', B.x + B.w - 44 * k, B.y + 6 * k, { size: 10 * k, color: C.cyan, font: MONO })
      }
      const mh = (B.h - 24 * k) / 3
      const barX = B.x + 150 * k
      const barW = B.w - 150 * k - 56 * k
      METRICS.forEach((m, j) => {
        const y = B.y + 24 * k + j * mh + mh * 0.45
        text(ctx, m.label, B.x, y, { size: 11 * k, color: C.soft })
        const grow = easeOut(sp(c, 4, j * 0.2, 0.8))
        const drawBar = (val: number, yy: number, hh: number, col: string) => {
          rrect(ctx, barX, yy - hh / 2, barW, hh, hh / 2)
          ctx.fillStyle = 'rgba(255,255,255,0.05)'
          ctx.fill()
          rrect(ctx, barX, yy - hh / 2, Math.max(hh, barW * val * grow), hh, hh / 2)
          ctx.fillStyle = col
          ctx.fill()
        }
        if (comparing) {
          const cf = easeOut(sp(c, 5, j * 0.2, 0.6))
          drawBar(s1[m.key], y - 6 * k, 8 * k, rgba(C.muted, 0.6))
          drawBar(s2[m.key] * (0.4 + 0.6 * cf), y + 6 * k, 8 * k, C.cyan)
          const d = s2[m.key] - s1[m.key]
          const dTxt = m.percent ? `${d >= 0 ? '+' : ''}${Math.round(d * 100)}%` : `${d >= 0 ? '+' : ''}${d.toFixed(2)}`
          text(ctx, Math.abs(d) < 0.005 ? '±0' : dTxt, barX + barW + 8 * k, y, { size: 11 * k, color: d > 0.005 ? C.green : d < -0.005 ? C.red : C.amber, font: MONO, weight: 600 })
        } else {
          const v = cur[m.key]
          drawBar(v, y, 12 * k, v >= m.threshold ? C.green : C.red)
          text(ctx, fmtMetric(m, v * grow), barX + barW + 8 * k, y, { size: 11.5 * k, color: C.text, font: MONO, weight: 600 })
        }
        const tx = barX + barW * m.threshold
        ctx.strokeStyle = rgba(C.amber, 0.8)
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(tx, y - 14 * k)
        ctx.lineTo(tx, y + 14 * k)
        ctx.stroke()
        ctx.setLineDash([])
        text(ctx, `≥${fmtMetric(m, m.threshold)}`, tx, y - 19 * k, { size: 8.5 * k, color: C.amber, font: MONO, align: 'center' })
      })
    }

    rrect(ctx, G.x, G.y, G.w, G.h, 12 * k)
    if (c.step < 6) {
      ctx.setLineDash([4, 6])
      ctx.strokeStyle = 'rgba(148,163,255,0.15)'
      ctx.stroke()
      ctx.setLineDash([])
      text(ctx, 'CI release gate', G.x + G.w / 2, G.y + G.h / 2, { size: 11 * k, color: C.dim, align: 'center' })
    } else {
      const cur = scores(exp)
      const pass = METRICS.every((m) => cur[m.key] >= m.threshold)
      const col = pass ? C.green : C.red
      const a = easeOut(sp(c, 6, 0, 0.6))
      glow(ctx, G.x + G.w / 2, G.y + G.h / 2, G.w * 0.6, col, 0.15 * a)
      rrect(ctx, G.x, G.y, G.w, G.h, 12 * k)
      ctx.fillStyle = '#05070f'
      ctx.fill()
      ctx.strokeStyle = rgba(col, 0.7)
      ctx.lineWidth = 1.4
      ctx.stroke()
      text(ctx, `CI GATE  ·  ${exp}`, G.x + 12 * k, G.y + 16 * k, { size: 10 * k, color: C.muted, font: MONO, weight: 600 })
      METRICS.forEach((m, j) => {
        const ok = cur[m.key] >= m.threshold
        const f = easeOut(sp(c, 6, 0.2 + j * 0.25, 0.3))
        text(ctx, `${ok ? '✓' : '✗'} ${m.key}`, G.x + 12 * k, G.y + 42 * k + j * 20 * k, { size: 11 * k, color: ok ? C.green : C.red, font: MONO, alpha: f })
        text(ctx, `${fmtMetric(m, cur[m.key])} / ${fmtMetric(m, m.threshold)}`, G.x + G.w - 12 * k, G.y + 42 * k + j * 20 * k, { size: 10.5 * k, color: C.muted, font: MONO, align: 'right', alpha: f })
      })
      const vf = easeOut(sp(c, 6, 1.0, 0.4))
      chip(ctx, pass ? '✓ PASS · ship it' : '✗ BLOCKED · fix before release', G.x + 12 * k, G.y + G.h - 20 * k, { color: col, size: 11.5 * k, h: 28 * k, fillAlpha: 0.2, weight: 700, alpha: vf })
    }
  })

  return <canvas ref={ref} className="stage-canvas" aria-label="Evaluating an LLM app on a dataset with code checks and an LLM judge" />
}
