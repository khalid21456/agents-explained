import { C } from '../lib/draw'

export interface Mem {
  label: string
  x: number
  y: number
  cluster: number
}

export const CLUSTERS = [
  { name: 'TRAVEL', x: 0.17, y: 0.36, color: C.cyan },
  { name: 'FOOD', x: 0.38, y: 0.74, color: C.amber },
  { name: 'WORK', x: 0.76, y: 0.32, color: C.violet },
  { name: 'MUSIC', x: 0.67, y: 0.78, color: C.pink },
]

export const MEMS: Mem[] = [
  { label: 'Booked Kyoto trip in May', x: 0.12, y: 0.26, cluster: 0 },
  { label: 'Prefers window seats', x: 0.22, y: 0.4, cluster: 0 },
  { label: 'Hates long layovers', x: 0.05, y: 0.5, cluster: 0 },
  { label: 'Speaks some Japanese', x: 0.26, y: 0.14, cluster: 0 },
  { label: 'Vegetarian', x: 0.33, y: 0.64, cluster: 1 },
  { label: 'Allergic to peanuts', x: 0.45, y: 0.78, cluster: 1 },
  { label: 'Loves ramen', x: 0.29, y: 0.83, cluster: 1 },
  { label: 'Builds agents with LangGraph', x: 0.63, y: 0.16, cluster: 2 },
  { label: 'Deploys on AWS', x: 0.8, y: 0.47, cluster: 2 },
  { label: 'Team of 5 engineers', x: 0.66, y: 0.37, cluster: 2 },
  { label: 'Writes Python', x: 0.83, y: 0.26, cluster: 2 },
  { label: 'Listens to jazz', x: 0.62, y: 0.7, cluster: 3 },
  { label: 'Learning guitar', x: 0.74, y: 0.86, cluster: 3 },
]

export interface Query {
  label: string
  x: number
  y: number
  answer: string
}

export const PRESETS: Record<string, Query> = {
  kyoto: { label: 'Plan dinner on my Kyoto trip', x: 0.2, y: 0.6, answer: 'Try a vegetarian ramen spot near your hotel.' },
  agent: { label: 'Why does my agent loop forever?', x: 0.76, y: 0.3, answer: 'Check your LangGraph exit condition.' },
  music: { label: 'Recommend something to listen to', x: 0.6, y: 0.82, answer: 'Some Wes Montgomery: jazz guitar.' },
}

export function resolveQuery(v: string | undefined): Query {
  if (v && PRESETS[v]) return PRESETS[v]
  const [x, y] = (v ?? '').split(',').map(Number)
  if (Number.isFinite(x) && Number.isFinite(y)) return { label: 'Your query', x, y, answer: 'Answer grounded in the 3 retrieved memories.' }
  return PRESETS.kyoto
}

const ASPECT = 2.6

export function rank(q: Query) {
  return MEMS.map((m, i) => {
    const d = Math.hypot((m.x - q.x) * ASPECT, m.y - q.y)
    return { i, d, score: Math.max(0.3, 1 - d / 1.6) }
  }).sort((a, b) => a.d - b.d)
}

export const MEM_DURS = [1.2, 1.6, 1.5, 1.9, 2.2]
