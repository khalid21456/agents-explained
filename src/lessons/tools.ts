import type { Lesson, Opts, Step } from './types'
import ToolCall from '../canvases/ToolCall'
import { QUESTIONS, TOOLS, TOOL_SCALE, TOOL_STARTS } from '../data/tools'
import { C } from '../lib/draw'

function build(o: Opts) {
  const q = QUESTIONS[Number(o.q ?? 0)]
  const tool = TOOLS[q.tool]
  const call = { name: tool.name, args: { [tool.param]: q.arg }, id: 'call_7f3a' }
  const code = String.raw`
from langchain_core.tools import tool
from langchain.chat_models import init_chat_model

@tool
def ${tool.name}(${tool.param}: str) -> str:
    """${tool.doc}"""
    return run_${tool.name}(${tool.param})

model = init_chat_model("openai:gpt-5")
model_with_tools = model.bind_tools([calculator, web_search, sql_query, get_weather])

user_msg = ("user", "${q.ask}")
ai_msg = model_with_tools.invoke([user_msg])

call = ai_msg.tool_calls[0]
tool_msg = ${tool.name}.invoke(call)

final = model_with_tools.invoke([user_msg, ai_msg, tool_msg])
print(final.content)
`

  const base = { model: 'openai:gpt-5', question: q.ask, tools_available: TOOLS.map((t) => t.name) }
  const dur = (i: number) => (TOOL_STARTS[i + 1] - TOOL_STARTS[i]) * TOOL_SCALE

  const steps: Step[] = [
    {
      title: 'Question arrives',
      detail: 'The user message is sent to a model that has tool schemas bound to it.',
      color: C.cyan,
      focus: ['user_msg = ', 'ai_msg = model_with_tools.invoke'],
      state: { ...base },
    },
    {
      title: 'Model picks a tool',
      detail: `It reads every tool's name, docstring and arguments, and decides ${tool.name} fits best.`,
      color: C.violet,
      focus: ['@tool', `def ${tool.name}`, '"""', 'bind_tools'],
      state: { ...base, selected_tool: tool.name },
    },
    {
      title: 'Tool call emitted',
      detail: 'The model does not run anything. It only returns structured JSON: a tool name plus arguments.',
      color: C.amber,
      focus: ['call = ai_msg.tool_calls[0]'],
      state: { ...base, selected_tool: tool.name, ai_message: { content: '', tool_calls: [call] } },
    },
    {
      title: 'Your code executes it',
      detail: 'Execution happens in your runtime, where you can validate arguments, check permissions, or ask a human first.',
      color: tool.color,
      focus: [`tool_msg = ${tool.name}.invoke(call)`, `return run_${tool.name}`],
      state: { ...base, selected_tool: tool.name, ai_message: { content: '', tool_calls: [call] }, executing: `${tool.name}(${JSON.stringify(call.args)})` },
    },
    {
      title: 'Result goes back',
      detail: 'The output becomes a ToolMessage linked to the call by its id, and is appended to the conversation.',
      color: C.green,
      focus: [`tool_msg = ${tool.name}.invoke(call)`],
      state: {
        ...base,
        selected_tool: tool.name,
        ai_message: { content: '', tool_calls: [call] },
        tool_message: { content: q.result, tool_call_id: call.id },
      },
    },
    {
      title: 'Model answers',
      detail: 'With the tool result in context, the model writes a normal text answer and no further tool calls.',
      color: C.pink,
      focus: ['final = model_with_tools.invoke', 'print(final.content)'],
      state: {
        ...base,
        selected_tool: tool.name,
        tool_message: { content: q.result, tool_call_id: call.id },
        final_answer: q.answer,
      },
    },
  ].map((s, i) => ({ ...s, dur: dur(i) }))

  return { steps, file: 'tools.py', code }
}

export const tools: Lesson = {
  id: 'tools',
  num: '04',
  nav: 'Tools',
  group: 'Foundations',
  title: 'Giving the model hands',
  lead: 'The model emits a structured request, your code runs the tool, and the result goes back as a message.',
  blurb: 'Function calling, step by step.',
  options: [
    {
      key: 'q',
      label: 'Question',
      type: 'segmented',
      choices: QUESTIONS.map((q, i) => ({ value: String(i), label: q.short })),
    },
  ],
  defaults: { q: '0' },
  ideas: [
    { title: 'The description is the prompt', body: 'The model picks tools by reading their names, docstrings and argument schemas. Clear descriptions beat clever code.', color: C.amber },
    { title: 'You stay in control', body: 'Execution happens in your runtime: you can validate arguments, enforce permissions, rate-limit, or ask a human first.', color: C.green },
    { title: 'Anything can be a tool', body: 'APIs, SQL, a Python sandbox, a browser, a vector search, or even another agent.', color: C.blue },
  ],
  build,
  Canvas: ToolCall,
}
