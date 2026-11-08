export type MmScenario = 'support' | 'chart'
export type MmPhase = 'inputs' | 'image' | 'second' | 'understand' | 'tools' | 'reply'

export interface MmScenarioDef {
  imageName: string
  secondKind: 'audio' | 'text'
  secondLabel: string
  transcript: string
  facts: { icon: 'eye' | 'ear' | 'text'; text: string }[]
  tools: { call: string; result: string }[]
  reply: string
  outputKind: 'speech' | 'chart'
}

export const MM: Record<MmScenario, MmScenarioDef> = {
  support: {
    imageName: 'package.jpg',
    secondKind: 'audio',
    secondLabel: 'voice_note.m4a · 0:06',
    transcript: 'My order arrived like this. Can I get a refund?',
    facts: [
      { icon: 'eye', text: 'box is crushed on one corner' },
      { icon: 'eye', text: 'shipping label reads #4512' },
      { icon: 'ear', text: 'customer asks for a refund' },
    ],
    tools: [
      { call: 'lookup_order(4512)', result: 'delivered yesterday · $89' },
      { call: 'create_refund(4512)', result: 'refund R-883 created' },
    ],
    reply: "Sorry about that! I've refunded $89 for order #4512 (ref R-883). It will reach your card in 3–5 days.",
    outputKind: 'speech',
  },
  chart: {
    imageName: 'sales_chart.png',
    secondKind: 'text',
    secondLabel: 'typed question',
    transcript: 'Why did sales drop in March?',
    facts: [
      { icon: 'eye', text: 'bar chart: Jan 120k, Feb 118k, Mar 72k' },
      { icon: 'eye', text: 'March is down about 39%' },
      { icon: 'text', text: 'user wants the cause of the drop' },
    ],
    tools: [{ call: 'run_sql("sales by region, March")', result: 'EU: -71% · warehouse closed 2 weeks' }],
    reply: 'March fell 39% because the EU warehouse was closed for two weeks; EU sales dropped 71% while other regions were flat.',
    outputKind: 'chart',
  },
}

export const MM_PHASES: MmPhase[] = ['inputs', 'image', 'second', 'understand', 'tools', 'reply']
export const MM_DUR = 3.2
