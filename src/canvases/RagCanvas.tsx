import { useCanvas } from '../hooks/useCanvas'
import type { CanvasProps } from '../lessons/types'
import { RAG_ANSWER, RAG_DOCS, RAG_QUERY, RAG_QUESTION, RAG_TOP, RAG_WRONG } from '../data/rag'
import { sp } from '../lib/clock'
import type { Pt } from '../lib/draw'
import { C, DISPLAY, FONT, MONO, TAU, chip, chipWidth, easeInOut, easeOut, glow, lerp, rgba, rrect, scaleFor, text, wrapLines } from '../lib/draw'
import { database, doc, person, robot } from '../lib/icons'

export default function RagCanvas({ clock }: CanvasProps) {
  const ref = useCanvas(({ ctx, w, h, t }) => {
    const c = clock.current
    const i = c.step
    const k = scaleFor(w, 800, 0.55)
    const pad = 16 * k

    const V = { x: w * 0.5, y: h * 0.08, w: w * 0.47, h: h * 0.5 }
    const vp = (vx: number, vy: number): Pt => ({ x: V.x + vx * V.w, y: V.y + vy * V.h })

    text(ctx, '1 · INDEXING  (offline, once)', pad, pad + 4 * k, { size: 10.5 * k, color: i >= 1 && i <= 4 ? C.cyan : C.muted, font: MONO, weight: 600 })
    text(ctx, '2 · QUERY  (every question)', pad, h * 0.6, { size: 10.5 * k, color: i >= 5 || i === 0 ? C.cyan : C.muted, font: MONO, weight: 600 })

    rrect(ctx, V.x, V.y, V.w, V.h, 14 * k)
    ctx.fillStyle = 'rgba(255,255,255,0.015)'
    ctx.fill()
    const stored = sp(c, 4, 0, 0.8)
    ctx.strokeStyle = rgba(C.violet, 0.15 + stored * 0.35)
    ctx.lineWidth = 1.2
    ctx.stroke()
    database(ctx, V.x + 26 * k, V.y + 26 * k, 16 * k, { color: C.violet, active: c.step === 4 || c.step === 6, t })
    text(ctx, 'VECTOR STORE', V.x + 50 * k, V.y + 22 * k, { size: 10.5 * k, color: C.muted, font: MONO })
    if (i >= 4) text(ctx, `${9} vectors · 1536 dims`, V.x + 50 * k, V.y + 37 * k, { size: 10 * k, color: C.violet, font: MONO, alpha: stored })
    if (i < 3) text(ctx, i === 0 ? 'empty: no knowledge base yet' : 'waiting for embeddings…', V.x + V.w / 2, V.y + V.h / 2, { size: 12 * k, color: C.dim, align: 'center' })

    if (i >= 4) {
      RAG_DOCS.forEach((d) => {
        const cx = d.chunks.reduce((a, ch) => a + ch.vx, 0) / 3
        const cy = d.chunks.reduce((a, ch) => a + ch.vy, 0) / 3
        const p = vp(cx, cy)
        glow(ctx, p.x, p.y, V.h * 0.32, d.color, 0.12 * stored)
      })
    }

    const docX = Math.max(w * 0.06, 54 * k)
    const rowY = (r: number) => h * (0.17 + r * 0.14)
    const ds = Math.min(18 * k, h * 0.035)
    const docsIn = i === 0 ? 0 : easeOut(sp(c, 1, 0, 0.8))
    const chipStart = docX + 48 * k

    const chipPos: Pt[][] = RAG_DOCS.map((d, r) => {
      let x = chipStart
      return d.chunks.map((ch) => {
        const cw = chipWidth(ctx, ch.short, { color: d.color, size: 10 * k })
        const p = { x, y: rowY(r) }
        x += cw + 6 * k
        return p
      })
    })

    RAG_DOCS.forEach((d, r) => {
      const y = rowY(r)
      ctx.save()
      ctx.globalAlpha = i === 0 ? 0.18 : docsIn
      doc(ctx, docX, y, ds, { color: d.color, active: c.step === 1 || c.step === 2, t })
      text(ctx, d.name, docX, y + ds * 0.95 + 6 * k, { size: 9 * k, color: C.muted, font: MONO, align: 'center' })
      ctx.restore()

      d.chunks.forEach((ch, j) => {
        const split = easeOut(sp(c, 2, r * 0.25 + j * 0.15, 0.5))
        if (split <= 0) return
        const target = chipPos[r][j]
        const x = lerp(docX, target.x, split)
        const emb = sp(c, 3, (r * 3 + j) * 0.09, 0.7)
        chip(ctx, ch.short, x, target.y, {
          color: d.color,
          size: 10 * k,
          h: 22 * k,
          alpha: split,
          fillAlpha: emb >= 1 ? 0.28 : 0.12,
          strokeAlpha: emb >= 1 ? 0.9 : 0.5,
        })
        if (emb > 0 && emb < 1) {
          const cw = chipWidth(ctx, ch.short, { color: d.color, size: 10 * k })
          const from = { x: target.x + cw / 2, y: target.y }
          const to = vp(ch.vx, ch.vy)
          const u = easeInOut(emb)
          const px = lerp(from.x, to.x, u)
          const py = lerp(from.y, to.y, u) - Math.sin(u * Math.PI) * 30 * k
          glow(ctx, px, py, 16 * k, d.color, 0.8)
          ctx.fillStyle = '#fff'
          ctx.beginPath()
          ctx.arc(px, py, 2.6 * k, 0, TAU)
          ctx.fill()
        }
      })
    })
    if (i === 2) {
      text(ctx, 'chunk_size=500 · overlap=50', chipStart, rowY(2) + 34 * k, { size: 10 * k, color: C.dim, font: MONO, alpha: sp(c, 2, 1.2, 0.5) })
    }
    if (i === 3) {
      text(ctx, 'embed(chunk) → [0.021, -0.113, 0.087, …]', chipStart, rowY(2) + 34 * k, { size: 10 * k, color: C.cyan, font: MONO, alpha: sp(c, 3, 0.2, 0.5) })
    }

    const top = new Set(RAG_TOP.map((r) => `${r.doc}-${r.chunk}`))
    const lit = i >= 6
    RAG_DOCS.forEach((d, r) =>
      d.chunks.forEach((ch, j) => {
        const emb = sp(c, 3, (r * 3 + j) * 0.09, 0.7)
        if (emb < 1) return
        const p = vp(ch.vx, ch.vy)
        const hit = lit && top.has(`${r}-${j}`)
        if (hit) glow(ctx, p.x, p.y, 24 * k, d.color, 0.6)
        ctx.fillStyle = d.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, (hit ? 5 : 3.6) * k, 0, TAU)
        ctx.fill()
        const right = ch.vx < 0.7
        const rank = RAG_TOP.findIndex((tt) => tt.doc === r && tt.chunk === j)
        const scored = hit && rank >= 0 && sp(c, 6, 0.6 + rank * 0.2, 0.3) >= 1
        const label = scored ? `#${rank + 1} ${ch.short}  ${RAG_TOP[rank].score.toFixed(2)}` : ch.short
        text(ctx, label, p.x + (right ? 9 : -9) * k, p.y, { size: 10 * k, color: hit ? C.text : C.muted, align: right ? 'left' : 'right', weight: hit ? 600 : 400 })
      }),
    )

    const person0 = { x: w * 0.045, y: h * 0.69 }
    const qShow = i === 0 || i >= 5 ? (i === 0 ? 1 : easeOut(sp(c, 5, 0, 0.5))) : 0
    if (qShow > 0) {
      person(ctx, person0.x, person0.y, 14 * k, { color: C.cyan, active: false, t })
      ctx.font = `600 ${11.5 * k}px ${FONT}`
      chip(ctx, RAG_QUESTION, person0.x + 22 * k, person0.y, { color: C.cyan, size: 11 * k, h: 26 * k, alpha: qShow, fillAlpha: 0.2, weight: 600 })
    }

    const qp = vp(RAG_QUERY.vx, RAG_QUERY.vy)
    const qFly = easeInOut(sp(c, 5, 0.5, 0.8))
    if (i >= 5 && qFly > 0) {
      const from = { x: person0.x + 140 * k, y: person0.y }
      const px = lerp(from.x, qp.x, qFly)
      const py = lerp(from.y, qp.y, qFly)
      glow(ctx, px, py, 26 * k, C.cyan, 0.7)
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(px, py, 4.5 * k, 0, TAU)
      ctx.fill()
      if (qFly >= 1) {
        ctx.strokeStyle = C.cyan
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(qp.x, qp.y, 9 * k, 0, TAU)
        ctx.stroke()
        if (i === 5) text(ctx, 'embed(question)', qp.x, qp.y - 18 * k, { size: 10 * k, color: C.cyan, font: MONO, align: 'center' })
      }
    }

    if (i >= 6) {
      const ring = easeOut(sp(c, 6, 0, 1.0))
      const far = Math.max(...RAG_TOP.map((r) => {
        const p = vp(RAG_DOCS[r.doc].chunks[r.chunk].vx, RAG_DOCS[r.doc].chunks[r.chunk].vy)
        return Math.hypot(p.x - qp.x, p.y - qp.y)
      }))
      ctx.strokeStyle = rgba(C.cyan, 0.55)
      ctx.setLineDash([4, 5])
      ctx.lineDashOffset = -t * 20
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(qp.x, qp.y, (far + 12 * k) * ring, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      RAG_TOP.forEach((r, j) => {
        const f = easeOut(sp(c, 6, 0.6 + j * 0.2, 0.3))
        if (f <= 0) return
        const ch = RAG_DOCS[r.doc].chunks[r.chunk]
        const p = vp(ch.vx, ch.vy)
        ctx.strokeStyle = rgba(C.cyan, 0.85)
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(qp.x, qp.y)
        ctx.lineTo(lerp(qp.x, p.x, f), lerp(qp.y, p.y, f))
        ctx.stroke()
      })
    }

    const P = { x: pad, y: h * 0.76, w: w * 0.44, h: h * 0.21 }
    if (i >= 7) {
      rrect(ctx, P.x, P.y, P.w, P.h, 12 * k)
      ctx.fillStyle = '#05070f'
      ctx.fill()
      ctx.strokeStyle = rgba(C.violet, 0.45)
      ctx.lineWidth = 1.2
      ctx.stroke()
      text(ctx, 'AUGMENTED PROMPT', P.x + 12 * k, P.y + 14 * k, { size: 9.5 * k, color: C.violet, font: MONO, weight: 600 })
      const lh = 15 * k
      RAG_TOP.forEach((r, j) => {
        const f = easeInOut(sp(c, 7, j * 0.25, 0.8))
        if (f <= 0) return
        const d = RAG_DOCS[r.doc]
        const ch = d.chunks[r.chunk]
        const target = { x: P.x + 12 * k, y: P.y + 34 * k + j * lh }
        if (f < 1) {
          const from = vp(ch.vx, ch.vy)
          const px = lerp(from.x, target.x + 60 * k, f)
          const py = lerp(from.y, target.y, f) - Math.sin(f * Math.PI) * 40 * k
          glow(ctx, px, py, 20 * k, d.color, 0.7)
          chip(ctx, ch.short, px, py, { color: d.color, size: 10 * k, h: 20 * k, align: 'center', fillAlpha: 0.25 })
        } else {
          ctx.font = `500 ${10.5 * k}px ${FONT}`
          const line = wrapLines(ctx, `[${j + 1}] ${ch.text}`, P.w - 24 * k)[0]
          text(ctx, line, target.x, target.y, { size: 10.5 * k, color: d.color })
        }
      })
      if (sp(c, 7, 1.0, 0.4) > 0) {
        text(ctx, `Question: ${RAG_QUESTION}`, P.x + 12 * k, P.y + 34 * k + 3 * lh + 4 * k, { size: 10.5 * k, color: C.cyan, alpha: sp(c, 7, 1.0, 0.4) })
      }
    } else if (i >= 1) {
      rrect(ctx, P.x, P.y, P.w, P.h, 12 * k)
      ctx.setLineDash([4, 6])
      ctx.strokeStyle = 'rgba(148,163,255,0.15)'
      ctx.stroke()
      ctx.setLineDash([])
      text(ctx, 'prompt = retrieved chunks + question', P.x + P.w / 2, P.y + P.h / 2, { size: 11 * k, color: C.dim, align: 'center' })
    }

    const S = Math.min(32 * k, h * 0.06)
    const R = { x: w * 0.555, y: h * 0.8 }
    const robotActive = (i === 0 && c.local > 0.6 && c.local < 2.2) || (i === 8 && c.local < 2.2)
    robot(ctx, R.x, R.y, S, { color: C.violet, active: robotActive, t })
    text(ctx, 'gpt-5', R.x, R.y + S * 1.15, { size: 10.5 * k, color: C.muted, font: MONO, align: 'center' })

    const sendFrom = i === 0 ? { x: person0.x + 160 * k, y: person0.y + 14 * k } : { x: P.x + P.w, y: P.y + P.h / 2 }
    const send = i === 0 ? easeInOut(sp(c, 0, 0.2, 0.6)) : i === 8 ? easeInOut(sp(c, 8, 0, 0.6)) : 0
    if (send > 0 && send < 1) {
      const px = lerp(sendFrom.x, R.x - S, send)
      const py = lerp(sendFrom.y, R.y, send)
      glow(ctx, px, py, 22 * k, C.violet, 0.8)
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(px, py, 3.2 * k, 0, TAU)
      ctx.fill()
    }

    const A = { x: w * 0.63, y: h * 0.66, w: w * 0.34, h: h * 0.3 }
    rrect(ctx, A.x, A.y, A.w, A.h, 12 * k)
    ctx.fillStyle = '#05070f'
    ctx.fill()
    const showWrong = i === 0
    const showRight = i === 8
    const typeP = showWrong ? sp(c, 0, 1.0, 1.0) : showRight ? sp(c, 8, 0.9, 1.4) : 0
    const tone = showWrong ? C.red : showRight ? C.green : C.dim
    ctx.strokeStyle = rgba(tone, typeP > 0 ? 0.6 : 0.2)
    ctx.lineWidth = 1.2
    ctx.stroke()
    text(ctx, 'ANSWER', A.x + 12 * k, A.y + 14 * k, { size: 9.5 * k, color: C.muted, font: MONO, weight: 600 })
    if (typeP > 0) {
      const full = showWrong ? RAG_WRONG : RAG_ANSWER
      ctx.font = `500 ${12 * k}px ${FONT}`
      const lines = wrapLines(ctx, full.slice(0, Math.floor(full.length * typeP)), A.w - 24 * k)
      lines.forEach((ln, j) => text(ctx, ln, A.x + 12 * k, A.y + 36 * k + j * 17 * k, { size: 12 * k, color: C.text }))
      if (typeP >= 1) {
        const badge = showWrong ? '✗ hallucinated: not in your policy' : '✓ grounded in sources [1][2]'
        chip(ctx, badge, A.x + 12 * k, A.y + A.h - 18 * k, { color: tone, size: 10.5 * k, h: 22 * k, fillAlpha: 0.18, weight: 600 })
      }
    } else {
      text(ctx, i === 0 ? 'thinking…' : i < 8 ? 'answer after retrieval…' : '', A.x + A.w / 2, A.y + A.h / 2, { size: 11.5 * k, color: C.dim, align: 'center' })
    }

    if (i === 0) {
      text(ctx, 'WITHOUT RAG', w / 2, h * 0.6, { size: 12 * k, color: C.red, font: DISPLAY, weight: 700, align: 'center', alpha: 0.9 })
    }
  })

  return <canvas ref={ref} className="stage-canvas" aria-label="Retrieval-augmented generation: indexing and querying" />
}
