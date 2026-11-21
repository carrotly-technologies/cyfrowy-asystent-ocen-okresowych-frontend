import type { CaseDetail, CaseSummary, Correction } from './cases'
import { apiGet, apiPost } from './client'

export type CorrectionKind = 'DATE' | 'TEXT' | 'SCORE' | 'CRITERIA' | 'RESULT' | 'LEVEL' | 'ATTACHED' | 'GRADE' | 'YEAR'

/** A field the administrator may correct (GET /api/admin/cases/:id). */
export interface CorrectableField {
  field: string
  label: string
  section: string
  kind: CorrectionKind
  options?: (string | number)[]
  value: unknown
  display: string
}

export type AdminCaseRow = CaseSummary & { evaluatorName: string; corrections: number }

export interface AdminCase {
  case: CaseDetail
  fields: CorrectableField[]
}

export const getAdminCases = (signal?: AbortSignal) => apiGet<AdminCaseRow[]>('/admin/cases', signal)
export const getAdminCase = (id: string, signal?: AbortSignal) =>
  apiGet<AdminCase>(`/admin/cases/${encodeURIComponent(id)}`, signal)
export const postCorrection = (id: string, body: { field: string; value: unknown; reason: string }) =>
  apiPost<AdminCase & { correction: Correction }>(`/admin/cases/${encodeURIComponent(id)}/corrections`, body)
