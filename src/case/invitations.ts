import type { CaseDetail, TalkInvitation } from '../api/cases'
import { DEMO_TODAY, fmtDate } from '../lib/format'

/** An invitation that no longer applies: the talk already took place, or its date has passed. */
export function invitationState(detail: CaseDetail, i: TalkInvitation): { stale: boolean; note: string | null } {
  const heldOn = i.kind === 'OPENING' ? detail.partI.confirmedByEvaluatorOn : detail.assessmentTalkOn
  if (heldOn) return { stale: true, note: `nieaktualne: rozmowa odbyła się ${fmtDate(heldOn)}` }
  if (i.date < DEMO_TODAY) return { stale: true, note: 'termin minął' }
  return { stale: false, note: null }
}
