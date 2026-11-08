import { useCanvas } from '../hooks/useCanvas'
import type { CanvasProps } from '../lessons/types'
import type { SoScenario } from '../data/structured'
import { FREE_TEXT, INVOICE_LINES, JSON_SCHEMA_LINES, PYDANTIC_LINES, SO_FLOWS } from '../data/structured'
import type { Pt } from '../lib/draw'
import { C, FONT, MONO, TAU, chip, easeInOut, easeOut, glow, lerp, prog, rgba, rrect, scaleFor, text, wrapLines } from '../lib/draw'
import { robot } from '../lib/icons'

function card(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, active: boolean, k: number) {
  if (active) glow(ctx, x + w / 2, y + h / 2, Math.max(w, h) * 0.6, color, 0.12)
  rrect(ctx, x, y, w, h, 12 * k)
  ctx.fillStyle = '#05070f'
  ctx.fill()
  ctx.strokeStyle = rgba(color, active ? 0.7 : 0.25)
  ctx.lineWidth = active ? 1.5 : 1
  ctx.stroke()
}

function packet(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, f: number, color: string, k: number, label?: string) {
  if (f <= 0 || f >= 1) return
  const u = easeInOut(f)
  const p = { x: lerp(from.x, to.x, u), y: lerp(from.y, to.y, u) - Math.sin(u * Math.PI) * 20 * k }
  glow(ctx, p.x, p.y, 20 * k, color, 0.8)
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(p.x, p.y, 3.2 * k, 0, TAU)
  ctx.fill()
  if (label) chip(ctx, label, p.x, p.y - 18 * k, { color, size: 9.5 * k, mono: true, align: 'center', h: 20 * k, fillAlpha: 0.2 })
}

