import { useEffect, useMemo, useState } from 'react'
import type { Lesson, Opts } from '../lessons/types'
import { usePlayer } from '../hooks/usePlayer'
import Controls from './Controls'
import CodePanel from './CodePanel'
import StatePanel from './StatePanel'
import Icon from './Icon'

export interface Panels {
  sideHidden: boolean
  codeHidden: boolean
  toggleSide: () => void
  toggleCode: () => void
}

interface Props {
  lesson: Lesson
  opts: Opts
  setOpt: (key: string, value: string) => void
  onMenu: () => void
  panels: Panels
}

const CHOICE_ICON = { approve: 'check', edit: 'edit', reject: 'close' }

export default function LessonView({ lesson, opts, setOpt, onMenu, panels }: Props) {
  const [resume, setResume] = useState<{ key: string; step: number } | null>(null)
  const runKey = JSON.stringify(opts)

  const choose = (key: string, value: string, step: number) => {
    setResume({ key: JSON.stringify({ ...opts, [key]: value }), step })
    setOpt(key, value)
  }

  return (
    <div className={`lesson ${panels.codeHidden ? 'code-hidden' : ''}`}>
      <div className="mobile-bar">
        <button type="button" className="icon-btn" onClick={onMenu} aria-label="Open menu and options">
          <Icon name="menu" />
        </button>
        <span className="side-num">{lesson.num}</span>
        <b>{lesson.nav}</b>
      </div>
      <Runner
        key={runKey}
        lesson={lesson}
        opts={opts}
        setOpt={setOpt}
        startAt={resume && resume.key === runKey ? resume.step : 0}
        onChoose={choose}
        panels={panels}
      />
    </div>
  )
}

interface RunnerProps {
  lesson: Lesson
  opts: Opts
  setOpt: (key: string, value: string) => void
  startAt: number
  onChoose: (key: string, value: string, step: number) => void
  panels: Panels
}

function Runner({ lesson, opts, setOpt, startAt, onChoose, panels }: RunnerProps) {
  const inst = useMemo(() => lesson.build(opts), [lesson, opts])
  const player = usePlayer(inst.steps, inst.gate, Math.min(startAt, inst.steps.length - 1))
  const { ui } = player
  const step = inst.steps[ui.step]
  const Canvas = lesson.Canvas
  const { toggle, next, prev, restart } = player
  const { toggleSide, toggleCode } = panels

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.code === 'Space') {
        if (el && el.tagName === 'BUTTON') return
        e.preventDefault()
        toggle()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prev()
      } else if (e.key === 'r' || e.key === 'R') {
        restart()
      } else if (e.key === '[' && window.innerWidth > 980) {
        toggleSide()
      } else if (e.key === ']' && window.innerWidth > 980) {
        toggleCode()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, next, prev, restart, toggleSide, toggleCode])

  const pick = (value: string) => {
    if (!inst.choiceKey || opts[inst.choiceKey] === value) player.approve()
    else onChoose(inst.choiceKey, value, ui.step + 1)
  }

  return (
    <>
      <div className="stage-area">
        <div className="stage">
          <Canvas clock={player.clock} opts={opts} setOpt={setOpt} />
          {ui.waiting && (
            <div className={`interrupt ${inst.interruptSide ?? ''}`}>
              <div>
                <b>Interrupted.</b> {inst.interruptLabel?.(ui.step) ?? 'Waiting for approval.'}
              </div>
              {inst.choices ? (
                <div className="choices">
                  {inst.choices.map((ch) => (
                    <button key={ch.value} type="button" className={`choice-btn ${ch.tone}`} onClick={() => pick(ch.value)}>
                      <Icon name={CHOICE_ICON[ch.tone]} size={15} /> {ch.label}
                    </button>
                  ))}
                </div>
              ) : (
                <button type="button" className="primary-btn" onClick={player.approve}>
                  <Icon name="check" size={16} /> Approve & continue
                </button>
              )}
            </div>
          )}
        </div>
        <div className="caption" key={ui.step}>
          <span className="caption-step" style={{ color: step.color ?? 'var(--violet)', borderColor: step.color ?? 'var(--violet)' }}>
            {ui.step + 1}/{inst.steps.length}
          </span>
          <div>
            <b>{step.title}.</b> {step.detail}
          </div>
        </div>
        <Controls
          ui={ui}
          steps={inst.steps}
          barRef={player.barRef}
          onToggle={player.toggle}
          onPrev={player.prev}
          onNext={player.next}
          onRestart={player.restart}
          onSeek={player.seek}
          onSpeed={player.setSpeed}
          onLoop={player.toggleLoop}
          panels={panels}
        />
      </div>
      <StatePanel steps={inst.steps} current={ui.step} onSeek={player.seek} />
      <CodePanel
        files={[{ file: inst.file, code: inst.code }, ...(inst.extraFiles ?? [])]}
        stepFile={step.file}
        stepKey={ui.step}
        focus={step.focus ?? []}
        lead={lesson.lead}
        ideas={lesson.ideas}
      />
    </>
  )
}
