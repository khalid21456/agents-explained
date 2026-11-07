import type { RefObject } from 'react'
import type { PlayerUi } from '../hooks/usePlayer'
import type { Step } from '../lessons/types'
import Icon from './Icon'

interface Props {
  ui: PlayerUi
  steps: Step[]
  barRef: RefObject<HTMLDivElement | null>
  onToggle: () => void
  onPrev: () => void
  onNext: () => void
  onRestart: () => void
  onSeek: (i: number) => void
  onSpeed: (v: number) => void
  onLoop: () => void
}

const SPEEDS = [0.5, 1, 1.5, 2]

export default function Controls({ ui, steps, barRef, onToggle, onPrev, onNext, onRestart, onSeek, onSpeed, onLoop }: Props) {
  const total = steps.reduce((a, s) => a + s.dur, 0)
  const ticks = steps.map((s, i) => {
    const before = steps.slice(0, i).reduce((a, x) => a + x.dur, 0)
    return { left: (before / total) * 100, width: (s.dur / total) * 100 }
  })
  const playingNow = ui.playing

  return (
    <div className="controls">
      <div className="ctl-buttons">
        <button type="button" className="icon-btn" onClick={onRestart} title="Restart (R)" aria-label="Restart">
          <Icon name="restart" />
        </button>
        <button type="button" className="icon-btn" onClick={onPrev} disabled={ui.step === 0} title="Previous step (←)" aria-label="Previous step">
          <Icon name="prev" />
        </button>
        <button type="button" className="play-btn" onClick={onToggle} title="Play / pause (Space)" aria-label={playingNow ? 'Pause' : 'Play'}>
          <Icon name={playingNow ? 'pause' : 'play'} size={22} />
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={onNext}
          disabled={ui.step === steps.length - 1 && !ui.waiting}
          title="Next step (→)"
          aria-label="Next step"
        >
          <Icon name="next" />
        </button>
      </div>

      <div className="ctl-track">
        <div className="ctl-meta">
          <span>
            Step <b>{ui.step + 1}</b> / {steps.length}
          </span>
          <span className={`ctl-status ${ui.waiting ? 'wait' : ui.ended ? 'end' : ui.playing ? 'run' : ''}`}>
            {ui.waiting ? 'interrupted' : ui.ended ? 'finished' : ui.playing ? 'running' : 'paused'}
          </span>
        </div>
        <div className="ctl-bar">
          {ticks.map((t, i) => (
            <button
              key={i}
              type="button"
              className={`ctl-seg ${i === ui.step ? 'on' : ''} ${i < ui.step ? 'done' : ''}`}
              style={{ left: `${t.left}%`, width: `${t.width}%` }}
              onClick={() => onSeek(i)}
              title={`${i + 1}. ${steps[i].title}`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
          <div className="ctl-fill" ref={barRef} />
        </div>
      </div>

      <div className="ctl-right">
        <div className="speed" role="group" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <button key={s} type="button" className={ui.speed === s ? 'on' : ''} onClick={() => onSpeed(s)}>
              {s}×
            </button>
          ))}
        </div>
        <button type="button" className={`icon-btn ${ui.loop ? 'active' : ''}`} onClick={onLoop} title="Loop" aria-label="Loop" aria-pressed={ui.loop}>
          <Icon name="loop" />
        </button>
      </div>
    </div>
  )
}
