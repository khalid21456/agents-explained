import type { Lesson, Opts, Step } from './types'
import GraphCanvas from '../canvases/GraphCanvas'
import { GRAPHS, G_DUR } from '../data/graph'
import type { Msg } from '../data/graph'
import { C } from '../lib/draw'

const AGENT_CODE = String.raw`
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import InMemorySaver
from langchain.chat_models import init_chat_model

model = init_chat_model("openai:gpt-5")
model_with_tools = model.bind_tools([search_flights, get_weather])

class State(TypedDict):
    messages: Annotated[list, add_messages]

def agent(state: State):
    return {"messages": [model_with_tools.invoke(state["messages"])]}

builder = StateGraph(State)
builder.add_node("agent", agent)
builder.add_node("tools", ToolNode([search_flights, get_weather]))
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", tools_condition)
builder.add_edge("tools", "agent")

graph = builder.compile(
    checkpointer=InMemorySaver(),
    interrupt_before=["tools"],
)

config = {"configurable": {"thread_id": "trip-1"}}
graph.invoke({"messages": [("user", "Find a flight to Kyoto...")]}, config)
graph.get_state(config)
graph.invoke(None, config)
`

const REFLECT_CODE = String.raw`
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain.chat_models import init_chat_model

writer = init_chat_model("openai:gpt-5")
critic = init_chat_model("openai:gpt-5")

class State(TypedDict):
    messages: Annotated[list, add_messages]
    revisions: int

def generate(state: State):
    draft = writer.invoke(state["messages"])
    return {"messages": [draft], "revisions": state["revisions"] + 1}

def reflect(state: State):
    critique = critic.invoke(state["messages"])
    return {"messages": [("user", critique.content)]}

def should_continue(state: State):
    return END if state["revisions"] >= 3 else "reflect"

builder = StateGraph(State)
builder.add_node("generate", generate)
builder.add_node("reflect", reflect)
builder.add_edge(START, "generate")
builder.add_conditional_edges("generate", should_continue)
builder.add_edge("reflect", "generate")
graph = builder.compile()

graph.invoke({
    "messages": [("user", "Write a tweet announcing our agent framework.")],
    "revisions": 0,
})
`

const SUPERVISOR_CODE = String.raw`
from typing import Literal
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.types import Command
from langchain.chat_models import init_chat_model
from langchain.agents import create_agent

model = init_chat_model("openai:gpt-5")

diagnostic = create_agent(model, tools=[lookup_symptoms], system_prompt="Assess the patient's symptoms.")
reporter = create_agent(model, tools=[save_report], system_prompt="Write and save a visit report.")

class Route(TypedDict):
    next: Literal["diagnostic_agent", "report_agent", "FINISH"]

def supervisor(state: MessagesState) -> Command[Literal["diagnostic_agent", "report_agent", "__end__"]]:
    decision = model.with_structured_output(Route).invoke(state["messages"])
    goto = END if decision["next"] == "FINISH" else decision["next"]
    return Command(goto=goto)

def diagnostic_agent(state: MessagesState):
    result = diagnostic.invoke(state)
    return {"messages": result["messages"][-1:]}

def patient_response(state: MessagesState):
    reply = model.invoke([("system", "Explain this kindly and simply to the patient."), *state["messages"]])
    return {"messages": [reply]}

def report_agent(state: MessagesState):
    result = reporter.invoke(state)
    return {"messages": result["messages"][-1:]}

builder = StateGraph(MessagesState)
builder.add_node(supervisor)
builder.add_node(diagnostic_agent)
builder.add_node(patient_response)
builder.add_node(report_agent)
builder.add_edge(START, "supervisor")
builder.add_edge("diagnostic_agent", "patient_response")
builder.add_edge("patient_response", "supervisor")
builder.add_edge("report_agent", "supervisor")
graph = builder.compile()

graph.invoke({"messages": [("user", "I've had a fever and a cough for 3 days.")]})
`

