import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { errorMessage } from '../../api/client'
import { DeadlineText } from '../../components/Deadline'
import { ConfirmDialog, InlineAlert, StageStepper } from '../../components/ui'
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
  // After signing the check disappears: keep the user at the steps (not the sheet preview) and focus the next action,
  // which is now the hand-over of step 3 under the stepper.
  const afterSign = () =>
    requestAnimationFrame(() => {
      flowRef.current?.scrollIntoView({ block: 'nearest' })
      flowRef.current?.querySelector<HTMLButtonElement>('.doc-flow__action .btn--primary')?.focus()
    })
  const signed = !!detail.signedByEvaluatorOn
  const sent = !!detail.sentForAckOn
  const acked = !!detail.acknowledgedOn
  // Short names in the stepper; the full description of the current step is the heading of its action under it.
  const steps = [
    { key: 'talk', label: 'Rozmowa', action: 'Rozmowa oceniająca', date: detail.assessmentTalkOn },
    { key: 'sign', label: 'Podpis', action: 'Podpisz ocenę', date: detail.signedByEvaluatorOn },
    { key: 'send', label: 'Przekazanie', action: 'Przekaż ocenianemu', date: detail.sentForAckOn },
    { key: 'ack', label: 'Zapoznanie', action: 'Czeka na zapoznanie', date: detail.acknowledgedOn },
  ]
  // The current step is the first one without a date; once all four have a date there is no action left.
  const currentIndex = steps.findIndex((s) => !s.date)
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

  /** The action of a step, shown under the stepper while it is the current step. */
  const stepAction = (i: number) => {
    if (i === 1 && !signed && stage === 'SIGNATURE') {
      return (
        <>
          <FormalCheck detail={detail} label="Podpisz ocenę" onDone={afterSign} />
          <p className="small">
            <Link to={caseUrl(detail.id, 'ASSESSMENT')}>Wróć do oceny, aby poprawić część II lub III</Link>
          </p>
        </>
      )
    }
    if (i === 2 && signed && !sent) {
      return (
        <>
          <button type="button" className="btn btn--primary" disabled={act.isPending || !allows(detail, 'SEND_FOR_ACK')} onClick={() => setConfirmSend(true)}>
            Przekaż ocenianemu do zapoznania
          </button>
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
          <MutationError error={act.error} />
        </>
      )
    }
    if (i === 3 && sent && !acked) {
      return (
        <>
          <RemindButton detail={detail} />
          <BlockedReason>Potwierdzenie zapoznania należy do ocenianego; data zapoznania zapisze się przy jego potwierdzeniu.</BlockedReason>
          <MutationError error={act.error} />
        </>
      )
    }
    return null
  }

  return (
    <div className="stage">
      <StageHeader title={info.name} status={status} />
      <div className="stage-pad">
        <div className="doc-flow" ref={flowRef}>
          <StageStepper
            label="Kroki podpisu i przekazania"
            steps={steps.map((st, i) => ({
              key: st.key,
              label: st.label,
              sublabel: st.date ? fmtDate(st.date) : '—',
              status: st.date ? 'done' : i === currentIndex ? 'current' : 'todo',
            }))}
          />
          {currentIndex >= 0 && (
            <section className="doc-flow__action" aria-labelledby="doc-flow-h">
              <h3 id="doc-flow-h" className="doc-flow__title">
                Krok {currentIndex + 1} z {steps.length}: {steps[currentIndex].action}
              </h3>
              {stepAction(currentIndex)}
            </section>
          )}
        </div>

        <div className="paper-preview" aria-label="Podgląd arkusza">
          <SheetDocument detail={detail} model={model} criteria={criteria} />
        </div>
      </div>
    </div>
  )
}