export default function StructuredCanvas({ clock, opts }: CanvasProps) {
  const ref = useCanvas(({ ctx, w, h, t }) => {
    const c = clock.current
    const sc = (opts.scenario === 'retry' ? 'retry' : 'valid') as SoScenario
    const flow = SO_FLOWS[sc]
    const i = Math.min(c.step, flow.length - 1)
    const st = flow[i]
    const L = c.local
    const k = scaleFor(w, 800, 0.55)
    const fs = 10.5 * k
    const lh = fs * 1.6

    const D = { x: w * 0.03, y: h * 0.08, w: w * 0.25, h: h * 0.42 }
    const R: Pt = { x: w * 0.37, y: h * 0.3 }
    const Sc = { x: w * 0.47, y: h * 0.05, w: w * 0.5, h: h * 0.36 }
    const O = { x: w * 0.47, y: h * 0.45, w: w * 0.5, h: h * 0.4 }
    const S = Math.min(32 * k, h * 0.06)

    card(ctx, D.x, D.y, D.w, D.h, C.blue, st.phase === 'free' || st.phase === 'generate', k)
    text(ctx, 'INPUT  ·  invoice.pdf', D.x + 10 * k, D.y + 14 * k, { size: 9 * k, color: C.muted, font: MONO, weight: 600 })
    INVOICE_LINES.forEach((ln, j) => {
      text(ctx, ln, D.x + 10 * k, D.y + 34 * k + j * lh, { size: (j === 0 ? 11.5 : 10) * k, color: j === 0 ? C.text : C.soft, font: j >= 3 ? MONO : FONT, weight: j === 0 ? 700 : 400 })
    })

    const thinking = (st.phase === 'free' && L > 0.6 && L < 2) || ((st.phase === 'generate' || st.phase === 'retry') && L > 0.6 && L < 2.4)
    robot(ctx, R.x, R.y, S, { color: C.violet, active: thinking, t })
    text(ctx, 'gpt-5', R.x, R.y + S * 1.15, { size: 10 * k, color: C.muted, font: MONO, align: 'center' })

    const schemaOn = st.phase !== 'free'
    card(ctx, Sc.x, Sc.y, Sc.w, Sc.h, C.amber, st.phase === 'schema' || st.phase === 'jsonschema', k)
    if (!schemaOn) {
      text(ctx, 'SCHEMA', Sc.x + 12 * k, Sc.y + 14 * k, { size: 9 * k, color: C.dim, font: MONO, weight: 600 })
      text(ctx, 'no schema: the model can answer in any shape', Sc.x + Sc.w / 2, Sc.y + Sc.h / 2, { size: 11 * k, color: C.dim, align: 'center' })
    } else if (st.phase === 'jsonschema') {
      text(ctx, 'JSON SCHEMA  ·  sent with the request', Sc.x + 12 * k, Sc.y + 14 * k, { size: 9 * k, color: C.amber, font: MONO, weight: 600 })
      JSON_SCHEMA_LINES.forEach((ln, j) => {
        const a = easeOut(prog(L, j * 0.12, 0.3))
        text(ctx, ln, Sc.x + 12 * k, Sc.y + 34 * k + j * lh * 0.92, { size: 9.5 * k, color: C.soft, font: MONO, alpha: a })
      })
    } else {
      text(ctx, 'SCHEMA  ·  Pydantic', Sc.x + 12 * k, Sc.y + 14 * k, { size: 9 * k, color: C.amber, font: MONO, weight: 600 })
      const fieldsShown = st.fields ?? []
      PYDANTIC_LINES.forEach((ln, j) => {
        const a = st.phase === 'schema' ? easeOut(prog(L, 0.2 + j * 0.3, 0.3)) : 1
        const fi = fieldsShown.findIndex((f) => f.key === ln.field)
        const filling = (st.phase === 'generate' || st.phase === 'retry') && fi >= 0 && L > 0.9 + fi * 0.3 && L < 0.9 + fi * 0.3 + 0.5
        const y = Sc.y + 36 * k + j * lh
        if (filling) {
          rrect(ctx, Sc.x + 6 * k, y - lh / 2, Sc.w - 12 * k, lh, 5 * k)
          ctx.fillStyle = rgba(C.amber, 0.14)
          ctx.fill()
        }
        text(ctx, ln.text, Sc.x + 12 * k, y, { size: 10.5 * k, color: j === 0 ? C.violet : C.soft, font: MONO, alpha: a })
      })
    }

    card(ctx, O.x, O.y, O.w, O.h, st.phase === 'validate-fail' ? C.red : st.phase === 'free' ? C.red : C.green, st.phase !== 'schema' && st.phase !== 'jsonschema', k)
    text(ctx, st.phase === 'free' ? 'OUTPUT  ·  str' : 'OUTPUT  ·  JSON', O.x + 12 * k, O.y + 14 * k, { size: 9 * k, color: C.muted, font: MONO, weight: 600 })

    if (st.phase === 'free') {
      const typed = prog(L, 1.0, 1.0)
      ctx.font = `400 ${11.5 * k}px ${FONT}`
      wrapLines(ctx, FREE_TEXT.slice(0, Math.floor(FREE_TEXT.length * typed)), O.w - 24 * k).forEach((ln, j) => {
        text(ctx, ln, O.x + 12 * k, O.y + 36 * k + j * 17 * k, { size: 11.5 * k, color: C.soft })
      })
      if (L > 2.2) chip(ctx, 'json.loads(...) → JSONDecodeError', O.x + 12 * k, O.y + O.h - 22 * k, { color: C.red, size: 10.5 * k, mono: true, h: 24 * k, fillAlpha: 0.2, weight: 600 })
    } else if (st.fields) {
      const gen = st.phase === 'generate' || st.phase === 'retry'
      const checking = st.phase === 'validate-ok' || st.phase === 'validate-fail' || st.phase === 'use'
      text(ctx, '{', O.x + 12 * k, O.y + 32 * k, { size: 11 * k, color: C.soft, font: MONO })
      st.fields.forEach((f, j) => {
        const appear = gen ? prog(L, 0.9 + j * 0.3, 0.4) : 1
        if (appear <= 0) return
        const y = O.y + 32 * k + (j + 1) * lh * 1.12
        const showMark = checking && (st.phase === 'use' || L > 0.3 + j * 0.25)
        const bad = showMark && !f.ok
        const valueColor = bad ? C.red : st.phase === 'retry' && (f.key === 'currency' || f.key === 'total') ? C.green : '#86efac'
        ctx.font = `500 ${10.5 * k}px ${MONO}`
        const keyTxt = `  "${f.key}": `
        const kw = ctx.measureText(keyTxt).width
        text(ctx, keyTxt, O.x + 12 * k, y, { size: 10.5 * k, color: C.blue, font: MONO, alpha: appear })
        const full = f.value + (j < st.fields!.length - 1 ? ',' : '')
        text(ctx, gen ? full.slice(0, Math.ceil(full.length * appear)) : full, O.x + 12 * k + kw, y, { size: 10.5 * k, color: valueColor, font: MONO })
        if (showMark) {
          const mx = O.x + O.w - 14 * k
          text(ctx, f.ok ? '✓' : '✗', mx, y, { size: 12 * k, color: f.ok ? C.green : C.red, align: 'right', weight: 700 })
          const note = f.ok ? `→ ${f.parsed}` : (f.error ?? '')
          text(ctx, note, mx - 16 * k, y, { size: 9.5 * k, color: f.ok ? C.muted : C.red, align: 'right', font: f.ok ? MONO : FONT })
        }
      })
      text(ctx, '}', O.x + 12 * k, O.y + 32 * k + (st.fields.length + 1) * lh * 1.12, { size: 11 * k, color: C.soft, font: MONO })
      if (st.phase === 'validate-fail' && L > 1.6) chip(ctx, 'ValidationError: 2 errors', O.x + 12 * k, O.y + O.h - 20 * k, { color: C.red, size: 10.5 * k, mono: true, h: 24 * k, fillAlpha: 0.2, weight: 600 })
      if (st.phase === 'validate-ok' && L > 1.6) chip(ctx, '✓ valid Invoice object', O.x + 12 * k, O.y + O.h - 20 * k, { color: C.green, size: 10.5 * k, h: 24 * k, fillAlpha: 0.2, weight: 600 })
      if (st.phase === 'retry') chip(ctx, 'retry 1 · errors sent back to the model', O.x + 12 * k, O.y + O.h - 20 * k, { color: C.amber, size: 10.5 * k, h: 24 * k, fillAlpha: 0.18, weight: 600 })
    } else {
      text(ctx, 'waiting for a schema…', O.x + O.w / 2, O.y + O.h / 2, { size: 11 * k, color: C.dim, align: 'center' })
    }

    const docEdge = { x: D.x + D.w, y: D.y + D.h * 0.45 }
    if (st.phase === 'free' || st.phase === 'generate') packet(ctx, docEdge, { x: R.x - S, y: R.y }, prog(L, 0, 0.6), C.blue, k, st.phase === 'free' ? 'prompt' : 'invoice text')
    if (st.phase === 'jsonschema') packet(ctx, { x: Sc.x, y: Sc.y + Sc.h * 0.5 }, { x: R.x + S, y: R.y - S * 0.3 }, prog(L, 1.2, 0.9), C.amber, k, 'JSON Schema')
    if (st.phase === 'retry') packet(ctx, { x: O.x, y: O.y + O.h * 0.5 }, { x: R.x + S, y: R.y + S * 0.4 }, prog(L, 0, 0.7), C.red, k, '2 errors')
    if (st.phase === 'free' || st.phase === 'generate' || st.phase === 'retry') {
      const start = st.phase === 'retry' ? 0.6 : 0.6
      packet(ctx, { x: R.x + S, y: R.y + S * 0.3 }, { x: O.x, y: O.y + 30 * k }, prog(L, start + 0.1, 0.4), C.violet, k)
    }

    const B = { x: w * 0.03, y: h * 0.89, w: w * 0.94 }
    if (st.phase === 'use') {
      const lines = ['invoice.total → 1240.0', 'invoice.invoice_date → date(2026, 3, 3)', 'total > 1000 → request_approval()']
      let x = B.x
      lines.forEach((ln, j) => {
        const a = easeOut(prog(L, 0.3 + j * 0.4, 0.4))
        const wv = chip(ctx, ln, x, B.y, { color: j === 2 ? C.pink : C.cyan, size: 10.5 * k, mono: true, h: 26 * k, fillAlpha: 0.16, alpha: a })
        x += wv + 8 * k
      })
    } else {
      text(ctx, 'YOUR CODE  ·  ' + (st.phase === 'free' ? 'has to parse prose with regexes' : 'will get a typed Python object'), B.x, B.y, { size: 10 * k, color: C.dim, font: MONO })
    }

    if (st.phase === 'free' || st.phase === 'generate' || st.phase === 'retry') {
      ctx.strokeStyle = 'rgba(148,163,255,0.15)'
      ctx.setLineDash([4, 6])
      ctx.beginPath()
      ctx.moveTo(docEdge.x, docEdge.y)
      ctx.lineTo(R.x - S, R.y)
      ctx.moveTo(R.x + S, R.y + S * 0.3)
      ctx.lineTo(O.x, O.y + 30 * k)
      ctx.stroke()
      ctx.setLineDash([])
    }
  })

  return <canvas ref={ref} className="stage-canvas" aria-label="Structured output: schema, generation and validation" />
}
