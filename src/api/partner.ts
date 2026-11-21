import { apiGet, apiPatch, apiPost } from './client'

// Virtual HR partner and pulse survey: backend README, "Virtual HR partner and pulse survey".

export type PulseQuestionId = 'workload' | 'energy' | 'support' | 'clarity' | 'satisfaction'
export type PulseAnswers = Record<PulseQuestionId, number>

export interface PulseQuestion {
  id: PulseQuestionId
  label: string
  statement: string
  low: string
  high: string
}

export interface PulseInfo {
  questions: PulseQuestion[]
  scale: { min: number; max: number }
  intervalDays: number
  minGroupSize: number
  privacy: string[]
}

export interface PulseResponse {
  id: string
  personId: string
  date: string
  answers: PulseAnswers
  comment: string | null
  shareComment: boolean
  createdAt: string
  index?: number
}

export interface MyPulse extends PulseInfo {
  history: (PulseResponse & { index: number })[]
  nextDue: string
  canSubmit: boolean
}

export type TrendKind = 'NO_DATA' | 'STABLE' | 'IMPROVING' | 'GRADUAL_DECLINE' | 'SUDDEN_DROP'
export type SignalKind = 'OVERLOAD' | 'MOTIVATION_DROP' | 'BURNOUT_RISK' | 'APPRECIATION'
export type SignalLevel = 'WATCH' | 'ALERT' | 'POSITIVE'
export type ReasonSource = 'PULSE' | 'JOURNAL' | 'TASKS' | 'SCOPE' | 'ABSENCE'

export interface PartnerAction {
  id: string
  label: string
  how: string
}

export interface Signal {
  kind: SignalKind
  level: SignalLevel
  title: string
  reasons: { source: ReasonSource; text: string }[]
  actions: PartnerAction[]
}

export interface TeamPeriod {
  from: string
  to: string
  respondents: number
  averages: PulseAnswers | null
  index: number | null
  hiddenReason: string | null
}

export interface TeamMember {
  personId: string
  name: string
  position: string
  caseId: string
  stage: string
  lastPulse: string | null
  trend: TrendKind
  series: { date: string; index: number }[]
  signals: Pick<Signal, 'kind' | 'level' | 'title'>[]
  notes: string[]
}

export interface PartnerTeam {
  members: TeamMember[]
  signalCounts: Partial<Record<SignalKind, number>>
  aggregate: TeamPeriod[]
  questions: { id: PulseQuestionId; label: string }[]
  minGroupSize: number
  privacy: string[]
  disclaimer: string
}

/** One response as the supervisor sees it: the overall index only (no answers to single questions). */
export interface PulsePoint {
  id: string
  date: string
  index: number
  sharedComment: string | null
}

export interface WorkContext {
  openTasks: number
  overdueTasks: number
  scopeChanges: { date: string; text: string }[]
  absences: { from: string; to: string }[]
  source: string
}

export interface PersonCard {
  personId: string
  name: string
  position: string
  caseId: string
  points: PulsePoint[]
  trend: { kind: TrendKind; delta: number; description: string }
  signals: Signal[]
  notes: string[]
  work: WorkContext | null
  privacy: string[]
  disclaimer: string
}

export interface CriterionSummary {
  criterionId: string
  name: string
  strengths: number
  developments: number
  score: number | null
  basis: string[]
}

export interface CaseHints {
  personId: string
  disclaimer: string
  strengths: CriterionSummary[]
  areas: CriterionSummary[]
  feedback: { criterionId: string; name: string; kind: 'STRENGTH' | 'DEVELOPMENT'; date: string; text: string }[]
  feedbackTips: string[]
  development: { criterionId: string; name: string; forms: { form: string; text: string }[]; dailyManagement: string }[]
  management: string[]
}

export interface PartnerAnswer {
  answer: string
  mode: 'LLM' | 'RULES'
  llmConfigured: boolean
  anonymizedPrompt: string
  replacements: number
  anonymizationNote: string
  disclaimer: string
}

export const getPulseInfo = (signal?: AbortSignal) => apiGet<PulseInfo>('/pulse/questions', signal)
export const getMyPulse = (signal?: AbortSignal) => apiGet<MyPulse>('/pulse/me', signal)
export const submitPulse = (body: { answers: PulseAnswers; comment: string | null; shareComment: boolean }) =>
  apiPost<PulseResponse>('/pulse', body)
export const sharePulse = (id: string, shareComment: boolean) => apiPatch<PulseResponse>(`/pulse/${id}/share`, { shareComment })

export const getPartnerTeam = (signal?: AbortSignal) => apiGet<PartnerTeam>('/partner/team', signal)
export const getPersonCard = (personId: string, signal?: AbortSignal) =>
  apiGet<PersonCard>(`/partner/people/${encodeURIComponent(personId)}`, signal)
export const getCaseHints = (caseId: string, signal?: AbortSignal) =>
  apiGet<CaseHints>(`/partner/cases/${encodeURIComponent(caseId)}/hints`, signal)
export const askPartner = (body: { question: string; personId?: string; caseId?: string }) =>
  apiPost<PartnerAnswer>('/partner/ask', body)
