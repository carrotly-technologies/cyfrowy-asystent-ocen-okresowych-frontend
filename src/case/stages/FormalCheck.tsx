import { Check, X } from 'lucide-react'
import type { CaseAction, CaseDetail } from '../../api/cases'
import { useCaseAction } from '../../lib/caseQueries'
import { fmtDate } from '../../lib/format'
import { BlockedReason, MutationError } from './common'

/** ✓/✗ list from the backend + the signing action, blocked while any item fails. */
export function FormalCheck({ detail, action = 'SIGN_ASSESSMENT', label }: { detail: CaseDetail; action?: CaseAction; label: string }) {
  const act = useCaseAction(detail.id)
  const errors = detail.formalCheck.filter((i) => !i.ok)
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
        {detail.formalCheck.map((i) => (
          <li key={i.id} className={`formal__item ${i.ok ? 'is-ok' : 'is-err'}`}>
            <span className="formal__icon" aria-label={i.ok ? 'spełnione' : 'niespełnione'}>
              {i.ok ? <Check size={13} strokeWidth={2.5} /> : <X size={13} strokeWidth={2.5} />}
            </span>
            <span className="formal__msg">{i.message}</span>
            {i.legalBasis && <span className="legal">{i.legalBasis}</span>}
          </li>
        ))}
      </ul>
      <div className="formal__foot">
        {signed ? (
          <p className="notice notice--ok">Ocena podpisana przez oceniającego {fmtDate(detail.signedByEvaluatorOn)}.</p>
        ) : (
          <>
            <button type="button" className="btn btn--primary" disabled={errors.length > 0 || act.isPending} onClick={() => act.mutate(action)}>
              {label}
            </button>
            {errors.length > 0 && (
              <BlockedReason>
                Zatwierdzenie jest zablokowane, dopóki lista zawiera błędy. Popraw: {errors.map((e) => e.message.replace(/\.$/, '')).join('; ')}.
              </BlockedReason>
            )}
          </>
        )}
        <MutationError error={act.error} />
      </div>
    </section>
  )
}
