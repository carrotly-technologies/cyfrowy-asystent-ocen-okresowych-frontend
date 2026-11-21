import { apiGet, apiPost } from './client'

// Reference data of the assessment (rozp. PRM z 4.04.2016), from the backend.

export type SheetId = 'A' | 'B' | 'C'

export interface ScaleLevel {
  points: number
  label: string
}

/** One criterion of „Wykaz kryteriów oceny” (załącznik nr 1 do rozporządzenia). */
export interface Criterion {
  id: string
  number: number
  name: string
  description: string[]
}

/** GET /api/criteria. */
export interface CriteriaCatalogue {
  title: string
  legalBasis: string
  scale: ScaleLevel[]
  criteria: Criterion[]
}

export interface Sheet {
  id: SheetId
  name: string
  appliesTo: string
  scale: number[]
  mandatoryCriteria: string[]
  maxAdditionalCriteria: number
  legalBasis: string
  /** Fixed texts of the official template (załączniki nr 2–4 do rozp. PRM z 4.04.2016), from the API. */
  template: SheetTemplate
}

export interface SheetTemplate {
  annex: string
  title: string
  partIConfirmation: string[]
  employeeAcknowledgement: string
  objectionNotice: string
  objectionNoticeNote: string | null
  partIIIApplicability: string
  partIIINotAttached: string
  promotionRequest: { beforeName: string; afterName: string; afterGrade: string }
}

/** GET /api/civil-service-grades: stopnie służbowe, lowest first (art. 86 ust. 1 ustawy o służbie cywilnej). */
export interface CivilServiceGrades {
  grades: { id: string; label: string }[]
  legalBasis: string
}

export interface EvaluateResponse {
  average: number
  averageDisplay: string
  level: { label: string; range: string } | null
  result: 'POSITIVE' | 'NEGATIVE'
  reasons: string[]
}

export function getCriteria(signal?: AbortSignal) {
  return apiGet<CriteriaCatalogue>('/criteria', signal)
}

export function getSheets(signal?: AbortSignal) {
  return apiGet<Sheet[]>('/sheets', signal)
}

export function getCivilServiceGrades(signal?: AbortSignal) {
  return apiGet<CivilServiceGrades>('/civil-service-grades', signal)
}

export function evaluateAssessment(body: { sheetId: SheetId; scores: { criterionId: string; points: number }[] }, signal?: AbortSignal) {
  return apiPost<EvaluateResponse>('/assessments/evaluate', body, signal)
}
