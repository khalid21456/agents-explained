import { C } from '../lib/draw'

export type CrewProcess = 'sequential' | 'hierarchical'
export type CrewAgentId = 'researcher' | 'writer' | 'editor'
export type TaskStatus = 'queued' | 'running' | 'done' | 'revising'

export const CREW_AGENTS: { id: CrewAgentId; role: string; color: string; accessory?: 'pen' | 'lens' }[] = [
  { id: 'researcher', role: 'Senior Researcher', color: C.blue, accessory: 'lens' },
  { id: 'writer', role: 'Tech Writer', color: C.violet, accessory: 'pen' },
  { id: 'editor', role: 'Editor', color: C.green },
]

export const CREW_TASKS: { name: string; agent: CrewAgentId; description: string; expected: string; output: string }[] = [
  {
    name: 'Research',
    agent: 'researcher',
    description: 'Research the current state of solid-state batteries.',
    expected: '5 bullet points with key facts and sources',
    output: '5 facts: pilot lines, ~2x density, safer, 3–4x cost, 2028+',
  },
  {
    name: 'Write',
    agent: 'writer',
    description: 'Write a blog post about solid-state batteries using the research.',
    expected: 'A 3-paragraph markdown blog post',
    output: 'Draft: 3 paragraphs, 280 words',
  },
  {
    name: 'Edit',
    agent: 'editor',
    description: 'Proofread and polish the post. Add a strong title.',
    expected: 'A publish-ready post with a title',
    output: 'Final: "The Battery That Could Double Your Range"',
  },
]

export type CrewStepKind = 'kickoff' | 'task' | 'review' | 'final'

export interface CrewStep {
  kind: CrewStepKind
  task?: number
  statuses: TaskStatus[]
  done: boolean[]
}

export const CREW_FLOWS: Record<CrewProcess, CrewStep[]> = {
  sequential: [
    { kind: 'kickoff', statuses: ['queued', 'queued', 'queued'], done: [false, false, false] },
    { kind: 'task', task: 0, statuses: ['done', 'queued', 'queued'], done: [true, false, false] },
    { kind: 'task', task: 1, statuses: ['done', 'done', 'queued'], done: [true, true, false] },
    { kind: 'task', task: 2, statuses: ['done', 'done', 'done'], done: [true, true, true] },
    { kind: 'final', statuses: ['done', 'done', 'done'], done: [true, true, true] },
  ],
  hierarchical: [
    { kind: 'kickoff', statuses: ['queued', 'queued', 'queued'], done: [false, false, false] },
    { kind: 'task', task: 0, statuses: ['done', 'queued', 'queued'], done: [true, false, false] },
    { kind: 'task', task: 1, statuses: ['done', 'done', 'queued'], done: [true, true, false] },
    { kind: 'review', task: 1, statuses: ['done', 'done', 'queued'], done: [true, true, false] },
    { kind: 'task', task: 2, statuses: ['done', 'done', 'done'], done: [true, true, true] },
    { kind: 'final', statuses: ['done', 'done', 'done'], done: [true, true, true] },
  ],
}

export const REVISION_NOTE = 'Revise: add a cost comparison with Li-ion'
export const REVISED_OUTPUT = 'Draft v2: adds cost comparison table'
export const CREW_DUR = 3.4
