import { C } from '../lib/draw'

export type StageIcon = 'doc' | 'robot' | 'funnel' | 'db'

export interface Stage {
  icon: StageIcon
  label: string
  sub: string
  x: number
  y: number
  color: string
}

export interface KF {
  t: number
  x: number
  y: number
  label?: string
  color?: string
}

export interface ChainLayout {
  stages: Stage[]
  tubes: [number, number][][]
  tracks: KF[][]
  ends: { label: string; x: number; y: number }[]
  starts: number[]
  pipe: string
  forkLabel?: { text: string; x: number; y: number }
}

export const CHAIN_SCALE = 1.3

export const CHAINS: Record<string, ChainLayout> = {
  simple: {
    stages: [
      { icon: 'doc', label: 'PromptTemplate', sub: 'fills in {topic}', x: 0.3, y: 0.52, color: C.violet },
      { icon: 'robot', label: 'ChatModel', sub: 'openai:gpt-5', x: 0.55, y: 0.52, color: C.amber },
      { icon: 'funnel', label: 'StrOutputParser', sub: 'message → str', x: 0.8, y: 0.52, color: C.green },
    ],
    tubes: [
      [
        [0.05, 0.52],
        [0.96, 0.52],
      ],
    ],
    tracks: [
      [
        { t: 0, x: 0.05, y: 0.52, label: '{"topic": "agents"}', color: C.cyan },
        { t: 1.0, x: 0.3, y: 0.52 },
        { t: 1.5, x: 0.3, y: 0.52, label: '[System, Human]', color: C.violet },
        { t: 2.4, x: 0.55, y: 0.52 },
        { t: 3.2, x: 0.55, y: 0.52, label: 'AIMessage(…)', color: C.amber },
        { t: 4.1, x: 0.8, y: 0.52 },
        { t: 4.5, x: 0.8, y: 0.52, label: '"Agents are…"', color: C.green },
        { t: 5.4, x: 0.96, y: 0.52 },
        { t: 9, x: 0.96, y: 0.52 },
      ],
    ],
    ends: [
      { label: 'invoke()', x: 0.05, y: 0.52 },
      { label: 'result', x: 0.96, y: 0.52 },
    ],
    starts: [0, 1.0, 2.4, 4.1, 5.4, 6.6],
    pipe: 'prompt | model | parser',
  },
  rag: {
    stages: [
      { icon: 'db', label: 'Retriever', sub: 'vector search, k=4', x: 0.31, y: 0.22, color: C.blue },
      { icon: 'doc', label: 'Prompt', sub: 'context + question', x: 0.47, y: 0.62, color: C.violet },
      { icon: 'robot', label: 'ChatModel', sub: 'gpt-5, grounded', x: 0.67, y: 0.62, color: C.amber },
      { icon: 'funnel', label: 'Parser', sub: '→ str', x: 0.86, y: 0.62, color: C.green },
    ],
    tubes: [
      [
        [0.04, 0.62],
        [0.97, 0.62],
      ],
      [
        [0.16, 0.62],
        [0.16, 0.22],
        [0.47, 0.22],
        [0.47, 0.62],
      ],
    ],
    tracks: [
      [
        { t: 0, x: 0.04, y: 0.62, label: '"What is LangGraph?"', color: C.cyan },
        { t: 0.8, x: 0.16, y: 0.62 },
        { t: 2.7, x: 0.47, y: 0.62 },
        { t: 3.1, x: 0.47, y: 0.62, label: '[System, Human]', color: C.violet },
        { t: 3.9, x: 0.67, y: 0.62 },
        { t: 4.6, x: 0.67, y: 0.62, label: 'AIMessage(…)', color: C.amber },
        { t: 5.3, x: 0.86, y: 0.62 },
        { t: 5.6, x: 0.86, y: 0.62, label: '"LangGraph is…"', color: C.green },
        { t: 6.3, x: 0.97, y: 0.62 },
        { t: 10, x: 0.97, y: 0.62 },
      ],
      [
        { t: 0.8, x: 0.16, y: 0.62, label: 'question', color: C.cyan },
        { t: 1.25, x: 0.16, y: 0.22 },
        { t: 1.6, x: 0.31, y: 0.22 },
        { t: 2.1, x: 0.31, y: 0.22, label: '4 docs', color: C.blue },
        { t: 2.45, x: 0.47, y: 0.22 },
        { t: 2.7, x: 0.47, y: 0.62 },
      ],
    ],
    ends: [
      { label: 'invoke()', x: 0.04, y: 0.62 },
      { label: 'result', x: 0.97, y: 0.62 },
    ],
    starts: [0, 0.8, 2.7, 3.9, 5.3, 6.3, 7.5],
    pipe: '{"context": retriever, "question": passthrough} | prompt | model | parser',
    forkLabel: { text: 'RunnableParallel', x: 0.16, y: 0.42 },
  },
}
