import { C } from '../lib/draw'

export type TeamMode = 'roundrobin' | 'selector'

export interface AgAgent {
  id: string
  color: string
  accessory?: 'pen' | 'lens' | 'crown'
  role: string
  tool?: string
}

export interface AgTurn {
  speaker: string
  text: string
  tool?: { call: string; result: string }
}

export interface AgTeam {
  manager: string
  managerSub: string
  agents: AgAgent[]
  task: string
  stopWord: string
  maxMessages: number
  turns: AgTurn[]
}

export const TEAMS: Record<TeamMode, AgTeam> = {
  roundrobin: {
    manager: 'RoundRobinGroupChat',
    managerSub: 'fixed turn order',
    agents: [
      { id: 'writer', color: C.violet, accessory: 'pen', role: 'writes copy' },
      { id: 'critic', color: C.green, accessory: 'lens', role: 'reviews' },
    ],
    task: 'Write a tagline for a reusable water bottle.',
    stopWord: 'APPROVE',
    maxMessages: 10,
    turns: [
      { speaker: 'user', text: 'Write a tagline for a reusable water bottle.' },
      { speaker: 'writer', text: 'Stay hydrated, save the planet.' },
      { speaker: 'critic', text: 'Too generic. Make it vivid and specific to reuse.' },
      { speaker: 'writer', text: 'One bottle. A thousand refills. Zero regrets.' },
      { speaker: 'critic', text: 'Specific and memorable. APPROVE' },
    ],
  },
  selector: {
    manager: 'SelectorGroupChat',
    managerSub: 'gpt-5 picks the next speaker',
    agents: [
      { id: 'planner', color: C.amber, accessory: 'crown', role: 'plans the work' },
      { id: 'researcher', color: C.blue, accessory: 'lens', role: 'web search', tool: 'web_search' },
      { id: 'writer', color: C.violet, accessory: 'pen', role: 'writes the brief' },
    ],
    task: 'Write a short brief on solid-state batteries.',
    stopWord: 'TERMINATE',
    maxMessages: 12,
    turns: [
      { speaker: 'user', text: 'Write a short brief on solid-state batteries.' },
      { speaker: 'planner', text: 'Plan: 1) researcher finds current facts, 2) writer drafts a 3-line brief.' },
      {
        speaker: 'researcher',
        text: 'Pilot production lines exist, roughly 2x energy density, costs still high.',
        tool: { call: 'web_search("solid-state batteries 2026")', result: '5 results' },
      },
      { speaker: 'writer', text: 'Solid-state batteries promise twice the range in a safer pack, but cost blocks mass adoption for now. TERMINATE' },
    ],
  },
}

export const AG_TURN = 3.2
export const AG_STOP = 2.6
