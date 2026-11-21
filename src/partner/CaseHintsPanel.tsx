import { useQuery } from '@tanstack/react-query'
import { HeartHandshake } from 'lucide-react'
import { getCaseHints } from '../api/partner'
import { ErrorState, LoadingState } from '../components/QueryState'
import { InlineAlert } from '../components/ui'
import { fmtDate } from '../lib/format'
import { AskPartner } from './AskPartner'
import s from './Partner.module.css'

/** "Podpowiedzi HR partnera" in the assessment stage: help only, the supervisor sets every score. */
export function CaseHintsPanel({ caseId }: { caseId: string }) {
  const q = useQuery({ queryKey: ['partner-hints', caseId], queryFn: ({ signal }) => getCaseHints(caseId, signal) })
  return (
    <details className={s.hints}>
      <summary>
        <span className={s.row} style={{ display: 'inline-flex' }}>
          <HeartHandshake size={18} aria-hidden="true" /> Podpowiedzi HR partnera
        </span>
      </summary>
      <div className={`${s.hintsBody} ${s.stack}`}>
        {q.isPending && <LoadingState />}
        {q.isError && <ErrorState error={q.error} what="podpowiedzi HR partnera" onRetry={() => q.refetch()} />}
        {q.data && (
          <>
            <InlineAlert tone="info">{q.data.disclaimer}</InlineAlert>
            <div className={s.grid}>
              <div className={s.box}>
                <h4>Mocne strony</h4>
                {q.data.strengths.length === 0 ? (
                  <p className={s.muted}>Brak wyraźnych mocnych stron w obserwacjach i ocenach roboczych.</p>
                ) : (
                  <ul className={s.reasons}>
                    {q.data.strengths.map((c) => (
                      <li key={c.criterionId}>
                        <strong>{c.name}</strong> – {c.basis.join(', ')}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className={s.box}>
                <h4>Obszary do rozwoju</h4>
                {q.data.areas.length === 0 ? (
                  <p className={s.muted}>Brak kryteriów poniżej poziomu oczekiwań ani przewagi obserwacji do rozwoju.</p>
                ) : (
                  <ul className={s.reasons}>
                    {q.data.areas.map((c) => (
                      <li key={c.criterionId}>
                        <strong>{c.name}</strong> – {c.basis.join(', ')}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className={s.box}>
              <h4>Jak sformułować informację zwrotną (sytuacja – zachowanie – rezultat)</h4>
              <ul className={s.reasons}>
                {q.data.feedbackTips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              {q.data.feedback.map((f) => (
                <blockquote key={`${f.criterionId}-${f.date}`} className={s.quote}>
                  <span className={s.src}>{f.kind === 'STRENGTH' ? 'Mocna strona' : 'Do rozwoju'}</span>
                  {f.name}, {fmtDate(f.date)}: {f.text}
                </blockquote>
              ))}
            </div>

            {q.data.development.length > 0 && (
              <div className={s.box}>
                <h4>Propozycje do wniosków IPRZ</h4>
                <ul className={s.reasons}>
                  {q.data.development.map((d) => (
                    <li key={d.criterionId}>
                      <strong>{d.name}:</strong> {d.forms.map((f) => `${f.form} – ${f.text}`).join('; ')}
                    </li>
                  ))}
                </ul>
                <p className={s.muted}>Przykładowy katalog form rozwoju; urząd może zastąpić go własną ofertą szkoleń.</p>
              </div>
            )}

            <div className={s.box}>
              <h4>Jak przełożyć wyniki na codzienne zarządzanie zespołem</h4>
              <ul className={s.reasons}>
                {q.data.management.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
            <AskPartner caseId={caseId} />
          </>
        )}
      </div>
    </details>
  )
}
