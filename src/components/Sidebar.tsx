import { LESSONS } from '../lessons'
import type { Lesson, Opts } from '../lessons/types'
import Icon from './Icon'

interface Props {
  current: string
  open: boolean
  onClose: () => void
  opts: Opts
  setOpt: (key: string, value: string) => void
}

function LessonOptions({ lesson, opts, setOpt }: { lesson: Lesson; opts: Opts; setOpt: (key: string, value: string) => void }) {
  if (!lesson.options?.length) return null
  return (
    <div className="side-opts">
      {lesson.options.map((o) => {
        const enabled = o.enabledWhen ? o.enabledWhen(opts) : true
        if (o.type === 'switch') {
          return (
            <label key={o.key} className={`switch ${enabled ? '' : 'disabled'}`}>
              <input type="checkbox" checked={opts[o.key] === 'on'} disabled={!enabled} onChange={(e) => setOpt(o.key, e.target.checked ? 'on' : 'off')} />
              <span className="switch-track" />
              {o.label}
            </label>
          )
        }
        return (
          <div key={o.key} className="side-opt" role="radiogroup" aria-label={o.label}>
            <span className="side-opt-label">{o.label}</span>
            {(o.choices ?? []).map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={opts[o.key] === c.value}
                className={`side-choice ${opts[o.key] === c.value ? 'on' : ''}`}
                onClick={() => setOpt(o.key, c.value)}
              >
                <i />
                {c.label}
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}

export default function Sidebar({ current, open, onClose, opts, setOpt }: Props) {
  const groups = [...new Set(LESSONS.map((l) => l.group))]
  return (
    <>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="side-top">
          <a href="#/" className="brand" onClick={onClose}>
            <span className="brand-mark" />
            <b>
              agents<span>.explained</span>
            </b>
          </a>
          <button type="button" className="icon-btn only-mobile" onClick={onClose} aria-label="Close menu">
            <Icon name="close" />
          </button>
        </div>
        <nav className="side-nav">
          <a href="#/" className={`side-link ${current === '' ? 'on' : ''}`} onClick={onClose}>
            <span className="side-num">00</span>
            Overview
          </a>
          {groups.map((g) => (
            <div key={g} className="side-group">
              <div className="side-group-title">{g}</div>
              {LESSONS.filter((l) => l.group === g).map((l) => (
                <div key={l.id}>
                  <a href={`#/${l.id}`} className={`side-link ${current === l.id ? 'on' : ''}`} onClick={onClose}>
                    <span className="side-num">{l.num}</span>
                    {l.nav}
                  </a>
                  {current === l.id && <LessonOptions lesson={l} opts={opts} setOpt={setOpt} />}
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-keys">
          <div>
            <kbd>Space</kbd> play / pause
          </div>
          <div>
            <kbd>←</kbd>
            <kbd>→</kbd> step
          </div>
          <div>
            <kbd>R</kbd> restart
          </div>
        </div>
      </aside>
    </>
  )
}