const SUPERVISOR_TEXT: { title: string; detail: string; focus: string[] }[] = [
  {
    title: 'START: patient message',
    detail: "graph.invoke writes the patient's message into the shared state, and the fixed edge START → supervisor runs first.",
    focus: ['graph.invoke({"messages"', 'builder.add_edge(START, "supervisor")'],
  },
  {
    title: 'supervisor → diagnostic_agent',
    detail: 'The supervisor LLM reads the conversation and returns Command(goto="diagnostic_agent"). Dashed edges are routes chosen at runtime.',
    focus: ['class Route', 'next: Literal', 'def supervisor', 'decision = model.with_structured_output', 'goto = END if', 'return Command(goto=goto)'],
  },
  {
    title: 'node: diagnostic_agent',
    detail: 'A specialist agent with its own prompt and tools assesses the symptoms and appends its finding to the state.',
    focus: ['diagnostic = create_agent', 'def diagnostic_agent', 'result = diagnostic.invoke'],
  },
  {
    title: 'node: patient_response',
    detail: 'A fixed edge always sends the diagnosis to patient_response, which rewrites it in plain, kind language for the patient.',
    focus: ['builder.add_edge("diagnostic_agent", "patient_response")', 'def patient_response', 'reply = model.invoke'],
  },
  {
    title: 'supervisor → report_agent',
    detail: 'The fixed edge patient_response → supervisor hands control back. The patient has been answered, so a report is needed next.',
    focus: ['builder.add_edge("patient_response", "supervisor")', 'def supervisor', 'return Command(goto=goto)'],
  },
  {
    title: 'node: report_agent',
    detail: 'The report agent writes and saves the visit report with its own tool, then returns to the supervisor.',
    focus: ['reporter = create_agent', 'def report_agent', 'result = reporter.invoke'],
  },
  {
    title: 'supervisor → END',
    detail: 'Everything is done, so the supervisor returns FINISH, which maps to END. That is the dashed edge labelled END.',
    focus: ['builder.add_edge("report_agent", "supervisor")', 'goto = END if', 'return Command(goto=goto)'],
  },
  {
    title: 'END',
    detail: 'The graph stops. The final state holds the whole conversation: the patient message, the diagnosis, the reply and the report.',
    focus: ['graph = builder.compile()'],
  },
]

const PREFIX: Record<Msg['role'], string> = { human: 'human', ai: 'ai', tool: 'tool', critic: 'human (critique)' }

