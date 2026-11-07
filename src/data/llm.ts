export const BASE = ['An', 'AI', 'agent', 'is', 'a']

export const PREDICTIONS: { c: [string, number][]; pick: number }[] = [
  { c: [['system', 0.46], ['program', 0.28], ['model', 0.14], ['loop', 0.07]], pick: 0 },
  { c: [['that', 0.58], ['which', 0.21], ['designed', 0.12], ['built', 0.05]], pick: 0 },
  { c: [['uses', 0.41], ['lets', 0.33], ['helps', 0.14], ['allows', 0.08]], pick: 1 },
  { c: [['an', 0.52], ['the', 0.27], ['its', 0.12], ['a', 0.05]], pick: 0 },
  { c: [['LLM', 0.63], ['AI', 0.18], ['model', 0.11], ['agent', 0.04]], pick: 0 },
  { c: [['decide', 0.44], ['choose', 0.29], ['call', 0.15], ['plan', 0.08]], pick: 0 },
  { c: [['what', 0.57], ['which', 0.2], ['how', 0.14], ['when', 0.06]], pick: 0 },
  { c: [['to', 0.71], ['it', 0.12], ['actions', 0.09], ['next', 0.04]], pick: 0 },
  { c: [['do', 0.66], ['call', 0.14], ['say', 0.1], ['try', 0.06]], pick: 0 },
]

export const ALL_TOKENS = [...BASE, ...PREDICTIONS.map((p) => p.c[p.pick][0])]

export const STEP_DUR = 3.2
