import { C, DISPLAY, FONT, TAU, glow, rgba, rrect } from './draw'

export interface IconOpts {
  color: string
  active: boolean
  t: number
}

function shell(ctx: CanvasRenderingContext2D, color: string, active: boolean, lw: number) {
  ctx.fillStyle = C.panel
  ctx.fill()
  ctx.fillStyle = rgba(color, active ? 0.26 : 0.12)
  ctx.fill()
  ctx.strokeStyle = rgba(color, active ? 1 : 0.6)
  ctx.lineWidth = lw
  ctx.stroke()
}

export function robot(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, o: IconOpts & { accessory?: 'pen' | 'lens' | 'crown' }) {
  const { color, active, t } = o
  const lw = Math.max(1.3, s * 0.05)
  const cy = y + (active ? Math.sin(t * 3) * s * 0.04 : 0)
  if (active) glow(ctx, x, cy, s * 2.1, color, 0.32)
  ctx.save()
  ctx.lineCap = 'round'

  ctx.beginPath()
  ctx.ellipse(x, cy + s * 0.8, s * 0.64, s * 0.38, 0, Math.PI, TAU)
  ctx.closePath()
  shell(ctx, color, active, lw)
  glow(ctx, x, cy + s * 0.62, s * 0.24, color, active ? 0.9 : 0.35)
  ctx.fillStyle = active ? '#ffffff' : rgba(color, 0.8)
  ctx.beginPath()
  ctx.arc(x, cy + s * 0.62, s * 0.065, 0, TAU)
  ctx.fill()

  if (o.accessory !== 'crown') {
    ctx.strokeStyle = rgba(color, 0.85)
    ctx.lineWidth = lw
    ctx.beginPath()
    ctx.moveTo(x, cy - s * 0.68)
    ctx.lineTo(x, cy - s * 0.98)
    ctx.stroke()
    const pulse = active ? 0.6 + 0.4 * Math.sin(t * 6) : 0.4
    glow(ctx, x, cy - s * 1.04, s * 0.32, color, pulse)
    ctx.fillStyle = active ? '#ffffff' : color
    ctx.beginPath()
    ctx.arc(x, cy - s * 1.04, s * 0.09, 0, TAU)
    ctx.fill()
  }

  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.arc(x + side * s * 0.72, cy - s * 0.12, s * 0.13, 0, TAU)
    shell(ctx, color, active, lw)
  }

  ctx.beginPath()
  ctx.ellipse(x, cy - s * 0.12, s * 0.68, s * 0.58, 0, 0, TAU)
  shell(ctx, color, active, lw)

  if (o.accessory === 'crown') {
    const by = cy - s * 0.6
    const top = cy - s * 1.02
    if (active) glow(ctx, x, (by + top) / 2, s * 0.6, C.amber, 0.5 + 0.2 * Math.sin(t * 5))
    ctx.beginPath()
    ctx.moveTo(x - s * 0.36, by)
    ctx.lineTo(x - s * 0.42, top + s * 0.08)
    ctx.lineTo(x - s * 0.2, by - s * 0.2)
    ctx.lineTo(x, top)
    ctx.lineTo(x + s * 0.2, by - s * 0.2)
    ctx.lineTo(x + s * 0.42, top + s * 0.08)
    ctx.lineTo(x + s * 0.36, by)
    ctx.closePath()
    ctx.lineJoin = 'round'
    ctx.fillStyle = rgba(C.amber, active ? 0.95 : 0.75)
    ctx.fill()
    ctx.strokeStyle = C.amber
    ctx.lineWidth = lw * 0.8
    ctx.stroke()
    for (const px of [-0.42, 0, 0.42]) {
      ctx.fillStyle = active ? '#ffffff' : C.soft
      ctx.beginPath()
      ctx.arc(x + px * s, (px === 0 ? top : top + s * 0.08) - s * 0.02, s * 0.055, 0, TAU)
      ctx.fill()
    }
  }

  ctx.beginPath()
  ctx.ellipse(x, cy - s * 0.1, s * 0.5, s * 0.32, 0, 0, TAU)
  ctx.fillStyle = '#04060d'
  ctx.fill()
  ctx.strokeStyle = rgba(color, 0.45)
  ctx.lineWidth = lw * 0.8
  ctx.stroke()

  const blink = t % 3.6 < 0.13 ? 0.15 : 1
  const look = active ? Math.sin(t * 1.7) * s * 0.07 : 0
  const eye = active ? C.cyan : rgba(C.cyan, 0.75)
  for (const side of [-1, 1]) {
    const ex = x + side * s * 0.19 + look
    const ey = cy - s * 0.14
    if (active) glow(ctx, ex, ey, s * 0.22, C.cyan, 0.5)
    ctx.fillStyle = eye
    ctx.beginPath()
    ctx.ellipse(ex, ey, s * 0.085, s * 0.085 * blink, 0, 0, TAU)
    ctx.fill()
  }
  ctx.strokeStyle = rgba(C.cyan, active ? 0.9 : 0.55)
  ctx.lineWidth = Math.max(1, s * 0.035)
  ctx.beginPath()
  ctx.arc(x + look * 0.5, cy - s * 0.06, s * 0.12, 0.2 * Math.PI, 0.8 * Math.PI)
  ctx.stroke()

  if (o.accessory === 'pen') {
    ctx.save()
    ctx.translate(x + s * 0.78, cy + s * 0.42 + (active ? Math.sin(t * 8) * s * 0.05 : 0))
    ctx.rotate(-0.7)
    ctx.strokeStyle = C.amber
    ctx.lineWidth = s * 0.11
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.32)
    ctx.lineTo(0, s * 0.18)
    ctx.stroke()
    ctx.fillStyle = C.soft
    ctx.beginPath()
    ctx.moveTo(-s * 0.055, s * 0.2)
    ctx.lineTo(s * 0.055, s * 0.2)
    ctx.lineTo(0, s * 0.34)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  } else if (o.accessory === 'lens') {
    const lx = x + s * 0.8 + (active ? Math.sin(t * 2.4) * s * 0.08 : 0)
    const ly = cy + s * 0.42
    ctx.strokeStyle = C.soft
    ctx.lineWidth = s * 0.07
    ctx.beginPath()
    ctx.moveTo(lx + s * 0.14, ly + s * 0.14)
    ctx.lineTo(lx + s * 0.34, ly + s * 0.34)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(lx, ly, s * 0.2, 0, TAU)
    ctx.fillStyle = rgba(C.cyan, 0.18)
    ctx.fill()
    ctx.strokeStyle = C.green
    ctx.lineWidth = s * 0.06
    ctx.stroke()
  }
  ctx.restore()
}

