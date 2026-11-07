import { useEffect, useRef } from 'react'
import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js'

const COLORS = [0x22d3ee, 0xa78bfa, 0x60a5fa, 0xa78bfa, 0x22d3ee, 0xf472b6]
const LINK = 135
const MOUSE_R = 230
const BUCKETS = 5

interface P {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  color: number
  sprite: Sprite
}

interface Pulse {
  a: number
  b: number
  p: number
  s: number
  color: number
  hops: number
  sprite: Sprite
}

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.12, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.22)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return Texture.from(c)
}

export default function PixiHero() {
  const host = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const app = new Application()
    let ready = false
    let disposed = false
    const cleanups: (() => void)[] = []

    app
      .init({
        resizeTo: el,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        preference: 'webgl',
      })
      .then(() => {
        if (disposed) {
          app.destroy(true, { children: true, texture: true })
          return
        }
        ready = true
        el.appendChild(app.canvas)

        const tex = glowTexture()
        const links = new Graphics()
        const glowLayer = new Container()
        const pulseLayer = new Container()
        app.stage.addChild(links, glowLayer, pulseLayer)

        const mouse = { x: -1e4, y: -1e4, inside: false }
        let ps: P[] = []
        let pulses: Pulse[] = []
        const pool: Sprite[] = []
        let acc = 0
        let W = 0
        let H = 0

        const makeSprite = (layer: Container) => {
          const s = new Sprite(tex)
          s.anchor.set(0.5)
          s.blendMode = 'add'
          layer.addChild(s)
          return s
        }

        const seed = () => {
          W = app.screen.width
          H = app.screen.height
          glowLayer.removeChildren().forEach((c) => c.destroy())
          const n = Math.round(Math.min(260, Math.max(70, (W * H) / 6500)))
          ps = Array.from({ length: n }, () => {
            const big = Math.random() < 0.1
            const r = big ? 2.6 + Math.random() * 2 : 0.9 + Math.random() * 1.3
            const color = COLORS[Math.floor(Math.random() * COLORS.length)]
            const sprite = makeSprite(glowLayer)
            sprite.tint = color
            sprite.scale.set((r * (big ? 9 : 5)) / 64)
            sprite.alpha = big ? 0.9 : 0.75
            return { x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 22, vy: (Math.random() - 0.5) * 22, r, color, sprite }
          })
          pulses.forEach((pu) => {
            pu.sprite.visible = false
            pool.push(pu.sprite)
          })
          pulses = []
        }

        const neighbor = (i: number) => {
          const a = ps[i]
          const near: number[] = []
          for (let j = 0; j < ps.length; j++) {
            if (j === i) continue
            const dx = ps[j].x - a.x
            const dy = ps[j].y - a.y
            if (dx * dx + dy * dy < LINK * LINK) near.push(j)
          }
          return near.length ? near[Math.floor(Math.random() * near.length)] : -1
        }

        const spawn = (a: number, b: number, color: number, hops: number) => {
          const sprite = pool.pop() ?? makeSprite(pulseLayer)
          sprite.visible = true
          sprite.tint = color
          sprite.scale.set(0.42)
          pulses.push({ a, b, p: 0, s: 1.1 + Math.random() * 1.3, color, hops, sprite })
        }

        seed()

        const buckets: number[][] = Array.from({ length: BUCKETS }, () => [])

        app.ticker.add((ticker) => {
          const dt = Math.min(ticker.deltaMS / 1000, 0.05)
          if (Math.abs(app.screen.width - W) > 80 || Math.abs(app.screen.height - H) > 80) seed()
          const w = app.screen.width
          const h = app.screen.height

          for (const p of ps) {
            if (mouse.inside) {
              const dx = mouse.x - p.x
              const dy = mouse.y - p.y
              const d = Math.hypot(dx, dy)
              if (d < MOUSE_R && d > 1) {
                const f = (1 - d / MOUSE_R) * 75
                p.vx += (dx / d) * f * dt
                p.vy += (dy / d) * f * dt
              }
            }
            if (Math.hypot(p.vx, p.vy) > 16) {
              p.vx *= 1 - 0.8 * dt
              p.vy *= 1 - 0.8 * dt
            }
            p.x += p.vx * dt
            p.y += p.vy * dt
            if (p.x < -20) p.x = w + 20
            else if (p.x > w + 20) p.x = -20
            if (p.y < -20) p.y = h + 20
            else if (p.y > h + 20) p.y = -20
            p.sprite.position.set(p.x, p.y)
          }

          for (const b of buckets) b.length = 0
          for (let i = 0; i < ps.length; i++) {
            const a = ps[i]
            for (let j = i + 1; j < ps.length; j++) {
              const b = ps[j]
              const dx = a.x - b.x
              const dy = a.y - b.y
              const d2 = dx * dx + dy * dy
              if (d2 < LINK * LINK) {
                const strength = 1 - Math.sqrt(d2) / LINK
                buckets[Math.min(BUCKETS - 1, Math.floor(strength * BUCKETS))].push(i, j)
              }
            }
          }

          links.clear()
          buckets.forEach((list, bi) => {
            if (!list.length) return
            for (let q = 0; q < list.length; q += 2) {
              const a = ps[list[q]]
              const b = ps[list[q + 1]]
              links.moveTo(a.x, a.y).lineTo(b.x, b.y)
            }
            links.stroke({ width: 1, color: 0xa78bfa, alpha: ((bi + 0.5) / BUCKETS) * 0.24 })
          })

          if (mouse.inside) {
            let any = false
            for (const p of ps) {
              if (Math.hypot(p.x - mouse.x, p.y - mouse.y) < 180) {
                links.moveTo(p.x, p.y).lineTo(mouse.x, mouse.y)
                any = true
              }
            }
            if (any) links.stroke({ width: 1, color: 0x22d3ee, alpha: 0.28 })
            links.circle(mouse.x, mouse.y, 3).fill({ color: 0x22d3ee, alpha: 0.9 })
          }

          acc += dt
          while (acc > 0.08) {
            acc -= 0.08
            if (pulses.length < 90) {
              const a = Math.floor(Math.random() * ps.length)
              const b = neighbor(a)
              if (b >= 0) spawn(a, b, Math.random() < 0.55 ? 0x22d3ee : 0xa78bfa, 0)
            }
          }

          const alive: Pulse[] = []
          const trailCyan: number[] = []
          const trailViolet: number[] = []
          for (const pu of pulses) {
            pu.p += dt * pu.s
            if (pu.p >= 1) {
              pu.sprite.visible = false
              pool.push(pu.sprite)
              if (pu.hops < 6 && Math.random() < 0.75) {
                const n = neighbor(pu.b)
                if (n >= 0 && n !== pu.a) spawn(pu.b, n, pu.color, pu.hops + 1)
              }
              continue
            }
            alive.push(pu)
            const a = ps[pu.a]
            const b = ps[pu.b]
            const x = a.x + (b.x - a.x) * pu.p
            const y = a.y + (b.y - a.y) * pu.p
            pu.sprite.position.set(x, y)
            ;(pu.color === 0x22d3ee ? trailCyan : trailViolet).push(a.x, a.y, x, y)
          }
          pulses = alive
          for (const [list, color] of [
            [trailCyan, 0x22d3ee],
            [trailViolet, 0xa78bfa],
          ] as const) {
            if (!list.length) continue
            for (let q = 0; q < list.length; q += 4) links.moveTo(list[q], list[q + 1]).lineTo(list[q + 2], list[q + 3])
            links.stroke({ width: 1.4, color, alpha: 0.5 })
          }
        })

        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect()
          mouse.x = e.clientX - r.left
          mouse.y = e.clientY - r.top
          mouse.inside = mouse.x >= 0 && mouse.y >= 0 && mouse.x <= r.width && mouse.y <= r.height
        }
        const onLeave = () => {
          mouse.inside = false
        }
        window.addEventListener('pointermove', onMove, { passive: true })
        document.addEventListener('pointerleave', onLeave)

        const io = new IntersectionObserver(([e]) => {
          if (e.isIntersecting) app.ticker.start()
          else app.ticker.stop()
        })
        io.observe(el)

        cleanups.push(() => {
          window.removeEventListener('pointermove', onMove)
          document.removeEventListener('pointerleave', onLeave)
          io.disconnect()
          tex.destroy(true)
        })
      })

    return () => {
      disposed = true
      cleanups.forEach((f) => f())
      if (ready) app.destroy(true, { children: true })
    }
  }, [])

  return <div ref={host} className="hero-canvas" aria-hidden="true" />
}
