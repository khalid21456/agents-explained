import type { Lesson, Step } from './types'
import TokenCanvas from '../canvases/TokenCanvas'
import { BASE, PREDICTIONS, STEP_DUR } from '../data/llm'
import { C } from '../lib/draw'

const CODE = String.raw`
from langchain.chat_models import init_chat_model

tokens = tokenize("An AI agent is a")

while not done(tokens):
    probs = llm(tokens)
    next_token = sample(probs, temperature=0.7)
    tokens.append(next_token)

model = init_chat_model("openai:gpt-5")

for chunk in model.stream("An AI agent is a"):
    print(chunk.content, end="")
`

function build() {
  const chosen: string[] = []
  const steps: Step[] = PREDICTIONS.map((p, i) => {
    const context = [...BASE, ...chosen].join(' ')
    const pick = p.c[p.pick][0]
    chosen.push(pick)
    return {
      title: `Predict token ${i + 1}: “${pick}”`,
      detail:
        p.pick === 0
          ? `The model scores every candidate token and samples “${pick}”, the most likely one.`
          : `Sampling picked “${pick}”, only the 2nd most likely token. Temperature above 0 adds this variety.`,
      dur: STEP_DUR,
      color: p.pick === 0 ? C.cyan : C.amber,
      focus: i === 0 ? ['tokens = tokenize', 'probs = llm', 'sample(', 'tokens.append'] : ['probs = llm', 'sample(', 'tokens.append'],
      state: {
        context,
        candidates: Object.fromEntries(p.c),
        temperature: 0.7,
        sampled: pick,
        tokens_generated: i + 1,
      },
    }
  })
  steps.push({
    title: 'Done',
    detail: 'That loop is all an LLM does. Real APIs run it for you and stream each token back as it is produced.',
    dur: 3,
    color: C.pink,
    focus: ['init_chat_model', 'model.stream', 'print(chunk'],
    state: {
      model: 'openai:gpt-5',
      output: [...BASE, ...chosen].join(' '),
      tokens_generated: chosen.length,
      finish_reason: 'stop',
    },
  })
  return { steps, file: 'next_token.py', code: CODE }
}

export const llm: Lesson = {
  id: 'llm',
  num: '01',
  nav: 'LLM',
  group: 'Foundations',
  title: 'An LLM is a next-token predictor',
  lead: 'Given some text, it scores every possible next token, samples one, appends it, and repeats.',
  blurb: 'Tokens, probabilities and sampling.',
  ideas: [
    { title: 'Tokens, not words', body: 'Text is chopped into tokens. The model never sees letters or sentences, only token IDs in and token IDs out.', color: C.cyan },
    { title: 'A probability per token', body: 'Each step produces a distribution. Temperature controls how often it samples something other than the top choice.', color: C.violet },
    { title: 'No hands, no memory', body: "On its own an LLM can only emit text. It can't browse, compute reliably, or remember you tomorrow. Agents fix exactly that.", color: C.pink },
  ],
  build,
  Canvas: TokenCanvas,
}
