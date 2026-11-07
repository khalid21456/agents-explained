export type HNode = 'user' | 'agent' | 'tools' | 'human' | 'answer'
export type Decision = 'approve' | 'edit' | 'reject'

export interface HStep {
  from: HNode
  to: HNode
  packet: string
  tone: 'ok' | 'warn' | 'bad' | 'call'
  title: string
  detail: string
  focus: string[]
}

const COMMON: HStep[] = [
  {
    from: 'user',
    to: 'agent',
    packet: 'Pay my electricity bill.',
    tone: 'ok',
    title: 'User asks',
    detail: 'The request starts a run on thread bills-42. The checkpointer will save the state after every step.',
    focus: ['config = ', 'graph.invoke({"messages"'],
  },
  {
    from: 'agent',
    to: 'tools',
    packet: 'read_bill()',
    tone: 'call',
    title: 'Safe tool runs on its own',
    detail: 'read_bill is read-only, so route() sends it straight to the tools. No human needed for low-risk actions.',
    focus: ['SENSITIVE = ', 'def route', 'return "human_review" if'],
  },
  {
    from: 'tools',
    to: 'agent',
    packet: 'PowerCo · $240 · due Nov 30',
    tone: 'ok',
    title: 'Bill found',
    detail: 'The tool result goes back to the agent, which now wants to pay.',
    focus: ['ToolNode(', 'builder.add_edge("tools", "agent")'],
  },
  {
    from: 'agent',
    to: 'human',
    packet: 'pay_bill(PowerCo, $240, checking)',
    tone: 'warn',
    title: 'interrupt(): waiting for a human',
    detail: 'pay_bill moves money, so route() sends it to human_review. interrupt() saves a checkpoint and pauses the graph. Pick a decision.',
    focus: ['def human_review', 'decision = interrupt(', 'checkpointer=InMemorySaver()'],
  },
]

export const BRANCHES: Record<Decision, HStep[]> = {
  approve: [
    {
      from: 'human',
      to: 'tools',
      packet: 'pay_bill(PowerCo, $240, checking)',
      tone: 'ok',
      title: 'Human approves',
      detail: 'Command(resume=…) loads the checkpoint and returns the decision from interrupt(). Approved, so the original call goes to the tools.',
      focus: ['graph.invoke(Command(resume=', 'if decision["action"] == "approve"', 'return Command(goto="tools")'],
    },
    {
      from: 'tools',
      to: 'agent',
      packet: 'paid · confirmation #8841',
      tone: 'ok',
      title: 'Payment executed',
      detail: 'The tool runs exactly as proposed and the result returns to the agent.',
      focus: ['ToolNode(', 'builder.add_edge("tools", "agent")'],
    },
    {
      from: 'agent',
      to: 'answer',
      packet: 'Paid $240 to PowerCo from checking. Confirmation #8841.',
      tone: 'ok',
      title: 'Agent confirms',
      detail: 'No more tool calls, so route() ends the run.',
      focus: ['if not calls', 'return END'],
    },
  ],
  edit: [
    {
      from: 'human',
      to: 'tools',
      packet: 'pay_bill(PowerCo, $240, savings)',
      tone: 'warn',
      title: 'Human edits the call',
      detail: 'The human changes the account to savings. human_review rewrites the tool call in the state, then sends it to the tools.',
      focus: ['graph.invoke(Command(resume=', 'if decision["action"] == "edit"', 'edited = ', 'ai = state', 'return Command(goto="tools", update'],
    },
    {
      from: 'tools',
      to: 'agent',
      packet: 'paid from savings · #8842',
      tone: 'ok',
      title: 'Edited payment executed',
      detail: 'The tool runs with the corrected arguments, not the ones the model proposed.',
      focus: ['ToolNode(', 'builder.add_edge("tools", "agent")'],
    },
    {
      from: 'agent',
      to: 'answer',
      packet: 'Paid $240 to PowerCo from your savings account. Confirmation #8842.',
      tone: 'ok',
      title: 'Agent confirms',
      detail: 'The answer reflects the human correction.',
      focus: ['if not calls', 'return END'],
    },
  ],
  reject: [
    {
      from: 'human',
      to: 'agent',
      packet: 'Not now, wait until payday on the 28th.',
      tone: 'bad',
      title: 'Human rejects with feedback',
      detail: 'Nothing is paid. The feedback goes back to the agent as a ToolMessage, so the model knows why and can adapt.',
      focus: ['graph.invoke(Command(resume=', 'rejection = ToolMessage', 'return Command(goto="agent"'],
    },
    {
      from: 'agent',
      to: 'answer',
      packet: "Understood, I won't pay it now. I'll remind you on the 28th.",
      tone: 'ok',
      title: 'Agent adapts',
      detail: 'The model reads the rejection and responds without retrying the payment.',
      focus: ['def agent', 'if not calls', 'return END'],
    },
  ],
}

export function hitlSteps(d: Decision): HStep[] {
  return [...COMMON, ...BRANCHES[d]]
}

export const RESUME: Record<Decision, string> = {
  approve: '{"action": "approve"}',
  edit: '{"action": "edit", "args": {"account": "savings"}}',
  reject: '{"action": "reject", "feedback": "Not now, wait until payday on the 28th."}',
}

export const HITL_TRAVEL = 1.0
export const HITL_DUR = 3.0
export const INTERRUPT_STEP = COMMON.length - 1
