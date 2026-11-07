import { C } from '../lib/draw'

export interface PromptBlock {
  tag: string
  color: string
  text: string
}

export const BLOCKS: PromptBlock[] = [
  { tag: 'ROLE', color: C.violet, text: 'You are a support triage assistant for an online store.' },
  { tag: 'INSTRUCTIONS', color: C.cyan, text: 'Classify category, urgency and sentiment, then suggest the next action.' },
  { tag: 'CONTEXT', color: C.green, text: 'Refund policy: damaged items can be refunded within 30 days.' },
  { tag: 'FEW-SHOT', color: C.amber, text: '2 example tickets, each with the ideal answer.' },
  { tag: 'FORMAT', color: C.pink, text: 'with_structured_output(Ticket): a typed JSON schema.' },
]

export const USER_BLOCK: PromptBlock = { tag: 'USER', color: C.blue, text: 'My order #4512 arrived broken, I want a refund!!' }

export const TICKETS = [
  'My order #4512 arrived broken, I want a refund!!',
  'Where is my parcel? It is 3 days late.',
  'Love the product, thanks!',
]

export interface PromptStage {
  title: string
  technique: string
  output: string
  json: boolean
  quality: number
  verdict: string
  issues: string[]
  detail: string
  focus: string[]
}

export const STAGES: PromptStage[] = [
  {
    title: 'Bare prompt',
    technique: 'none',
    output: "Oh no, sorry to hear that! Broken items are so frustrating. You could contact the seller, check the warranty, or maybe leave a review so others know…",
    json: false,
    quality: 0.18,
    verdict: 'generic, rambling, not actionable',
    issues: ['no role', 'no task', 'free-form text'],
    detail: 'Just the raw ticket. The model has no idea who it is, what you want, or what shape the answer should take, so it chats.',
    focus: ['("human", "Ticket: {ticket}")'],
  },
  {
    title: '+ Role',
    technique: 'system role',
    output: "I'm sorry your order arrived damaged. I'll help you sort this out. Could you share a photo of the item so we can look into it?",
    json: false,
    quality: 0.34,
    verdict: 'on-topic tone, but no triage',
    issues: ['no task', 'free-form text'],
    detail: 'A system role sets the persona and domain. The tone improves, but the model still does not know the job is triage.',
    focus: ['("system", "You are a support triage'],
  },
  {
    title: '+ Clear instructions',
    technique: 'explicit task',
    output: 'Category: Product damage\nUrgency: Pretty high\nSentiment: Angry\nNext step: Help the customer',
    json: false,
    quality: 0.55,
    verdict: 'triage done, labels inconsistent',
    issues: ['labels invent themselves', 'vague action'],
    detail: 'Saying exactly what to produce turns chat into triage. But the labels are improvised: "Product damage", "Pretty high".',
    focus: ['("system", "Classify the ticket'],
  },
  {
    title: '+ Context',
    technique: 'grounding context',
    output: 'Category: Product damage\nUrgency: High\nSentiment: Angry\nNext step: Eligible for a refund (damaged, within 30 days)',
    json: false,
    quality: 0.7,
    verdict: 'uses your policy, still free text',
    issues: ['labels not in your taxonomy'],
    detail: 'The model only knows what is in the window. Adding the refund policy lets it recommend the right action.',
    focus: ['("system", "Refund policy'],
  },
  {
    title: '+ Few-shot examples',
    technique: 'few-shot',
    output: 'category: product\nurgency: high\nsentiment: negative\naction: refund damaged item',
    json: false,
    quality: 0.82,
    verdict: 'labels match your taxonomy',
    issues: ['not machine-readable yet'],
    detail: 'Two worked examples teach the exact labels and style better than any description. Show, don\'t tell.',
    focus: ['("human", "Ticket: The parcel', '("ai", ', '("human", "Ticket: I was charged'],
  },
  {
    title: '+ Structured output',
    technique: 'output schema',
    output: '{\n  "category": "product",\n  "urgency": "high",\n  "sentiment": "negative",\n  "action": "refund damaged item"\n}',
    json: true,
    quality: 0.96,
    verdict: 'valid, typed JSON',
    issues: [],
    detail: 'A Pydantic schema plus with_structured_output forces valid JSON with allowed values only, ready for your code.',
    focus: ['class Ticket', 'category: Literal', 'urgency: Literal', 'sentiment: Literal', 'action: str', 'with_structured_output'],
  },
  {
    title: 'Template it',
    technique: 'reusable template',
    output:
      '{"category": "product", "urgency": "high", …}\n{"category": "shipping", "urgency": "medium", …}\n{"category": "other", "urgency": "low", …}',
    json: true,
    quality: 0.96,
    verdict: 'same prompt, any ticket',
    issues: [],
    detail: 'The finished prompt is a template with a {ticket} variable, so you can batch, test and version it like code.',
    focus: ['ChatPromptTemplate.from_messages', '{ticket}', 'triage.batch', 'tickets = ['],
  },
]

export const PROMPT_DUR = 3.6
