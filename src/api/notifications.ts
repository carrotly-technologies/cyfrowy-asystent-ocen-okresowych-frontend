import { apiGet, apiPost } from './client'
import type { CaseDetail, TalkInvitation } from './cases'

export type { TalkInvitation }

/** In-app notification (backend src/notifications). */
export interface AppNotification {
  id: string
  caseId: string | null
  type: string
  title: string
  body: string
  createdOn: string
  createdAt: string
  readAt: string | null
}

export interface Inbox {
  items: AppNotification[]
  unread: number
}

export const getNotifications = (signal?: AbortSignal) => apiGet<Inbox>('/notifications', signal)
export const markNotificationRead = (id: string) => apiPost<void>(`/notifications/${encodeURIComponent(id)}/read`, undefined)
export const markAllNotificationsRead = () => apiPost<{ marked: number }>('/notifications/read-all', undefined)
export const runReminders = () => apiPost<{ today: string; created: number }>('/notifications/run', undefined)

/** Reasons of a due-date change, from the law via the API (art. 81 ust. 7–8). */
export interface DueChangeReasonInfo {
  id: string
  label: string
  legalBasis: string
  selectable: boolean
}

export interface DeadlineRules {
  reasons: DueChangeReasonInfo[]
  minMonthsSinceLastAssessment: number
  dueSoonThresholds: number[]
}

export const getDeadlineRules = (signal?: AbortSignal) => apiGet<DeadlineRules>('/deadlines/rules', signal)

const casePath = (id: string, rest: string) => `/cases/${encodeURIComponent(id)}/${rest}`

export const changeDueDate = (id: string, body: { date: string; reason: string; note?: string }) =>
  apiPost<CaseDetail>(casePath(id, 'due-date'), body)

export const inviteToTalk = (
  id: string,
  body: { kind: TalkInvitation['kind']; date: string; time: string; place: string; note?: string },
) => apiPost<CaseDetail>(casePath(id, 'talk-invitations'), body)

export const invitationIcsPath = (caseId: string, invitationId: string) =>
  casePath(caseId, `talk-invitations/${encodeURIComponent(invitationId)}/ics`)
