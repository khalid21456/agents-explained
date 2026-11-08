import type { Lesson, Step } from './types'
import McpCanvas from '../canvases/McpCanvas'
import { MCP_ANSWER, MCP_DURS, MCP_QUESTION, SERVERS } from '../data/mcp'
import { C } from '../lib/draw'

const CLIENT = String.raw`
import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.agents import create_agent

client = MultiServerMCPClient({
    "weather": {
        "url": "http://localhost:8000/mcp",
        "transport": "streamable_http",
    },
    "filesystem": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "./notes"],
        "transport": "stdio",
    },
    "calendar": {
        "url": "https://calendar.example.com/mcp",
        "transport": "streamable_http",
    },
})

async def main():
    tools = await client.get_tools()
    agent = create_agent("openai:gpt-5", tools)
    result = await agent.ainvoke({
        "messages": [("user", "Check tomorrow's weather in Paris and save it to notes.md")]
    })
    print(result["messages"][-1].content)

asyncio.run(main())
`

const SERVER = String.raw`
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("weather")

@mcp.tool()
def get_forecast(city: str, day: str = "tomorrow") -> str:
    """Get the weather forecast for a city."""
    return forecast_api.lookup(city, day)

if __name__ == "__main__":
    mcp.run(transport="streamable-http")
`

const CLIENT_FILE = 'agent.py'
const SERVER_FILE = 'server.py'

const rpc = (id: number, method: string, params?: Record<string, unknown>) => ({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) })

function build() {
  const raw: Omit<Step, 'dur'>[] = [
    {
      title: 'The problem: N × M integrations',
      detail: 'Without a standard, every app needs custom glue code for every tool. 3 apps and 3 tools means 9 integrations to build and maintain.',
      color: C.red,
      file: CLIENT_FILE,
      focus: [],
      state: { apps: 3, tools: 3, integrations: 9, formula: 'N apps × M tools', problem: 'every pair needs its own custom glue code' },
    },
    {
      title: 'MCP: one protocol, N + M',
      detail: 'MCP is an open standard: tools are exposed once as MCP servers, and any MCP host (agent, IDE, chat app) can use them.',
      color: C.green,
      file: CLIENT_FILE,
      focus: ['MultiServerMCPClient({'],
      state: { apps: 3, servers: 3, integrations: 6, formula: 'N + M', benefit: 'build each server once, use it from any MCP host' },
    },
    {
      title: 'Connect to servers',
      detail: 'The client launches the filesystem server as a local process over stdio and reaches the others over streamable HTTP, then runs the initialize handshake.',
      color: C.violet,
      file: CLIENT_FILE,
      focus: ['"url": ', '"transport": "streamable_http"', '"command": "npx"', '"transport": "stdio"'],
      state: {
        transports: Object.fromEntries(SERVERS.map((s) => [s.id, s.transport])),
        request: rpc(1, 'initialize', { protocolVersion: '2025-06-18', clientInfo: { name: 'langchain-mcp-adapters' } }),
        response: { result: { serverInfo: { name: 'filesystem' }, capabilities: { tools: {} } } },
      },
    },
    {
      title: 'Discover tools',
      detail: 'tools/list asks every server what it offers. Each tool comes with a name, description and JSON schema, and becomes a normal LangChain tool.',
      color: C.cyan,
      file: CLIENT_FILE,
      focus: ['tools = await client.get_tools()'],
      state: {
        request: rpc(2, 'tools/list'),
        response: {
          result: {
            tools: [
              {
                name: 'get_forecast',
                description: 'Get the weather forecast for a city.',
                inputSchema: { type: 'object', properties: { city: { type: 'string' }, day: { type: 'string' } }, required: ['city'] },
              },
            ],
          },
        },
        discovered: SERVERS.flatMap((s) => s.tools.map((tool) => `${s.id}.${tool}`)),
      },
    },
    {
      title: 'User asks',
      detail: 'The agent is created with the discovered tools. It does not know or care that they live on MCP servers.',
      color: C.cyan,
      file: CLIENT_FILE,
      focus: ['agent = create_agent', 'result = await agent.ainvoke', '"messages": [("user"'],
      state: { messages: [`user: ${MCP_QUESTION}`], tools_available: 6 },
    },
    {
      title: 'Model picks a tool',
      detail: 'gpt-5 reads the tool descriptions that came from the servers and decides to call get_forecast first.',
      color: C.violet,
      file: CLIENT_FILE,
      focus: ['agent = create_agent("openai:gpt-5", tools)'],
      state: { ai_message: { tool_calls: [{ name: 'get_forecast', args: { city: 'Paris', day: 'tomorrow' } }] } },
    },
    {
      title: 'tools/call on the weather server',
      detail: 'The adapter turns the tool call into a JSON-RPC tools/call request. The weather server runs its Python function and returns the result.',
      color: C.amber,
      file: SERVER_FILE,
      focus: ['@mcp.tool()', 'def get_forecast', 'return forecast_api.lookup', 'mcp.run('],
      state: {
        request: rpc(3, 'tools/call', { name: 'get_forecast', arguments: { city: 'Paris', day: 'tomorrow' } }),
        response: { result: { content: [{ type: 'text', text: 'Rain, 14°C' }] } },
      },
    },
    {
      title: 'tools/call on the filesystem server',
      detail: 'Next the model calls write_file. The same protocol works over stdio with a server someone else wrote, in another language.',
      color: C.green,
      file: CLIENT_FILE,
      focus: ['"filesystem": {', '"@modelcontextprotocol/server-filesystem"'],
      state: {
        request: rpc(4, 'tools/call', { name: 'write_file', arguments: { path: 'notes.md', content: 'Paris, tomorrow: rain, 14°C' } }),
        response: { result: { content: [{ type: 'text', text: 'Successfully wrote to notes.md' }] } },
      },
    },
    {
      title: 'Answer',
      detail: 'Two tools from two different servers, one standard protocol. Swap or add servers without touching the agent code.',
      color: C.pink,
      file: CLIENT_FILE,
      focus: ['print(result["messages"][-1].content)'],
      state: { answer: MCP_ANSWER, tools_used: ['weather.get_forecast', 'filesystem.write_file'] },
    },
  ]
  const steps: Step[] = raw.map((s, i) => ({ ...s, dur: MCP_DURS[i] }))
  return { steps, file: CLIENT_FILE, code: CLIENT, extraFiles: [{ file: SERVER_FILE, code: SERVER }] }
}

export const mcp: Lesson = {
  id: 'mcp',
  num: '06',
  nav: 'MCP',
  group: 'Foundations',
  title: 'Model Context Protocol',
  lead: 'An open standard for plugging tools and data into any agent: build a server once, use it from every MCP host.',
  blurb: 'Servers, discovery, tools/call.',
  ideas: [
    { title: 'USB-C for AI tools', body: 'MCP standardises how agents talk to tools, so a server written once works in your agent, your IDE and your chat app.', color: C.violet },
    { title: 'Hosts, clients, servers', body: 'The host is the app, the client holds one connection per server, and servers expose tools, resources and prompts.', color: C.cyan },
    { title: 'Discovery at runtime', body: 'Tools are listed with their schemas when the client connects. Add a server and the agent gains new abilities with no code change.', color: C.green },
    { title: 'Two transports', body: 'stdio for local processes on your machine, streamable HTTP for remote servers shared by many clients.', color: C.amber },
    { title: 'Trust carefully', body: 'A server can run code and read data. Only connect servers you trust, and combine MCP with guardrails and human approval.', color: C.red },
  ],
  build,
  Canvas: McpCanvas,
}
