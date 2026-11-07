import type { Lesson } from './types'
import { llm } from './llm'
import { prompting } from './prompting'
import { loop } from './loop'
import { tools } from './tools'
import { memory } from './memory'
import { rag } from './rag'
import { guardrails } from './guardrails'
import { hitl } from './hitl'
import { evaluation } from './evaluation'
import { langchain } from './langchain'
import { langgraph } from './langgraph'

export const LESSONS: Lesson[] = [llm, prompting, loop, tools, memory, rag, guardrails, hitl, evaluation, langchain, langgraph]
