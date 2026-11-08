import type { Lesson, Opts, Step } from './types'
import AutogenCanvas from '../canvases/AutogenCanvas'
import type { TeamMode } from '../data/autogen'
import { AG_STOP, AG_TURN, TEAMS } from '../data/autogen'
import { C } from '../lib/draw'

const ROUND_ROBIN_CODE = String.raw`
import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_agentchat.conditions import TextMentionTermination, MaxMessageTermination
from autogen_agentchat.ui import Console
from autogen_ext.models.openai import OpenAIChatCompletionClient

model_client = OpenAIChatCompletionClient(model="gpt-5")

writer = AssistantAgent(
    "writer",
    model_client=model_client,
    system_message="You write short, punchy product copy.",
)
critic = AssistantAgent(
    "critic",
    model_client=model_client,
    system_message="Review the copy and give feedback. Reply APPROVE when it is good.",
)

termination = TextMentionTermination("APPROVE") | MaxMessageTermination(10)
team = RoundRobinGroupChat([writer, critic], termination_condition=termination)

async def main():
    await Console(team.run_stream(task="Write a tagline for a reusable water bottle."))
    await model_client.close()

asyncio.run(main())
`

const SELECTOR_CODE = String.raw`
import asyncio
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import SelectorGroupChat
from autogen_agentchat.conditions import TextMentionTermination, MaxMessageTermination
from autogen_agentchat.ui import Console
from autogen_ext.models.openai import OpenAIChatCompletionClient

model_client = OpenAIChatCompletionClient(model="gpt-5")

async def web_search(query: str) -> str:
    """Search the web for recent information."""
    return await search_api(query)

planner = AssistantAgent(
    "planner",
    model_client=model_client,
    description="Breaks the task into steps for the other agents.",
    system_message="Plan the work and assign it. Do not do it yourself.",
)
researcher = AssistantAgent(
    "researcher",
    model_client=model_client,
    description="Finds up-to-date facts with web search.",
    tools=[web_search],
)
writer = AssistantAgent(
    "writer",
    model_client=model_client,
    description="Writes the final brief.",
    system_message="Write the brief from the research, then say TERMINATE.",
)

termination = TextMentionTermination("TERMINATE") | MaxMessageTermination(12)
team = SelectorGroupChat(
    [planner, researcher, writer],
    model_client=model_client,
    termination_condition=termination,
)

async def main():
    await Console(team.run_stream(task="Write a short brief on solid-state batteries."))
    await model_client.close()

asyncio.run(main())
`

const RR_TEXT = [
  { title: 'Task starts the chat', detail: 'run_stream posts the task as the first message of a group chat that every agent in the team can read.', focus: ['team.run_stream(task=', 'async def main'] },
  { title: 'writer speaks', detail: 'RoundRobinGroupChat gives the turn to agents in a fixed order. The writer drafts a first tagline.', focus: ['writer = AssistantAgent(', 'system_message="You write', 'team = RoundRobinGroupChat'] },
  { title: 'critic speaks', detail: 'Next in the circle, the critic reads the whole chat and gives feedback instead of approving.', focus: ['critic = AssistantAgent(', 'system_message="Review the copy'] },
  { title: 'writer revises', detail: 'The turn comes back to the writer, who sees the feedback in the shared history and improves the draft.', focus: ['writer = AssistantAgent(', 'team = RoundRobinGroupChat'] },
  { title: 'critic approves', detail: 'The critic is satisfied and says APPROVE, the word the termination condition is watching for.', focus: ['Reply APPROVE when it is good'] },
]

const SEL_TEXT = [
  { title: 'Task starts the chat', detail: 'run_stream posts the task into the shared group chat.', focus: ['team.run_stream(task=', 'async def main'] },
  { title: 'selector picks planner', detail: 'SelectorGroupChat asks gpt-5 who should speak next, based on each agent\'s description and the chat so far. It picks the planner.', focus: ['team = SelectorGroupChat(', 'planner = AssistantAgent(', 'description="Breaks the task'] },
  { title: 'selector picks researcher', detail: 'The plan says research comes first, so the researcher speaks. It calls its web_search tool and shares what it found.', focus: ['async def web_search', 'researcher = AssistantAgent(', 'tools=[web_search]'] },
  { title: 'selector picks writer', detail: 'With facts in the chat, the selector hands over to the writer, who writes the brief and ends with TERMINATE.', focus: ['writer = AssistantAgent(', 'then say TERMINATE'] },
]

