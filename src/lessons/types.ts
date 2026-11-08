import type { ComponentType, RefObject } from 'react'

export interface Clock {
  step: number
  local: number
  waiting: boolean
}

export type Opts = Record<string, string>

export interface Step {
  title: string
  detail: string
  dur: number
  color?: string
  focus?: string[]
  file?: string
  state: Record<string, unknown>
}

export interface Idea {
  title: string
  body: string
  color: string
}

export interface OptionDef {
  key: string
  label: string
  type: 'segmented' | 'switch'
  choices?: { value: string; label: string }[]
  enabledWhen?: (o: Opts) => boolean
}

export interface LessonInstance {
  steps: Step[]
  file: string
  code: string
  extraFiles?: { file: string; code: string }[]
  gate?: (i: number) => boolean
  interruptLabel?: (i: number) => string
  interruptSide?: 'left' | 'right' | 'top'
  choiceKey?: string
  choices?: { value: string; label: string; tone: 'approve' | 'edit' | 'reject' }[]
}

export interface CanvasProps {
  clock: RefObject<Clock>
  opts: Opts
  setOpt: (key: string, value: string) => void
}

export interface Lesson {
  id: string
  num: string
  nav: string
  group: string
  title: string
  lead: string
  blurb: string
  ideas: Idea[]
  options?: OptionDef[]
  defaults?: Opts
  build: (o: Opts) => LessonInstance
  Canvas: ComponentType<CanvasProps>
}
