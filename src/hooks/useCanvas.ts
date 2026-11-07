import { useEffect, useLayoutEffect, useRef } from 'react'

export interface Frame {
  ctx: CanvasRenderingContext2D
  w: number
  h: number
  t: number
  dt: number
  mouse: { x: number; y: number; inside: boolean }
}

export function useCanvas(draw: (f: Frame) => void) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawRef = useRef(draw)

  useLayoutEffect(() => {
    drawRef.current = draw
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    let dpr = 1
    let raf = 0
    let visible = false
    let last = 0
    let t = 0
    const mouse = { x: -1e4, y: -1e4, inside: false }

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = r.width
      h = r.height
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
    }

    const loop = (now: number) => {
      raf = 0
      if (!visible) return
      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 0
      last = now
      t += dt
      if (w > 0 && h > 0) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, w, h)
        drawRef.current({ ctx, w, h, t, dt, mouse })
      }
      raf = requestAnimationFrame(loop)
    }

    const start = () => {
      if (!raf) {
        last = 0
        raf = requestAnimationFrame(loop)
      }
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible) start()
      },
      { rootMargin: '120px' },
    )
    io.observe(canvas)

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.x = e.clientX - r.left
      mouse.y = e.clientY - r.top
      mouse.inside = mouse.x >= 0 && mouse.y >= 0 && mouse.x <= r.width && mouse.y <= r.height
    }
    const onLeave = () => {
      mouse.inside = false
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return canvasRef
}
