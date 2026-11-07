import type { Lesson, Step } from './types'
import RagCanvas from '../canvases/RagCanvas'
import { RAG_ANSWER, RAG_DOCS, RAG_DUR, RAG_QUESTION, RAG_TOP, RAG_WRONG } from '../data/rag'
import { C } from '../lib/draw'

const CODE = String.raw`
from langchain_community.document_loaders import PyPDFLoader, TextLoader, WebBaseLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_core.vectorstores import InMemoryVectorStore
from langchain.chat_models import init_chat_model

model = init_chat_model("openai:gpt-5")
question = "How long do I have to return a damaged item?"
without_rag = model.invoke(question)

docs = (
    PyPDFLoader("refund_policy.pdf").load()
    + TextLoader("shipping.md").load()
    + WebBaseLoader("https://example.com/help/faq").load()
)

splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(docs)

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

vector_store = InMemoryVectorStore(embeddings)
vector_store.add_documents(chunks)

hits = vector_store.similarity_search_with_score(question, k=3)

context = "\n\n".join(
    f"[{i + 1}] {doc.page_content}" for i, (doc, score) in enumerate(hits)
)
prompt = f"Answer only from the sources below and cite them.\n\n{context}\n\nQuestion: {question}"

answer = model.invoke(prompt)
`

const chunkList = RAG_DOCS.flatMap((d) => d.chunks.map((ch) => ({ source: d.name, text: ch.text })))
const topHits = RAG_TOP.map((r, j) => ({ rank: j + 1, source: RAG_DOCS[r.doc].name, text: RAG_DOCS[r.doc].chunks[r.chunk].text, score: r.score }))

function build() {
  const raw: Omit<Step, 'dur'>[] = [
    {
      title: 'Without RAG',
      detail: 'Asked about your refund policy, the model has never seen it, so it produces a confident, plausible and wrong answer.',
      color: C.red,
      focus: ['question = ', 'without_rag = model.invoke(question)'],
      state: { question: RAG_QUESTION, retrieval: 'none', answer: RAG_WRONG, grounded: false, problem: 'hallucination: the model never saw your policy' },
    },
    {
      title: 'Load documents',
      detail: 'Indexing starts offline. Loaders read your PDFs, Markdown files and web pages into Document objects with metadata.',
      color: C.green,
      focus: ['PyPDFLoader("refund_policy.pdf")', 'TextLoader("shipping.md")', 'WebBaseLoader(', 'docs = ('],
      state: { documents: RAG_DOCS.map((d) => ({ source: d.name })) },
    },
    {
      title: 'Split into chunks',
      detail: 'Long documents are cut into small overlapping chunks, so each one is about a single idea and fits easily into a prompt.',
      color: C.blue,
      focus: ['RecursiveCharacterTextSplitter(', 'chunks = splitter.split_documents'],
      state: { documents: 3, chunks: 9, chunk_size: 500, chunk_overlap: 50, example_chunk: { page_content: chunkList[0].text, metadata: { source: chunkList[0].source, start_index: 0 } } },
    },
    {
      title: 'Embed each chunk',
      detail: 'An embedding model turns every chunk into a vector. Chunks about similar topics land close together.',
      color: C.cyan,
      focus: ['embeddings = OpenAIEmbeddings'],
      state: { chunks: 9, embedding_model: 'text-embedding-3-small', dimensions: 1536, example_vector: [0.021, -0.113, 0.087, 0.004, '… 1532 more'] },
    },
    {
      title: 'Store the vectors',
      detail: 'Vectors and their text go into a vector store. Indexing is done, and only needs re-running when documents change.',
      color: C.violet,
      focus: ['vector_store = InMemoryVectorStore', 'vector_store.add_documents(chunks)'],
      state: { vector_store: { type: 'InMemoryVectorStore', vectors: 9, sources: RAG_DOCS.map((d) => d.name) } },
    },
    {
      title: 'Embed the question',
      detail: 'At query time the question is embedded with the same model, so it lands in the same space as the chunks.',
      color: C.cyan,
      focus: ['question = ', 'similarity_search_with_score(question'],
      state: { question: RAG_QUESTION, query_vector: [0.018, -0.097, 0.11, 0.02, '… 1532 more'] },
    },
    {
      title: 'Retrieve top-k',
      detail: 'Similarity search returns the 3 nearest chunks with scores. All three come from the refund policy.',
      color: C.blue,
      focus: ['hits = vector_store.similarity_search_with_score', 'k=3'],
      state: { question: RAG_QUESTION, top_k: topHits },
    },
    {
      title: 'Augment the prompt',
      detail: 'The retrieved chunks are numbered and pasted into the prompt, with an instruction to answer only from them and cite them.',
      color: C.amber,
      focus: ['context = "\\n\\n".join(', 'f"[{i + 1}] {doc.page_content}"', 'prompt = f"Answer only'],
      state: {
        prompt: ['Answer only from the sources below and cite them.', ...topHits.map((hh) => `[${hh.rank}] ${hh.text}`), `Question: ${RAG_QUESTION}`],
      },
    },
    {
      title: 'Generate a grounded answer',
      detail: 'The same model, now with the right facts in its context window, answers correctly and cites its sources.',
      color: C.green,
      focus: ['answer = model.invoke(prompt)'],
      state: { answer: RAG_ANSWER, citations: [`${topHits[0].source}#1`, `${topHits[1].source}#2`], grounded: true },
    },
  ]
  const steps: Step[] = raw.map((s) => ({ ...s, dur: RAG_DUR }))
  return { steps, file: 'rag.py', code: CODE }
}

export const rag: Lesson = {
  id: 'rag',
  num: '06',
  nav: 'RAG',
  group: 'Foundations',
  title: 'Retrieval-Augmented Generation',
  lead: 'Index your documents once, then retrieve the most relevant chunks for every question and let the model answer from them.',
  blurb: 'Load, split, embed, retrieve, generate.',
  ideas: [
    { title: 'Ground the model', body: 'RAG gives the model your facts at question time. No retraining, and updating knowledge is just re-indexing documents.', color: C.green },
    { title: 'Indexing is offline', body: 'Load, split, embed and store happen once, ahead of time. Queries only embed the question and search.', color: C.violet },
    { title: 'Chunking matters', body: 'Chunks that are too big add noise; too small and they lose context. Overlap keeps sentences from being cut in half.', color: C.blue },
    { title: 'Cite your sources', body: 'Numbered sources plus "answer only from these" make answers checkable and reduce hallucinations.', color: C.amber },
    { title: 'Retrieval is the bottleneck', body: 'If the right chunk is not retrieved, the model cannot use it. Evaluate retrieval quality, not just the final answers.', color: C.cyan },
  ],
  build,
  Canvas: RagCanvas,
}
