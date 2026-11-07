import { C } from '../lib/draw'

export interface ToolDef {
  name: string
  desc: string
  color: string
  param: string
  doc: string
}

export const TOOLS: ToolDef[] = [
  { name: 'calculator', desc: 'exact math', color: C.amber, param: 'expression', doc: 'Evaluate a math expression exactly.' },
  { name: 'web_search', desc: 'fresh info', color: C.blue, param: 'query', doc: 'Search the web for recent information.' },
  { name: 'sql_query', desc: 'your database', color: C.green, param: 'sql', doc: 'Run a read-only SQL query on the orders DB.' },
  { name: 'get_weather', desc: 'live API', color: C.pink, param: 'city', doc: 'Get the current weather for a city.' },
]

export interface Question {
  short: string
  ask: string
  tool: number
  arg: string
  result: string
  answer: string
}

export const QUESTIONS: Question[] = [
  { short: '23 × 47', ask: "What's 23 × 47?", tool: 0, arg: '23 * 47', result: '1081', answer: '23 × 47 = 1,081' },
  { short: 'News', ask: 'Latest LangGraph release?', tool: 1, arg: 'LangGraph latest release', result: '3 results', answer: 'Here is what changed in the latest release…' },
  { short: 'SQL', ask: 'Orders last week?', tool: 2, arg: 'SELECT COUNT(*) FROM orders WHERE …', result: '1284', answer: 'You had 1,284 orders last week.' },
  { short: 'Weather', ask: 'Weather in Tokyo?', tool: 3, arg: 'Tokyo', result: '22°C, clear', answer: "It's 22°C and clear in Tokyo." },
]

export const TOOL_STARTS = [0, 0.7, 1.9, 3.1, 4.0, 5.1, 7.2]
export const TOOL_SCALE = 1.4
