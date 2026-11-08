export type ArNode = '__start__' | 'agent' | 'retrieve' | 'grade' | 'rewrite' | 'generate' | '__end__'
export type ArScenario = 'rewrite' | 'first' | 'direct'

export interface ArStep {
  node: ArNode
  title: string
  detail: string
  focus: string[]
  query?: string
  rewritten?: boolean
  docs?: string[]
  grades?: boolean[]
  packet?: string
  answer?: string
  message?: string
}

const BAD_DOCS = ['Smoothie recipes for your blender', 'How to clean your blender', 'Holiday kitchen gift guide']
const GOOD_DOCS = ['Damaged items can be refunded within 30 days of delivery.', 'Refunds are sent to the original payment method.', 'Opened software cannot be returned.']
const SHIP_DOCS = ['Standard delivery takes 3–5 business days.', 'Express orders ship the next business day.', 'We currently ship to 30 countries.']

const F = {
  start: ['graph.invoke({"messages"', 'builder.add_edge(START, "agent")'],
  agent: ['def agent', 'model.bind_tools([retrieve])', 'builder.add_conditional_edges("agent"'],
  retrieve: ['@tool', 'def retrieve', 'docs = vector_store.similarity_search', 'ToolNode([retrieve])'],
  grade: ['class Grade', 'relevant: bool', 'def grade_documents', 'grade = model.with_structured_output', 'return "generate" if', 'builder.add_conditional_edges("retrieve"'],
  rewrite: ['def rewrite_query', 'better = model.invoke', 'return {"messages": [("user"', 'builder.add_edge("rewrite_query", "agent")'],
  generate: ['def generate', 'answer = model.invoke', 'builder.add_edge("generate", END)'],
  end: ['graph = builder.compile()'],
}

export const QUESTIONS: Record<ArScenario, string> = {
  rewrite: 'When can I get my money back for a broken blender?',
  first: 'How long does standard delivery take?',
  direct: "Thanks, that's all!",
}

export const SCENARIOS: Record<ArScenario, ArStep[]> = {
  rewrite: [
    { node: '__start__', title: 'START: question in', detail: 'The question enters the graph state. Nothing is retrieved yet.', focus: F.start, query: QUESTIONS.rewrite, packet: 'question' },
    {
      node: 'agent',
      title: 'Agent decides to retrieve',
      detail: 'Unlike plain RAG, the model first decides whether it needs to search at all. This needs company policy, so it calls the retrieve tool.',
      focus: F.agent,
      query: 'money back broken blender',
      packet: 'retrieve("money back broken blender")',
    },
    {
      node: 'retrieve',
      title: 'Retrieve',
      detail: 'The literal wording matches the wrong documents: blender articles, not refund policy.',
      focus: F.retrieve,
      query: 'money back broken blender',
      docs: BAD_DOCS,
      packet: '3 docs',
    },
    {
      node: 'grade',
      title: 'Grade: not relevant',
      detail: 'grade_documents asks the model whether the documents answer the question. They do not, so the graph routes to rewrite_query instead of answering badly.',
      focus: F.grade,
      query: 'money back broken blender',
      docs: BAD_DOCS,
      grades: [false, false, false],
      packet: 'not relevant',
    },
    {
      node: 'rewrite',
      title: 'Rewrite the query',
      detail: 'The model rewrites the question as a precise search query using the words a policy document would contain.',
      focus: F.rewrite,
      query: 'refund policy for damaged or broken products',
      rewritten: true,
      packet: 'better query',
    },
    {
      node: 'agent',
      title: 'Agent tries again',
      detail: 'The loop goes back to the agent, which retrieves with the improved query. Cycles like this are what make it agentic.',
      focus: F.agent,
      query: 'refund policy for damaged or broken products',
      rewritten: true,
      packet: 'retrieve("refund policy…")',
    },
    {
      node: 'retrieve',
      title: 'Retrieve again',
      detail: 'This time the search lands in the refund policy.',
      focus: F.retrieve,
      query: 'refund policy for damaged or broken products',
      rewritten: true,
      docs: GOOD_DOCS,
      packet: '3 docs',
    },
    {
      node: 'grade',
      title: 'Grade: relevant',
      detail: 'Two of the three chunks answer the question, so the graph routes to generate.',
      focus: F.grade,
      query: 'refund policy for damaged or broken products',
      rewritten: true,
      docs: GOOD_DOCS,
      grades: [true, true, false],
      packet: 'relevant',
    },
    {
      node: 'generate',
      title: 'Generate a grounded answer',
      detail: 'The answer is written only from the relevant sources, with citations.',
      focus: F.generate,
      query: 'refund policy for damaged or broken products',
      rewritten: true,
      docs: GOOD_DOCS,
      grades: [true, true, false],
      answer: 'You can get a refund within 30 days of delivery [1], paid back to your original payment method [2].',
      packet: 'answer',
    },
    { node: '__end__', title: 'END', detail: 'One bad retrieval was caught and fixed automatically. Plain RAG would have answered from smoothie recipes.', focus: F.end, answer: 'You can get a refund within 30 days of delivery [1], paid back to your original payment method [2].' },
  ],
  first: [
    { node: '__start__', title: 'START: question in', detail: 'The question enters the graph state.', focus: F.start, query: QUESTIONS.first, packet: 'question' },
    { node: 'agent', title: 'Agent decides to retrieve', detail: 'Shipping times are company facts, so the agent calls the retrieve tool.', focus: F.agent, query: 'standard delivery time', packet: 'retrieve("standard delivery time")' },
    { node: 'retrieve', title: 'Retrieve', detail: 'The search returns shipping documents.', focus: F.retrieve, query: 'standard delivery time', docs: SHIP_DOCS, packet: '3 docs' },
    {
      node: 'grade',
      title: 'Grade: relevant',
      detail: 'The first chunk answers the question directly, so no rewrite is needed and the graph goes straight to generate.',
      focus: F.grade,
      query: 'standard delivery time',
      docs: SHIP_DOCS,
      grades: [true, false, false],
      packet: 'relevant',
    },
    {
      node: 'generate',
      title: 'Generate a grounded answer',
      detail: 'One retrieval was enough. The grading step cost one extra model call and confirmed the answer is grounded.',
      focus: F.generate,
      query: 'standard delivery time',
      docs: SHIP_DOCS,
      grades: [true, false, false],
      answer: 'Standard delivery takes 3–5 business days [1].',
      packet: 'answer',
    },
    { node: '__end__', title: 'END', detail: 'Same graph, shorter path: agentic RAG only loops when it has to.', focus: F.end, answer: 'Standard delivery takes 3–5 business days [1].' },
  ],
  direct: [
    { node: '__start__', title: 'START: message in', detail: 'A message enters the graph state.', focus: F.start, query: QUESTIONS.direct, packet: 'message' },
    {
      node: 'agent',
      title: 'Agent answers directly',
      detail: 'Nothing to look up, so the model replies without calling the retrieve tool. tools_condition sees no tool call and routes to END.',
      focus: F.agent,
      answer: "You're welcome! Have a great day.",
      packet: 'no tool call',
    },
    { node: '__end__', title: 'END', detail: 'Plain RAG would have searched the vector store anyway. Here the agent saved a retrieval, a grade and latency.', focus: F.end, answer: "You're welcome! Have a great day." },
  ],
}

export const AR_TRAVEL = 0.9
export const AR_DUR = 3.0
