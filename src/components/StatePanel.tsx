import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import type { Step } from '../lessons/types'

interface Props {
  steps: Step[]
  current: number
  onSeek: (i: number) => void
}

const JSON_RE = /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/g

function colorize(line: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let k = 0
  for (const m of line.matchAll(JSON_RE)) {
    const i = m.index ?? 0
    if (i > last) out.push(line.slice(last, i))
    if (m[1] && m[2]) {
      out.push(
        <span key={k++} className="j-key">
          {m[1]}
        </span>,
        m[2],
      )
    } else if (m[1]) {
      out.push(
        <span key={k++} className="j-str">
          {m[1]}
        </span>,
      )
    } else if (m[3]) {
      out.push(
        <span key={k++} className="j-bool">
          {m[3]}
        </span>,
      )
    } else {
      out.push(
        <span key={k++} className="j-num">
          {m[4]}
        </span>,
      )
    }
    last = i + m[0].length
  }
  if (last < line.length) out.push(line.slice(last))
  return out
}

function buildLines(state: Record<string, unknown>, prev?: Record<string, unknown>) {
  const lines: { text: string; changed: boolean }[] = [{ text: '{', changed: false }]
  const keys = Object.keys(state)
  keys.forEach((key, idx) => {
    const value = state[key]
    const changed = !prev || JSON.stringify(prev[key]) !== JSON.stringify(value)
    const body = JSON.stringify(value, null, 2).split('\n')
    const comma = idx < keys.length - 1 ? ',' : ''
    body.forEach((b, j) => {
      const prefix = j === 0 ? `  ${JSON.stringify(key)}: ` : '  '
      lines.push({ text: prefix + b + (j === body.length - 1 ? comma : ''), changed })
    })
  })
  lines.push({ text: '}', changed: false })
  return lines
}

export default function StatePanel({ steps, current, onSeek }: Props) {
  const listRef = useRef<HTMLOListElement | null>(null)
  const stateRef = useRef<HTMLDivElement | null>(null)
  const step = steps[current]
  const lines = useMemo(() => buildLines(step.state, current > 0 ? steps[current - 1].state : undefined), [step, steps, current])

  useEffect(() => {
    const list = listRef.current
    const el = list?.querySelector<HTMLElement>('li.on')
    if (list && el) list.scrollTo({ top: el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' })
    const box = stateRef.current
    const ch = box?.querySelector<HTMLElement>('.jl.changed')
    if (box && ch) box.scrollTo({ top: Math.max(0, ch.offsetTop - 24), behavior: 'smooth' })
  }, [current])

  return (
    <section className="state-panel" aria-label="Execution state">
      <div className="trace-col">
        <header className="panel-head">
          <span className="panel-label">
            <span className="live-dot" />
            Execution trace
          </span>
        </header>
        <ol className="timeline" ref={listRef}>
          {steps.map((s, i) => (
            <li key={i} className={`${i === current ? 'on' : ''} ${i < current ? 'done' : ''}`}>
              <button type="button" onClick={() => onSeek(i)}>
                <span className="tl-dot" style={{ background: s.color ?? 'var(--violet)' }} />
                <span className="tl-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="tl-title">{s.title}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="state-col">
        <header className="panel-head">
          <span className="panel-label">State after step {current + 1}</span>
          <span className="legend">
            <i /> changed
          </span>
        </header>
        <div className="json" ref={stateRef}>
          {lines.map((l, i) => (
            <div key={`${current}-${i}`} className={`jl ${l.changed ? 'changed' : ''}`}>
              {colorize(l.text)}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