function fmt(m: Msg) {
  const isCall = m.role === 'ai' && /^\w+\(/.test(m.text)
  return `${m.name ?? PREFIX[m.role]}: ${isCall ? `tool_call ${m.text}` : m.text}`
}

function build(o: Opts) {
  const mode = o.mode === 'reflect' ? 'reflect' : o.mode === 'agent' ? 'agent' : 'supervisor'
  const hitl = mode === 'agent' && o.hitl === 'on'
  const g = GRAPHS[mode]
  const messages: string[] = []
  let revisions = 0

  const steps: Step[] = g.script.map((s, i) => {
    if (s.msg) messages.push(fmt(s.msg))
    if (s.node === 'generate') revisions += 1
    const nextNode = g.script[i + 1]?.node
    const isCall = s.msg?.role === 'ai' && /^\w+\(/.test(s.msg.text)
    const node = g.nodes.find((n) => n.id === s.node)!
    let title = s.node === '__start__' ? 'START: input written to state' : s.node === '__end__' ? 'END' : `node: ${s.node}`
    let detail: string
    let focus: string[]

    if (mode === 'supervisor') {
      const sup = SUPERVISOR_TEXT[i]
      title = sup.title
      detail = sup.detail
      focus = sup.focus
    } else if (mode === 'agent') {
      if (s.node === '__start__') {
        detail = 'graph.invoke writes the input into the shared state. That state object is what flows along every edge.'
        focus = ['graph.invoke({"messages"', 'class State', 'messages: Annotated']
      } else if (s.node === 'agent' && isCall) {
        detail = hitl
          ? 'The agent node asks for a tool. tools_condition routes to "tools", but interrupt_before pauses the graph first.'
          : 'The agent node calls the model, which asks for a tool. tools_condition sees tool_calls and routes to "tools".'
        focus = hitl
          ? ['model = init_chat_model', 'model_with_tools = ', 'def agent', 'return {"messages"', 'add_conditional_edges', 'interrupt_before']
          : ['model = init_chat_model', 'model_with_tools = ', 'def agent', 'return {"messages"', 'add_conditional_edges']
        title = 'node: agent → tool call'
      } else if (s.node === 'tools') {
        detail = 'ToolNode runs the requested tool and appends a ToolMessage. The edge tools → agent loops back.'
        focus = ['ToolNode(', 'add_edge("tools", "agent")']
        if (hitl) focus.push('graph.invoke(None, config)')
      } else if (s.node === 'agent') {
        detail = 'This time the model answers with no tool calls, so tools_condition routes to END.'
        focus = ['def agent', 'add_conditional_edges']
        title = 'node: agent → final answer'
      } else {
        detail = 'The run finishes. Every step was checkpointed, so get_state shows the full history and you can resume or time-travel.'
        focus = ['checkpointer=InMemorySaver()', 'graph.get_state(config)']
      }
    } else {
      if (s.node === '__start__') {
        detail = 'The input message and revisions = 0 are written into the state.'
        focus = ['graph.invoke({', '"revisions": 0', 'revisions: int']
      } else if (s.node === 'generate') {
        detail = `The writer drafts version ${revisions}. should_continue checks the revision count to choose the next edge.`
        focus = ['writer = init_chat_model', 'def generate', 'draft = writer.invoke', '"revisions": state["revisions"] + 1', 'def should_continue', 'return END if']
        title = `node: generate (v${revisions})`
      } else if (s.node === 'reflect') {
        detail = 'The critic reviews the draft. Its feedback is added as a user message so the writer sees it next.'
        focus = ['critic = init_chat_model', 'def reflect', 'critique = critic.invoke', 'return {"messages": [("user"']
      } else {
        detail = 'Three revisions reached: the conditional edge routes to END. A loop plus a stop condition: easy as a graph, impossible as a chain.'
        focus = ['return END if', 'add_conditional_edges("generate"']
      }
    }

    const values: Record<string, unknown> = { messages: [...messages] }
    if (mode === 'reflect') values.revisions = revisions
    const next = nextNode ? [nextNode] : []
    return {
      title,
      detail,
      dur: i === 0 ? 1.4 : G_DUR,
      color: node.color,
      focus,
      state: {
        values,
        next,
        model: 'openai:gpt-5',
        metadata: { step: i, source: i === 0 ? 'input' : 'loop', writes: s.node },
        checkpoint_id: `1ef${(i * 7919).toString(16).padStart(4, '0')}-${mode}`,
      },
    }
  })

  const gate = hitl ? (i: number) => g.script[i + 1]?.node === 'tools' : undefined
  const interruptLabel = (i: number) => `The agent wants to run ${g.script[i]?.msg?.text ?? 'a tool'}.`
  const file = mode === 'agent' ? 'graph.py' : mode === 'reflect' ? 'reflection.py' : 'supervisor.py'
  const code = mode === 'agent' ? AGENT_CODE : mode === 'reflect' ? REFLECT_CODE : SUPERVISOR_CODE
  return { steps, gate, interruptLabel, file, code }
}

export const langgraph: Lesson = {
  id: 'langgraph',
  num: '16',
  nav: 'LangGraph',
  group: 'Frameworks',
  title: 'Agents as state machines',
  lead: 'Nodes are functions, edges decide what runs next, and a shared state is checkpointed after every step.',
  blurb: 'State, nodes, edges, checkpoints, interrupts.',
  options: [
    {
      key: 'mode',
      label: 'Graph',
      type: 'segmented',
      choices: [
        { value: 'supervisor', label: 'Supervisor graph' },
        { value: 'agent', label: 'Tool-calling agent' },
        { value: 'reflect', label: 'Reflection loop' },
      ],
    },
    { key: 'hitl', label: 'Human approval before tools', type: 'switch', enabledWhen: (o) => o.mode === 'agent' },
  ],
  defaults: { mode: 'supervisor', hitl: 'off' },
  ideas: [
    { title: 'State', body: 'A typed dict shared by all nodes. Reducers like add_messages decide how updates merge: append, overwrite, or custom.', color: C.cyan },
    { title: 'Nodes & edges', body: 'Nodes are plain functions that return state updates. Conditional edges are functions that pick the next node, and cycles are allowed.', color: C.violet },
    { title: 'Checkpoints', body: 'After every super-step the state is saved. That gives you memory across turns, crash recovery, human-in-the-loop and time travel.', color: C.amber },
  ],
  build,
  Canvas: GraphCanvas,
}
