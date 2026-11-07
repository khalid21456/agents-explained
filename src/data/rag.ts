import { C } from '../lib/draw'

export interface RagChunk {
  short: string
  text: string
  vx: number
  vy: number
}

export interface RagDoc {
  name: string
  color: string
  chunks: RagChunk[]
}

export const RAG_DOCS: RagDoc[] = [
  {
    name: 'refund_policy.pdf',
    color: C.green,
    chunks: [
      { short: 'refund 30 days', text: 'Damaged items can be refunded within 30 days of delivery.', vx: 0.17, vy: 0.3 },
      { short: 'original card', text: 'Refunds are sent to the original payment method.', vx: 0.3, vy: 0.4 },
      { short: 'no opened software', text: 'Opened software cannot be returned.', vx: 0.2, vy: 0.52 },
    ],
  },
  {
    name: 'shipping.md',
    color: C.blue,
    chunks: [
      { short: '3–5 days', text: 'Standard delivery takes 3–5 business days.', vx: 0.64, vy: 0.24 },
      { short: 'express', text: 'Express orders ship the next business day.', vx: 0.78, vy: 0.17 },
      { short: '30 countries', text: 'We currently ship to 30 countries.', vx: 0.88, vy: 0.4 },
    ],
  },
  {
    name: 'faq.html',
    color: C.amber,
    chunks: [
      { short: 'tracking', text: 'Track your order from the Orders page.', vx: 0.5, vy: 0.74 },
      { short: 'address change', text: 'You can change the address before dispatch.', vx: 0.64, vy: 0.66 },
      { short: 'gift cards', text: 'Gift cards never expire.', vx: 0.62, vy: 0.86 },
    ],
  },
]

export const RAG_QUESTION = 'How long do I have to return a damaged item?'
export const RAG_QUERY = { vx: 0.26, vy: 0.44 }
export const RAG_TOP = [
  { doc: 0, chunk: 0, score: 0.91 },
  { doc: 0, chunk: 1, score: 0.77 },
  { doc: 0, chunk: 2, score: 0.64 },
]
export const RAG_WRONG = 'Refunds are accepted within 60 days, no questions asked.'
export const RAG_ANSWER = 'You have 30 days from delivery to return a damaged item [1]. The refund goes back to your original payment method [2].'
export const RAG_DUR = 3.4
