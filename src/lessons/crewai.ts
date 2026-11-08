import type { Lesson, Opts, Step } from './types'
import CrewCanvas from '../canvases/CrewCanvas'
import type { CrewProcess, CrewStep } from '../data/crewai'
import { CREW_AGENTS, CREW_DUR, CREW_FLOWS, CREW_TASKS, REVISED_OUTPUT, REVISION_NOTE } from '../data/crewai'
import { C } from '../lib/draw'

const AGENTS_CODE = String.raw`
from crewai import Agent, Task, Crew, Process
from crewai_tools import SerperDevTool

researcher = Agent(
    role="Senior Researcher",
    goal="Find the latest facts about {topic}",
    backstory="You dig up accurate, recent information and always cite sources.",
    tools=[SerperDevTool()],
    llm="openai/gpt-5",
)
writer = Agent(
    role="Tech Writer",
    goal="Turn research into a clear, engaging blog post",
    backstory="You explain complex technology in simple words.",
    llm="openai/gpt-5",
)
editor = Agent(
    role="Editor",
    goal="Make every post accurate, polished and publish-ready",
    backstory="You have a sharp eye for errors and weak headlines.",
    llm="openai/gpt-5",
)
`

const SEQ_TASKS = String.raw`
research_task = Task(
    description="Research the current state of {topic}.",
    expected_output="5 bullet points with key facts and sources",
    agent=researcher,
)
writing_task = Task(
    description="Write a blog post about {topic} using the research.",
    expected_output="A 3-paragraph markdown blog post",
    agent=writer,
    context=[research_task],
)
editing_task = Task(
    description="Proofread and polish the post. Add a strong title.",
    expected_output="A publish-ready post with a title",
    agent=editor,
    context=[writing_task],
)

crew = Crew(
    agents=[researcher, writer, editor],
    tasks=[research_task, writing_task, editing_task],
    process=Process.sequential,
)

result = crew.kickoff(inputs={"topic": "solid-state batteries"})
print(result.raw)
`

const HIER_TASKS = String.raw`
research_task = Task(
    description="Research the current state of {topic}.",
    expected_output="5 bullet points with key facts and sources",
)
writing_task = Task(
    description="Write a blog post about {topic} using the research.",
    expected_output="A 3-paragraph markdown blog post",
)
editing_task = Task(
    description="Proofread and polish the post. Add a strong title.",
    expected_output="A publish-ready post with a title",
)

crew = Crew(
    agents=[researcher, writer, editor],
    tasks=[research_task, writing_task, editing_task],
    process=Process.hierarchical,
    manager_llm="openai/gpt-5",
)

result = crew.kickoff(inputs={"topic": "solid-state batteries"})
print(result.raw)
print(len(result.tasks_output))
`

const TASK_VARS = ['research_task = Task(', 'writing_task = Task(', 'editing_task = Task(']
const AGENT_VARS = ['researcher = Agent(', 'writer = Agent(', 'editor = Agent(']

function texts(proc: CrewProcess, s: CrewStep): { title: string; detail: string; focus: string[]; color: string } {
  if (s.kind === 'kickoff') {
    return {
      title: 'Kickoff',
      detail:
        proc === 'sequential'
          ? 'crew.kickoff fills {topic} into every agent goal and task description, then starts the first task.'
          : 'crew.kickoff hands the whole job to a manager agent that CrewAI creates from manager_llm. It plans and delegates.',
      focus: proc === 'sequential' ? ['result = crew.kickoff', 'Crew('] : ['result = crew.kickoff', 'process=Process.hierarchical', 'manager_llm='],
      color: C.cyan,
    }
  }
  if (s.kind === 'final') {
    return {
      title: 'Crew finished',
      detail: 'kickoff returns a CrewOutput: the final answer in .raw plus every task output in .tasks_output.',
      focus: proc === 'sequential' ? ['print(result.raw)', 'process=Process.sequential'] : ['print(result.raw)', 'print(len(result.tasks_output))'],
      color: C.pink,
    }
  }
  const j = s.task!
  const task = CREW_TASKS[j]
  const agent = CREW_AGENTS.find((a) => a.id === task.agent)!
  if (s.kind === 'review') {
    return {
      title: 'Manager reviews the draft',
      detail: `The manager compares the draft with the expected output and sends it back once: "${REVISION_NOTE}". The writer revises before editing starts.`,
      focus: ['manager_llm=', 'expected_output="A 3-paragraph'],
      color: C.amber,
    }
  }
  const seqDetail = [
    'The researcher takes task 1. Its role, goal and backstory shape how it works, and it uses SerperDevTool to search the web.',
    'Task 2 goes to the writer. context=[research_task] passes the research output in, so the writer builds on it.',
    'Task 3 goes to the editor, with the draft as context. Its output is the crew\'s final result.',
  ]
  const hierDetail = [
    'The manager reads the task and picks the best agent by role: the Senior Researcher. The result comes back to the manager.',
    'The manager delegates writing to the Tech Writer and passes along the research.',
    'With an approved draft, the manager delegates the final polish to the Editor.',
  ]
  return {
    title: `Task ${j + 1}: ${task.name} → ${agent.role}`,
    detail: proc === 'sequential' ? seqDetail[j] : hierDetail[j],
    focus: proc === 'sequential' ? [AGENT_VARS[j], TASK_VARS[j], ...(j > 0 ? [`context=[${['research', 'writing'][j - 1]}_task]`] : ['tools=[SerperDevTool()]'])] : [AGENT_VARS[j], TASK_VARS[j]],
    color: agent.color,
  }
}

