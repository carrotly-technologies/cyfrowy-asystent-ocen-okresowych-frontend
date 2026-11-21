import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { errorMessage } from '../../api/client'
import { DeadlineText } from '../../components/Deadline'
import { ConfirmDialog, InlineAlert } from '../../components/ui'
import { useCaseAction } from '../../lib/caseQueries'
import { fmtDate } from '../../lib/format'
import { SheetDocument } from '../../sheet/SheetDocument'
import type { StageProps } from '../CasePage'
import { BlockedReason, MutationError, StageHeader } from './common'
import { FormalCheck } from './FormalCheck'
import { RemindButton } from '../RemindButton'
import { allows, caseUrl } from '../../lib/stages'

/**
 * Steps 6–7: the formal check and the evaluator's signature, hand-over to the assessed person, and their
 * acknowledgement (done by the assessed person on their own account, never here).
 */
export function DocumentStage({ detail, model, criteria, stage }: StageProps) {
  const info = detail.stages.find((s) => s.id === stage)!
  const act = useCaseAction(detail.id)
  const [confirmSend, setConfirmSend] = useState(false)
  const flowRef = useRef<HTMLDivElement>(null)
  // After signing the check disappears: keep the user at the steps (not the sheet preview) and focus the next action.
  const afterSign = () =>
    requestAnimationFrame(() => {
      flowRef.current?.scrollIntoView({ block: 'nearest' })
      flowRef.current?.querySelector<HTMLButtonElement>('.doc-flow__actions .btn--primary')?.focus()
    })
  const signed = !!detail.signedByEvaluatorOn
  const sent = !!detail.sentForAckOn
  const acked = !!detail.acknowledgedOn
  const steps = [
    { label: 'Rozmowa oceniająca przeprowadzona', date: detail.assessmentTalkOn },
    { label: 'Ocena podpisana przez oceniającego', date: detail.signedByEvaluatorOn },
    { label: 'Przekazana ocenianemu do zapoznania', date: detail.sentForAckOn },
    { label: 'Oceniany zapoznał się z oceną', date: detail.acknowledgedOn },
  ]
  const nextCycle = detail.history.filter((h) => h.text.startsWith('Nowy cykl')).at(-1)
  const status = acked ? (
    <InlineAlert tone="info" title={`Oceniany zapoznał się z oceną ${fmtDate(detail.acknowledgedOn)}`}>
      {detail.objectionDeadline && (
        <>
          <p>
            <strong>Termin na sprzeciw:</strong> <DeadlineText deadline={detail.objectionDeadline} />
          </p>
          <p className="legal legal--wrap">{detail.objectionDeadline.legalBasis}</p>
        </>
      )}
      {nextCycle && <p>{nextCycle.text}</p>}
    </InlineAlert>
  ) : sent ? (
    <InlineAlert tone="warning" title="Czeka na zapoznanie ocenianego">
      Ocenę przekazano {fmtDate(detail.sentForAckOn)}. Oceniany potwierdza zapoznanie na swoim koncie („Moje oceny”).
    </InlineAlert>
  ) : null

  return (
    <div className="stage">
      <StageHeader title={info.name} status={status} />
      <div className="stage-pad">
        <div className="doc-flow" ref={flowRef}>
          <ol className="steps">
            {steps.map((s, i) => (
              <li key={s.label} className={`steps__item ${s.date ? 'is-done' : ''}`}>
                <span className="steps__num num">{i + 1}</span>
                <span className="steps__label" title={s.label}>{s.label}</span>
                <span className="steps__date num">{s.date ? fmtDate(s.date) : '—'}</span>
              </li>
            ))}
          </ol>
          {!signed && stage === 'SIGNATURE' && (
            <>
              <FormalCheck detail={detail} label="Podpisz ocenę" onDone={afterSign} />
              <p className="small">
                <Link to={caseUrl(detail.id, 'ASSESSMENT')}>Wróć do oceny, aby poprawić część II lub III</Link>
              </p>
            </>
          )}
          <div className="doc-flow__actions">
            {signed && !sent && (
              <button type="button" className="btn btn--primary" disabled={act.isPending || !allows(detail, 'SEND_FOR_ACK')} onClick={() => setConfirmSend(true)}>
                Przekaż ocenianemu do zapoznania
              </button>
            )}
            <ConfirmDialog
              open={confirmSend}
              title="Przekazać ocenę ocenianemu?"
              confirmLabel="Przekaż do zapoznania"
              cancelLabel="Wróć"
              onConfirm={() => act.mutateAsync('SEND_FOR_ACK')}
              onCancel={() => setConfirmSend(false)}
              errorText={errorMessage}
            >
              <dl className="confirm-summary">
                <dt>Oceniany</dt>
                <dd>{detail.person.firstName} {detail.person.lastName}</dd>
                <dt>Wynik</dt>
                <dd>
                  {detail.evaluation ? (detail.evaluation.result === 'POSITIVE' ? 'ocena pozytywna' : 'ocena negatywna') : '—'}
                  {detail.evaluation?.level && `, ${detail.evaluation.level.label.toLowerCase()}`}
                </dd>
                <dt>Podpisana</dt>
                <dd>{fmtDate(detail.signedByEvaluatorOn)}</dd>
              </dl>
              <p>
                Oceniany dostanie powiadomienie i potwierdzi zapoznanie na swoim koncie. Od dnia zapoznania biegnie termin na
                sprzeciw. Tej czynności nie można cofnąć.
              </p>
            </ConfirmDialog>
            {sent && !acked && <RemindButton detail={detail} />}
            {sent && !acked && <BlockedReason>Potwierdzenie zapoznania należy do ocenianego; data zapoznania zapisze się przy jego potwierdzeniu.</BlockedReason>}
            <MutationError error={act.error} />
          </div>
        </div>

        <div className="paper-preview" aria-label="Podgląd arkusza">
          <SheetDocument detail={detail} model={model} criteria={criteria} />
        </div>
      </div>
    </div>
  )
}
