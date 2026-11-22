import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { HeartHandshake } from 'lucide-react'
import { getCaseHints } from '../api/partner'
import { ErrorState, LoadingState } from '../components/QueryState'
import { Card, Disclosure, InlineAlert } from '../components/ui'
import { fmtDate } from '../lib/format'
import { AskPartner } from './AskPartner'
import s from './Partner.module.css'

/** "Podpowiedzi HR partnera" in the assessment stage: help only, the supervisor sets every score. */
export function CaseHintsPanel({ caseId }: { caseId: string }) {
  const q = useQuery({ queryKey: ['partner-hints', caseId], queryFn: ({ signal }) => getCaseHints(caseId, signal) })
  return (
    <Disclosure
      className="case-hints"
      title={
        <>
          <HeartHandshake size={16} strokeWidth={1.75} aria-hidden="true" /> Podpowiedzi HR partnera
        </>
      }
    >
      {q.isPending && <LoadingState />}
      {q.isError && <ErrorState error={q.error} what="podpowiedzi HR partnera" onRetry={() => q.refetch()} />}
      {q.data && (
        <>
          <InlineAlert tone="info">{q.data.disclaimer}</InlineAlert>
          <div className={s.grid}>
            <HintCard title="Mocne strony">
              {q.data.strengths.length === 0 ? (
                <p className="small muted">Brak wyraźnych mocnych stron w obserwacjach i ocenach roboczych.</p>
              ) : (
                <ul className="bullets">
                  {q.data.strengths.map((c) => (
                    <li key={c.criterionId}>
                      <strong>{c.name}</strong> – {c.basis.join(', ')}
                    </li>
                  ))}
                </ul>
              )}
            </HintCard>
            <HintCard title="Obszary do rozwoju">
              {q.data.areas.length === 0 ? (
                <p className="small muted">Brak kryteriów poniżej poziomu oczekiwań ani przewagi obserwacji do rozwoju.</p>
              ) : (
                <ul className="bullets">
                  {q.data.areas.map((c) => (
                    <li key={c.criterionId}>
                      <strong>{c.name}</strong> – {c.basis.join(', ')}
                    </li>
                  ))}
                </ul>
              )}
            </HintCard>
          </div>

          <HintCard title="Jak sformułować informację zwrotną (sytuacja – zachowanie – rezultat)">
            <ul className="bullets">
              {q.data.feedbackTips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            {q.data.feedback.map((f) => (
              <blockquote key={`${f.criterionId}-${f.date}`} className={s.quote}>
                <span className={`tag ${f.kind === 'STRENGTH' ? 'tag--ok' : 'tag--warn'}`}>
                  {f.kind === 'STRENGTH' ? 'mocna strona' : 'do rozwoju'}
                </span>{' '}
                {f.name}, {fmtDate(f.date)}: {f.text}
              </blockquote>
            ))}
          </HintCard>

          {q.data.development.length > 0 && (
            <HintCard title="Propozycje do wniosków IPRZ">
              <ul className="bullets">
                {q.data.development.map((d) => (
                  <li key={d.criterionId}>
                    <strong>{d.name}:</strong> {d.forms.map((f) => `${f.form} – ${f.text}`).join('; ')}
                  </li>
                ))}
              </ul>
              <p className="small muted">Przykładowy katalog form rozwoju; urząd może zastąpić go własną ofertą szkoleń.</p>
            </HintCard>
          )}

          <HintCard title="Jak przełożyć wyniki na codzienne zarządzanie zespołem">
            <ul className="bullets">
              {q.data.management.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </HintCard>
          <AskPartner caseId={caseId} />
        </>
      )}
    </Disclosure>
  )
}

/** One section of the hints: the shared case-folder card with an `h-sub` heading. */
function HintCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <div className={s.stack}>
        <h4 className="h-sub">{title}</h4>
        {children}
      </div>
    </Card>
  )
}
