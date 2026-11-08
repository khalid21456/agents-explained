import { useEffect, useMemo, useRef, useState } from 'react'
import { tokenize } from '../lib/highlight'
import type { Idea } from '../lessons/types'
import Icon from './Icon'

interface Props {
  files: { file: string; code: string }[]
  stepFile?: string
  stepKey: number
  focus: string[]
  lead: string
  ideas: Idea[]
}

export default function CodePanel({ files, stepFile, stepKey, focus, lead, ideas }: Props) {
  const [tab, setTab] = useState<'code' | 'concepts'>('code')
  const [copied, setCopied] = useState(false)
  const [manual, setManual] = useState<{ file: string; at: number } | null>(null)
  const stepActive = stepFile ?? files[0].file
  const activeName = manual && manual.at === stepKey ? manual.file : stepActive
  const active = files.find((f) => f.file === activeName) ?? files[0]
  const file = active.file
  const code = active.code
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const lines = useMemo(() => code.trim().split('\n'), [code])
  const tokens = useMemo(() => lines.map((l) => tokenize(l)), [lines])
  const focusKey = file === stepActive ? focus.join('\u0000') : ''
  const hl = useMemo(() => {
    const keys = focusKey ? focusKey.split('\u0000') : []
    return lines.map((l) => keys.some((k) => l.includes(k)))
  }, [lines, focusKey])

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const first = body.querySelector<HTMLElement>('.ln.hl')
    if (!first) return
    const top = first.offsetTop - body.clientHeight * 0.3
    body.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }, [hl, tab])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code.trim())
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="code-panel" aria-label="Code">
      <header className="panel-head">
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'code'} className={tab === 'code' ? 'on' : ''} onClick={() => setTab('code')}>
            Code
          </button>
          <button type="button" role="tab" aria-selected={tab === 'concepts'} className={tab === 'concepts' ? 'on' : ''} onClick={() => setTab('concepts')}>
            Concepts
          </button>
        </div>
        {tab === 'code' && (
          <>
            {files.length > 1 ? (
              <div className="file-tabs" role="tablist" aria-label="Files">
                {files.map((f) => (
                  <button
                    key={f.file}
                    type="button"
                    role="tab"
                    aria-selected={f.file === file}
                    className={`file-tab ${f.file === file ? 'on' : ''} ${f.file === stepActive ? 'step' : ''}`}
                    onClick={() => setManual({ file: f.file, at: stepKey })}
                  >
                    {f.file}
                  </button>
                ))}
              </div>
            ) : (
              <span className="file-name">{file}</span>
            )}
            <button type="button" className="icon-btn small" onClick={copy} title="Copy code" aria-label="Copy code">
              <Icon name={copied ? 'check' : 'copy'} size={15} />
            </button>
          </>
        )}
      </header>
      {tab === 'code' ? (
        <div className="code-body" ref={bodyRef}>
          <pre>
            {tokens.map((line, i) => (
              <div key={i} className={`ln ${hl[i] ? 'hl' : ''}`}>
                <span className="ln-num">{i + 1}</span>
                <code>
                  {line.length === 0
                    ? ' '
                    : line.map((t, j) =>
                        t.kind === 'plain' ? (
                          t.text
                        ) : (
                          <span key={j} className={`tk-${t.kind}`}>
                            {t.text}
                          </span>
                        ),
                      )}
                </code>
              </div>
            ))}
          </pre>
        </div>
      ) : (
        <div className="concepts">
          <p className="concepts-lead">{lead}</p>
          {ideas.map((it) => (
            <article key={it.title} className="idea">
              <span className="idea-dot" style={{ background: it.color, boxShadow: `0 0 16px ${it.color}` }} />
              <h4>{it.title}</h4>
              <p>{it.body}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