function build(o: Opts) {
  const proc: CrewProcess = o.process === 'hierarchical' ? 'hierarchical' : 'sequential'
  const flow = CREW_FLOWS[proc]
  const steps: Step[] = flow.map((s, i) => {
    const tx = texts(proc, s)
    const revisedDone = proc === 'hierarchical' && i >= 3
    const tasks = CREW_TASKS.map((tk, j) => ({
      task: tk.name,
      agent: proc === 'hierarchical' ? `(delegated) ${CREW_AGENTS.find((a) => a.id === tk.agent)!.role}` : CREW_AGENTS.find((a) => a.id === tk.agent)!.role,
      status: s.statuses[j],
      ...(s.done[j] ? { output: revisedDone && j === 1 ? REVISED_OUTPUT : tk.output } : {}),
    }))
    const state: Record<string, unknown> = {
      process: proc,
      inputs: { topic: 'solid-state batteries' },
      ...(proc === 'hierarchical' ? { manager_llm: 'openai/gpt-5' } : {}),
      tasks,
    }
    if (s.kind === 'review') state.manager_feedback = REVISION_NOTE
    if (s.kind === 'final') state.crew_output = { raw: 'The Battery That Could Double Your Range…', tasks_output: 3 }
    return { ...tx, dur: s.kind === 'kickoff' ? 2.4 : CREW_DUR, state }
  })
  return { steps, file: 'crew.py', code: AGENTS_CODE + (proc === 'sequential' ? SEQ_TASKS : HIER_TASKS) }
}

export const crewai: Lesson = {
  id: 'crewai',
  num: '18',
  nav: 'CrewAI',
  group: 'Frameworks',
  title: 'CrewAI: a crew of role-playing agents',
  lead: 'Give each agent a role, a goal and a backstory, describe the tasks with their expected output, and let the crew work through them.',
  blurb: 'Agents, tasks, crews and processes.',
  options: [
    {
      key: 'process',
      label: 'Process',
      type: 'segmented',
      choices: [
        { value: 'sequential', label: 'Sequential' },
        { value: 'hierarchical', label: 'Hierarchical' },
      ],
    },
  ],
  defaults: { process: 'sequential' },
  ideas: [
    { title: 'Think in roles', body: 'Each agent is a teammate with a role, goal and backstory. These become its system prompt and keep it focused.', color: C.violet },
    { title: 'Tasks define done', body: 'A task says what to do and what the expected output looks like. Clear expected outputs give better results.', color: C.cyan },
    { title: 'Context links tasks', body: 'In a sequential crew, context passes earlier task outputs forward, like a relay.', color: C.blue },
    { title: 'A manager for flexibility', body: 'The hierarchical process adds a manager that delegates and reviews. More adaptable, but more LLM calls.', color: C.amber },
    { title: 'CrewAI vs AutoGen vs LangGraph', body: 'CrewAI is task-and-role first, AutoGen is conversation first, LangGraph is graph and state first.', color: C.pink },
  ],
  build,
  Canvas: CrewCanvas,
}
