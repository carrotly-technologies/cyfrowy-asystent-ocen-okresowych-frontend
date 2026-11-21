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
            {units.map((u) => <option key={u} value={u}>{u.split(',')[0]}</option>)}
          </select>
          <button type="button" className="btn" onClick={() => void onDownload()}>
            <Download size={15} aria-hidden="true" /> Pobierz CSV
          </button>
        </div>
      </header>
      {downloadError && <p className="notice notice--danger" role="alert">{downloadError}</p>}

      <div className="counters" role="list" aria-label="Najważniejsze wskaźniki">
        {[
          ['Pracownicy', s.employees],
          ['Oceny w toku', s.cases.open],
          ['Oceny negatywne', `${s.results.negativePercent.toLocaleString('pl-PL')}%`],
          ['W toku po terminie', s.timeliness.openOverdue],
          ['Obowiązkowy kolejny stopień', s.promotions.obligatory],
        ].map(([label, value]) => (
          <div key={label} className="counter" role="listitem">
            <span className="counter__n num">{value}</span>
            <span className="counter__l">{label}</span>
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
          { label: 'W toku, w terminie', value: s.timeliness.openOnTrack },
          { label: 'W toku, po terminie', value: s.timeliness.openOverdue, tone: 'warn' },
        ]} />
        <Bars title="Oceny w toku według etapu" bars={s.stages.map((st) => ({ label: st.name, value: st.count }))} />
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
              <tr><th>Komórka</th><th className="num">Pracownicy</th><th className="num">Oceny w toku</th><th className="num">Pozytywne</th><th className="num">Negatywne</th><th className="num">Po terminie</th></tr>
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
