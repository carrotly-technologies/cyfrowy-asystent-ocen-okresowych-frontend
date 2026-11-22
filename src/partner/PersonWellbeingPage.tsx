import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { getPersonCard, type PersonCard } from '../api/partner'
import { CaseActionLink } from '../components/CaseActionLink'
import { ErrorState, LoadingState } from '../components/QueryState'
import { BackLink, Card, InfoTip, InlineAlert } from '../components/ui'
import { fmtDate, fmtNumber } from '../lib/format'
import { useMe } from '../lib/useAuth'
import { AskPartner } from './AskPartner'
import { PrivacyNote, SignalCard, TrendBadge } from './common'
import { PulseChart } from './PulseChart'
import { ASSISTANT_INTRO } from './labels'
import s from './Partner.module.css'

/**
 * Wellbeing card of one employee (/dobrostan/:personId), laid out like the person page in „Oceny zespołu”: BackLink,
 * name and position, sections in cards. Pulse trend, signals with reasons, work data and „Zapytaj wirtualnego asystenta HR”.
 */
export function PersonWellbeingPage() {
  const { personId = '' } = useParams()
  const me = useMe()
  const q = useQuery({ queryKey: ['partner-person', personId], queryFn: ({ signal }) => getPersonCard(personId, signal) })
  if (q.isPending) return <div className="page page--wide"><LoadingState /></div>
  if (q.isError) return <div className="page page--wide"><ErrorState error={q.error} what="karta pracownika" onRetry={() => q.refetch()} /></div>
  const c = q.data
  const shared = c.points.filter((p) => p.sharedComment)
  return (
    <div className="page page--wide">
      <BackLink to="/dobrostan">Dobrostan zespołu</BackLink>
      <header className="page-head">
        <div>
          <h1 className="h-page">{c.name}</h1>
          <p className="page-head__meta">{c.position}</p>
        </div>
        {c.caseId && (
          <div className={s.caseLink}>
            <div className={s.row}>
              <CaseActionLink caseId={c.caseId} status={c.caseStatus} role={me.role} variant="secondary" />
              <InfoTip label="Czy dane dobrostanu trafiają do oceny?">
                Dane dobrostanu nie trafiają do oceny okresowej.
              </InfoTip>
            </div>
            <p className={s.caseContext}>{caseContext(c)}</p>
          </div>
        )}
      </header>
      <InlineAlert tone="info" title={ASSISTANT_INTRO}>
        {c.disclaimer}
      </InlineAlert>

      <section className="section" aria-labelledby="sig-h">
        <h2 id="sig-h" className="h-section">Sygnały wirtualnego asystenta HR</h2>
        {c.notes.map((n) => (
          <p key={n} className={s.muted}>{n}</p>
        ))}
        {c.signals.length === 0 ? (
          <Card>
            <p>Brak sygnałów. Utrzymuj regularne rozmowy 1:1 i bieżącą informację zwrotną.</p>
          </Card>
        ) : (
          <div className={s.signals}>
            {c.signals.map((sg) => (
              <SignalCard key={sg.kind} signal={sg} />
            ))}
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="pulse-h">
        <h2 id="pulse-h" className="h-section">Puls: ogólny wskaźnik dobrostanu</h2>
        <div className={s.stack}>
          <Card>
            <div className={s.stack}>
              <div className={s.row}>
                <TrendBadge kind={c.trend.kind} /> <span>{c.trend.description}</span>
              </div>
              <PulseChart points={c.points} label={`Indeks pulsu: ${c.name}`} />
              <p className={s.muted}>
                Widzisz tylko ogólny wskaźnik i trend. Odpowiedzi na poszczególne pytania widzi wyłącznie pracownik; średnie dla
                pytań są tylko w widoku zespołu, gdy odpowiedziało wystarczająco wiele osób.
              </p>
            </div>
          </Card>
          {c.points.length > 0 && (
            <div className="panel table-scroll">
              <table className="table">
                <caption className="visually-hidden">Ogólny wskaźnik dobrostanu w kolejnych pulsach</caption>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Wskaźnik (1–5)</th>
                    <th>Komentarz</th>
                  </tr>
                </thead>
                <tbody>
                  {c.points.map((p) => (
                    <tr key={p.id}>
                      <td className="num">{fmtDate(p.date)}</td>
                      <td className="num"><strong>{fmtNumber(p.index)}</strong></td>
                      <td>{p.sharedComment ? 'udostępniony' : <span className="faint">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="section" aria-labelledby="com-h">
        <h2 id="com-h" className="h-section">Komentarze udostępnione przez pracownika</h2>
        <Card>
          {shared.length === 0 ? (
            <p>Brak udostępnionych komentarzy.</p>
          ) : (
            shared.map((p) => (
              <blockquote key={p.id} className={s.quote}>
                {fmtDate(p.date)}: {p.sharedComment}
              </blockquote>
            ))
          )}
        </Card>
      </section>

      {c.work && (
        <section className="section" aria-labelledby="work-h">
          <h2 id="work-h" className="h-section">Zadania i zmiany</h2>
          <Card>
            <div className={s.stack}>
              <dl className="dl">
                <dt>Otwarte zadania</dt>
                <dd className="num">{c.work.openTasks}</dd>
                <dt>Po terminie</dt>
                <dd className="num">{c.work.overdueTasks}</dd>
              </dl>
              {c.work.scopeChanges.map((sc) => (
                <p key={sc.date}>Zmiana zakresu obowiązków {fmtDate(sc.date)}: {sc.text}</p>
              ))}
              {c.work.absences.map((a) => (
                <p key={a.from}>Nieobecność {fmtDate(a.from)}–{fmtDate(a.to)} (bez przyczyny)</p>
              ))}
              <p className={s.muted}>{c.work.source}</p>
            </div>
          </Card>
        </section>
      )}

      <section className="section">
        <AskPartner personId={c.personId} />
      </section>
      <section className="section">
        <PrivacyNote items={c.privacy} />
      </section>
    </div>
  )
}

/** „Ocena okresowa · etap: … · termin …” under the case button, or the date a closed assessment ended. */
function caseContext(c: PersonCard): string {
  if (c.caseStatus === 'ZAKONCZONA')
    return ['Ocena okresowa zakończona', c.completedOn && fmtDate(c.completedOn)].filter(Boolean).join(' ')
  return [
    'Ocena okresowa',
    `etap: ${c.stageName}`,
    c.nextDeadline?.date && `termin ${fmtDate(c.nextDeadline.date)}`,
  ]
    .filter(Boolean)
    .join(' · ')
}
