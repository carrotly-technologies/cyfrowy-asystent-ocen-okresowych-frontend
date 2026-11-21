import { useQuery } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { getPersonCard } from '../api/partner'
import { ErrorState, LoadingState } from '../components/QueryState'
import { BackLink, InlineAlert } from '../components/ui'
import { fmtDate } from '../lib/format'
import { caseUrl } from '../lib/stages'
import { AskPartner } from './AskPartner'
import { PrivacyNote, SignalCard, Sparkline, TrendBadge } from './common'
import s from './Partner.module.css'

/** HR partner card of one employee: pulse trend, flags with reasons, work data and "Zapytaj HR partnera". */
export function PersonWellbeingPage() {
  const { personId = '' } = useParams()
  const q = useQuery({ queryKey: ['partner-person', personId], queryFn: ({ signal }) => getPersonCard(personId, signal) })
  if (q.isPending) return <div className="page"><LoadingState /></div>
  if (q.isError) return <div className="page"><ErrorState error={q.error} what="karta pracownika" onRetry={() => q.refetch()} /></div>
  const c = q.data
  const shared = c.points.filter((p) => p.sharedComment)
  const privateCount = c.points.filter((p) => p.hasPrivateComment).length
  return (
    <div className="page">
      <BackLink to="/dobrostan" />
      <header className="page-head">
        <div>
          <h1 className="h-page">{c.name}</h1>
          <p className="page-head__meta">
            {c.position} · <Link to={caseUrl(c.caseId)}>teczka oceny</Link>
          </p>
        </div>
      </header>
      <InlineAlert tone="info">{c.disclaimer}</InlineAlert>

      <section className="section" aria-labelledby="sig-h">
        <h2 id="sig-h" className="h-section">Sygnały HR partnera</h2>
        {c.notes.map((n) => (
          <p key={n} className={s.muted}>{n}</p>
        ))}
        {c.signals.length === 0 ? (
          <p className={s.muted}>Brak sygnałów. Utrzymuj regularne rozmowy 1:1 i bieżącą informację zwrotną.</p>
        ) : (
          <div className={s.grid}>
            {c.signals.map((sg) => (
              <SignalCard key={sg.kind} signal={sg} />
            ))}
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="pulse-h">
        <h2 id="pulse-h" className="h-section">Puls</h2>
        <div className={`${s.box} ${s.stack}`}>
          <div className={s.row}>
            <TrendBadge kind={c.trend.kind} /> <span className={s.muted}>{c.trend.description}</span>
          </div>
          <Sparkline points={c.points} width={480} height={90} label={`Indeks pulsu: ${c.name}`} />
          {c.points.length > 0 && (
            <div className="sheet-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    {c.questions.map((qq) => (
                      <th key={qq.id}>{qq.label}</th>
                    ))}
                    <th>Indeks</th>
                  </tr>
                </thead>
                <tbody>
                  {c.points.map((p) => (
                    <tr key={p.id}>
                      <td>{fmtDate(p.date)}</td>
                      {c.questions.map((qq) => (
                        <td key={qq.id} className="num">{p.answers[qq.id]}</td>
                      ))}
                      <td className="num"><strong>{p.index}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <h3>Komentarze udostępnione przez pracownika</h3>
          {shared.length === 0 && <p className={s.muted}>Brak udostępnionych komentarzy.</p>}
          {shared.map((p) => (
            <blockquote key={p.id} className={s.quote}>
              {fmtDate(p.date)}: {p.sharedComment}
            </blockquote>
          ))}
          {privateCount > 0 && (
            <p className={`${s.row} ${s.muted}`}>
              <Lock size={14} aria-hidden="true" /> Prywatne komentarze: {privateCount}. Treść widzi tylko pracownik.
            </p>
          )}
        </div>
      </section>

      {c.work && (
        <section className="section" aria-labelledby="work-h">
          <h2 id="work-h" className="h-section">Zadania i zmiany</h2>
          <div className={`${s.box} ${s.stack}`}>
            <p>
              Otwarte zadania: <strong>{c.work.openTasks}</strong>, po terminie: <strong>{c.work.overdueTasks}</strong>
            </p>
            {c.work.scopeChanges.map((sc) => (
              <p key={sc.date}>Zmiana zakresu obowiązków {fmtDate(sc.date)}: {sc.text}</p>
            ))}
            {c.work.absences.map((a) => (
              <p key={a.from}>Nieobecność {fmtDate(a.from)}–{fmtDate(a.to)} (bez przyczyny)</p>
            ))}
            <p className={s.muted}>{c.work.source}</p>
          </div>
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
