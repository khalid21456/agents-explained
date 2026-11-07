export type Experiment = 'v1' | 'v2'

export interface EvalExample {
  ticket: string
  category: string
  urgency: string
}

export const DATASET: EvalExample[] = [
  { ticket: 'My order #4512 arrived broken, I want a refund!!', category: 'product', urgency: 'high' },
  { ticket: 'Where is my parcel? It is 3 days late.', category: 'shipping', urgency: 'medium' },
  { ticket: 'I was charged twice for one order.', category: 'billing', urgency: 'high' },
  { ticket: 'Love the product, thanks!', category: 'other', urgency: 'low' },
  { ticket: 'Can I change my delivery address?', category: 'shipping', urgency: 'low' },
  { ticket: 'Checkout charges me in the wrong currency.', category: 'billing', urgency: 'medium' },
]

export interface EvalRun {
  label: string
  prefix: string
  outputs: { category: string; urgency: string }[]
  judge: number[]
}

export const RUNS: Record<Experiment, EvalRun> = {
  v1: {
    label: 'v1 · bare prompt',
    prefix: 'triage-prompt-v1',
    outputs: [
      { category: 'damage', urgency: 'high' },
      { category: 'shipping', urgency: 'urgent' },
      { category: 'billing', urgency: 'high' },
      { category: 'feedback', urgency: 'low' },
      { category: 'shipping', urgency: 'low' },
      { category: 'technical', urgency: 'medium' },
    ],
    judge: [0.6, 0.5, 0.7, 0.8, 0.6, 0.4],
  },
  v2: {
    label: 'v2 · few-shot + schema',
    prefix: 'triage-prompt-v2',
    outputs: [
      { category: 'product', urgency: 'high' },
      { category: 'shipping', urgency: 'medium' },
      { category: 'billing', urgency: 'high' },
      { category: 'other', urgency: 'low' },
      { category: 'shipping', urgency: 'medium' },
      { category: 'billing', urgency: 'medium' },
    ],
    judge: [0.9, 0.9, 0.95, 0.9, 0.8, 0.85],
  },
}

export interface Metric {
  key: 'correct_category' | 'correct_urgency' | 'helpful_action'
  label: string
  threshold: number
  percent: boolean
}

export const METRICS: Metric[] = [
  { key: 'correct_category', label: 'category accuracy', threshold: 0.9, percent: true },
  { key: 'correct_urgency', label: 'urgency accuracy', threshold: 0.8, percent: true },
  { key: 'helpful_action', label: 'LLM judge: helpful action', threshold: 0.8, percent: false },
]

export function checks(e: Experiment) {
  const run = RUNS[e]
  return DATASET.map((ex, i) => ({
    category: run.outputs[i].category === ex.category,
    urgency: run.outputs[i].urgency === ex.urgency,
    judge: run.judge[i],
  }))
}

export function scores(e: Experiment) {
  const c = checks(e)
  const n = c.length
  return {
    correct_category: c.filter((x) => x.category).length / n,
    correct_urgency: c.filter((x) => x.urgency).length / n,
    helpful_action: c.reduce((a, x) => a + x.judge, 0) / n,
  }
}

export function fmtMetric(m: Metric, v: number) {
  return m.percent ? `${Math.round(v * 100)}%` : v.toFixed(2)
}

export const EVAL_DURS = [3.0, 3.6, 3.2, 3.6, 3.0, 3.4, 3.0]
