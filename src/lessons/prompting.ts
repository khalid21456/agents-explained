import type { Lesson, Step } from './types'
import PromptCanvas from '../canvases/PromptCanvas'
import { BLOCKS, PROMPT_DUR, STAGES, TICKETS } from '../data/prompting'
import { C } from '../lib/draw'

const CODE = String.raw`
from typing import Literal
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from langchain.chat_models import init_chat_model

class Ticket(BaseModel):
    category: Literal["shipping", "billing", "product", "other"]
    urgency: Literal["low", "medium", "high"]
    sentiment: Literal["positive", "neutral", "negative"]
    action: str = Field(description="Next step for the support team")

prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a support triage assistant for an online store."),
    ("system", "Classify the ticket by category, urgency and sentiment, then suggest the next action."),
    ("system", "Refund policy: damaged items can be refunded within 30 days."),
    ("human", "Ticket: The parcel was late but fine."),
    ("ai", '{{"category": "shipping", "urgency": "low", "sentiment": "neutral", "action": "apologise"}}'),
    ("human", "Ticket: I was charged twice!!"),
    ("ai", '{{"category": "billing", "urgency": "high", "sentiment": "negative", "action": "refund duplicate charge"}}'),
    ("human", "Ticket: {ticket}"),
])

model = init_chat_model("openai:gpt-5")
triage = prompt | model.with_structured_output(Ticket)

result = triage.invoke({"ticket": "My order #4512 arrived broken, I want a refund!!"})

tickets = [
    "My order #4512 arrived broken, I want a refund!!",
    "Where is my parcel? It is 3 days late.",
    "Love the product, thanks!",
]
results = triage.batch([{"ticket": t} for t in tickets])
`

const COLORS = [C.blue, ...BLOCKS.map((b) => b.color), C.green]

const BATCH = [
  { category: 'product', urgency: 'high', sentiment: 'negative', action: 'refund damaged item' },
  { category: 'shipping', urgency: 'medium', sentiment: 'negative', action: 'share tracking link' },
  { category: 'other', urgency: 'low', sentiment: 'positive', action: 'thank the customer' },
]

function build() {
  const steps: Step[] = STAGES.map((s, i) => {
    const used = BLOCKS.slice(0, Math.min(i, BLOCKS.length)).map((b) => b.tag.toLowerCase())
    const messages = 1 + Math.min(i, 3) + (i >= 4 ? 4 : 0)
    const tokens = [18, 32, 55, 74, 160, 210, 210][i]
    const state: Record<string, unknown> = {
      model: 'openai:gpt-5',
      techniques: used.length ? used : ['none'],
      prompt: { messages, approx_tokens: tokens },
    }
    if (i === STAGES.length - 1) state.inputs = TICKETS
    state.output = !s.json ? s.output : i === STAGES.length - 1 ? BATCH : JSON.parse(s.output)
    state.quality = `${Math.round(s.quality * 100)}%`
    state.remaining_issues = s.issues.length ? s.issues : ['none']
    return {
      title: s.title,
      detail: s.detail,
      dur: PROMPT_DUR,
      color: COLORS[i],
      focus: s.focus,
      state,
    }
  })
  return { steps, file: 'prompting.py', code: CODE }
}

export const prompting: Lesson = {
  id: 'prompting',
  num: '02',
  nav: 'Prompt engineering',
  group: 'Foundations',
  title: 'Prompt engineering',
  lead: 'Role, instructions, context, examples and an output format each make the answer more precise.',
  blurb: 'Role, context, few-shot, structured output.',
  ideas: [
    { title: 'Be specific', body: 'Say what to do, for whom, and in what shape. Vague prompts get vague answers.', color: C.cyan },
    { title: 'Give it context', body: 'The model only knows what is in the window: policies, documents, data. Put the facts it needs right there.', color: C.green },
    { title: "Show, don't tell", body: 'A couple of worked examples teach labels, tone and edge cases better than paragraphs of description.', color: C.amber },
    { title: 'Constrain the output', body: 'A schema with structured output makes answers machine-readable, validated and easy to test.', color: C.pink },
    { title: 'Treat prompts like code', body: 'Template them, version them, and evaluate them on a fixed set of inputs before you ship a change.', color: C.violet },
  ],
  build,
  Canvas: PromptCanvas,
}
