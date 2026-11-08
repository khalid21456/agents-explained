import type { Lesson, Opts, Step } from './types'
import GuardCanvas from '../canvases/GuardCanvas'
import { GUARD_DUR, SCENARIOS } from '../data/guardrails'
import type { GuardId } from '../data/guardrails'
import { C } from '../lib/draw'

function code(prompt: string) {
  return String.raw`
from langchain.agents import create_agent
from langchain.agents.middleware import (
    HumanInTheLoopMiddleware,
    ModelCallLimitMiddleware,
    PIIMiddleware,
    after_agent,
    before_agent,
)
from langchain_core.messages import AIMessage
from langgraph.checkpoint.memory import InMemorySaver

@before_agent(can_jump_to=["end"])
def block_injection(state, runtime):
    text = state["messages"][-1].content
    if looks_like_injection(text):
        return {
            "messages": [AIMessage("I can't help with that request.")],
            "jump_to": "end",
        }
    return None

@after_agent
def check_output(state, runtime):
    answer = state["messages"][-1]
    if not safety_model.is_safe(answer.content):
        safe = AIMessage("Sorry, I can't share credentials.", id=answer.id)
        return {"messages": [safe]}
    return None

agent = create_agent(
    model="openai:gpt-5",
    tools=[search_orders, send_email],
    middleware=[
        block_injection,
        PIIMiddleware("email", strategy="redact", apply_to_input=True),
        PIIMiddleware("credit_card", strategy="mask", apply_to_input=True),
        HumanInTheLoopMiddleware(interrupt_on={"send_email": True}),
        ModelCallLimitMiddleware(run_limit=10),
        check_output,
    ],
    checkpointer=InMemorySaver(),
)

config = {"configurable": {"thread_id": "support-1"}}
agent.invoke({"messages": [("user", "${prompt.replace(/"/g, '\\"')}")]}, config)
`
}

const COLORS = { ok: C.cyan, warn: C.amber, bad: C.red }
const GUARD_NAMES: Record<GuardId, string> = { in: 'input', tg: 'tool', out: 'output' }

function build(o: Opts) {
  const sc = SCENARIOS[o.scenario ?? 'safe'] ?? SCENARIOS.safe
  const guards: Record<string, string> = { input: 'pending', tool: 'pending', output: 'pending' }
  const messages: string[] = [`user: ${sc.prompt}`]
  let modelCalls = 0
  let toolCalls = 0

  const steps: Step[] = sc.steps.map((s) => {
    if (s.verdict) guards[GUARD_NAMES[s.to as GuardId]] = `${s.verdict.state}: ${s.verdict.note}`
    if (s.to === 'agent') modelCalls += 1
    if (s.to === 'tools') toolCalls += 1
    if (s.from === 'agent' && s.to === 'tg') messages.push(`ai: tool_call ${s.packet}`)
    if (s.from === 'tools') messages.push(`tool: ${s.packet}`)
    if (s.verdict?.state === 'redact') messages[0] = 'user: Card ****-****-****-1111. Email the receipt to [REDACTED_EMAIL]'
    if (s.from === 'agent' && s.to === 'out') messages.push(`ai: ${s.packet}`)
    if (s.verdict?.state === 'replace') messages[messages.length - 1] = "ai: Sorry, I can't share credentials."
    if (s.to === 'resp' && messages[messages.length - 1] !== `ai: ${s.packet}`) messages.push(`ai: ${s.packet}`)

    const state: Record<string, unknown> = {
      user_input: sc.prompt,
    }
    if (o.scenario === 'pii') state.model_input = 'Card ****-****-****-1111. Email the receipt to [REDACTED_EMAIL]'
    state.guards = { ...guards }
    state.model_calls = `${modelCalls} / 10`
    state.tool_calls = toolCalls
    if (s.from === 'in' && s.to === 'resp') state.jump_to = 'end'
    if (s.verdict?.state === 'replace') state.replaced = { before: s.packet, after: "Sorry, I can't share credentials." }
    if (s.verdict?.state === 'approve') state.interrupt = { tool: 'send_email', waiting_for: 'human approval' }
    state.messages = [...messages]
    if (s.to === 'resp') state.response = s.packet

    return {
      title: s.title,
      detail: s.detail,
      dur: s.verdict ? GUARD_DUR : GUARD_DUR - 0.4,
      color: s.verdict?.state === 'pass' ? C.green : COLORS[s.tone],
      focus: s.focus,
      state,
    }
  })

  const gate = (i: number) => sc.steps[i]?.verdict?.state === 'approve'
  const interruptLabel = () => 'HumanInTheLoopMiddleware paused the run: the agent wants to call send_email.'
  return { steps, gate, interruptLabel, interruptSide: 'left' as const, file: 'guardrails.py', code: code(sc.prompt) }
}

export const guardrails: Lesson = {
  id: 'guardrails',
  num: '10',
  nav: 'Guardrails',
  group: 'Foundations',
  title: 'Guardrails keep agents safe',
  lead: 'Check what goes into the model, what the agent is allowed to do, and what comes out.',
  blurb: 'Input, tool and output checks.',
  options: [
    {
      key: 'scenario',
      label: 'Scenario',
      type: 'segmented',
      choices: Object.entries(SCENARIOS).map(([value, s]) => ({ value, label: s.label })),
    },
  ],
  defaults: { scenario: 'safe' },
  ideas: [
    { title: 'Defense in depth', body: 'Guard the input before the model, the tools around it, and the output after it. No single check catches everything.', color: C.cyan },
    { title: 'Deterministic first', body: 'Regexes, allowlists and limits are cheap and predictable. Add model-based classifiers for the nuanced cases.', color: C.green },
    { title: 'Humans for irreversible actions', body: 'Sending emails, payments, deletions: pause and ask. A checkpointer lets the run resume exactly where it stopped.', color: C.amber },
    { title: 'Fail closed, cap the loop', body: 'When a check is unsure, refuse. Limit model and tool calls so a confused agent cannot loop forever or burn budget.', color: C.red },
  ],
  build,
  Canvas: GuardCanvas,
}
