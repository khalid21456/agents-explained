import type { Lesson, Opts, Step } from './types'
import HitlCanvas from '../canvases/HitlCanvas'
import type { Decision } from '../data/hitl'
import { HITL_DUR, INTERRUPT_STEP, RESUME, hitlSteps } from '../data/hitl'
import { C } from '../lib/draw'

function code(d: Decision) {
  return String.raw`
from typing import Literal
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.prebuilt import ToolNode
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import ToolMessage
from langchain.chat_models import init_chat_model

model = init_chat_model("openai:gpt-5").bind_tools([read_bill, pay_bill])
SENSITIVE = {"pay_bill"}

def agent(state: MessagesState):
    return {"messages": [model.invoke(state["messages"])]}

def route(state: MessagesState) -> Literal["tools", "human_review", "__end__"]:
    calls = state["messages"][-1].tool_calls
    if not calls:
        return END
    return "human_review" if calls[0]["name"] in SENSITIVE else "tools"

def human_review(state: MessagesState) -> Command[Literal["tools", "agent"]]:
    call = state["messages"][-1].tool_calls[0]
    decision = interrupt({"question": "Approve this payment?", "tool_call": call})
    if decision["action"] == "approve":
        return Command(goto="tools")
    if decision["action"] == "edit":
        edited = {**call, "args": {**call["args"], **decision["args"]}}
        ai = state["messages"][-1].model_copy(update={"tool_calls": [edited]})
        return Command(goto="tools", update={"messages": [ai]})
    rejection = ToolMessage(decision["feedback"], tool_call_id=call["id"])
    return Command(goto="agent", update={"messages": [rejection]})

builder = StateGraph(MessagesState)
builder.add_node(agent)
builder.add_node("tools", ToolNode([read_bill, pay_bill]))
builder.add_node(human_review)
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", route)
builder.add_edge("tools", "agent")
graph = builder.compile(checkpointer=InMemorySaver())

config = {"configurable": {"thread_id": "bills-42"}}
graph.invoke({"messages": [("user", "Pay my electricity bill.")]}, config)

graph.invoke(Command(resume=${RESUME[d]}), config)
`
}

const CALL = { name: 'pay_bill', args: { payee: 'PowerCo', amount: 240, account: 'checking' }, id: 'call_pay_1' }
const TONE_COLOR = { ok: C.cyan, warn: C.amber, bad: C.red, call: C.violet }

function build(o: Opts) {
  const d: Decision = o.decision === 'edit' || o.decision === 'reject' ? o.decision : 'approve'
  const raw = hitlSteps(d)
  const messages: string[] = []
  const steps: Step[] = raw.map((s, i) => {
    if (s.from === 'user') messages.push(`user: ${s.packet}`)
    if (s.from === 'agent' && s.to === 'tools') messages.push(`ai: tool_call ${s.packet}`)
    if (s.from === 'tools') messages.push(`tool: ${s.packet}`)
    if (s.to === 'human') messages.push(`ai: tool_call ${s.packet}`)
    if (s.from === 'human' && d === 'edit') messages[messages.length - 1] = `ai: tool_call ${s.packet}`
    if (s.from === 'human' && d === 'reject') messages.push(`tool: ${s.packet}`)
    if (s.to === 'answer') messages.push(`ai: ${s.packet}`)

    const state: Record<string, unknown> = { thread_id: 'bills-42' }
    if (i < INTERRUPT_STEP) state.status = 'running'
    else if (i === INTERRUPT_STEP) {
      state.status = 'interrupted'
      state.next = ['human_review']
      state.interrupts = [{ value: { question: 'Approve this payment?', tool_call: CALL } }]
    } else {
      state.status = s.to === 'answer' ? 'done' : 'resumed'
      state.resume = JSON.parse(RESUME[d])
      if (d === 'edit') state.tool_call = { ...CALL, args: { ...CALL.args, account: 'savings' } }
    }
    state.messages = [...messages]
    state.checkpoints = i + 1

    return {
      title: s.title,
      detail: s.detail,
      dur: HITL_DUR,
      color: TONE_COLOR[s.tone],
      focus: s.focus,
      state,
    }
  })

  return {
    steps,
    file: 'human_in_the_loop.py',
    code: code(d),
    gate: (i: number) => i === INTERRUPT_STEP,
    interruptLabel: () => 'interrupt() paused the graph: the agent wants to pay $240 to PowerCo from checking. What do you decide?',
    interruptSide: 'top' as const,
    choiceKey: 'decision',
    choices: [
      { value: 'approve', label: 'Approve', tone: 'approve' as const },
      { value: 'edit', label: 'Edit: use savings', tone: 'edit' as const },
      { value: 'reject', label: 'Reject', tone: 'reject' as const },
    ],
  }
}

export const hitl: Lesson = {
  id: 'human-in-the-loop',
  num: '08',
  nav: 'Human-in-the-loop',
  group: 'Foundations',
  title: 'Human-in-the-loop',
  lead: 'Pause the agent before risky actions, let a person approve, edit or reject, then resume exactly where it stopped.',
  blurb: 'interrupt(), approve, edit, reject, resume.',
  options: [
    {
      key: 'decision',
      label: 'Human decision',
      type: 'segmented',
      choices: [
        { value: 'approve', label: 'Approve' },
        { value: 'edit', label: 'Edit' },
        { value: 'reject', label: 'Reject' },
      ],
    },
  ],
  defaults: { decision: 'approve' },
  ideas: [
    { title: 'Pause only where it matters', body: 'Let read-only, reversible actions run freely. Interrupt on money, deletions, external messages: anything hard to undo.', color: C.amber },
    { title: 'Checkpoints make pausing possible', body: 'interrupt() saves the full state. The human can answer seconds or days later, and the graph resumes from that exact point.', color: C.violet },
    { title: 'More than yes or no', body: 'Humans can approve, edit the arguments, or reject with feedback the model learns from. Each is just a different resume value.', color: C.green },
    { title: 'Design for the reviewer', body: 'Show exactly what will happen, with the arguments, so approving is fast and informed instead of a reflexive click.', color: C.cyan },
  ],
  build,
  Canvas: HitlCanvas,
}
