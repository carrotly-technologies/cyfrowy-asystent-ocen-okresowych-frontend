import type { CaseStatus, CaseSummary, Deadline, StageId } from './cases'
import { apiDelete, apiDownload, apiGet, apiPatch, apiPost } from './client'

// HR register (kartoteka): backend src/employees, routes in the backend README.

export type Employment = 'URZEDNIK' | 'PRACOWNIK'
export type SheetId = 'A' | 'B' | 'C'

export interface EmployeeFields {
  firstName: string
  lastName: string
  unit: string
  position: string
  employment: Employment
  officeHead: boolean
  managesPeople: boolean
  appointedYear: number | null
  grade: string | null
  gradeGrantedOn: string | null
  indefiniteSince: string | null
  evaluatorId: string | null
}

export interface PastAssessment {
  source: 'SYSTEM' | 'IMPORT'
  caseId: string | null
  assessedOn: string
  acknowledgedOn: string | null
  result: 'POSITIVE' | 'NEGATIVE'
  level: string | null
}

export interface EmployeeView extends EmployeeFields {
  id: string
  createdAt: string
  updatedAt: string
  evaluatorName: string | null
  effectiveEvaluatorId: string | null
  effectiveEvaluatorName: string | null
  substitution: { from: string; to: string } | null
  sheetId: SheetId
  sheetSuggestion: { sheetId: SheetId; reason: string; legalBasis: string }
  currentCase: {
    id: string
    stage: StageId
    stageName: string
    status: CaseStatus
    sheetId: SheetId | null
    nextDeadline: Deadline | null
    /** Assessment term; `extended` when absences > 1 month moved it (art. 81 ust. 7). */
    assessmentDue: (Deadline & { baseDate: string | null; extended: boolean }) | null
  } | null
  lastAssessment: PastAssessment | null
  obligatoryPromotion: ObligatoryPromotion
}

export interface ObligatoryPromotion {
  due: boolean
  reason: string
  legalBasis: string
  /** Last day to grant the grade (30 days from acknowledgement), when known. */
  deadline: string | null
  nextStep: string | null
}

/** GET /employees/:id only: preview of "Rozpocznij nowy cykl" (null with an open case). */
export interface EmployeeDetail extends EmployeeView {
  nextCycle: { ok: boolean; reason: string; openingTalk: Deadline | null } | null
}

export interface ImportResult {
  imported: number
  skipped: number
  rows: { line: number; employeeId: string; name: string; assessedOn: string; result: 'POSITIVE' | 'NEGATIVE'; level: string | null; skipped: boolean }[]
}

export interface Evaluator {
  id: string
  name: string
  position: string
  unit: string
}

export interface AbsenceType {
  id: string
  label: string
  justified: boolean
}

export interface Absence {
  id: string
  employeeId: string
  type: string
  from: string
  to: string
  justified: boolean
  note: string
}

export interface AbsencesResponse {
  absences: Absence[]
  continuous: { from: string; to: string; days: number; longerThanMonth: boolean }[]
  legalBasis: string
}

export interface Substitution {
  id: string
  evaluatorId: string
  substituteId: string
  evaluatorName: string
  substituteName: string
  from: string
  to: string
  note: string
  active: boolean
}

export interface HistoryResponse {
  cases: {
    caseId: string
    cycleLabel: string
    sheetId: SheetId | null
    stage: StageId
    stageName: string
    status: CaseStatus
    signedOn: string | null
    acknowledgedOn: string | null
    result: 'POSITIVE' | 'NEGATIVE' | null
    level: string | null
  }[]
  imported: { id: string; assessedOn: string; acknowledgedOn: string | null; result: 'POSITIVE' | 'NEGATIVE'; level: string | null }[]
}

export interface Statistics {
  generatedOn: string
  unit: string | null
  employees: number
  cases: { total: number; open: number; finished: number }
  results: { positive: number; negative: number; negativePercent: number }
  levels: { label: string; count: number }[]
  timeliness: { signedOnTime: number; signedLate: number; openOverdue: number; openOnTrack: number }
  stages: { stageId: StageId; name: string; count: number }[]
  promotions: { requested: number; obligatory: number }
  units: { unit: string; employees: number; openCases: number; positive: number; negative: number; overdue: number }[]
  sources: string
}

export const listEmployees = (signal?: AbortSignal) => apiGet<EmployeeView[]>('/employees', signal)
export const getEmployee = (id: string, signal?: AbortSignal) => apiGet<EmployeeDetail>(`/employees/${encodeURIComponent(id)}`, signal)
export const createEmployee = (body: EmployeeFields) => apiPost<EmployeeView>('/employees', body)
export const updateEmployee = (id: string, body: Partial<EmployeeFields>) => apiPatch<EmployeeView>(`/employees/${encodeURIComponent(id)}`, body)
export const deleteEmployee = (id: string) => apiDelete(`/employees/${encodeURIComponent(id)}`)
export const startCycle = (id: string) =>
  apiPost<{ caseId: string; case: CaseSummary; reason: string }>(`/employees/${encodeURIComponent(id)}/cycles`, undefined)
export const getEvaluators = (signal?: AbortSignal) => apiGet<Evaluator[]>('/employees/evaluators', signal)
export const getAbsenceTypes = (signal?: AbortSignal) => apiGet<AbsenceType[]>('/employees/absence-types', signal)
export const getAbsences = (id: string, signal?: AbortSignal) => apiGet<AbsencesResponse>(`/employees/${encodeURIComponent(id)}/absences`, signal)
export const addAbsence = (id: string, body: { type: string; from: string; to: string; justified?: boolean; note?: string }) =>
  apiPost<Absence>(`/employees/${encodeURIComponent(id)}/absences`, body)
export const deleteAbsence = (id: string, absenceId: string) =>
  apiDelete(`/employees/${encodeURIComponent(id)}/absences/${encodeURIComponent(absenceId)}`)
export const getHistory = (id: string, signal?: AbortSignal) => apiGet<HistoryResponse>(`/employees/${encodeURIComponent(id)}/history`, signal)
export const importHistory = (csv: string) => apiPost<ImportResult>('/employees/history/import', { csv })
export const getUnits = (signal?: AbortSignal) => apiGet<string[]>('/employees/units', signal)
export const getSubstitutions = (signal?: AbortSignal) => apiGet<Substitution[]>('/substitutions', signal)
export const addSubstitution = (body: { evaluatorId: string; substituteId: string; from: string; to: string; note?: string }) =>
  apiPost<Substitution>('/substitutions', body)
export const deleteSubstitution = (id: string) => apiDelete(`/substitutions/${encodeURIComponent(id)}`)
export const getStatistics = (unit: string, signal?: AbortSignal) =>
  apiGet<Statistics>(`/statistics${unit ? `?unit=${encodeURIComponent(unit)}` : ''}`, signal)
export const downloadStatisticsCsv = (unit: string) =>
  apiDownload(`/statistics/export.csv${unit ? `?unit=${encodeURIComponent(unit)}` : ''}`, 'statystyki-ocen.csv')
export const downloadEmployeesCsv = () => apiDownload('/employees/export.csv', 'kartoteka-pracownikow.csv')
