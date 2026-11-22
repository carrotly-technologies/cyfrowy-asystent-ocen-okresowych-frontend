import { apiGet, apiPatch, apiPost } from './client'
import type { EvaluateResponse, SheetId } from './reference'

// Types follow the backend README (cyfrowy-asystent-ocen-okresowych-backend).

/** The seven stages of a periodic assessment, in order (backend `STAGES`). */
export type StageId =
  | 'SHEET_SELECTION'
  | 'OPENING_TALK'
  | 'PART_I_ACK'
  | 'OBSERVATION'
  | 'ASSESSMENT'
  | 'SIGNATURE'
  | 'ACKNOWLEDGEMENT'
export type StageStatus = 'DONE' | 'CURRENT' | 'UPCOMING' | 'LOCKED'
export type DeadlineState = 'OK' | 'SOON' | 'OVERDUE' | 'NONE'
export type CaseStatus = 'W_TOKU' | 'DO_ZAPOZNANIA' | 'OKRES_SPRZECIWU' | 'SPRZECIW_W_ROZPATRZENIU' | 'ZAKONCZONA'
export type Points = 1 | 3 | 5 | 7 | 9

export interface Person {
  id: string
  firstName: string
  lastName: string
  position: string
  unit: string
  employment: 'URZEDNIK' | 'PRACOWNIK'
  hiredOn: string
  /** Kierownik urzędu (sheet A). */
  officeHead: boolean
  /** Directly manages employees (sheet B). */
  managesPeople: boolean
}

export interface Deadline {
  date: string | null
  daysLeft: number | null
  state: DeadlineState
  label: string
  legalBasis: string
}

export interface StageInfo {
  id: StageId
  name: string
  status: StageStatus
  deadline: Deadline | null
  completedOn: string | null
  legalBasis: string
}

export interface CaseSummary {
  id: string
  person: Person
  sheetId: SheetId | null
  cycleLabel: string
  currentStage: StageId
  stages: StageInfo[]
  nextDeadline: Deadline | null
  /** Predicted next periodic assessment (YYYY-MM-DD): last signed one + 24 months, computed by the backend; null when none is signed. */
  nextEvaluationDueOn: string | null
  status: CaseStatus
}

export interface Observation {
  id: string
  date: string
  criterionId: string
  kind: 'STRENGTH' | 'DEVELOPMENT'
  situation: string
  action: string
  result: string
}

/** Rule-based proposal of the sheet (§3 ust. 2–4); the evaluator confirms or changes it. */
export interface SheetSuggestion {
  sheetId: SheetId
  reason: string
  legalBasis: string
  isSuggestionOnly: true
}

export interface PartI {
  additionalCriteria: string[]
  assessmentDue: string | null
  topics: { duties: string; criteria: string; expectations: string; goals: string }
  expectations: Record<string, string>
  confirmedByEvaluatorOn: string | null
  acknowledgedByEmployeeOn: string | null
}

/** "Dane dotyczące poprzedniej oceny okresowej urzędnika służby cywilnej"; `level` as the sheet writes it. */
export interface PreviousAssessment {
  result: 'POSITIVE' | 'NEGATIVE' | null
  level: string | null
  date: string | null
}

/** Answer to "Czy do oceny okresowej dołączono wniosek o przyznanie kolejnego stopnia służbowego?". */
export type PromotionAttached = 'YES' | 'NO' | 'NOT_APPLICABLE'

/** The answer above and part III of the sheet; part III fields are kept only while `attached` is YES. */
export interface PromotionRequest {
  attached: PromotionAttached | null
  appointedYear: number | null
  currentGrade: string | null
  gradeGrantedOn: string | null
  requestedGrade: string | null
  motivation: string
}

export interface FormalCheckItem {
  id: string
  ok: boolean
  message: string
  legalBasis: string | null
}

