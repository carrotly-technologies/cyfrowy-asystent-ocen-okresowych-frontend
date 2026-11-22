import type { CaseAction, CaseDetail, StageId, StageInfo } from '../api/cases'

/** URL slugs for /teczka/:id/:stage. */
export const STAGE_SLUG: Record<StageId, string> = {
  SHEET_SELECTION: 'arkusz-i-kryteria',
  OPENING_TALK: 'rozmowa-rozpoczynajaca',
  PART_I_ACK: 'potwierdzenie-czesci-i',
  OBSERVATION: 'obserwacje',
  ASSESSMENT: 'ocena',
  SIGNATURE: 'podpis',
  ACKNOWLEDGEMENT: 'zapoznanie',
}

export function stageFromSlug(slug: string | undefined): StageId | null {
  if (!slug) return null
  const hit = (Object.entries(STAGE_SLUG) as [StageId, string][]).find(([, s]) => s === slug)
  return hit ? hit[0] : null
}

export const caseUrl = (id: string, stage?: StageId) => (stage ? `/teczka/${id}/${STAGE_SLUG[stage]}` : `/teczka/${id}`)

/** Every stage has its own view. Kept as a function so callers stay simple. */
export function viewStage(_stages: Pick<StageInfo, 'id'>[], stage: StageId): StageId {
  return stage
}

/** Stage names used everywhere (the same list as STAGE_NAMES in the backend, src/cases/case.rules.ts). */
export const STAGE_SHORT: Record<StageId, string> = {
  SHEET_SELECTION: 'Arkusz i kryteria',
  OPENING_TALK: 'Rozmowa rozpoczynająca',
  PART_I_ACK: 'Potwierdzenie części I',
  OBSERVATION: 'Okres obserwacji',
  ASSESSMENT: 'Rozmowa oceniająca i ocena',
  SIGNATURE: 'Podpis i przekazanie',
  ACKNOWLEDGEMENT: 'Zapoznanie z oceną',
}

/** One-word step names under the circles of the stepper (the full name goes to the tooltip and screen readers). */
export const STAGE_STEP: Record<StageId, string> = {
  SHEET_SELECTION: 'Arkusz',
  OPENING_TALK: 'Rozmowa',
  PART_I_ACK: 'Potwierdzenie',
  OBSERVATION: 'Obserwacje',
  ASSESSMENT: 'Ocena',
  SIGNATURE: 'Podpis',
  ACKNOWLEDGEMENT: 'Zapoznanie',
}

export const stageTitle = (info: Pick<StageInfo, 'id' | 'name'>) => info.name

export function sheetLabel(sheetId: string | null): string {
  return sheetId ? `Okresowa · arkusz ${sheetId}` : 'Okresowa · arkusz do ustalenia'
}

export const CASE_STATUS_LABEL = {
  W_TOKU: 'W toku',
  DO_ZAPOZNANIA: 'Do zapoznania',
  OKRES_SPRZECIWU: 'Okres sprzeciwu',
  SPRZECIW_W_ROZPATRZENIU: 'Sprzeciw w rozpatrzeniu',
  ZAKONCZONA: 'Zakończona',
} as const

/** A stage can be opened once it is done or current. */
export function canOpenStage(detail: CaseDetail, stage: StageId): boolean {
  const info = detail.stages.find((s) => s.id === stage)
  return !!info && (info.status === 'DONE' || info.status === 'CURRENT')
}

/** Whether the signed-in user may run `action` now (from the backend's `availableActions`). */
export function allows(detail: CaseDetail, action: CaseAction): boolean {
  return detail.availableActions.includes(action)
}

/**
 * Part II/III of the sheet are editable from the assessment talk stage until the signature (field schema of
 * sheets A/B/C; the stage comes from the API as `partIIEditableFrom`, the backend enforces it).
 */
export function partIIOpen(detail: CaseDetail): boolean {
  // Locked by the API, e.g. after the assessment was changed in the decision of a sprzeciw (art. 83 ust. 4).
  if (detail.signedByEvaluatorOn || detail.locks?.partII) return false
  const order = detail.stages.map((s) => s.id)
  const from = order.indexOf(detail.partIIEditableFrom ?? 'ASSESSMENT')
  const now = order.indexOf(detail.currentStage)
  return now >= from && detail.currentStage !== 'ACKNOWLEDGEMENT'
}

export type StepStatus = 'done' | 'current' | 'todo'

/** One step of the horizontal stage stepper (one backend stage). */
export interface CaseStep {
  key: string
  label: string
  /** One-word name shown under the circle. */
  shortLabel: string
  stages: StageInfo[]
  status: StepStatus
}

function stepStatus(s: StageInfo): StepStatus {
  if (s.status === 'DONE') return 'done'
  if (s.status === 'CURRENT') return 'current'
  return 'todo'
}

export function caseSteps(detail: Pick<CaseDetail, 'stages'>): CaseStep[] {
  return detail.stages.map((s) => ({ key: s.id, label: STAGE_SHORT[s.id] ?? s.name, shortLabel: STAGE_STEP[s.id] ?? s.name, stages: [s], status: stepStatus(s) }))
}

export function stepTarget(step: CaseStep): StageId {
  return step.stages[0].id
}

/**
 * Why the evaluator cannot add an observation now, or null when the journal is open. The journal stays open in the
 * observation period and at the assessment talk (evidence is gathered right up to it) and closes once the assessment
 * is signed. From the API (`observationsLock`); older responses fall back to the signature date.
 */
export function observationLockOf(detail: CaseDetail): string | null {
  if (detail.observationsLock !== undefined) return detail.observationsLock
  return detail.signedByEvaluatorOn ? 'Ocena została podpisana — dziennik obserwacji jest zamknięty.' : null
}
