import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { getPartnerTeam, type PartnerTeam, type SignalKind } from '../api/partner'
import { ErrorState, LoadingState } from '../components/QueryState'
import { InlineAlert } from '../components/ui'
import { countLabel, fmtDate, fmtNumber } from '../lib/format'
import { PrivacyNote, SignalBadge, Sparkline, TrendBadge } from './common'
import { SIGNAL_SHORT } from './labels'
import s from './Partner.module.css'

const KINDS: SignalKind[] = ['BURNOUT_RISK', 'OVERLOAD', 'MOTIVATION_DROP', 'APPRECIATION']

/** "Mój zespół — dobrostan": the supervisor's HR partner panel. */
export function TeamWellbeingPage() {
  const navigate = useNavigate()
  const q = useQuery({ queryKey: ['partner-team'], queryFn: ({ signal }) => getPartnerTeam(signal) })
  if (q.isPending) return <div className="page"><LoadingState /></div>
  if (q.isError) return <div className="page"><ErrorState error={q.error} what="dobrostan zespołu" onRetry={() => q.refetch()} /></div>
  const t = q.data
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="h-page">Mój zespół — dobrostan</h1>
          <p className="page-head__meta">Wirtualny HR partner: sygnały przeciążenia, spadku motywacji, ryzyka wypalenia i momenty do docenienia.</p>
        </div>
      </header>

      <InlineAlert tone="info">{t.disclaimer} Sygnały nie są częścią oceny okresowej.</InlineAlert>

      <section className="section" aria-labelledby="sig-h">
        <h2 id="sig-h" className="h-section">Sygnały w zespole</h2>
        <div className={s.counters}>
          {KINDS.map((k) => (
            <div key={k} className={s.box}>
              <p className={s.muted}>{SIGNAL_SHORT[k]}</p>
              <p style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, margin: 0 }}>{t.signalCounts[k] ?? 0}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="agg-h">
        <h2 id="agg-h" className="h-section">Puls zespołu (średnie z okresów 2-tygodniowych)</h2>
        <TeamChart team={t} />
        <QuestionAverages team={t} />
      </section>

      <section className="section" aria-labelledby="mem-h">
        <h2 id="mem-h" className="h-section">Pracownicy</h2>
        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>Pracownik</th>
                <th>Wskaźnik dobrostanu (1–5)</th>
                <th>Trend</th>
                <th>Sygnały</th>
                <th aria-label="Akcje" />
              </tr>
            </thead>
            <tbody>
              {t.members.map((m) => (
                <tr key={m.personId} className="is-link" onClick={() => navigate(`/dobrostan/${m.personId}`)}>
                  <td>
                    <div className="person">
                      <span className="person__name">{m.name}</span>
                      <span className="person__meta">{m.position}</span>
                    </div>
                  </td>
                  <td>
                    {m.series.length > 0 ? (
                      <>
                        <Sparkline points={m.series} label={`Puls: ${m.name}`} />
                        <span className={`${s.muted} ${s.block}`}>{m.lastPulse ? `ostatni ${fmtDate(m.lastPulse)}` : ''}</span>
                      </>
                    ) : (
                      <span className={s.muted}>nie wypełnia pulsu</span>
                    )}
                  </td>
                  <td>
                    <TrendBadge kind={m.trend} />
                  </td>
                  <td>
                    <div className={s.badges}>
                      {m.signals.length === 0 && <span className={s.muted}>brak</span>}
                      {m.signals.map((sg) => (
                        <SignalBadge key={sg.kind} kind={sg.kind} level={sg.level} />
                      ))}
                    </div>
                  </td>
                  <td className="cell-action">
                    <Link to={`/dobrostan/${m.personId}`} className="btn btn--sm" aria-label={`Karta: ${m.name}`} onClick={(e) => e.stopPropagation()}>
                      Karta <ChevronRight size={14} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <PrivacyNote items={t.privacy} />
      </section>
    </div>
  )
}

/** Bars of the team index per period; hidden periods (fewer than minGroupSize respondents) are dashed and labelled. */
function TeamChart({ team }: { team: PartnerTeam }) {
  const periods = team.aggregate
  const w = 560
  const h = 160
  const bw = (w - 30) / periods.length
  const y = (v: number) => 16 + ((5 - v) * (h - 44)) / 4
  return (
    <div className={s.box}>
      <svg className={s.chart} style={{ maxWidth: '40rem' }} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Średni indeks pulsu zespołu w kolejnych okresach">
        {[1, 3, 5].map((v) => (
          <g key={v}>
            <line className={s.chartGrid} x1={24} x2={w} y1={y(v)} y2={y(v)} />
            <text className={s.chartLabel} x={4} y={y(v) + 4}>{v}</text>
          </g>
        ))}
        {periods.map((p, i) => {
          const x = 30 + i * bw
          const value = p.index ?? 5
          return (
            <g key={p.from}>
              <rect className={p.index == null ? s.barHidden : s.bar} x={x} width={bw - 16} y={y(value)} height={y(1) - y(value)} rx={3} />
              <text className={s.chartLabel} x={x} y={h - 14}>{fmtDate(p.to).slice(0, 5)}</text>
              <text className={s.chartLabel} x={x} y={h - 2}>{p.index == null ? 'ukryte' : `${fmtNumber(p.index)} (${p.respondents} os.)`}</text>
            </g>
          )
        })}
      </svg>
      <ul className="visually-hidden">
        {periods.map((p) => (
          <li key={p.from}>
            {fmtDate(p.from)}–{fmtDate(p.to)}: {p.index == null ? p.hiddenReason : `indeks ${fmtNumber(p.index)}, odpowiedzi: ${p.respondents}`}
          </li>
        ))}
      </ul>
      <p className={s.muted}>
        Średnie pokazujemy tylko wtedy, gdy w okresie są odpowiedzi co najmniej {countLabel(team.minGroupSize, 'osoby', 'osób', 'osób')}.
      </p>
    </div>
  )
}

/** Per-question averages: only for the whole team and only in a period with enough respondents (privacy). */
function QuestionAverages({ team }: { team: PartnerTeam }) {
  const latest = [...team.aggregate].reverse().find((p) => p.averages)
  if (!latest?.averages) {
    return (
      <p className={s.muted}>
        Średnie dla poszczególnych pytań pokażemy, gdy w okresie będą odpowiedzi co najmniej{' '}
        {countLabel(team.minGroupSize, 'osoby', 'osób', 'osób')}.
      </p>
    )
  }
  const averages = latest.averages
  return (
    <div className={s.box}>
      <h3>
        Średnie dla pytań – cały zespół, {fmtDate(latest.from)}–{fmtDate(latest.to)} ({countLabel(latest.respondents, 'osoba', 'osoby', 'osób')})
      </h3>
      <table className="table">
        <thead>
          <tr>
            <th>Pytanie</th>
            <th>Średnia (1–5)</th>
          </tr>
        </thead>
        <tbody>
          {team.questions.map((qq) => (
            <tr key={qq.id}>
              <td>{qq.label}</td>
              <td className="num">{fmtNumber(averages[qq.id])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={s.muted}>Odpowiedzi poszczególnych osób na pytania widzi tylko każda z tych osób.</p>
    </div>
  )
}
