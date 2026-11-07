import { C } from '../lib/draw'

export type Role = 'human' | 'ai' | 'tool' | 'critic'

export interface Msg {
  role: Role
  text: string
  name?: string
}

export type NodeKind = 'start' | 'end' | 'agent' | 'tools' | 'writer' | 'critic' | 'supervisor' | 'bubble'

export interface GNode {
  id: string
  kind: NodeKind
  label: string
  sub?: string
  x: number
  y: number
  terminal?: boolean
  color: string
  labelSide?: 'right'
}

export interface GEdge {
  from: string
  to: string
  bend?: number
  cond?: string
}

export interface GStep {
  node: string
  msg?: Msg
}

export interface GraphDef {
  scale?: number
  nodes: GNode[]
  edges: GEdge[]
  script: GStep[]
}

export const GRAPHS: Record<string, GraphDef> = {
  supervisor: {
    scale: 0.8,
    nodes: [
      { id: '__start__', kind: 'start', label: '__start__', x: 0.5, y: 0.07, terminal: true, color: C.cyan },
      { id: 'supervisor', kind: 'supervisor', label: 'supervisor', sub: 'routes the work', x: 0.5, y: 0.28, color: C.violet },
      { id: 'report_agent', kind: 'writer', label: 'report_agent', sub: 'writes the visit report', x: 0.15, y: 0.64, color: C.blue },
      { id: 'diagnostic_agent', kind: 'critic', label: 'diagnostic_agent', sub: 'assesses symptoms', x: 0.5, y: 0.64, color: C.green },
      { id: '__end__', kind: 'end', label: '__end__', x: 0.85, y: 0.64, terminal: true, color: C.pink },
      { id: 'patient_response', kind: 'bubble', label: 'patient_response', sub: 'replies to the patient', x: 0.74, y: 0.9, color: C.amber, labelSide: 'right' },
    ],
    edges: [
      { from: '__start__', to: 'supervisor' },
      { from: 'supervisor', to: 'report_agent', bend: 0.14, cond: '' },
      { from: 'report_agent', to: 'supervisor', bend: 0.14 },
      { from: 'supervisor', to: 'diagnostic_agent', cond: '' },
      { from: 'supervisor', to: '__end__', cond: 'END' },
      { from: 'diagnostic_agent', to: 'patient_response', bend: 0.12 },
      { from: 'patient_response', to: 'supervisor', bend: 0.32 },
    ],
    script: [
      { node: '__start__', msg: { role: 'human', text: "I've had a fever and a cough for 3 days. What should I do?" } },
      { node: 'supervisor' },
      { node: 'diagnostic_agent', msg: { role: 'ai', name: 'diagnostic_agent', text: 'Likely a viral respiratory infection. Red flags: shortness of breath, fever above 39°C.' } },
      { node: 'patient_response', msg: { role: 'ai', name: 'patient_response', text: 'Rest, drink plenty of fluids and take paracetamol for the fever. See a doctor if breathing gets hard.' } },
      { node: 'supervisor' },
      { node: 'report_agent', msg: { role: 'ai', name: 'report_agent', text: 'Visit report saved: symptoms, assessment, advice given.' } },
      { node: 'supervisor' },
      { node: '__end__' },
    ],
  },
  agent: {
    nodes: [
      { id: '__start__', kind: 'start', label: 'START', x: 0.3, y: 0.12, terminal: true, color: C.cyan },
      { id: 'agent', kind: 'agent', label: 'agent', sub: 'GPT-5 with tools bound', x: 0.3, y: 0.48, color: C.violet },
      { id: 'tools', kind: 'tools', label: 'tools', sub: 'ToolNode', x: 0.74, y: 0.48, color: C.amber },
      { id: '__end__', kind: 'end', label: 'END', x: 0.3, y: 0.86, terminal: true, color: C.pink },
    ],
    edges: [
      { from: '__start__', to: 'agent' },
      { from: 'agent', to: 'tools', bend: -0.38, cond: 'has tool_calls' },
      { from: 'tools', to: 'agent', bend: -0.38 },
      { from: 'agent', to: '__end__', cond: 'no tool_calls' },
    ],
    script: [
      { node: '__start__', msg: { role: 'human', text: 'Find a flight to Kyoto on Friday and tell me the weather there.' } },
      { node: 'agent', msg: { role: 'ai', text: 'search_flights(dest="KIX", day="Fri")' } },
      { node: 'tools', msg: { role: 'tool', text: 'JL 61 · 10:40 · $820' } },
      { node: 'agent', msg: { role: 'ai', text: 'get_weather(city="Kyoto", day="Fri")' } },
      { node: 'tools', msg: { role: 'tool', text: 'Rain · 17°C' } },
      { node: 'agent', msg: { role: 'ai', text: 'Take JL 61 at 10:40 ($820). Expect rain and 17°C, so pack an umbrella.' } },
      { node: '__end__' },
    ],
  },
  reflect: {
    nodes: [
      { id: '__start__', kind: 'start', label: 'START', x: 0.3, y: 0.12, terminal: true, color: C.cyan },
      { id: 'generate', kind: 'writer', label: 'generate', sub: 'writer LLM', x: 0.3, y: 0.48, color: C.violet },
      { id: 'reflect', kind: 'critic', label: 'reflect', sub: 'critic LLM', x: 0.74, y: 0.48, color: C.green },
      { id: '__end__', kind: 'end', label: 'END', x: 0.3, y: 0.86, terminal: true, color: C.pink },
    ],
    edges: [
      { from: '__start__', to: 'generate' },
      { from: 'generate', to: 'reflect', bend: -0.38, cond: 'revisions < 3' },
      { from: 'reflect', to: 'generate', bend: -0.38 },
      { from: 'generate', to: '__end__', cond: 'revisions ≥ 3' },
    ],
    script: [
      { node: '__start__', msg: { role: 'human', text: 'Write a tweet announcing our agent framework.' } },
      { node: 'generate', msg: { role: 'ai', text: 'v1: "We made a new framework. Check it out!"' } },
      { node: 'reflect', msg: { role: 'critic', text: 'Too vague. Say what it does and who it is for.' } },
      { node: 'generate', msg: { role: 'ai', text: 'v2: "Build reliable AI agents as graphs, with loops, memory and human review built in."' } },
      { node: 'reflect', msg: { role: 'critic', text: 'Much better. Add a call to action.' } },
      { node: 'generate', msg: { role: 'ai', text: 'v3: "…human review built in. Ship your first agent in 5 minutes →"' } },
      { node: '__end__' },
    ],
  },
}

export const G_TRAVEL = 0.95
export const G_DUR = 2.7
