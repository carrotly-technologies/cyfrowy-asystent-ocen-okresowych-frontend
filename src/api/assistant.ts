import { apiPost } from './client'
import type { StageId } from './cases'

export type AssistantMode = 'FORMAL' | 'CONVERSATION'

export interface AssistantContext {
  caseId?: string
  stageId?: StageId
  /** Human-readable context shown in the chip, e.g. "Ocena · Anna Nowak · Arkusz C". */
  label?: string
}

export interface AssistantSource {
  /** e.g. "§11 ust. 1 pkt 4 rozp. PRM z 4.04.2016" */
  title: string
  /** e.g. "Poradnik KPRM, s. 28" */
  locator?: string
  quote?: string
}

export interface AssistantAnswer {
  answer: string
  sources: AssistantSource[]
  /** True when the knowledge base had no sufficient information (the assistant must say so). */
  noAnswer: boolean
  placeholder?: boolean
}

export interface AskAssistantRequest {
  mode: AssistantMode
  question: string
  context: AssistantContext
  history: { role: 'user' | 'assistant'; text: string }[]
}

interface AskResponse {
  answer: string
  grounded: boolean
  mode: 'LLM' | 'EXTRACTIVE'
  sources: { n: number; title: string; ref: string; quote: string }[]
  disclaimer: string
}

/** POST /api/assistant/ask — answers only from the knowledge base, with sources. */
export async function askAssistant(req: AskAssistantRequest): Promise<AssistantAnswer> {
  const res = await apiPost<AskResponse>('/assistant/ask', {
    question: req.question,
    assistant: req.mode,
    ...(req.context.caseId ? { caseId: req.context.caseId } : {}),
    ...(req.context.stageId ? { stageId: req.context.stageId } : {}),
  })
  return {
    answer: res.disclaimer ? `${res.answer}\n\n${res.disclaimer}` : res.answer,
    sources: res.sources.map((s) => ({
      title: s.ref,
      locator: s.title,
      quote: s.quote,
    })),
    noAnswer: !res.grounded,
  }
}
