import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { getHrOverview, sendReminders, type HrCase, type HrOverview, type ReminderResponse } from '../api/cases'
import { listEmployees } from '../api/employees'
import { AckFictionButton } from '../case/LegalPaths'
import { DeadlineText } from '../components/Deadline'
import { ErrorState, LoadingState } from '../components/QueryState'
import { StageDots } from '../components/StageDots'
import { countLabel, DEMO_TODAY, fmtDate } from '../lib/format'
import { CASE_STATUS_LABEL, STAGE_SHORT } from '../lib/stages'
import { evaluatorLabel } from '../lib/evaluator'
import { MutationError } from '../case/stages/common'
import { InlineAlert } from '../components/ui'
import './hr.css'

type CounterKey = keyof HrOverview['counters'] | 'all'

/** One definition per counter, shown as its description (the same words as in Statystyki). */
const COUNTERS: { key: CounterKey; label: string; hint: string; tone?: string }[] = [
  { key: 'inProgress', label: 'W toku', hint: 'Oceny przed przekazaniem do zapoznania (bez oczekujących na zapoznanie i sprzeciwów).' },
  { key: 'dueSoon', label: 'Termin ≤ 14 dni', hint: 'Najbliższy termin za 0–14 dni; przeterminowane liczy kafelek „Po terminie”.', tone: 'warn' },
  { key: 'overdue', label: 'Po terminie', hint: 'Najbliższy termin już minął.', tone: 'danger' },
  { key: 'awaitingAck', label: 'Oczekuje na zapoznanie', hint: 'Ocena podpisana, oceniany jeszcze się z nią nie zapoznał.' },
  { key: 'objectionPeriod', label: 'W okresie sprzeciwu', hint: 'Biegnie 7 dni na sprzeciw od zapoznania z oceną.' },
]

function matches(c: HrCase, k: CounterKey) {
  switch (k) {
    case 'all': return true
    case 'inProgress': return c.status === 'W_TOKU'
    case 'dueSoon': return c.nextDeadline?.state === 'SOON'
    case 'overdue': return c.nextDeadline?.state === 'OVERDUE'
    case 'awaitingAck': return c.status === 'DO_ZAPOZNANIA'
    case 'objectionPeriod': return c.status === 'OKRES_SPRZECIWU'
  }
}

const deptOf = (unit: string) => unit.split(',')[0]