function gearPath(ctx: CanvasRenderingContext2D, x: number, y: number, rIn: number, rOut: number, teeth: number, rot: number) {
  const step = TAU / teeth
  ctx.beginPath()
  for (let i = 0; i < teeth; i++) {
    const a = rot + i * step
    const pts: [number, number][] = [
      [rIn, a],
      [rOut, a + step * 0.22],
      [rOut, a + step * 0.48],
      [rIn, a + step * 0.7],
    ]
    pts.forEach(([r, ang], j) => {
      const px = x + Math.cos(ang) * r
      const py = y + Math.sin(ang) * r
      if (i === 0 && j === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    const end = a + step
    ctx.arc(x, y, rIn, a + step * 0.7, end)
  }
  ctx.closePath()
}

export function gears(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, o: IconOpts) {
  const { color, active, t } = o
  const lw = Math.max(1.3, s * 0.05)
  if (active) glow(ctx, x, y, s * 2, color, 0.3)
  const rot = active ? t * 1.6 : 0.2
  const bx = x - s * 0.18
  const by = y + s * 0.12
  gearPath(ctx, bx, by, s * 0.5, s * 0.66, 9, rot)
  shell(ctx, color, active, lw)
  ctx.beginPath()
  ctx.arc(bx, by, s * 0.2, 0, TAU)
  ctx.fillStyle = C.bg
  ctx.fill()
  ctx.strokeStyle = rgba(color, 0.8)
  ctx.stroke()

  const sx = x + s * 0.5
  const sy = y - s * 0.5
  gearPath(ctx, sx, sy, s * 0.28, s * 0.4, 7, -rot * 1.6 + 0.3)
  shell(ctx, color, active, lw)
  ctx.beginPath()
  ctx.arc(sx, sy, s * 0.11, 0, TAU)
  ctx.fillStyle = C.bg
  ctx.fill()
  if (active) {
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + (i * TAU) / 3
      ctx.fillStyle = rgba(color, 0.9)
      ctx.beginPath()
      ctx.arc(bx + Math.cos(a) * s * 0.95, by + Math.sin(a) * s * 0.95, s * 0.05, 0, TAU)
      ctx.fill()
    }
  }
}

export function doc(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, o: IconOpts) {
  const { color, active, t } = o
  const lw = Math.max(1.3, s * 0.05)
  if (active) glow(ctx, x, y, s * 1.8, color, 0.3)
  const x0 = x - s * 0.48
  const y0 = y - s * 0.62
  const w = s * 0.96
  const h = s * 1.24
  const f = s * 0.3
  ctx.beginPath()
  ctx.moveTo(x0, y0 + s * 0.08)
  ctx.quadraticCurveTo(x0, y0, x0 + s * 0.08, y0)
  ctx.lineTo(x0 + w - f, y0)
  ctx.lineTo(x0 + w, y0 + f)
  ctx.lineTo(x0 + w, y0 + h - s * 0.08)
  ctx.quadraticCurveTo(x0 + w, y0 + h, x0 + w - s * 0.08, y0 + h)
  ctx.lineTo(x0 + s * 0.08, y0 + h)
  ctx.quadraticCurveTo(x0, y0 + h, x0, y0 + h - s * 0.08)
  ctx.closePath()
  shell(ctx, color, active, lw)
  ctx.beginPath()
  ctx.moveTo(x0 + w - f, y0)
  ctx.lineTo(x0 + w - f, y0 + f)
  ctx.lineTo(x0 + w, y0 + f)
  ctx.strokeStyle = rgba(color, 0.7)
  ctx.stroke()
  ctx.font = `700 ${s * 0.42}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText('{ }', x, y - s * 0.18)
  const typed = active ? (t * 1.4) % 1 : 1
  for (let i = 0; i < 3; i++) {
    const lwid = w * (i === 2 ? 0.42 : 0.66)
    const fill = active ? Math.max(0, Math.min(1, typed * 3 - i)) : 1
    ctx.fillStyle = rgba(color, 0.25)
    rrect(ctx, x0 + s * 0.16, y + s * 0.12 + i * s * 0.15, lwid, s * 0.06, 2)
    ctx.fill()
    ctx.fillStyle = rgba(color, 0.85)
    rrect(ctx, x0 + s * 0.16, y + s * 0.12 + i * s * 0.15, lwid * fill, s * 0.06, 2)
    ctx.fill()
  }
}

export function funnel(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, o: IconOpts) {
  const { color, active, t } = o
  const lw = Math.max(1.3, s * 0.05)
  if (active) glow(ctx, x, y, s * 1.8, color, 0.3)
  ctx.beginPath()
  ctx.moveTo(x - s * 0.62, y - s * 0.48)
  ctx.lineTo(x + s * 0.62, y - s * 0.48)
  ctx.lineTo(x + s * 0.15, y + s * 0.1)
  ctx.lineTo(x + s * 0.15, y + s * 0.52)
  ctx.lineTo(x - s * 0.15, y + s * 0.66)
  ctx.lineTo(x - s * 0.15, y + s * 0.1)
  ctx.closePath()
  ctx.lineJoin = 'round'
  shell(ctx, color, active, lw)
  ctx.beginPath()
  ctx.ellipse(x, y - s * 0.48, s * 0.62, s * 0.14, 0, 0, TAU)
  ctx.fillStyle = rgba(color, active ? 0.35 : 0.18)
  ctx.fill()
  ctx.strokeStyle = rgba(color, active ? 1 : 0.6)
  ctx.stroke()
  if (active) {
    for (let i = 0; i < 3; i++) {
      const f = (t * 1.6 + i / 3) % 1
      ctx.fillStyle = rgba(color, 1 - f)
      ctx.beginPath()
      ctx.arc(x, y + s * 0.72 + f * s * 0.5, s * 0.06, 0, TAU)
      ctx.fill()
    }
  }
}

export function database(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, o: IconOpts) {
  const { color, active, t } = o
  const lw = Math.max(1.3, s * 0.05)
  if (active) glow(ctx, x, y, s * 1.8, color, 0.3)
  const rx = s * 0.5
  const ry = s * 0.16
  const top = y - s * 0.5
  const bot = y + s * 0.42
  ctx.beginPath()
  ctx.moveTo(x - rx, top)
  ctx.lineTo(x - rx, bot)
  ctx.ellipse(x, bot, rx, ry, 0, Math.PI, 0, true)
  ctx.lineTo(x + rx, top)
  ctx.ellipse(x, top, rx, ry, 0, 0, Math.PI, false)
  ctx.closePath()
  shell(ctx, color, active, lw)
  for (const yy of [top, y - s * 0.05]) {
    ctx.beginPath()
    ctx.ellipse(x, yy, rx, ry, 0, 0, yy === top ? TAU : Math.PI)
    ctx.strokeStyle = rgba(color, 0.7)
    ctx.stroke()
  }
  const lx = x + s * 0.42 + (active ? Math.cos(t * 2.2) * s * 0.18 : 0)
  const ly = y + s * 0.32 + (active ? Math.sin(t * 2.2) * s * 0.1 : 0)
  ctx.strokeStyle = C.soft
  ctx.lineWidth = s * 0.08
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(lx + s * 0.16, ly + s * 0.16)
  ctx.lineTo(lx + s * 0.38, ly + s * 0.38)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(lx, ly, s * 0.22, 0, TAU)
  ctx.fillStyle = C.panel
  ctx.fill()
  ctx.fillStyle = rgba(C.cyan, active ? 0.3 : 0.12)
  ctx.fill()
  ctx.strokeStyle = C.cyan
  ctx.lineWidth = s * 0.06
  ctx.stroke()
}

export function startNode(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, o: IconOpts) {
  if (o.active) glow(ctx, x, y, s * 2.4, o.color, 0.4)
  ctx.beginPath()
  ctx.arc(x, y, s * 0.55, 0, TAU)
  ctx.fillStyle = o.color
  ctx.fill()
}

export function endNode(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, o: IconOpts) {
  if (o.active) glow(ctx, x, y, s * 2.4, o.color, 0.4)
  ctx.beginPath()
  ctx.arc(x, y, s * 0.68, 0, TAU)
  ctx.fillStyle = C.panel
  ctx.fill()
  ctx.strokeStyle = o.color
  ctx.lineWidth = Math.max(1.5, s * 0.1)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x, y, s * 0.38, 0, TAU)
  ctx.fillStyle = o.color
  ctx.fill()
}

export function nodeLabel(ctx: CanvasRenderingContext2D, x: number, y: number, title: string, sub: string | undefined, k: number, color: string, active: boolean) {
  const ts = 15 * k
  const ss = 10.5 * k
  ctx.font = `600 ${ts}px ${DISPLAY}`
  const tw = ctx.measureText(title).width
  ctx.font = `500 ${ss}px ${FONT}`
  const sw = sub ? ctx.measureText(sub).width : 0
  const w = Math.max(tw, sw) + 18 * k
  const h = sub ? 40 * k : 24 * k
  rrect(ctx, x - w / 2, y - 4 * k, w, h, 9 * k)
  ctx.fillStyle = rgba('#070a14', 0.88)
  ctx.fill()
  if (active) {
    ctx.strokeStyle = rgba(color, 0.5)
    ctx.lineWidth = 1
    ctx.stroke()
  }
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.font = `600 ${ts}px ${DISPLAY}`
  ctx.fillStyle = active ? C.text : C.soft
  ctx.fillText(title, x, y)
  if (sub) {
    ctx.font = `500 ${ss}px ${FONT}`
    ctx.fillStyle = C.muted
    ctx.fillText(sub, x, y + ts + 4 * k)
  }
}

export type ShieldState = 'idle' | 'checking' | 'pass' | 'block' | 'redact' | 'approve' | 'replace'

const SHIELD_COLORS: Record<ShieldState, string> = {
  idle: C.muted,
  checking: C.cyan,
  pass: C.green,
  block: C.red,
  redact: C.amber,
  approve: C.amber,
  replace: C.pink,
}

export function shield(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, state: ShieldState, t: number) {
  const color = SHIELD_COLORS[state]
  const active = state !== 'idle'
  const lw = Math.max(1.4, s * 0.06)
  if (active) glow(ctx, x, y, s * 2, color, state === 'checking' ? 0.25 + 0.15 * Math.sin(t * 8) : 0.35)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x, y - s * 0.78)
  ctx.quadraticCurveTo(x + s * 0.35, y - s * 0.55, x + s * 0.68, y - s * 0.58)
  ctx.quadraticCurveTo(x + s * 0.72, y + s * 0.2, x, y + s * 0.82)
  ctx.quadraticCurveTo(x - s * 0.72, y + s * 0.2, x - s * 0.68, y - s * 0.58)
  ctx.quadraticCurveTo(x - s * 0.35, y - s * 0.55, x, y - s * 0.78)
  ctx.closePath()
  ctx.fillStyle = C.panel
  ctx.fill()
  ctx.fillStyle = rgba(color, active ? 0.22 : 0.08)
  ctx.fill()
  ctx.strokeStyle = rgba(color, active ? 1 : 0.55)
  ctx.lineWidth = lw
  ctx.stroke()
  ctx.clip()
  if (state === 'checking') {
    const sy = y - s * 0.8 + ((t * 1.6) % 1) * s * 1.6
    const g = ctx.createLinearGradient(0, sy - s * 0.2, 0, sy + s * 0.05)
    g.addColorStop(0, rgba(C.cyan, 0))
    g.addColorStop(1, rgba(C.cyan, 0.7))
    ctx.fillStyle = g
    ctx.fillRect(x - s, sy - s * 0.2, s * 2, s * 0.25)
  }
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = s * 0.12
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  if (state === 'pass') {
    ctx.moveTo(x - s * 0.26, y + s * 0.02)
    ctx.lineTo(x - s * 0.06, y + s * 0.22)
    ctx.lineTo(x + s * 0.3, y - s * 0.2)
    ctx.stroke()
  } else if (state === 'block') {
    ctx.moveTo(x - s * 0.22, y - s * 0.22)
    ctx.lineTo(x + s * 0.22, y + s * 0.22)
    ctx.moveTo(x + s * 0.22, y - s * 0.22)
    ctx.lineTo(x - s * 0.22, y + s * 0.22)
    ctx.stroke()
  } else if (state === 'redact') {
    for (let i = 0; i < 3; i++) {
      rrect(ctx, x - s * 0.3, y - s * 0.24 + i * s * 0.2, i === 1 ? s * 0.4 : s * 0.6, s * 0.1, s * 0.04)
      ctx.fill()
    }
  } else if (state === 'approve') {
    const p = 0.6 + 0.4 * Math.sin(t * 5)
    ctx.globalAlpha = p
    ctx.fillRect(x - s * 0.17, y - s * 0.24, s * 0.12, s * 0.46)
    ctx.fillRect(x + s * 0.05, y - s * 0.24, s * 0.12, s * 0.46)
  } else if (state === 'replace') {
    ctx.arc(x, y, s * 0.24, -Math.PI * 0.2, Math.PI * 1.3)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + s * 0.2, y - s * 0.32)
    ctx.lineTo(x + s * 0.22, y - s * 0.12)
    ctx.lineTo(x + s * 0.02, y - s * 0.14)
    ctx.stroke()
  } else {
    ctx.lineWidth = s * 0.08
    ctx.arc(x, y - s * 0.02, s * 0.2, Math.PI, TAU)
    ctx.stroke()
    rrect(ctx, x - s * 0.28, y - s * 0.02, s * 0.56, s * 0.36, s * 0.06)
    ctx.globalAlpha = state === 'idle' ? 0.6 : 1
    ctx.fill()
  }
  ctx.restore()
}

export function person(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, o: IconOpts) {
  const { color, active } = o
  const lw = Math.max(1.3, s * 0.05)
  if (active) glow(ctx, x, y, s * 1.8, color, 0.3)
  ctx.beginPath()
  ctx.ellipse(x, y + s * 0.62, s * 0.55, s * 0.4, 0, Math.PI, TAU)
  ctx.closePath()
  shell(ctx, color, active, lw)
  ctx.beginPath()
  ctx.arc(x, y - s * 0.14, s * 0.32, 0, TAU)
  shell(ctx, color, active, lw)
}

export function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, o: IconOpts) {
  const { color, active, t } = o
  const lw = Math.max(1.3, s * 0.05)
  if (active) glow(ctx, x, y, s * 1.8, color, 0.3)
  ctx.beginPath()
  ctx.ellipse(x, y - s * 0.08, s * 0.66, s * 0.5, 0, Math.PI * 0.62, Math.PI * 0.42 + TAU)
  ctx.lineTo(x - s * 0.42, y + s * 0.62)
  ctx.closePath()
  shell(ctx, color, active, lw)
  for (let i = -1; i <= 1; i++) {
    const bounce = active ? Math.max(0, Math.sin(t * 6 - i)) * s * 0.08 : 0
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x + i * s * 0.22, y - s * 0.08 - bounce, s * 0.07, 0, TAU)
    ctx.fill()
  }
}

export type ServerGlyph = 'sun' | 'folder' | 'calendar'

export function mcpServer(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, o: IconOpts & { glyph: ServerGlyph }) {
  const { color, active, t } = o
  const lw = Math.max(1.3, s * 0.05)
  if (active) glow(ctx, x, y, s * 2, color, 0.32)
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * TAU) / 6
    const px = x + Math.cos(a) * s * 0.78
    const py = y + Math.sin(a) * s * 0.78
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.lineJoin = 'round'
  shell(ctx, color, active, lw)
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = s * 0.07
  ctx.lineCap = 'round'
  if (o.glyph === 'sun') {
    const spin = active ? t * 0.8 : 0
    ctx.beginPath()
    ctx.arc(x, y, s * 0.18, 0, TAU)
    ctx.fill()
    for (let i = 0; i < 8; i++) {
      const a = spin + (i * TAU) / 8
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(a) * s * 0.28, y + Math.sin(a) * s * 0.28)
      ctx.lineTo(x + Math.cos(a) * s * 0.4, y + Math.sin(a) * s * 0.4)
      ctx.stroke()
    }
  } else if (o.glyph === 'folder') {
    ctx.beginPath()
    ctx.moveTo(x - s * 0.36, y - s * 0.18)
    ctx.lineTo(x - s * 0.36, y + s * 0.26)
    ctx.lineTo(x + s * 0.36, y + s * 0.26)
    ctx.lineTo(x + s * 0.36, y - s * 0.12)
    ctx.lineTo(x - s * 0.02, y - s * 0.12)
    ctx.lineTo(x - s * 0.1, y - s * 0.22)
    ctx.lineTo(x - s * 0.36, y - s * 0.22)
    ctx.closePath()
    ctx.stroke()
    if (active) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6)
      ctx.fillRect(x - s * 0.2, y + s * 0.02, s * 0.4, s * 0.06)
    }
  } else {
    rrect(ctx, x - s * 0.34, y - s * 0.26, s * 0.68, s * 0.56, s * 0.08)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x - s * 0.34, y - s * 0.1)
    ctx.lineTo(x + s * 0.34, y - s * 0.1)
    ctx.stroke()
    for (let r = 0; r < 2; r++)
      for (let cI = 0; cI < 3; cI++) {
        ctx.globalAlpha = active && r === 1 && cI === 1 ? 1 : 0.7
        ctx.fillRect(x - s * 0.22 + cI * s * 0.17, y + r * s * 0.15, s * 0.1, s * 0.08)
      }
  }
  ctx.restore()
}

export function mcpHub(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, o: IconOpts) {
  const { color, active, t } = o
  if (active) glow(ctx, x, y, s * 2.2, color, 0.35 + 0.1 * Math.sin(t * 3))
  ctx.beginPath()
  ctx.arc(x, y, s * 0.72, 0, TAU)
  shell(ctx, color, active, Math.max(1.5, s * 0.06))
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = s * 0.08
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x - s * 0.14, y - s * 0.36)
  ctx.lineTo(x - s * 0.14, y - s * 0.18)
  ctx.moveTo(x + s * 0.14, y - s * 0.36)
  ctx.lineTo(x + s * 0.14, y - s * 0.18)
  ctx.stroke()
  rrect(ctx, x - s * 0.27, y - s * 0.2, s * 0.54, s * 0.3, s * 0.1)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x, y + s * 0.1)
  ctx.lineTo(x, y + s * 0.36)
  ctx.stroke()
  ctx.restore()
}
