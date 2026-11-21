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

export type StepStatus = 'done' | 'current' | 'todo'

/** One step of the horizontal stage stepper (one backend stage). */
export interface CaseStep {
  key: string
  label: string
  stages: StageInfo[]
  status: StepStatus
}

function stepStatus(s: StageInfo): StepStatus {
  if (s.status === 'DONE') return 'done'
  if (s.status === 'CURRENT') return 'current'
  return 'todo'
}

export function caseSteps(detail: Pick<CaseDetail, 'stages'>): CaseStep[] {
  return detail.stages.map((s) => ({ key: s.id, label: STAGE_SHORT[s.id] ?? s.name, stages: [s], status: stepStatus(s) }))
}

export function stepTarget(step: CaseStep): StageId {
  return step.stages[0].id
}
