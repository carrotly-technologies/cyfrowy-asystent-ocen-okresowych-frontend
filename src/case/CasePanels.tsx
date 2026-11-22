import type { CaseDetail } from '../api/cases'
import { Disclosure } from '../components/ui'
import { EvaluatorDeadlinesPanel } from './DeadlinesPanel'
import { invitationState } from './invitations'
import { EvaluatorLegalPanel } from './LegalPaths'
import s from './CasePage.module.css'

/**
 * Terms, talk invitations, the assessed person's requests and objections, folded into one collapsible frame above
 * the work area so they never push the stage out of view. Opens by itself when something waits for a decision.
 */
export function CasePanels({ detail, supervisor }: { detail: CaseDetail; supervisor: boolean }) {
  const actions = detail.legalActions ?? []
  const decide = actions.includes('DECIDE_DUE_DATE_REQUEST')
  const fiction = actions.includes('RECORD_ACK_FICTION')
  // Sheet A: the evaluator decides the sprzeciw (art. 83 ust. 2), so it waits for them here.
  const decideObjection = actions.includes('DECIDE_OBJECTION')
  const pendingObjections = detail.objections.filter((o) => !o.decision).length
  const invitations = (detail.talkInvitations ?? []).filter((i) => !invitationState(detail, i).stale).length
  const hasLegal = decide || fiction || !!detail.ackFiction || detail.objections.length > 0
  if (!supervisor && !hasLegal) return null

  const chips: { text: string; warn?: boolean }[] = []
  if (decide) chips.push({ text: 'wniosek ocenianego czeka na decyzję', warn: true })
  if (decideObjection) chips.push({ text: 'sprzeciw czeka na Twoje rozstrzygnięcie', warn: true })
  else if (pendingObjections > 0) chips.push({ text: 'sprzeciw w rozpatrzeniu', warn: true })
  if (fiction) chips.push({ text: 'oczekuje na zapoznanie' })
  if (supervisor && invitations > 0) chips.push({ text: `aktualne zaproszenia: ${invitations}` })

  return (
    <Disclosure
      open={decide || decideObjection}
      title={
        <>
          <span>{supervisor ? 'Termin oceny, zaproszenia i wnioski' : 'Wnioski i sprzeciwy'}</span>
          {chips.map((c) => (
            <span key={c.text} className={`${s.panelChip} ${c.warn ? s.panelChipWarn : ''}`}>
              {c.text}
            </span>
          ))}
        </>
      }
    >
      <EvaluatorLegalPanel detail={detail} />
      {supervisor && <EvaluatorDeadlinesPanel detail={detail} />}
    </Disclosure>
  )
}
