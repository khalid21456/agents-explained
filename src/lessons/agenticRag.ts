import type { Lesson, Opts, Step } from './types'
import AgenticRagCanvas from '../canvases/AgenticRagCanvas'
import type { ArScenario } from '../data/agenticRag'
import { AR_DUR, QUESTIONS, SCENARIOS } from '../data/agenticRag'
import { C } from '../lib/draw'

function code(sc: ArScenario) {
  return String.raw`
from typing import Literal
from pydantic import BaseModel
from langchain.chat_models import init_chat_model
from langchain_core.tools import tool
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.prebuilt import ToolNode, tools_condition

model = init_chat_model("openai:gpt-5")

@tool
def retrieve(query: str) -> str:
    """Search the company help center."""
    docs = vector_store.similarity_search(query, k=3)
    return "\n\n".join(d.page_content for d in docs)

def agent(state: MessagesState):
    return {"messages": [model.bind_tools([retrieve]).invoke(state["messages"])]}

class Grade(BaseModel):
    relevant: bool

def grade_documents(state: MessagesState) -> Literal["generate", "rewrite_query"]:
    question = state["messages"][0].content
    docs = state["messages"][-1].content
    grade = model.with_structured_output(Grade).invoke(
        f"Do these documents answer the question?\nQuestion: {question}\nDocuments: {docs}"
    )
    return "generate" if grade.relevant else "rewrite_query"

def rewrite_query(state: MessagesState):
    question = state["messages"][0].content
    better = model.invoke(f"Rewrite this as a precise search query: {question}")
    return {"messages": [("user", better.content)]}

def generate(state: MessagesState):
    question = state["messages"][0].content
    docs = state["messages"][-1].content
    answer = model.invoke(f"Answer only from these sources and cite them.\n{docs}\n\nQuestion: {question}")
    return {"messages": [answer]}

builder = StateGraph(MessagesState)
builder.add_node(agent)
builder.add_node("retrieve", ToolNode([retrieve]))
builder.add_node(rewrite_query)
builder.add_node(generate)
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", tools_condition, {"tools": "retrieve", END: END})
builder.add_conditional_edges("retrieve", grade_documents)
builder.add_edge("rewrite_query", "agent")
builder.add_edge("generate", END)
graph = builder.compile()

graph.invoke({"messages": [("user", "${QUESTIONS[sc].replace(/"/g, '\\"')}")]})
`
}

const COLOR: Record<string, string> = {
  __start__: C.cyan,
  agent: C.violet,
  retrieve: C.blue,
  grade: C.amber,
  rewrite: C.cyan,
  generate: C.green,
  __end__: C.pink,
}

function build(o: Opts) {
  const sc: ArScenario = o.scenario === 'first' || o.scenario === 'direct' ? o.scenario : 'rewrite'
  const raw = SCENARIOS[sc]
  let retrievals = 0
  let modelCalls = 0
  const steps: Step[] = raw.map((s, i) => {
    if (s.node === 'retrieve') retrievals += 1
    if (s.node === 'agent' || s.node === 'grade' || s.node === 'rewrite' || s.node === 'generate') modelCalls += 1
    const next = raw[i + 1]?.node
    const state: Record<string, unknown> = { question: QUESTIONS[sc] }
    if (s.query) state.search_query = s.query
    if (s.docs) state.documents = s.docs.map((d, j) => (s.grades ? { text: d, relevant: s.grades[j] } : d))
    if (s.grades) state.route = s.grades.some(Boolean) ? 'generate' : 'rewrite_query'
    if (s.answer) state.answer = s.answer
    state.retrievals = retrievals
    state.model_calls = modelCalls
    if (next) state.next = [next === 'rewrite' ? 'rewrite_query' : next === 'grade' ? 'grade_documents' : next]
    return { title: s.title, detail: s.detail, focus: s.focus, color: COLOR[s.node], dur: i === 0 ? 2.2 : AR_DUR, state }
  })
  return { steps, file: 'agentic_rag.py', code: code(sc) }
}

export const agenticRag: Lesson = {
  id: 'agentic-rag',
  num: '09',
  nav: 'Agentic RAG',
  group: 'Foundations',
  title: 'Agentic RAG',
  lead: 'Let an agent decide when to retrieve, check whether the results are relevant, and rewrite the query when they are not.',
  blurb: 'Decide, grade, rewrite, retry.',
  options: [
    {
      key: 'scenario',
      label: 'Scenario',
      type: 'segmented',
      choices: [
        { value: 'rewrite', label: 'Rewrite & retry' },
        { value: 'first', label: 'Relevant first try' },
        { value: 'direct', label: 'No retrieval needed' },
      ],
    },
  ],
  defaults: { scenario: 'rewrite' },
  ideas: [
    { title: 'Plain RAG trusts the first search', body: 'Classic RAG always retrieves once and answers, even when the documents are wrong. Agentic RAG checks before it answers.', color: C.red },
    { title: 'Retrieve only when needed', body: 'The agent decides per question. Small talk and general knowledge skip the vector store entirely.', color: C.violet },
    { title: 'Grade, then route', body: 'A cheap relevance check turns retrieval into a decision point: generate if relevant, rewrite and retry if not.', color: C.amber },
    { title: 'Cap the loop', body: 'Limit rewrites (for example 2) and fall back to "I could not find that" so the agent never loops forever.', color: C.green },
    { title: 'Trade-off', body: 'Extra model calls add latency and cost. Use agentic RAG where wrong answers are expensive.', color: C.cyan },
  ],
  build,
  Canvas: AgenticRagCanvas,
}