export interface CaseDetail extends CaseSummary {
  evaluator: { firstName: string; lastName: string; position: string; unit: string }
  officeName: string
  /** Urząd z konfiguracji backendu (env OFFICE_*): nazwa, miejscowość, logo, adresat sprzeciwu w arkuszu A. */
  office?: OfficeConfig
  sheetSuggestion: SheetSuggestion
  partI: PartI
  observations: Observation[]
  decisions: Record<string, number>
  deviationNotes: Record<string, string>
  justification: string
  iprz: string
  previousAssessment: PreviousAssessment | null
  promotionRequest: PromotionRequest
  evaluation: EvaluateResponse | null
  formalCheck: FormalCheckItem[]
  assessmentTalkOn: string | null
  signedByEvaluatorOn: string | null
  sentForAckOn: string | null
  acknowledgedOn: string | null
  objectionDeadline: Deadline | null
  /** "Co dalej?" under the pouczenie: the objection path in plain words, with legal basis. */
  objectionNextSteps?: { text: string; legalBasis: string }[]
  /** To whom the sprzeciw goes (genitive in `to`), when the API provides it. */
  objectionAddressee?: { decider?: 'EVALUATOR' | 'DIRECTOR'; to: string; who: string; legalBasis: string }
  /** Whether a sprzeciw lies from the current assessment (false after a change of the assessment, art. 83 ust. 4). */
  objectionRight?: { open: boolean; note: string | null; legalBasis: string }
  /** The upheld objection (change / re-making) behind the current assessment, for the evaluator's banner. */
  objectionDecisionNotice?: ObjectionDecisionNotice | null
  /** Notatki robocze oceniającego (bez skutków prawnych, nie trafiają do arkusza). */
  workingNotes?: string
  /** Etap, od którego część II/III jest edytowalna (schemat pól arkuszy A/B/C). */
  partIIEditableFrom?: StageId
  /** „Okres, w którym oceniany podlegał ocenie” (zapisany albo domyślny). */
  assessmentPeriod?: { from: string | null; to: string | null }
  /** Korekty administratora (tryb korekty błędów): kto, kiedy, stara → nowa wartość, powód. */
  corrections?: Correction[]
  /** Dlaczego część I / części II–III są zablokowane (null = edytowalne). */
  locks?: { partI: string | null; partII: string | null }
  /** Why no observation can be added now (null = the journal is open: observation and assessment stages until signing). */
  observationsLock?: string | null
  history: HistoryEntry[]
  ackFiction: AckFiction | null
  objections: ObjectionView[]
  assessmentVersions: AssessmentVersion[]
  dueDateRequests: DueDateRequest[]
  dueDateChanges: DueDateChange[]
  dueDateRequestRule: { eligible: boolean; reason: string; legalBasis: string }
  /** null when the evaluator may change the due date now (art. 81 ust. 8), else why not. */
  dueDateChangeBlocker?: string | null
  talkInvitations?: TalkInvitation[]
  /** Post-assessment actions the signed-in user may take now (backend appeals.rules.ts). */
  legalActions?: LegalAction[]
  /** Actions the signed-in user may do right now (the assessed person sees only their confirmations). */
  availableActions: CaseAction[]
}

export interface OfficeConfig {
  name: string
  city: string
  logoUrl: string | null
  objectionRecipient: string | null
  hasDirectorGeneral?: boolean
}

export interface Correction {
  id: string
  at: string
  date: string
  by: { userId: string; name: string }
  field: string
  label: string
  section: string
  oldValue: string
  newValue: string
  reason: string
}

export interface CasePatch {
  sheetId?: SheetId
  partI?: Partial<PartI>
  decisions?: Record<string, number | null>
  deviationNotes?: Record<string, string | null>
  justification?: string
  iprz?: string
  /** null clears it */
  previousAssessment?: Partial<PreviousAssessment> | null
  promotionRequest?: Partial<PromotionRequest>
  assessmentTalkOn?: string
  /** null: back to the default */
  assessmentPeriod?: { from?: string | null; to?: string | null }
  workingNotes?: string
}

export type CaseAction =
  | 'ACCEPT_SHEET'
  | 'CONFIRM_PART_I'
  | 'EMPLOYEE_ACK_PART_I'
  | 'START_ASSESSMENT'
  | 'COMPLETE_ASSESSMENT_TALK'
  | 'SIGN_ASSESSMENT'
  | 'SEND_FOR_ACK'
  | 'EMPLOYEE_ACK_ASSESSMENT'

export type Role = 'SUPERVISOR' | 'EMPLOYEE' | 'HR' | 'ADMIN' | 'DIRECTOR'

export interface HistoryEntry {
  date: string
  text: string
  /** Domain event behind the entry (for notifications). */
  event?: { type: string; notify: string[] }
}

export type LegalAction =
  | 'RECORD_ACK_FICTION'
  | 'FILE_OBJECTION'
  | 'DECIDE_OBJECTION'
  | 'REQUEST_DUE_DATE_CHANGE'
  | 'WITHDRAW_DUE_DATE_REQUEST'
  | 'DECIDE_DUE_DATE_REQUEST'

export interface ActorRef {
  name: string
  role: string
}

/** "Fikcja zapoznania": the assessment reached the assessed person, who could not or would not confirm it. */
export interface AckFiction {
  date: string
  reason: string
  recordedOn: string
  recordedBy: ActorRef
}

export type ObjectionOutcome = 'DISMISS' | 'CHANGE' | 'REDO'

export interface ObjectionDecisionNotice {
  outcome: 'CHANGE' | 'REDO'
  decidedOn: string
  decidedBy: ActorRef
  reason: string
  title: string
  text: string
  changes: { criterionId: string; from: number | null; to: number }[]
  legalBasis: string
}

export interface ObjectionView {
  id: string
  round: number
  filedOn: string
  text: string
  decision: { outcome: ObjectionOutcome; decidedOn: string; deliveredOn?: string; reason: string; decidedBy: ActorRef } | null
  decisionDeadline: Deadline
  courtAppealDeadline: Deadline | null
}

export interface AssessmentVersion {
  round: number
  status: 'CANCELLED' | 'CHANGED'
  closedOn: string
  reason: string
  decisions: Record<string, number>
  justification: string
  iprz: string
  result: 'POSITIVE' | 'NEGATIVE' | null
  average: number | null
  signedByEvaluatorOn: string | null
  acknowledgedOn: string | null
  ackFiction: AckFiction | null
}

