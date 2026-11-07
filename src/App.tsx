import { Suspense, lazy, useState } from 'react'
import Nav from './components/Nav'
import Section from './components/Section'
import Reveal from './components/Reveal'
import Ideas from './components/Ideas'
import CodeBlock from './components/CodeBlock'
import Toggle from './components/Toggle'
import TokenCanvas from './canvases/TokenCanvas'
import AgentLoop from './canvases/AgentLoop'
import ToolCall from './canvases/ToolCall'
import MemoryCanvas from './canvases/MemoryCanvas'
import ChainCanvas from './canvases/ChainCanvas'
import type { ChainMode } from './canvases/ChainCanvas'
import LangGraphDemo from './canvases/LangGraphDemo'
import MultiAgent from './canvases/MultiAgent'
import * as S from './content/snippets'

const PixiHero = lazy(() => import('./canvases/PixiHero'))

const GLOSSARY = [
  ['Token', 'The unit an LLM reads and writes, roughly ¾ of an English word.'],
  ['Context window', 'Everything the model can see in one call: prompt, history, tool results.'],
  ['Tool call', 'A structured request (name + JSON args) the model emits for your code to execute.'],
  ['ReAct', 'Reason + Act: interleave thoughts, actions and observations in a loop.'],
  ['Embedding', 'A vector that captures meaning, so similar texts land close together.'],
  ['RAG', 'Retrieval-Augmented Generation: fetch relevant docs, then answer with them.'],
  ['Runnable / LCEL', "LangChain's shared interface; compose runnables with the | operator."],
  ['StateGraph', 'LangGraph builder: nodes + edges + a typed shared state.'],
  ['Reducer', 'How a state key merges updates, e.g. add_messages appends instead of overwriting.'],
  ['Checkpointer', 'Persists state after every step: memory, resumability, time travel.'],
  ['Interrupt', 'Pause a graph mid-run to wait for a human, then resume from the checkpoint.'],
  ['Handoff', 'One agent passing control (and context) directly to another.'],
]

