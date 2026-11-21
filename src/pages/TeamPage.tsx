import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { getMe, getTeam, type CaseSummary } from '../api/cases'
import { DeadlineText } from '../components/Deadline'
import { ErrorState, LoadingState } from '../components/QueryState'
import { StageDots } from '../components/StageDots'
import { countLabel, fmtDate, fmtDaysLeft } from '../lib/format'
import { caseUrl, CASE_STATUS_LABEL, STAGE_SHORT } from '../lib/stages'

export function TeamPage() {
  const navigate = useNavigate()
  const team = useQuery({ queryKey: ['team'], queryFn: ({ signal }) => getTeam(signal) })
  const me = useQuery({ queryKey: ['me'], queryFn: ({ signal }) => getMe(signal), staleTime: Infinity })

  if (team.isPending) return <div className="page"><LoadingState /></div>
  if (team.isError) return <div className="page"><ErrorState error={team.error} what="lista zespołu" onRetry={() => team.refetch()} /></div>

  const { cases, todo } = team.data
  const urgent = todo.filter((t) => t.deadline.state === 'SOON' || t.deadline.state === 'OVERDUE')
  const overdue = todo.filter((t) => t.deadline.state === 'OVERDUE').length

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="h-page">Mój zespół</h1>
          <p className="page-head__meta">{me.data?.unit ?? 'Wydział'}</p>
        </div>
      </header>

      <p className="lede">
        {urgent.length === 0
          ? 'Żadne działanie nie wymaga uwagi w ciągu najbliższych 14 dni.'
          : `${countLabel(urgent.length, 'działanie wymaga', 'działania wymagają', 'działań wymaga')} uwagi w ciągu 14 dni`}
        {overdue > 0 && <span className="lede__warn">, w tym {countLabel(overdue, 'po terminie', 'po terminie', 'po terminie')}</span>}
        {urgent.length > 0 && '.'}
      </p>

      <section className="section" aria-labelledby="todo-h">
        <div className="section__head">
          <h2 id="todo-h" className="h-section">Do zrobienia</h2>
          <span className="faint small">Posortowane według terminu</span>
        </div>
        {todo.length === 0 ? (
          <p className="panel panel__body muted">Brak zadań z terminem.</p>
        ) : (
          <ol className="todo panel">
            {todo.map((t) => (
              <li key={`${t.caseId}-${t.stageId}`}>
                <Link className="todo__row" to={caseUrl(t.caseId, t.stageId)}>
                  <span className={`todo__when todo__when--${t.deadline.state.toLowerCase()}`}>
                    <span className="todo__date num">{fmtDate(t.deadline.date)}</span>
                    <span className="todo__rel num">{fmtDaysLeft(t.deadline.daysLeft)}</span>
                  </span>
                  <span className="todo__text">
                    <span className="todo__title">{t.text}</span>
                    <span className="todo__basis">
                      {t.deadline.label} {fmtDate(t.deadline.date)} · {t.deadline.legalBasis}
                    </span>
                  </span>
                  <ChevronRight className="todo__chev" size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="section" aria-labelledby="team-h">
        <div className="section__head">
          <h2 id="team-h" className="h-section">Pracownicy</h2>
          <span className="faint small">{countLabel(cases.length, 'osoba', 'osoby', 'osób')}</span>
        </div>
        <div className="panel">
          <table className="table team-table">
            <thead>
              <tr>
                <th>Pracownik</th>
                <th>Rodzaj oceny</th>
                <th>Etap</th>
                <th>Najbliższy termin</th>
                <th>Status</th>
                <th aria-label="Akcje" />
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <TeamRow key={c.id} c={c} onOpen={() => navigate(caseUrl(c.id))} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function TeamRow({ c, onOpen }: { c: CaseSummary; onOpen: () => void }) {
  const current = c.stages.find((s) => s.id === c.currentStage)
  const idx = c.stages.findIndex((s) => s.id === c.currentStage)
  return (
    <tr className="is-link" onClick={onOpen}>
      <td>
        <div className="person">
          <span className="person__name">
            {c.person.firstName} {c.person.lastName}
          </span>
          <span className="person__meta">{c.person.position}</span>
        </div>
      </td>
      <td>
        <div className="person">
          <span>{c.path === 'FIRST' ? 'Pierwsza ocena' : 'Ocena okresowa'}</span>
          <span className="person__meta">{c.path === 'FIRST' ? 'arkusz pierwszej oceny' : c.sheetId ? `arkusz ${c.sheetId}` : 'arkusz do ustalenia'}</span>
        </div>
      </td>
      <td>
        <div className="stage-cell">
          <StageDots stages={c.stages} />
          <span className="stage-cell__name">
            <span className="faint num">{idx + 1}/{c.stages.length}</span> {current ? STAGE_SHORT[current.id] : '—'}
          </span>
        </div>
      </td>
      <td>
        {c.nextDeadline ? (
          <div className="person">
            <DeadlineText deadline={c.nextDeadline} />
            <span className="person__meta">{c.nextDeadline.label.replace(/ do$/, '')}</span>
          </div>
        ) : (
          <span className="faint">—</span>
        )}
      </td>
      <td>
        <span className={`tag ${c.status === 'OKRES_SPRZECIWU' || c.status === 'DO_ZAPOZNANIA' ? 'tag--accent' : ''}`}>{CASE_STATUS_LABEL[c.status]}</span>
      </td>
      <td className="cell-action">
        <Link to={caseUrl(c.id)} className="btn btn--sm" onClick={(e) => e.stopPropagation()}>
          Otwórz teczkę
        </Link>
      </td>
    </tr>
  )
}
