import type { Lesson, Opts, Step } from './types'
import MultimodalCanvas from '../canvases/MultimodalCanvas'
import type { MmScenario } from '../data/multimodal'
import { MM, MM_DUR, MM_PHASES } from '../data/multimodal'
import { C } from '../lib/draw'

const SUPPORT_CODE = String.raw`
import base64
from openai import OpenAI
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage

client = OpenAI()

def b64(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()

def transcribe(path: str) -> str:
    with open(path, "rb") as f:
        return client.audio.transcriptions.create(model="gpt-4o-transcribe", file=f).text

def speak(text: str) -> None:
    audio = client.audio.speech.create(model="gpt-4o-mini-tts", voice="alloy", input=text)
    audio.write_to_file("reply.mp3")

agent = create_agent("openai:gpt-5", tools=[lookup_order, create_refund])

message = HumanMessage(content=[
    {"type": "text", "text": transcribe("voice_note.m4a")},
    {"type": "image", "base64": b64("package.jpg"), "mime_type": "image/jpeg"},
])

result = agent.invoke({"messages": [message]})
reply = result["messages"][-1].content
speak(reply)
`

const CHART_CODE = String.raw`
import base64
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage

def b64(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()

agent = create_agent("openai:gpt-5", tools=[run_sql])

message = HumanMessage(content=[
    {"type": "text", "text": "Why did sales drop in March?"},
    {"type": "image", "base64": b64("sales_chart.png"), "mime_type": "image/png"},
])

result = agent.invoke({"messages": [message]})
reply = result["messages"][-1].content
print(reply)
`

function build(o: Opts) {
  const sc: MmScenario = o.scenario === 'chart' ? 'chart' : 'support'
  const d = MM[sc]
  const audio = d.secondKind === 'audio'
  const blocks = [
    { type: 'text', text: d.transcript },
    { type: 'image', base64: 'iVBORw0KGgoAAAANSUhEUg… (truncated)', mime_type: sc === 'chart' ? 'image/png' : 'image/jpeg' },
  ]

  const meta: Record<string, Omit<Step, 'dur' | 'state'>> = {
    inputs: {
      title: 'Multimodal input',
      detail: audio
        ? 'The customer sends a photo and a voice note instead of typing. A multimodal agent can work with both.'
        : 'The user pastes a chart screenshot and asks a question about it.',
      color: C.cyan,
      focus: ['message = HumanMessage('],
    },
    image: {
      title: 'Images become tokens',
      detail: 'The image is cut into small patches. Each patch is embedded into vectors the model reads just like word tokens. Bigger images mean more tokens and cost.',
      color: C.cyan,
      focus: ['{"type": "image"', 'def b64', 'base64.b64encode'],
    },
    second: audio
      ? {
          title: 'Speech becomes text',
          detail: 'GPT-5 reads text and images, not audio, so a speech-to-text model transcribes the voice note first. Realtime audio models can take speech directly.',
          color: C.pink,
          focus: ['def transcribe', 'client.audio.transcriptions.create', '{"type": "text", "text": transcribe('],
        }
      : {
          title: 'Text becomes tokens',
          detail: 'The typed question is tokenised and placed in the same message as the image.',
          color: C.amber,
          focus: ['{"type": "text", "text": "Why did'],
        },
    understand: {
      title: 'One model sees everything',
      detail: audio
        ? 'Text and image tokens sit in one context, so the model connects them: the damage in the photo, the order number on the label and the request in the voice note.'
        : 'The model reads the values off the bars and links them to the question, without any OCR pipeline.',
      color: C.violet,
      focus: ['agent = create_agent', 'result = agent.invoke'],
    },
    tools: {
      title: 'Act with tools',
      detail: audio
        ? 'The order number came from the image. The agent uses it to look the order up and issue the refund.'
        : 'The chart shows what happened. A SQL query finds out why.',
      color: C.amber,
      focus: [audio ? 'tools=[lookup_order, create_refund]' : 'tools=[run_sql]'],
    },
    reply: {
      title: audio ? 'Reply in text and voice' : 'Explain the answer',
      detail: audio
        ? 'The answer is shown as text and turned back into speech with a text-to-speech model, closing the voice loop.'
        : 'The agent answers in text and can return an annotated chart.',
      color: C.pink,
      focus: audio ? ['reply = result', 'speak(reply)', 'def speak', 'client.audio.speech.create'] : ['reply = result', 'print(reply)'],
    },
  }

  const steps: Step[] = MM_PHASES.map((ph, i) => {
    const state: Record<string, unknown> = {
      model: 'openai:gpt-5',
      inputs: audio ? ['image/jpeg: package.jpg', 'audio/m4a: voice_note.m4a'] : ['image/png: sales_chart.png', 'text: typed question'],
    }
    if (i >= 1) state.image = { patches: 16, image_tokens: '~800 (depends on size and detail)' }
    if (i >= 2) state[audio ? 'transcript' : 'question'] = d.transcript
    if (i >= 2) state.content_blocks = blocks
    if (i >= 3) state.understood = d.facts.map((f) => f.text)
    if (i >= 4) state.tool_calls = d.tools.map((tl) => ({ call: tl.call, result: tl.result }))
    if (i >= 5) {
      state.reply = d.reply
      if (audio) state.speech = { model: 'gpt-4o-mini-tts', file: 'reply.mp3' }
    }
    return { ...meta[ph], dur: MM_DUR, state }
  })

  return { steps, file: 'multimodal_agent.py', code: audio ? SUPPORT_CODE : CHART_CODE }
}

export const multimodal: Lesson = {
  id: 'multimodal',
  num: '13',
  nav: 'Multimodal agents',
  group: 'Foundations',
  title: 'Multimodal agents',
  lead: 'Agents that see images, hear voice and read documents, reason over all of it in one context, then act and reply.',
  blurb: 'Images, audio, patches, speech in and out.',
  options: [
    {
      key: 'scenario',
      label: 'Scenario',
      type: 'segmented',
      choices: [
        { value: 'support', label: 'Photo + voice note' },
        { value: 'chart', label: 'Chart screenshot' },
      ],
    },
  ],
  defaults: { scenario: 'support' },
  ideas: [
    { title: 'Everything becomes tokens', body: 'Images are split into patches and embedded, so the model reads them alongside text in a single context window.', color: C.cyan },
    { title: 'Pipelines vs native audio', body: 'You can chain speech-to-text → LLM → text-to-speech, or use a realtime model that takes and returns audio directly.', color: C.pink },
    { title: 'Images cost tokens', body: 'Resolution drives cost and latency. Resize or crop to what the task needs, and use low detail when it is enough.', color: C.amber },
    { title: 'Vision can be wrong', body: 'Models misread small text, numbers and charts. Confirm critical values, like an order number, with a tool before acting.', color: C.red },
    { title: 'Same agent, more senses', body: 'Tools, memory and guardrails work exactly as before. Multimodal only changes what goes into the context.', color: C.violet },
  ],
  build,
  Canvas: MultimodalCanvas,
}
