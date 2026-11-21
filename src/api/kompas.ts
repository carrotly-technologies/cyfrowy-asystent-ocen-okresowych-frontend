import { apiGet, apiPost } from './client'

// Types follow notatki/api-kontrakt-v1.md.

export type SheetId = 'A' | 'B' | 'C' | 'FIRST'
export type SheetKind = 'PERIODIC' | 'FIRST'
export type LevelKey = '1' | '3' | '5' | '7' | '9'

export interface Indicator {
  id: string
  name: string
  levels: Record<LevelKey, string>
}

export interface Competency {
  id: string
  name: string
  indicators: Indicator[]
}

export interface ScaleLevel {
  points: number
  label: string
}

export interface CompetencyModel {
  title: string
  instructions: string[]
  scale: ScaleLevel[]
  competencies: Competency[]
}

export interface Sheet {
  id: SheetId
  name: string
  appliesTo: string
  kind: SheetKind
  scale: number[]
  mandatoryCriteria: string[]
  maxAdditionalCriteria: number
  legalBasis: string
}

export interface IndicatorRating {
  indicatorId: string
  /** null = "brak podstaw do oceny" */
  points: number | null
}

export interface SuggestLevelRequest {
  sheetId: SheetId
  competencyId: string
  indicatorRatings: IndicatorRating[]
}

export interface SuggestLevelResponse {
  suggestedPoints: number | null
  suggestedLabel: string | null
  ratedCount: number
  skippedCount: number
  mean: number | null
  rationale: string
  warnings: string[]
  isSuggestionOnly: true
}

export type ExamPassed = 'YES' | 'NO' | 'NOT_APPLICABLE'

export interface FirstAssessmentInput {
  examPassed: ExamPassed
  reportSubmittedOnTime: boolean
}

export interface EvaluateRequest {
  sheetId: SheetId
  scores: { criterionId: string; points: number }[]
  firstAssessment?: FirstAssessmentInput
}

export interface EvaluateResponse {
  average: number
  averageDisplay: string
  level: { label: string; range: string } | null
  result: 'POSITIVE' | 'NEGATIVE'
  reasons: string[]
}

export function getCompetencyModel(signal?: AbortSignal) {
  return apiGet<CompetencyModel>('/competency-model', signal)
}

export function getSheets(signal?: AbortSignal) {
  return apiGet<Sheet[]>('/sheets', signal)
}

export function suggestLevel(body: SuggestLevelRequest, signal?: AbortSignal) {
  return apiPost<SuggestLevelResponse>(
    '/assessments/suggest-level',
    body,
    signal,
  )
}

export function evaluateAssessment(body: EvaluateRequest, signal?: AbortSignal) {
  return apiPost<EvaluateResponse>('/assessments/evaluate', body, signal)
}