export interface DueDateRequest {
  id: string
  filedOn: string
  reason: string
  proposedDate: string | null
  /** MOOT: closed without a decision once the assessment was drawn up. */
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'MOOT'
  decidedOn: string | null
  decisionNote: string | null
  newDate: string | null
  decidedBy: ActorRef | null
}

/** Invitation to the opening / assessment talk (backend src/deadlines). */
export interface TalkInvitation {
  id: string
  kind: 'OPENING' | 'ASSESSMENT'
  date: string
  time: string
  place: string
  note: string
  createdOn: string
}

export interface DueDateChange {
  changedOn: string
  from: string | null
  to: string
  reason: string
  by: ActorRef
  id?: string
  reasonCode?: string
  legalBasis?: string
  note?: string
  /** The written notice to the assessed person (§8 rozp. 2016). */
  notice?: { sentOn: string; text: string }
}

export interface ObjectionListItem {
  caseId: string
  person: Person
  evaluatorName: string
  sheetId: SheetId | null
  status: CaseStatus
  objection: ObjectionView
}

/** GET /api/me: the signed-in user. */
export interface Me {
  id: string
  login: string
  name: string
  role: Role
  position: string
  unit: string
  officeName: string
}

export interface TodoItem {
  caseId: string
  stageId: StageId
  text: string
  deadline: Deadline
}

export interface TeamResponse {
  cases: CaseSummary[]
  todo: TodoItem[]
}

export type HrCase = CaseSummary & {
  evaluatorName: string
  lastReminderOn: string | null
  /** False for a finished case or an objection under review (no reminder). */
  remindable: boolean
}

export interface HrOverview {
  counters: {
    inProgress: number
    dueSoon: number
    overdue: number
    awaitingAck: number
    objectionPeriod: number
  }
  cases: HrCase[]
}

export interface ReminderResponse {
  sent: number
  log: { caseId: string; date: string; text: string }[]
}

export const getMe = (signal?: AbortSignal) => apiGet<Me>('/me', signal)
export const getTeam = (signal?: AbortSignal) => apiGet<TeamResponse>('/team', signal)
export const getCase = (id: string, signal?: AbortSignal) =>
  apiGet<CaseDetail>(`/cases/${encodeURIComponent(id)}`, signal)
export const patchCase = (id: string, body: CasePatch) =>
  apiPatch<CaseDetail>(`/cases/${encodeURIComponent(id)}`, body)
export const addObservation = (id: string, body: Omit<Observation, 'id'>) =>
  apiPost<CaseDetail>(`/cases/${encodeURIComponent(id)}/observations`, body)
export const runCaseAction = (id: string, action: CaseAction) =>
  apiPost<CaseDetail>(`/cases/${encodeURIComponent(id)}/actions`, { action })
export const getCases = (signal?: AbortSignal) => apiGet<CaseSummary[]>('/cases', signal)
export const getHrOverview = (signal?: AbortSignal) => apiGet<HrOverview>('/hr/overview', signal)
export const sendReminders = (caseIds: string[]) =>
  apiPost<ReminderResponse>('/hr/reminders', { caseIds })
export const resetDemo = () => apiPost<unknown>('/demo/reset', {})

const casePath = (id: string, rest: string) => `/cases/${encodeURIComponent(id)}/${rest}`
export const recordAckFiction = (id: string, body: { date: string; reason: string }) =>
  apiPost<CaseDetail>(casePath(id, 'ack-fiction'), body)
export const fileObjection = (id: string, text: string) => apiPost<CaseDetail>(casePath(id, 'objection'), { text })
export const decideObjection = (
  id: string,
  body: { outcome: ObjectionOutcome; reason: string; decisions?: Record<string, number>; justification?: string; decidedOn?: string; deliveredOn?: string },
) => apiPost<CaseDetail>(casePath(id, 'objection/decision'), body)
/** Labour court term (art. 83 ust. 5) for a delivery date, computed by the API. */
export const getCourtTerm = (deliveredOn: string, signal?: AbortSignal) =>
  apiGet<Deadline>(`/objections/court-term?deliveredOn=${encodeURIComponent(deliveredOn)}`, signal)
export const requestDueDateChange = (id: string, body: { reason: string; proposedDate?: string | null }) =>
  apiPost<CaseDetail>(casePath(id, 'due-date-request'), body)
export const withdrawDueDateRequest = (id: string) => apiPost<CaseDetail>(casePath(id, 'due-date-request/withdraw'), {})
export const decideDueDateRequest = (id: string, body: { approve: boolean; newDate?: string | null; note?: string | null }) =>
  apiPost<CaseDetail>(casePath(id, 'due-date-request/decision'), body)
/** The evaluator reminds the assessed person to confirm part I or acknowledge the assessment (one notice a day). */
export const remindEmployee = (id: string) => apiPost<CaseDetail>(casePath(id, 'remind'), undefined)
export const getObjections = (signal?: AbortSignal) => apiGet<ObjectionListItem[]>('/objections', signal)
