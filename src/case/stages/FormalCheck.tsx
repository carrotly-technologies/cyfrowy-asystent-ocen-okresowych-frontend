import { Check, X } from 'lucide-react'
import type { CaseAction, CaseDetail } from '../../api/cases'
import { useState } from 'react'
import { ConfirmDialog, InlineAlert } from '../../components/ui'
import { errorMessage } from '../../api/client'
import { useCaseAction } from '../../lib/caseQueries'
import { fmtDate } from '../../lib/format'
import { BlockedReason, MutationError } from './common'
import { allows } from '../../lib/stages'

/** Stage status once the evaluator has signed; the stage passes it to `StageHeader status` (shown under the title). */
export function SignedStatus({ detail }: { detail: CaseDetail }) {
  return (
    <InlineAlert tone="success" title="Ocena podpisana">
      Ocena podpisana przez oceniającego {fmtDate(detail.signedByEvaluatorOn)}. Pola są tylko do odczytu.
    </InlineAlert>
  )
}

/** ✓/✗ list from the backend + the signing action, blocked while any item fails. The signed status is not shown here. */
export function FormalCheck({
  detail,
  action = 'SIGN_ASSESSMENT',
  label,
  onDone,
}: {
  detail: CaseDetail
  action?: CaseAction
  label: string
  /** Called after the action succeeded (e.g. to move focus to the next step). */
  onDone?: () => void
}) {
  const act = useCaseAction(detail.id)
  const [confirming, setConfirming] = useState(false)
  const ev = detail.evaluation
  const items = detail.formalCheck
  const errors = items.filter((i) => !i.ok)
  const signed = !!detail.signedByEvaluatorOn
  return (
    <section className="formal" aria-labelledby="formal-h">
      <div className="formal__head">
        <h3 id="formal-h" className="h-section">Kontrola formalna</h3>
        <span className={`tag ${errors.length ? 'tag--danger' : 'tag--ok'}`}>
          {errors.length ? `${errors.length} do poprawy` : 'bez uwag'}
        </span>
      </div>
      <ul className="formal__list">
        {items.map((i) => (
          <li key={i.id} className={`formal__item ${i.ok ? 'is-ok' : 'is-err'}`}>
            <span className="formal__icon" aria-label={i.ok ? 'spełnione' : 'niespełnione'}>
              {i.ok ? <Check size={13} strokeWidth={2.5} /> : <X size={13} strokeWidth={2.5} />}
            </span>
            <span className="formal__msg">{i.message}</span>
            {i.legalBasis && <span className="legal">{i.legalBasis}</span>}
          </li>
        ))}
      </ul>
      {(!signed || !!act.error) && (
        <div className="formal__foot">
          {!signed && (
            <>
              <button type="button" className="btn btn--primary" disabled={errors.length > 0 || act.isPending || !allows(detail, action)} onClick={() => setConfirming(true)}>
                {label}
              </button>
              <ConfirmDialog
                open={confirming}
                title="Podpisać ocenę?"
                confirmLabel={label}
                cancelLabel="Wróć"
                onConfirm={async () => {
                  await act.mutateAsync(action)
                  onDone?.()
                }}
                onCancel={() => setConfirming(false)}
                errorText={errorMessage}
              >
                <dl className="confirm-summary">
                  <dt>Wynik</dt>
                  <dd>{ev ? (ev.result === 'POSITIVE' ? 'ocena pozytywna' : 'ocena negatywna') : '—'}</dd>
                  <dt>Średnia</dt>
                  <dd className="num">{ev?.averageDisplay ?? '—'}</dd>
                  <dt>Poziom</dt>
                  <dd>{ev?.level?.label.toLowerCase() ?? '—'}</dd>
                  <dt>Wnioski do IPRZ</dt>
                  <dd>{detail.iprz.trim() ? 'wpisane' : 'brak'}</dd>
                  {detail.person.employment === 'URZEDNIK' && (
                    <>
                      <dt>Wniosek o kolejny stopień</dt>
                      <dd>
                        {detail.promotionRequest.attached === 'YES'
                          ? `TAK${detail.promotionRequest.requestedGrade ? ` (${detail.promotionRequest.requestedGrade} stopień)` : ''}`
                          : 'NIE'}
                      </dd>
                    </>
                  )}
                  <dt>Kontrola formalna</dt>
                  <dd>bez uwag</dd>
                </dl>
                <p>Po podpisie pola oceny zostaną zablokowane. Ocenę przekażesz ocenianemu w następnym kroku.</p>
              </ConfirmDialog>
              {errors.length > 0 && (
                <BlockedReason>
                  Zatwierdzenie jest zablokowane, dopóki lista zawiera błędy. Popraw: {errors.map((e) => e.message.replace(/\.$/, '')).join('; ')}.
                </BlockedReason>
              )}
            </>
          )}
          <MutationError error={act.error} />
        </div>
      )}
    </section>
  )
}
