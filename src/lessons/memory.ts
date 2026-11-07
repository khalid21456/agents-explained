import type { Lesson, Opts, Step } from './types'
import MemoryCanvas from '../canvases/MemoryCanvas'
import { MEMS, MEM_DURS, rank, resolveQuery } from '../data/memory'
import { C } from '../lib/draw'

function build(o: Opts) {
  const q = resolveQuery(o.query)
  const top = rank(q).slice(0, 3)
  const retrieved = top.map((r) => ({ text: MEMS[r.i].label, score: Number(r.score.toFixed(2)) }))
  const vector = [q.x * 2 - 1, 1 - q.y * 2, Math.sin(q.x * 9) * 0.4, Math.cos(q.y * 7) * 0.4].map((v) => Number(v.toFixed(3)))
  const context = ['system: You are a helpful assistant.', ...retrieved.map((r) => `memory: ${r.text}`), `user: ${q.label}`]

  const code = String.raw`
from langchain.embeddings import init_embeddings
from langchain_core.vectorstores import InMemoryVectorStore

embeddings = init_embeddings("openai:text-embedding-3-small")
store = InMemoryVectorStore.from_texts(memories, embedding=embeddings)

query = "${q.label}"
query_vector = embeddings.embed_query(query)

docs = store.similarity_search_by_vector(query_vector, k=3)

context = "\n".join(doc.page_content for doc in docs)
messages = [
    ("system", "You are a helpful assistant.\nKnown facts:\n" + context),
    ("user", query),
]
answer = model.invoke(messages)
`

  const steps: Step[] = [
    {
      title: 'Embed the query',
      detail: 'The question is turned into a vector, a point in the same space as every stored memory.',
      color: C.cyan,
      focus: ['query = ', 'query_vector = embeddings.embed_query'],
      state: { query: q.label, query_vector: [...vector, '… 1532 more'] },
    },
    {
      title: 'Similarity search',
      detail: 'The store looks for the nearest vectors. Close in space means close in meaning, not matching keywords.',
      color: C.blue,
      focus: ['similarity_search_by_vector', 'k=3'],
      state: { query: q.label, query_vector: [...vector, '… 1532 more'], searching: { k: 3, metric: 'cosine', candidates: MEMS.length } },
    },
    {
      title: 'Top-k retrieved',
      detail: 'The 3 closest memories win, each with a similarity score.',
      color: C.violet,
      focus: ['docs = store.similarity_search_by_vector'],
      state: { query: q.label, retrieved },
    },
    {
      title: 'Build the context',
      detail: 'Retrieved memories are written into the prompt. This is the only way the model can "remember" anything.',
      color: C.amber,
      focus: ['context = ', 'messages = [', '("system"', '("user", query)'],
      state: { query: q.label, retrieved, context_window: context },
    },
    {
      title: 'Call the LLM',
      detail: 'The model answers from the context it was given. Swap the memories and you get a different answer.',
      color: C.pink,
      focus: ['answer = model.invoke'],
      state: { context_window: context, answer: q.answer },
    },
  ].map((s, i) => ({ ...s, dur: MEM_DURS[i] }))

  return { steps, file: 'memory.py', code }
}

export const memory: Lesson = {
  id: 'memory',
  num: '05',
  nav: 'Memory',
  group: 'Foundations',
  title: 'Memory is what you put back in context',
  lead: 'LLMs are stateless. Long-term memory is retrieved by meaning and written into the context window.',
  blurb: 'Embeddings, vector search, context.',
  options: [
    {
      key: 'query',
      label: 'Query',
      type: 'segmented',
      choices: [
        { value: 'kyoto', label: 'Kyoto dinner' },
        { value: 'agent', label: 'Agent bug' },
        { value: 'music', label: 'Music' },
      ],
    },
  ],
  defaults: { query: 'kyoto' },
  ideas: [
    { title: 'Short-term: the thread', body: 'Messages from the current conversation, persisted per thread_id by a checkpointer. Trim or summarise when it gets long.', color: C.violet },
    { title: 'Long-term: the store', body: 'Facts, preferences and documents embedded as vectors. Similar meanings land near each other, so search is by meaning.', color: C.cyan },
    { title: 'The window is finite', body: 'Retrieval is a budget decision: pull in the few most relevant memories, not everything you know.', color: C.amber },
  ],
  build,
  Canvas: MemoryCanvas,
}