export function HrPage() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['hr'], queryFn: ({ signal }) => getHrOverview(signal) })
  // The register adds substitutions (who assesses now) and the obligatory next grade.
  const people = useQuery({ queryKey: ['employees'], queryFn: ({ signal }) => listEmployees(signal), retry: false })
  const [counter, setCounter] = useState<CounterKey>('all')
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('')
  const [path, setPath] = useState('')
  const [log, setLog] = useState<ReminderResponse['log']>([])
  const remind = useMutation({
    mutationFn: (ids: string[]) => sendReminders(ids),
    onSuccess: (r) => {
      setLog((l) => [...r.log, ...l])
      qc.invalidateQueries({ queryKey: ['hr'] })
    },
  })

  const cases = q.data?.cases
  const depts = useMemo(() => [...new Set((cases ?? []).map((c) => deptOf(c.person.unit)))].sort(), [cases])

  if (q.isPending) return <div className="page"><LoadingState /></div>
  if (q.isError) return <div className="page"><ErrorState error={q.error} what="monitoring ocen" onRetry={() => q.refetch()} /></div>

  const { counters } = q.data
  const rows = q.data.cases
    .filter((c) => matches(c, counter))
    .filter((c) => !dept || deptOf(c.person.unit) === dept)
    .filter((c) => !path || c.sheetId === path)
    .filter((c) => !search || `${c.person.firstName} ${c.person.lastName} ${evaluatorOf(c)}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.nextDeadline?.date ?? '9999').localeCompare(b.nextDeadline?.date ?? '9999'))
  const soonIds = q.data.cases
    .filter((c) => c.remindable && c.nextDeadline && (c.nextDeadline.state === 'SOON' || c.nextDeadline.state === 'OVERDUE'))
    .map((c) => c.id)
  const byPerson = new Map((people.data ?? []).map((e) => [e.id, e]))
  const evaluatorOf = (c: HrCase) => {
    const e = byPerson.get(c.person.id)
    return e && e.evaluatorId ? evaluatorLabel(c.evaluatorName, e.effectiveEvaluatorName) : c.evaluatorName
  }
  const obligatory = (people.data ?? []).filter((e) => e.obligatoryPromotion.due)

  return (
    <div className="page page--wide">
      <header className="page-head">
        <div>
          <h1 className="h-page">Monitoring ocen</h1>
          <p className="page-head__meta" title={`Wszystkie procesy ocen w urzędzie · stan na ${fmtDate(DEMO_TODAY)}`}>Wszystkie procesy ocen w urzędzie · stan na {fmtDate(DEMO_TODAY)}</p>
        </div>
        <button type="button" className="btn btn--primary" disabled={soonIds.length === 0 || remind.isPending} onClick={() => remind.mutate(soonIds)}>
          <Bell size={15} aria-hidden="true" /> Przypomnij: termin ≤ 14 dni lub po terminie ({soonIds.length})
        </button>
      </header>

      {obligatory.length > 0 && (
        <InlineAlert tone="warning" title="Obowiązkowy kolejny stopień służbowy">
          <ul className="hr-obligatory">
            {obligatory.map((e) => (
              <li key={e.id}>
                <Link to={`/kartoteka/${e.id}`}>{e.firstName} {e.lastName}</Link>
                {e.obligatoryPromotion.deadline && (
                  <> · termin: <strong className="num">{fmtDate(e.obligatoryPromotion.deadline)}</strong></>
                )}
                {e.obligatoryPromotion.nextStep && <span className="block small">{e.obligatoryPromotion.nextStep}</span>}
              </li>
            ))}
          </ul>
          <span className="legal">{obligatory[0].obligatoryPromotion.legalBasis}</span>
        </InlineAlert>
      )}

      <div className="counters" role="group" aria-label="Filtr według stanu">
        {COUNTERS.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`counter ${counter === c.key ? 'is-on' : ''} ${c.tone ? `counter--${c.tone}` : ''}`}
            aria-pressed={counter === c.key}
            title={c.hint}
            onClick={() => setCounter(counter === c.key ? 'all' : c.key)}
          >
            <span className="counter__n num">{counters[c.key as keyof HrOverview['counters']]}</span>
            <span className="counter__l">{c.label}</span>
            <span className="visually-hidden">. {c.hint}</span>
          </button>
        ))}
      </div>

      <div className="filters">
        <input type="search" className="input" style={{ width: 240 }} placeholder="Szukaj pracownika lub oceniającego" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Szukaj" />
        <select className="select" style={{ width: 260 }} value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Komórka">
          <option value="">Wszystkie komórki</option>
          {depts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="select" style={{ width: 180 }} value={path} onChange={(e) => setPath(e.target.value)} aria-label="Arkusz oceny">
          <option value="">Każdy arkusz</option>
          <option value="A">Arkusz A</option>
          <option value="B">Arkusz B</option>
          <option value="C">Arkusz C</option>
        </select>
        <span className="faint small">{countLabel(rows.length, 'proces', 'procesy', 'procesów')}</span>
        {(counter !== 'all' || dept || path || search) && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setCounter('all'); setDept(''); setPath(''); setSearch('') }}>
            Wyczyść filtry
          </button>
        )}
      </div>

      <div className="panel hr-scroll">
        <table className="table hr-table">
          <thead>
            <tr>
              <th>Pracownik</th>
              <th>Komórka</th>
              <th>Etap</th>
              <th>Termin</th>
              <th>Status</th>
              <th className="hr-actions">Działania</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="muted">Brak procesów spełniających filtry.</td></tr>
            )}
            {rows.map((c) => {
              const sentToday = c.lastReminderOn === DEMO_TODAY
              return (
                <tr key={c.id}>
                  <td>
                    <div className="person">
                      <span className="person__name" title={`${c.person.firstName} ${c.person.lastName}`}>{c.person.firstName} {c.person.lastName}</span>
                      <span className="person__meta" title={c.person.position}>{c.person.position}</span>
                    </div>
                  </td>
                  <td className="cell-unit" title={c.person.unit}>
                    {deptOf(c.person.unit)}
                    <span className="cell-sub">oceniający: {evaluatorOf(c)}</span>
                  </td>
                  <td>
                    <div className="stage-cell">
                      <StageDots stages={c.stages} />
                      <span className="stage-cell__name">{STAGE_SHORT[c.currentStage]}</span>
                      <span className="cell-sub">
                        {c.sheetId ? (
                          <Link to={`/teczka/${c.id}/arkusz`} title="Podgląd arkusza i PDF">{`arkusz ${c.sheetId}`}</Link>
                        ) : (
                          'arkusz do ustalenia'
                        )}
                      </span>
                    </div>
                  </td>
                  <td>{c.nextDeadline ? <DeadlineText deadline={c.nextDeadline} /> : <span className="faint">—</span>}</td>
                  <td><span title={CASE_STATUS_LABEL[c.status]} className={`tag ${c.status === 'OKRES_SPRZECIWU' || c.status === 'SPRZECIW_W_ROZPATRZENIU' || c.status === 'DO_ZAPOZNANIA' ? 'tag--accent' : ''}`}>{CASE_STATUS_LABEL[c.status]}</span></td>
                  <td className="hr-actions">
                    {c.remindable ? (
                      <button
                        type="button"
                        className="btn btn--sm"
                        disabled={sentToday || remind.isPending}
                        onClick={() => remind.mutate([c.id])}
                        aria-label={sentToday ? undefined : `Wyślij przypomnienie: ${c.person.firstName} ${c.person.lastName}`}
                        title={sentToday ? undefined : 'Wyślij przypomnienie oceniającemu'}
                      >
                        {sentToday ? 'Wysłano dziś' : 'Przypomnij'}
                      </button>
                    ) : (
                      <span className="faint small">{c.status === 'ZAKONCZONA' ? 'nie dotyczy (zakończona)' : c.status === 'OKRES_SPRZECIWU' ? 'nie dotyczy (okres sprzeciwu)' : 'nie dotyczy (sprzeciw u DG)'}</span>
                    )}
                    {c.lastReminderOn && !sentToday && <span className="cell-sub num">ostatnio {fmtDate(c.lastReminderOn)}</span>}
                    {c.status === 'DO_ZAPOZNANIA' && <AckFictionButton caseId={c.id} name={`${c.person.firstName} ${c.person.lastName}`} />}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <MutationError error={remind.error} />

      {log.length > 0 && (
        <section className="section" aria-labelledby="log-h">
          <div className="section__head">
            <h2 id="log-h" className="h-section">Wysłane przypomnienia</h2>
            <span className="faint small" title="Symulacja — docelowo e-mail lub zadanie w EZD">Symulacja — docelowo e-mail lub zadanie w EZD</span>
          </div>
          <ul className="log panel">
            {log.map((l, i) => (
              <li key={i} title={`${fmtDate(l.date)} ${l.text}`}>
                <Bell className="log__icon" size={16} aria-hidden="true" />
                <span className="num faint">{fmtDate(l.date)}</span>
                <span className="log__text">{l.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
