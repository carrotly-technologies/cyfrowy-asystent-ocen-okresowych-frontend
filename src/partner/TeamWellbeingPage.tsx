import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { getPartnerTeam, type PartnerTeam, type TeamMember, type SignalKind } from '../api/partner'
import { ErrorState, LoadingState } from '../components/QueryState'
import { ButtonLink, Card, InlineAlert, ResultTable, ResultTableRow, type ResultTableColumn } from '../components/ui'
import { countLabel, fmtDate, fmtNumber } from '../lib/format'
import { PrivacyNote, SignalBadge, Sparkline, TrendBadge } from './common'
import { ASSISTANT_INTRO, ASSISTANT_NAME, ASSISTANT_SCOPE, SIGNAL_SHORT } from './labels'
import s from './Partner.module.css'

const KINDS: SignalKind[] = ['BURNOUT_RISK', 'OVERLOAD', 'MOTIVATION_DROP', 'APPRECIATION']

/**
 * "Dobrostan zespołu" (/dobrostan): the supervisor's view of the virtual HR assistant, in the look of „Oceny zespołu”
 * (sections with a count, `ResultTable`, `Card`). Headings avoid other menu labels ("Oceny zespołu", "Pracownicy").
 */
export function TeamWellbeingPage() {
  const q = useQuery({ queryKey: ['partner-team'], queryFn: ({ signal }) => getPartnerTeam(signal) })
  if (q.isPending) return <div className="page"><LoadingState /></div>
  if (q.isError) return <div className="page"><ErrorState error={q.error} what="dobrostan zespołu" onRetry={() => q.refetch()} /></div>
  const t = q.data
  const flagged = t.members.filter((m) => m.signals.length > 0).length
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="h-page">Dobrostan zespołu</h1>
          <p className="page-head__meta">{ASSISTANT_NAME}: puls i sygnały w Twoim zespole</p>
        </div>
      </header>

      {/* One note instead of two: what the assistant is, what the supervisor sees, and that it is not part of the assessment. */}
      <InlineAlert tone="info" title={ASSISTANT_INTRO}>
        {ASSISTANT_SCOPE}
      </InlineAlert>

      <section className="section" aria-labelledby="sig-h">
        <div className="section__head">
          <h2 id="sig-h" className="h-section">Sygnały w zespole</h2>
          <span className="faint small">{countLabel(flagged, 'osoba z sygnałami', 'osoby z sygnałami', 'osób z sygnałami')}</span>
        </div>
        <ul className={s.counters} aria-label="Liczba sygnałów według rodzaju">
          {KINDS.map((k) => (
            <li key={k}>
              <Card className={s.counter}>
                <span className="block">{SIGNAL_SHORT[k]}</span>
                <strong className={s.count}>{t.signalCounts[k] ?? 0}</strong>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="agg-h">
        <div className="section__head">
          <h2 id="agg-h" className="h-section">Puls zespołu</h2>
        </div>
        <div className={s.stack}>
          <TeamChart team={t} />
          <QuestionAverages team={t} />
        </div>
      </section>

      <section className="section" aria-labelledby="mem-h">
        <div className="section__head">
          <h2 id="mem-h" className="h-section">Puls pracowników</h2>
          <span className="faint small">{countLabel(t.members.length, 'osoba', 'osoby', 'osób')}</span>
        </div>
        <ResultTable label="Puls pracowników" columns={COLUMNS}>
          {t.members.map((m) => (
            <MemberRow key={m.personId} m={m} />
          ))}
        </ResultTable>
      </section>

      <section className="section">
        <PrivacyNote items={t.privacy} />
      </section>
    </div>
  )
}

const COLUMNS: ResultTableColumn[] = [
  { label: 'Pracownik', width: 'minmax(0, 1.4fr)' },
  { label: 'Wskaźnik dobrostanu (1–5)', width: 'minmax(0, 1.2fr)' },
  { label: 'Trend', width: 'minmax(min-content, 1fr)' },
  { label: 'Sygnały', width: 'minmax(0, 1.2fr)' },
  { label: 'Akcje', width: 'max-content', hidden: true },
]

function MemberRow({ m }: { m: TeamMember }) {
  const [title, index, trend, signals] = COLUMNS.map((c) => c.label)
  const to = `/dobrostan/${encodeURIComponent(m.personId)}`
  return (
    <ResultTableRow
      to={to}
      linkLabel={`Karta dobrostanu: ${m.name}`}
      title={
        <>
          {m.name}
          <span className={`${s.muted} block`}>{m.position}</span>
        </>
      }
      titleLabel={title}
      cells={[
        {
          label: index,
          value:
            m.series.length > 0 ? (
              <>
                <Sparkline points={m.series} label={`Puls: ${m.name}`} />
                {m.lastPulse && <span className={s.muted}>ostatni {fmtDate(m.lastPulse)}</span>}
              </>
            ) : (
              <span className={s.muted}>nie wypełnia pulsu</span>
            ),
        },
        { label: trend, value: <TrendBadge kind={m.trend} /> },
        {
          label: signals,
          value: (
            <span className={s.badges}>
              {m.signals.length === 0 && <span className={s.muted}>brak</span>}
              {m.signals.map((sg) => (
                <SignalBadge key={sg.kind} kind={sg.kind} level={sg.level} />
              ))}
            </span>
          ),
        },
      ]}
      action={
        <ButtonLink to={to} variant="secondary" size="small" aria-label={`Zobacz kartę: ${m.name}`}>
          Zobacz kartę <ChevronRight size={16} aria-hidden="true" />
        </ButtonLink>
      }
    />
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
    <Card title="Średni indeks pulsu zespołu (1–5) w okresach 2-tygodniowych">
      <div className={s.stack}>
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
    </Card>
  )
}

/** Per-question averages: only for the whole team and only in a period with enough respondents (privacy). */
function QuestionAverages({ team }: { team: PartnerTeam }) {
  const latest = [...team.aggregate].reverse().find((p) => p.averages)
  if (!latest?.averages) {
    return (
      <Card title="Średnie dla pytań">
        <p className={s.muted}>
          Średnie dla poszczególnych pytań pokażemy, gdy w okresie będą odpowiedzi co najmniej{' '}
          {countLabel(team.minGroupSize, 'osoby', 'osób', 'osób')}.
        </p>
      </Card>
    )
  }
  const averages = latest.averages
  return (
    <Card title="Średnie dla pytań">
      <div className={s.stack}>
      <p className={s.muted}>
        Cały zespół, {fmtDate(latest.from)}–{fmtDate(latest.to)} ({countLabel(latest.respondents, 'osoba', 'osoby', 'osób')})
      </p>
      <div className="table-scroll">
      <table className="table">
        <caption className="visually-hidden">Średnie odpowiedzi zespołu na pytania pulsu</caption>
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
      </div>
      <p className={s.muted}>Odpowiedzi poszczególnych osób na pytania widzi tylko każda z tych osób.</p>
      </div>
    </Card>
  )
}
