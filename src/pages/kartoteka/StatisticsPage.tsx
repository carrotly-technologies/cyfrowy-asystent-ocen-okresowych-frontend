import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useState } from 'react'
import { downloadStatisticsCsv, getStatistics, listEmployees } from '../../api/employees'
import { ErrorState, LoadingState } from '../../components/QueryState'
import { errorMessage } from '../../api/client'
import { fmtDate } from '../../lib/format'
import './kartoteka.css'

type Bar = { label: string; value: number; tone?: 'ok' | 'danger' | 'warn' }

/** Horizontal bars; the numbers are text, the bars only illustrate them (aria-hidden). */
function Bars({ title, bars }: { title: string; bars: Bar[] }) {
  const max = Math.max(1, ...bars.map((b) => b.value))
  return (
    <section className="panel panel__body stat-card" aria-label={title}>
      <h2 className="h-sub">{title}</h2>
      <ul className="bars">
        {bars.map((b) => (
          <li key={b.label} className="bars__row">
            <span className="bars__label">{b.label}</span>
            <span className="bars__track" aria-hidden="true">
              <span className={`bars__fill ${b.tone ? `bars__fill--${b.tone}` : ''}`} style={{ width: `${(b.value / max) * 100}%` }} />
            </span>
            <span className="bars__value num">{b.value}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function StatisticsPage() {
  const [unit, setUnit] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const q = useQuery({ queryKey: ['statistics', unit], queryFn: ({ signal }) => getStatistics(unit, signal) })
  // Unit names for the filter come from the register (all units of the office).
  const people = useQuery({ queryKey: ['employees'], queryFn: ({ signal }) => listEmployees(signal), retry: false })
  const units = [...new Set([...(people.data ?? []).map((e) => e.unit), ...(q.data?.units ?? []).map((u) => u.unit)])].sort((a, b) => a.localeCompare(b, 'pl'))

  if (q.isPending) return <div className="page"><LoadingState /></div>
  if (q.isError) return <div className="page"><ErrorState error={q.error} what="statystyki" onRetry={() => q.refetch()} /></div>
  const s = q.data

  const onDownload = async () => {
    setDownloadError('')
    try {
      await downloadStatisticsCsv(unit)
    } catch (err) {
      setDownloadError(errorMessage(err))
    }
  }

  return (
    <div className="page page--wide">
      <header className="page-head">
        <div>
          <h1 className="h-page">Statystyki ocen okresowych</h1>
          <p className="page-head__meta">{s.unit ?? 'Cały urząd'} · stan na {fmtDate(s.generatedOn)}</p>
        </div>
        <div className="btn-row filters--register">
          <select className="select" value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Komórka organizacyjna">
            <option value="">Cały urząd</option>
            {units.map((u) => <option key={u} value={u}>{unitLabel(u, units)}</option>)}
          </select>
          <button type="button" className="btn" onClick={() => void onDownload()}>
            <Download size={15} aria-hidden="true" /> Pobierz CSV
          </button>
        </div>
      </header>
      {downloadError && <p className="notice notice--danger" role="alert">{downloadError}</p>}

      <div className="counters" role="list" aria-label="Najważniejsze wskaźniki">
        {[
          ['Pracownicy', s.employees, 'Osoby w kartotece (wybranej komórki).'],
          ['Oceny niezakończone', s.cases.open, 'Wszystkie oceny przed końcem: w toku, oczekujące na zapoznanie, w okresie sprzeciwu i sprzeciwy u dyrektora generalnego. Monitoring „W toku” liczy tylko oceny przed przekazaniem do zapoznania.'],
          ['Oceny negatywne', `${s.results.negativePercent.toLocaleString('pl-PL')}%`, 'Udział ocen negatywnych wśród podpisanych i zaimportowanych.'],
          ['Po terminie', s.timeliness.openOverdue, 'Oceny niezakończone, których najbliższy termin już minął (jak „Po terminie” w Monitoringu).'],
          ['Obowiązkowy kolejny stopień', s.promotions.obligatory, 'Urzędnicy z dwiema kolejnymi ocenami na jednym z dwóch najwyższych poziomów (art. 89 ust. 2).'],
        ].map(([label, value, hint]) => (
          <div key={label} className="counter" role="listitem" title={String(hint)}>
            <span className="counter__n num">{value}</span>
            <span className="counter__l">{label}</span>
            <span className="visually-hidden">. {hint}</span>
          </div>
        ))}
      </div>

      <div className="stat-grid">
        <Bars title="Wyniki ocen" bars={[
          { label: 'Pozytywne', value: s.results.positive, tone: 'ok' },
          { label: 'Negatywne', value: s.results.negative, tone: 'danger' },
        ]} />
        <Bars title="Poziomy ocen" bars={s.levels.map((l) => ({ label: l.label, value: l.count }))} />
        <Bars title="Terminowość" bars={[
          { label: 'Podpisane w terminie', value: s.timeliness.signedOnTime, tone: 'ok' },
          { label: 'Podpisane po terminie', value: s.timeliness.signedLate, tone: 'danger' },
          { label: 'Niezakończone, w terminie', value: s.timeliness.openOnTrack },
          { label: 'Niezakończone, po terminie', value: s.timeliness.openOverdue, tone: 'warn' },
        ]} />
        <Bars title="Oceny niezakończone według etapu" bars={s.stages.map((st) => ({ label: st.name, value: st.count }))} />
        <Bars title="Kolejny stopień służbowy" bars={[
          { label: 'Wnioski oceniających', value: s.promotions.requested },
          { label: 'Obowiązkowy (art. 89 ust. 2)', value: s.promotions.obligatory, tone: 'warn' },
        ]} />
      </div>

      <section className="section" aria-labelledby="units-h">
        <div className="section__head"><h2 id="units-h" className="h-section">Według komórek</h2></div>
        <div className="panel table-scroll">
          <table className="table">
            <thead>
              <tr><th>Komórka</th><th className="num">Pracownicy</th><th className="num" title="Oceny niezakończone">Niezakończone</th><th className="num">Pozytywne</th><th className="num">Negatywne</th><th className="num">Po terminie</th></tr>
            </thead>
            <tbody>
              {s.units.map((u) => (
                <tr key={u.unit}>
                  <td title={u.unit}>{u.unit}</td>
                  <td className="num">{u.employees}</td>
                  <td className="num">{u.openCases}</td>
                  <td className="num">{u.positive}</td>
                  <td className="num">{u.negative}</td>
                  <td className="num">{u.overdue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small faint">{s.sources}</p>
      </section>
    </div>
  )
}

/** Short unit name for the filter; the full name when two units share the same short one. */
function unitLabel(unit: string, all: string[]): string {
  const short = unit.split(',')[0].trim()
  return all.filter((u) => u.split(',')[0].trim() === short).length > 1 ? unit : short
}
