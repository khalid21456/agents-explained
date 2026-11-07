export const C = {
  bg: '#070a14',
  panel: '#0b0f1f',
  text: '#e8ebf7',
  soft: '#c3c9e0',
  muted: '#8a93b2',
  dim: '#4b5372',
  cyan: '#22d3ee',
  violet: '#a78bfa',
  pink: '#f472b6',
  amber: '#fbbf24',
  green: '#34d399',
  blue: '#60a5fa',
  red: '#fb7185',
}

export const FONT = '"Inter", system-ui, sans-serif'
export const MONO = '"JetBrains Mono", ui-monospace, Consolas, monospace'
export const DISPLAY = '"Space Grotesk", "Inter", sans-serif'

export const TAU = Math.PI * 2

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
export const prog = (t: number, start: number, dur: number) => clamp((t - start) / dur)

export function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

export function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a = 1) {
  if (r <= 0) return
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(color, a))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.fill()
}

export function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, Math.min(r, h / 2, w / 2))
}

export interface ChipOpts {
  color: string
  size?: number
  mono?: boolean
  fillAlpha?: number
  strokeAlpha?: number
  textColor?: string
  align?: 'left' | 'center' | 'right'
  h?: number
  padX?: number
  alpha?: number
  weight?: number
  radius?: number
}

function chipFont(o: ChipOpts) {
  const size = o.size ?? 13
  return `${o.weight ?? 500} ${size}px ${o.mono ? MONO : FONT}`
}

export function chipWidth(ctx: CanvasRenderingContext2D, text: string, o: ChipOpts) {
  const size = o.size ?? 13
  ctx.font = chipFont(o)
  return ctx.measureText(text).width + (o.padX ?? size * 0.8) * 2
}

export function chip(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, o: ChipOpts) {
  const size = o.size ?? 13
  const padX = o.padX ?? size * 0.8
  const h = o.h ?? size * 2.1
  ctx.font = chipFont(o)
  const w = ctx.measureText(text).width + padX * 2
  const x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x
  ctx.save()
  ctx.globalAlpha *= o.alpha ?? 1
  rrect(ctx, x0, y - h / 2, w, h, o.radius ?? 9)
  ctx.fillStyle = C.panel
  ctx.fill()
  ctx.fillStyle = rgba(o.color, o.fillAlpha ?? 0.14)
  ctx.fill()
  ctx.strokeStyle = rgba(o.color, o.strokeAlpha ?? 0.55)
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = o.textColor ?? C.text
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(text, x0 + padX, y + 0.5)
  ctx.restore()
  return w
}

export interface TextOpts {
  size?: number
  color?: string
  align?: CanvasTextAlign
  baseline?: CanvasTextBaseline
  weight?: number
  font?: string
  alpha?: number
}

export function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, o: TextOpts = {}) {
  ctx.save()
  ctx.globalAlpha *= o.alpha ?? 1
  ctx.font = `${o.weight ?? 500} ${o.size ?? 13}px ${o.font ?? FONT}`
  ctx.fillStyle = o.color ?? C.text
  ctx.textAlign = o.align ?? 'left'
  ctx.textBaseline = o.baseline ?? 'middle'
  ctx.fillText(s, x, y)
  ctx.restore()
}

export interface Pt {
  x: number
  y: number
}

export function quad(p0: Pt, c: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t
  return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y }
}

export function quadAngle(p0: Pt, c: Pt, p1: Pt, t: number) {
  const dx = 2 * (1 - t) * (c.x - p0.x) + 2 * t * (p1.x - c.x)
  const dy = 2 * (1 - t) * (c.y - p0.y) + 2 * t * (p1.y - c.y)
  return Math.atan2(dy, dx)
}

export function arrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, size: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-size, -size * 0.55)
  ctx.lineTo(-size * 0.7, 0)
  ctx.lineTo(-size, size * 0.55)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}

export function dotGrid(ctx: CanvasRenderingContext2D, w: number, h: number, gap: number, color: string) {
  ctx.fillStyle = color
  for (let x = gap / 2; x < w; x += gap) {
    for (let y = gap / 2; y < h; y += gap) {
      ctx.fillRect(x, y, 1, 1)
    }
  }
}

export function scaleFor(w: number, base = 760, min = 0.62) {
  return clamp(w / base, min, 1)
}

export function wrapLines(ctx: CanvasRenderingContext2D, s: string, maxW: number, hang = false) {
  const out: string[] = []
  for (const para of s.split('\n')) {
    const lead = para.match(/^\s*/)?.[0] ?? ''
    const words = para.trim().split(' ')
    let line = lead
    for (const word of words) {
      const test = line.trim() ? `${line} ${word}` : `${lead}${word}`
      if (ctx.measureText(test).width > maxW && line.trim()) {
        out.push(line)
        line = hang ? `${lead}  ${word}` : `${lead}${word}`
      } else line = test
    }
    out.push(line)
  }
  return out
}