export default function App() {
  const [chain, setChain] = useState<ChainMode>('simple')

  return (
    <>
      <Nav />
      <main id="top">
        <section className="hero">
          <Suspense fallback={<div className="hero-canvas" />}>
            <PixiHero />
          </Suspense>
          <div className="hero-fade" />
          <div className="hero-inner">
            <Reveal>
              <span className="pill">
                <span className="live-dot" /> An interactive field guide
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1>
                How <span className="grad">AI Agents</span>
                <br />
                actually work
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="hero-sub">
                From next-token prediction to multi-agent systems. LLMs, tools, memory, LangChain and LangGraph, explained with
                living diagrams you can watch, click and poke.
              </p>
            </Reveal>
            <Reveal delay={240} className="hero-ctas">
              <a href="#llm" className="primary-btn big">
                Start exploring ↓
              </a>
              <a href="#langgraph" className="ghost-btn big">
                Jump to LangGraph
              </a>
            </Reveal>
          </div>
          <div className="hero-hint">move your cursor through the network</div>
        </section>

        <Section
          id="llm"
          num="01"
          kicker="The brain"
          title={
            <>
              An LLM is a <span className="grad">next-token predictor</span>
            </>
          }
          lead="Every agent is built around a large language model. Strip away the magic and an LLM does one thing: given some text, it scores every possible next token, picks one, appends it, and repeats."
        >
          <Reveal className="stage">
            <TokenCanvas />
          </Reveal>
          <Ideas
            items={[
              { title: 'Tokens, not words', body: 'Text is chopped into tokens. The model never sees letters or sentences, only token IDs in and token IDs out.', color: 'var(--cyan)' },
              { title: 'A probability per token', body: 'Each step produces a distribution. Temperature controls how often it samples something other than the top choice.', color: 'var(--violet)' },
              { title: 'No hands, no memory', body: "On its own an LLM can only emit text. It can't browse, compute reliably, or remember you tomorrow. Agents fix exactly that.", color: 'var(--pink)' },
            ]}
          />
        </Section>

        <Section
          id="loop"
          num="02"
          kicker="The agent loop"
          title={
            <>
              Put the LLM <span className="grad">in a loop</span>
            </>
          }
          lead="An agent wraps the model in a loop. The model reasons about the goal and picks an action, your program executes it, and the result is fed back as an observation. This repeats until the model decides it is done."
        >
          <Reveal>
            <AgentLoop />
          </Reveal>
          <div className="two-col">
            <Ideas
              items={[
                { title: 'The model drives control flow', body: 'In normal code you write the if/else. In an agent, the LLM chooses the next step at runtime based on what it has seen.', color: 'var(--violet)' },
                { title: 'ReAct = Reason + Act', body: 'Thought → Action → Observation, repeated. Writing the reasoning down before acting makes tool use far more reliable.', color: 'var(--amber)' },
                { title: 'Knowing when to stop', body: 'The loop ends when the model answers without calling a tool, or when a max-iterations guardrail trips.', color: 'var(--pink)' },
              ]}
            />
            <Reveal delay={120}>
              <CodeBlock code={S.LOOP} file="agent.py" />
            </Reveal>
          </div>
        </Section>

        <Section
          id="tools"
          num="03"
          kicker="Tools"
          title={
            <>
              Giving the model <span className="grad">hands</span>
            </>
          }
          lead="A tool is a function plus a description. The model never runs code itself. It emits a structured request (tool name + JSON arguments), your code executes it, and the result goes back into the conversation as a message."
        >
          <Reveal>
            <ToolCall />
          </Reveal>
          <div className="two-col">
            <Ideas
              items={[
                { title: 'The description is the prompt', body: 'The model picks tools by reading their names, docstrings and argument schemas. Clear descriptions beat clever code.', color: 'var(--amber)' },
                { title: 'You stay in control', body: 'Execution happens in your runtime: you can validate arguments, enforce permissions, rate-limit, or ask a human first.', color: 'var(--green)' },
                { title: 'Anything can be a tool', body: 'APIs, SQL, a Python sandbox, a browser, a vector search, or even another agent.', color: 'var(--blue)' },
              ]}
            />
            <Reveal delay={120}>
              <CodeBlock code={S.TOOLS} file="tools.py" />
            </Reveal>
          </div>
        </Section>

        <Section
          id="memory"
          num="04"
          kicker="Memory"
          title={
            <>
              Memory is what you <span className="grad">put back in context</span>
            </>
          }
          lead="LLMs are stateless: every call starts from zero. Short-term memory is the running conversation in the context window. Long-term memory lives in a store and is retrieved by meaning, using embeddings."
        >
          <Reveal className="stage">
            <MemoryCanvas />
          </Reveal>
          <p className="hint">Click anywhere in the embedding space to drop your own query and watch nearest-neighbour search.</p>
          <div className="two-col">
            <Ideas
              items={[
                { title: 'Short-term: the thread', body: 'Messages from the current conversation, persisted per thread_id by a checkpointer. Trim or summarise when it gets long.', color: 'var(--violet)' },
                { title: 'Long-term: the store', body: 'Facts, preferences and documents embedded as vectors. Similar meanings land near each other, so search is by meaning, not keywords.', color: 'var(--cyan)' },
                { title: 'The window is finite', body: 'Retrieval is a budget decision: pull in the few most relevant memories, not everything you know.', color: 'var(--amber)' },
              ]}
            />
            <Reveal delay={120}>
              <CodeBlock code={S.MEMORY} file="memory.py" />
            </Reveal>
          </div>
        </Section>

        <Section
          id="langchain"
          num="05"
          kicker="LangChain"
          title={
            <>
              Composable <span className="grad">building blocks</span>
            </>
          }
          lead="LangChain gives every component (prompts, models, retrievers, parsers, tools) the same Runnable interface: invoke, stream, batch. Because they share an interface, you can pipe them together like Unix commands."
        >
          <Reveal className="stage">
            <div className="stage-controls">
              <Toggle<ChainMode>
                value={chain}
                onChange={setChain}
                options={[
                  { value: 'simple', label: 'Simple chain' },
                  { value: 'rag', label: 'RAG chain' },
                ]}
              />
            </div>
            <ChainCanvas mode={chain} />
          </Reveal>
          <div className="two-col">
            <Ideas
              items={[
                { title: 'One interface', body: 'Everything is a Runnable, so any step can be swapped, streamed, batched, retried or traced the same way.', color: 'var(--violet)' },
                { title: 'Provider-agnostic', body: 'Swap Claude for GPT or a local Llama by changing one string. The rest of the chain stays the same.', color: 'var(--amber)' },
                {
                  title: chain === 'rag' ? 'RAG in five lines' : 'Chains are fixed paths',
                  body:
                    chain === 'rag'
                      ? 'Fan the question out to a retriever and a passthrough in parallel, merge them into the prompt, then generate a grounded answer.'
                      : 'A chain always runs the same steps in the same order. Great for predictable pipelines, but it cannot loop or decide. That is where LangGraph comes in.',
                  color: 'var(--green)',
                },
              ]}
            />
            <Reveal delay={120}>
              <CodeBlock code={chain === 'rag' ? S.CHAIN_RAG : S.CHAIN_SIMPLE} file={chain === 'rag' ? 'rag.py' : 'chain.py'} />
            </Reveal>
          </div>
        </Section>

        <Section
          id="langgraph"
          num="06"
          kicker="LangGraph"
          title={
            <>
              Agents as <span className="grad">state machines</span>
            </>
          }
          lead="Chains run in a straight line. Real agents need loops, branches, retries and pauses. LangGraph models an agent as a graph: nodes are functions, edges decide what runs next, and a shared state flows through every step and is checkpointed after each one."
        >
          <Reveal>
            <LangGraphDemo />
          </Reveal>
          <p className="hint">Toggle “Human approval before tools” to see an interrupt: the graph pauses, saves a checkpoint, and resumes when you approve.</p>
          <div className="two-col">
            <Ideas
              items={[
                { title: 'State', body: 'A typed dict shared by all nodes. Reducers like add_messages decide how updates merge: append, overwrite, or custom.', color: 'var(--cyan)' },
                { title: 'Nodes & edges', body: 'Nodes are plain functions that return state updates. Conditional edges are functions that pick the next node, and cycles are allowed.', color: 'var(--violet)' },
                { title: 'Checkpoints', body: 'After every super-step the state is saved. That gives you memory across turns, crash recovery, human-in-the-loop and time travel.', color: 'var(--amber)' },
              ]}
            />
            <Reveal delay={120}>
              <CodeBlock code={S.GRAPH} file="graph.py" />
            </Reveal>
          </div>
        </Section>

        <Section
          id="multi"
          num="07"
          kicker="Multi-agent systems"
          title={
            <>
              A <span className="grad">team</span> of specialists
            </>
          }
          lead="When one agent juggles too many tools and instructions, quality drops. Split the work across focused agents, each with its own prompt and tools, coordinated by a supervisor or by handing off to each other directly."
        >
          <Reveal>
            <MultiAgent />
          </Reveal>
          <div className="two-col">
            <Ideas
              items={[
                { title: 'Supervisor', body: 'A central agent routes each task to a worker and decides when the job is done. Easy to reason about and debug.', color: 'var(--violet)' },
                { title: 'Network / swarm', body: 'Agents hand off control directly with Command(goto=…). More flexible, but harder to predict.', color: 'var(--green)' },
                { title: 'Agents are nodes', body: 'In LangGraph a whole agent can be a node or a subgraph, so multi-agent is just a bigger graph.', color: 'var(--amber)' },
              ]}
            />
            <Reveal delay={120}>
              <CodeBlock code={S.MULTI} file="team.py" />
            </Reveal>
          </div>
        </Section>

        <Section
          id="big-picture"
          num="08"
          kicker="The big picture"
          title={
            <>
              How it all <span className="grad">fits together</span>
            </>
          }
          lead="LangChain gives you the parts, LangGraph wires them into reliable, stateful agents, and observability tooling lets you see what happened at every step."
        >
          <div className="stack-wrap">
            <div className="stack">
              <Reveal className="layer l1">
                <span className="layer-tag">Orchestration</span>
                <h4>LangGraph</h4>
                <p>State, loops, branching, persistence, interrupts, multi-agent. LangChain's create_agent is itself a prebuilt LangGraph graph.</p>
              </Reveal>
              <Reveal className="layer l2" delay={100}>
                <span className="layer-tag">Components</span>
                <h4>LangChain</h4>
                <p>Models, prompts, tools, retrievers, parsers and hundreds of integrations behind one Runnable interface.</p>
              </Reveal>
              <Reveal className="layer l3" delay={200}>
                <span className="layer-tag">Foundations</span>
                <h4>Models, tools & data</h4>
                <p>LLMs from any provider, APIs, databases, vector stores, file systems: the things agents reason over and act on.</p>
              </Reveal>
            </div>
            <Reveal className="layer side" delay={300}>
              <span className="layer-tag">Observability</span>
              <h4>LangSmith</h4>
              <p>Trace every LLM call and tool step, debug failures, and run evals so you can change prompts without fear.</p>
            </Reveal>
          </div>

          <div className="compare">
            <Reveal className="compare-card">
              <h4>Use a workflow when…</h4>
              <p>You can draw the flowchart in advance. Fixed steps are cheaper, faster, and easier to test. A chain or a fixed graph is enough.</p>
            </Reveal>
            <Reveal className="compare-card accent" delay={100}>
              <h4>Use an agent when…</h4>
              <p>The path depends on what you discover along the way: open-ended research, debugging, multi-step tasks with tools.</p>
            </Reveal>
          </div>

          <h3 className="glossary-title">Glossary</h3>
          <div className="glossary">
            {GLOSSARY.map(([term, def], i) => (
              <Reveal key={term} className="gloss" delay={(i % 4) * 60}>
                <b>{term}</b>
                <span>{def}</span>
              </Reveal>
            ))}
          </div>
        </Section>
      </main>
      <footer className="footer">
        <span className="brand-mark" />
        <p>Built with React, PixiJS and hand-drawn Canvas 2D animations.</p>
        <a href="#top">Back to top ↑</a>
      </footer>
    </>
  )
}
