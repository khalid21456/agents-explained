import { C } from '../lib/draw'
import type { ServerGlyph } from '../lib/icons'

export interface McpServerDef {
  id: string
  glyph: ServerGlyph
  color: string
  transport: string
  short: string
  tools: string[]
  y: number
}

export const SERVERS: McpServerDef[] = [
  { id: 'weather', glyph: 'sun', color: C.amber, transport: 'streamable HTTP', short: 'HTTP', tools: ['get_forecast'], y: 0.2 },
  { id: 'filesystem', glyph: 'folder', color: C.green, transport: 'stdio', short: 'stdio', tools: ['read_file', 'write_file', 'list_directory'], y: 0.5 },
  { id: 'calendar', glyph: 'calendar', color: C.cyan, transport: 'streamable HTTP', short: 'HTTP', tools: ['list_events', 'create_event'], y: 0.8 },
]

export const APPS = [
  { label: 'your agent', kind: 'robot' as const, color: C.violet, y: 0.22 },
  { label: 'IDE assistant', kind: 'robot' as const, color: C.blue, y: 0.5 },
  { label: 'chat app', kind: 'bubble' as const, color: C.pink, y: 0.78 },
]

export const MCP_QUESTION = "Check tomorrow's weather in Paris and save it to notes.md"
export const MCP_ANSWER = 'Tomorrow in Paris: rain, 14°C. Saved to notes.md.'
export const MCP_DURS = [3.2, 3.2, 3.2, 3.2, 2.6, 2.6, 3.2, 3.2, 2.8]
