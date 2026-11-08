import type { Lesson, Step } from './types'
import AgentLoop from '../canvases/AgentLoop'
import { LOOP_DUR, LOOP_STEPS } from '../data/loop'
import { C } from '../lib/draw'

const CODE = String.raw`
messages = [("user", "What's the weather in Paris, in °F?")]

while True:
    response = llm_with_tools.invoke(messages)
    messages.append(response)

    if not response.tool_calls:
        break

    for call in response.tool_calls:
        result = tools[call["name"]].invoke(call["args"])
        messages.append(ToolMessage(result, tool_call_id=call["id"]))

print(response.content)

from langchain.agents import create_agent

agent = create_agent(
    model="openai:gpt-5",
    tools=[get_weather, calculator],
)
agent.invoke({"messages": messages[:1]})
`

const COLORS = { user: C.cyan, think: C.violet, act: C.amber, obs: C.green, answer: C.pink }

const DETAILS = [
  'The user message becomes the first entry in the conversation the model will see.',
  'The LLM reads the whole conversation and decides it needs live data, so it emits a tool call instead of an answer.',
  'Your code, not the model, executes the tool with the arguments the model chose.',
  'The tool result is appended as a ToolMessage, so the model can see it on the next turn.',
  'Same loop, new context: the model notices the unit is wrong and asks for another tool.',
  'The calculator runs. Exact math is a job for code, not for next-token prediction.',
  'The second observation goes back into the conversation.',
  'Nothing left to look up, so this time the response has no tool calls.',
  'No tool_calls means the loop breaks and the final text is returned to the user.',
]

const FOCUS: string[][] = [
  ['messages = [("user"'],
  ['response = llm_with_tools.invoke', 'messages.append(response)'],
  ['for call in response.tool_calls', 'result = tools['],
  ['messages.append(ToolMessage'],
  ['response = llm_with_tools.invoke', 'messages.append(response)'],
  ['for call in response.tool_calls', 'result = tools['],
  ['messages.append(ToolMessage'],
  ['if not response.tool_calls', 'break'],
  ['print(response.content)', 'create_agent(', 'agent.invoke'],
]

const MESSAGE_AFTER: (string | null)[] = [
  "user: What's the weather in Paris, in °F?",
  'ai: tool_call get_weather(city="Paris")',
  null,
  'tool: 18°C, cloudy',
  'ai: tool_call calculator("18 * 9/5 + 32")',
  null,
  'tool: 64.4',
  "ai: It's about 64°F and cloudy in Paris.",
  null,
]

function build() {
  const messages: string[] = []
  const steps: Step[] = LOOP_STEPS.map((s, i) => {
    const m = MESSAGE_AFTER[i]
    if (m) messages.push(m)
    const state: Record<string, unknown> = {
      model: 'openai:gpt-5',
      iteration: s.iter,
      phase: s.title.toLowerCase(),
    }
    if (s.node === 'think') state.thought = s.text
    if (s.node === 'act') state.executing = s.text
    if (s.node === 'answer') {
      state.done = true
      state.output = s.text
    }
    state.messages = [...messages]
    return {
      title: s.iter > 0 && s.node !== 'answer' ? `${s.title} (iteration ${s.iter})` : s.title,
      detail: DETAILS[i],
      dur: i === 0 ? 1.6 : LOOP_DUR,
      color: COLORS[s.node],
      focus: FOCUS[i],
      state,
    }
  })
  return { steps, file: 'agent_loop.py', code: CODE }
}

export const loop: Lesson = {
  id: 'loop',
  num: '04',
  nav: 'Agent loop',
  group: 'Foundations',
  title: 'Put the LLM in a loop',
  lead: 'Reason, act, observe, repeat. The model decides each next step until it chooses to answer.',
  blurb: 'ReAct: reason, act, observe, repeat.',
  ideas: [
    { title: 'The model drives control flow', body: 'In normal code you write the if/else. In an agent, the LLM chooses the next step at runtime based on what it has seen.', color: C.violet },
    { title: 'ReAct = Reason + Act', body: 'Thought, action, observation, repeated. Writing the reasoning down before acting makes tool use far more reliable.', color: C.amber },
    { title: 'Knowing when to stop', body: 'The loop ends when the model answers without calling a tool, or when a max-iterations guardrail trips.', color: C.pink },
  ],
  build,
  Canvas: AgentLoop,
}