function build(o: Opts) {
  const mode: TeamMode = o.team === 'selector' ? 'selector' : 'roundrobin'
  const team = TEAMS[mode]
  const texts = mode === 'roundrobin' ? RR_TEXT : SEL_TEXT
  const messages: { source: string; content: string }[] = []

  const steps: Step[] = team.turns.map((tn, i) => {
    if (tn.tool) messages.push({ source: tn.speaker, content: `[tool] ${tn.tool.call} → ${tn.tool.result}` })
    messages.push({ source: tn.speaker, content: tn.text })
    const next = team.turns[i + 1]?.speaker ?? null
    const agent = team.agents.find((a) => a.id === tn.speaker)
    return {
      ...texts[i],
      dur: AG_TURN,
      color: agent?.color ?? C.cyan,
      state: {
        team: team.manager,
        ...(mode === 'roundrobin' ? { turn_order: team.agents.map((a) => a.id) } : { candidates: team.agents.map((a) => a.id) }),
        speaker: tn.speaker,
        next_speaker: next,
        message_count: messages.length,
        messages: messages.map((m) => ({ ...m })),
      },
    }
  })

  steps.push({
    title: 'Termination condition fires',
    detail: `TextMentionTermination saw "${team.stopWord}", so the team stops and returns a TaskResult. MaxMessageTermination(${team.maxMessages}) is the safety net if it never appears.`,
    dur: AG_STOP,
    color: C.green,
    focus: ['termination = TextMentionTermination', 'termination_condition=termination'],
    state: {
      task_result: {
        stop_reason: `Text '${team.stopWord}' mentioned`,
        message_count: messages.length,
        last_message: messages[messages.length - 1],
      },
    },
  })

  return { steps, file: mode === 'roundrobin' ? 'round_robin.py' : 'selector.py', code: mode === 'roundrobin' ? ROUND_ROBIN_CODE : SELECTOR_CODE }
}

export const autogen: Lesson = {
  id: 'autogen',
  num: '17',
  nav: 'AutoGen',
  group: 'Frameworks',
  title: 'AutoGen: agents in a group chat',
  lead: "Microsoft's AutoGen builds multi-agent teams that talk in a shared chat, with a rule for who speaks next and a condition for when to stop.",
  blurb: 'Group chats, speaker selection, termination.',
  options: [
    {
      key: 'team',
      label: 'Team',
      type: 'segmented',
      choices: [
        { value: 'roundrobin', label: 'RoundRobinGroupChat' },
        { value: 'selector', label: 'SelectorGroupChat' },
      ],
    },
  ],
  defaults: { team: 'roundrobin' },
  ideas: [
    { title: 'Conversation as control flow', body: 'Instead of drawing a graph, you put agents in a group chat. The order of messages is the workflow.', color: C.cyan },
    { title: 'Who speaks next?', body: 'RoundRobin uses a fixed order. Selector lets an LLM choose from agent descriptions, so write those descriptions carefully.', color: C.amber },
    { title: 'Always define a stop', body: 'Combine a success signal (a keyword like APPROVE) with a hard limit (max messages) so the chat cannot run forever.', color: C.green },
    { title: 'AutoGen vs LangGraph', body: 'AutoGen is quick for conversational teams. LangGraph gives explicit state, edges and checkpoints when you need precise control.', color: C.violet },
    { title: 'Where it is heading', body: 'Microsoft is folding AutoGen into the new Microsoft Agent Framework. The team and group-chat ideas carry over.', color: C.pink },
  ],
  build,
  Canvas: AutogenCanvas,
}
