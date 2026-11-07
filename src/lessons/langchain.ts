import type { Lesson, Opts, Step } from './types'
import ChainCanvas from '../canvases/ChainCanvas'
import { CHAINS, CHAIN_SCALE } from '../data/chain'
import { C } from '../lib/draw'

const SIMPLE = String.raw`
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain.chat_models import init_chat_model

prompt = ChatPromptTemplate.from_messages([
    ("system", "You explain things in one sentence."),
    ("human", "What are {topic}?"),
])
model = init_chat_model("openai:gpt-5")
parser = StrOutputParser()

chain = prompt | model | parser

result = chain.invoke({"topic": "agents"})
`

const RAG = String.raw`
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

retriever = vector_store.as_retriever(search_kwargs={"k": 4})

prompt = ChatPromptTemplate.from_template(
    "Answer using only this context:\n{context}\n\nQuestion: {question}"
)

rag_chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt
    | model
    | StrOutputParser()
)

result = rag_chain.invoke("What is LangGraph?")
`

type Raw = Omit<Step, 'dur'>

const SIMPLE_STEPS: Raw[] = [
  {
    title: 'invoke()',
    detail: 'A plain dict goes in. Every component in the chain accepts and returns data through the same Runnable interface.',
    color: C.cyan,
    focus: ['result = chain.invoke'],
    state: { input: { topic: 'agents' }, model: 'openai:gpt-5' },
  },
  {
    title: 'PromptTemplate',
    detail: 'The template fills {topic} and produces a list of chat messages.',
    color: C.violet,
    focus: ['prompt = ChatPromptTemplate', '("system"', '("human"'],
    state: {
      input: { topic: 'agents' },
      prompt_value: ['SystemMessage("You explain things in one sentence.")', 'HumanMessage("What are agents?")'],
    },
  },
  {
    title: 'ChatModel',
    detail: 'The model receives the messages and returns an AIMessage. Swap the provider string and nothing else changes.',
    color: C.amber,
    focus: ['model = init_chat_model'],
    state: {
      prompt_value: ['SystemMessage(…)', 'HumanMessage("What are agents?")'],
      ai_message: {
        content: 'Agents are LLM-driven programs that decide their own next step.',
        response_metadata: { model_name: 'gpt-5', finish_reason: 'stop' },
        usage: { input_tokens: 24, output_tokens: 14 },
      },
    },
  },
  {
    title: 'StrOutputParser',
    detail: 'The parser pulls the plain text out of the AIMessage.',
    color: C.green,
    focus: ['parser = StrOutputParser'],
    state: {
      ai_message: { content: 'Agents are LLM-driven programs that decide their own next step.' },
      output: 'Agents are LLM-driven programs that decide their own next step.',
    },
  },
  {
    title: 'Result',
    detail: 'prompt | model | parser is itself a Runnable, so this whole chain can be streamed, batched, or nested inside a bigger one.',
    color: C.pink,
    focus: ['chain = prompt | model | parser'],
    state: { result: 'Agents are LLM-driven programs that decide their own next step.' },
  },
]

const DOCS = ['LangGraph is a library for stateful agents…', 'Graphs have nodes and edges…', 'Checkpointers persist state…', 'Interrupts pause for humans…']

const RAG_STEPS: Raw[] = [
  {
    title: 'invoke() and fan-out',
    detail: 'The dict at the start is a RunnableParallel: the same question goes to the retriever and to a passthrough at once.',
    color: C.cyan,
    focus: ['result = rag_chain.invoke', '{"context": retriever, "question": RunnablePassthrough()}'],
    state: { input: 'What is LangGraph?', model: 'openai:gpt-5' },
  },
  {
    title: 'Retriever',
    detail: 'The retriever embeds the question and returns the 4 most similar document chunks.',
    color: C.blue,
    focus: ['retriever = vector_store.as_retriever'],
    state: { input: 'What is LangGraph?', context: DOCS },
  },
  {
    title: 'Prompt',
    detail: 'Both branches merge: the template receives {context} and {question} and builds the messages.',
    color: C.violet,
    focus: ['prompt = ChatPromptTemplate', 'Answer using only this context'],
    state: { context: DOCS, question: 'What is LangGraph?', prompt_value: ['HumanMessage("Answer using only this context: …")'] },
  },
  {
    title: 'ChatModel',
    detail: 'The model answers grounded in the retrieved documents instead of only its training data.',
    color: C.amber,
    focus: ['| model'],
    state: { prompt_value: ['HumanMessage("Answer using only this context: …")'], ai_message: { content: 'LangGraph is a library for building stateful agents as graphs.', response_metadata: { model_name: 'gpt-5', finish_reason: 'stop' } } },
  },
  {
    title: 'Parser',
    detail: 'StrOutputParser extracts the text.',
    color: C.green,
    focus: ['| StrOutputParser()'],
    state: { output: 'LangGraph is a library for building stateful agents as graphs.' },
  },
  {
    title: 'Result',
    detail: 'That is RAG: retrieval plus generation, built from interchangeable Runnables.',
    color: C.pink,
    focus: ['rag_chain = ('],
    state: { result: 'LangGraph is a library for building stateful agents as graphs.', sources: 4 },
  },
]

function build(o: Opts) {
  const mode = o.mode === 'rag' ? 'rag' : 'simple'
  const L = CHAINS[mode]
  const raw = mode === 'rag' ? RAG_STEPS : SIMPLE_STEPS
  const steps: Step[] = raw.map((s, i) => ({ ...s, dur: (L.starts[i + 1] - L.starts[i]) * CHAIN_SCALE }))
  return { steps, file: mode === 'rag' ? 'rag.py' : 'chain.py', code: mode === 'rag' ? RAG : SIMPLE }
}

export const langchain: Lesson = {
  id: 'langchain',
  num: '10',
  nav: 'LangChain',
  group: 'Frameworks',
  title: 'Composable building blocks',
  lead: 'Prompts, models, retrievers and parsers share one Runnable interface, so you pipe them together.',
  blurb: 'Runnables, LCEL pipes and RAG.',
  options: [
    {
      key: 'mode',
      label: 'Chain',
      type: 'segmented',
      choices: [
        { value: 'simple', label: 'Simple chain' },
        { value: 'rag', label: 'RAG chain' },
      ],
    },
  ],
  defaults: { mode: 'simple' },
  ideas: [
    { title: 'One interface', body: 'Everything is a Runnable, so any step can be swapped, streamed, batched, retried or traced the same way.', color: C.violet },
    { title: 'Provider-agnostic', body: 'Swap GPT-5 for Claude or a local Llama by changing one string. The rest of the chain stays the same.', color: C.amber },
    { title: 'Chains are fixed paths', body: 'A chain always runs the same steps in the same order. It cannot loop or decide. That is where LangGraph comes in.', color: C.green },
  ],
  build,
  Canvas: ChainCanvas,
}
