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

/**
 * Stub. The RAG assistant is a separate task; wire it here (e.g. POST /api/assistant/ask)
 * and the panel will work unchanged.
 */
export async function askAssistant(req: AskAssistantRequest): Promise<AssistantAnswer> {
  void req
  await new Promise((r) => setTimeout(r, 450))
  return {
    answer:
      'Asystent zostanie podłączony do bazy wiedzy (ustawa o służbie cywilnej, rozporządzenia z 2015 i 2016 r., model kompetencji, poradniki KPRM). Do tego czasu nie udziela odpowiedzi, żeby nie podawać informacji bez źródła.',
    sources: [],
    noAnswer: true,
    placeholder: true,
  }
}
