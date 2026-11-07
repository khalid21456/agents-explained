import { useMemo, useState } from 'react'
import { tokenize } from '../lib/highlight'

interface Props {
  code: string
  file?: string
}

export default function CodeBlock({ code, file = 'agent.py' }: Props) {
  const tokens = useMemo(() => tokenize(code.trim()), [code])
  const [copied, setCopied] = useState(false)

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
    <div className="code">
      <div className="code-bar">
        <span className="dots">
          <i />
          <i />
          <i />
        </span>
        <span className="code-file">{file}</span>
        <button className="code-copy" onClick={copy} type="button">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre>
        <code>
          {tokens.map((t, i) =>
            t.kind === 'plain' ? (
              t.text
            ) : (
              <span key={i} className={`tk-${t.kind}`}>
                {t.text}
              </span>
            ),
          )}
        </code>
      </pre>
    </div>
  )
}
