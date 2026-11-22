import type { CaseDetail, TalkInvitation } from '../api/cases'
import { DEMO_TODAY, fmtDate } from '../lib/format'

/**
 * An invitation that no longer applies: a newer invitation to the same talk replaced it, the talk already took place,
 * or its date has passed.
 */
export function invitationState(detail: CaseDetail, i: TalkInvitation): { stale: boolean; note: string | null } {
  const same = (detail.talkInvitations ?? []).filter((x) => x.kind === i.kind)
  const newer = same.slice(same.indexOf(i) + 1).at(-1)
  if (newer && same.indexOf(i) >= 0) return { stale: true, note: `zastąpione zaproszeniem na ${fmtDate(newer.date)}` }
  const heldOn = i.kind === 'OPENING' ? detail.partI.confirmedByEvaluatorOn : detail.assessmentTalkOn
  if (heldOn) return { stale: true, note: `nieaktualne: rozmowa odbyła się ${fmtDate(heldOn)}` }
  if (i.date < DEMO_TODAY) return { stale: true, note: 'termin minął' }
  return { stale: false, note: null }
}
