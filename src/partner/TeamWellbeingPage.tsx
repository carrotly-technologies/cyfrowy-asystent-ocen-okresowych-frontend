import { useQuery } from '@tanstack/react-query'
import { Award, ChevronRight, Flame, Gauge, TrendingDown, type LucideIcon } from 'lucide-react'
import { getPartnerTeam, type PartnerTeam, type SignalKind, type SignalLevel, type TeamMember, type TeamPeriod } from '../api/partner'
import { ErrorState, LoadingState } from '../components/QueryState'
import { ButtonLink, Card, ClampText, InlineAlert, ResultStatus, ResultTable, ResultTableRow, type ResultTableColumn } from '../components/ui'
import { countLabel, fmtDate, fmtNumber } from '../lib/format'
import { PrivacyNote, SignalBadge, Sparkline, TrendBadge } from './common'
import {
  ASSISTANT_INTRO,
  ASSISTANT_NAME,
  ASSISTANT_SCOPE,
  LEVEL_DOT,
  LEVEL_SHORT,
  SIGNAL_DESCRIPTION,
  SIGNAL_SHORT,
  SOURCE_LABEL,
  TREND_LABEL,
} from './labels'
import { PulseChart } from './PulseChart'
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
        <TeamSignals members={t.members} />
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
  { label: 'Trend', width: 'minmax(0, 1.6fr)' },
  { label: 'Sygnały', width: 'minmax(0, 1.2fr)' },
  { label: 'Akcje', width: 'max-content', hidden: true },
]

function MemberRow({ m }: { m: TeamMember }) {
  const [title, trend, signals] = COLUMNS.map((c) => c.label)
  const to = `/dobrostan/${encodeURIComponent(m.personId)}`
  return (
    <ResultTableRow
      to={to}
      linkLabel={`Karta dobrostanu: ${m.name}`}
      title={m.name}
      subtitle={m.position}
      titleLabel={title}
      cells={[
        { label: trend, value: <TrendCell m={m} /> },
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

/** One trend per row: sparkline and trend label, the last index with its date underneath; read once by a screen reader. */
function TrendCell({ m }: { m: TeamMember }) {
  const last = m.series.at(-1)
  if (!last) return <span className={s.muted}>nie wypełnia pulsu</span>
  const date = fmtDate(m.lastPulse ?? last.date)
  return (
    <span className={s.trend}>
      <span className="visually-hidden">
        Puls: {m.name}, {TREND_LABEL[m.trend]}, ostatni wskaźnik {fmtNumber(last.index)}, {date}
      </span>
      <span className={s.trendVisual} aria-hidden="true">
        <Sparkline points={m.series} label={`Puls: ${m.name}`} width={120} height={32} />
        <TrendBadge kind={m.trend} />
      </span>
      <span className={s.trendMeta} aria-hidden="true">
        {fmtNumber(last.index)} · ostatni {date}
      </span>
    </span>
  )
}

const SIGNAL_ICON: Record<SignalKind, LucideIcon> = {
  BURNOUT_RISK: Flame,
  OVERLOAD: Gauge,
  MOTIVATION_DROP: TrendingDown,
  APPRECIATION: Award,
}

const LEVEL_ORDER: Record<SignalLevel, number> = { ALERT: 0, WATCH: 1, POSITIVE: 2 }

const surname = (name: string) => name.trim().split(/\s+/).at(-1) ?? name

const SIGNAL_COLUMNS: ResultTableColumn[] = [
  { label: 'Pracownik', width: 'minmax(0, 1.2fr)' },
  { label: 'Sygnał', width: 'minmax(0, 1fr)' },
  { label: 'Poziom', width: 'minmax(0, 0.9fr)' },
  { label: 'Dlaczego', width: 'minmax(0, 2fr)' },
]

type MemberSignal = { m: TeamMember; sg: TeamMember['signals'][number] }

/**
 * „Sygnały w zespole”: a legend (what each kind means and how many people have it) and one table row per
 * person – signal pair, alerts first, then by surname.
 */
function TeamSignals({ members }: { members: TeamMember[] }) {
  const rows: MemberSignal[] = members
    .flatMap((m) => m.signals.map((sg) => ({ m, sg })))
    .sort(
      (a, b) =>
        LEVEL_ORDER[a.sg.level] - LEVEL_ORDER[b.sg.level] ||
        surname(a.m.name).localeCompare(surname(b.m.name), 'pl') ||
        a.m.name.localeCompare(b.m.name, 'pl'),
    )
  const count = (k: SignalKind) => new Set(rows.filter((r) => r.sg.kind === k).map((r) => r.m.personId)).size
  return (
    <div className={s.stack}>
      <ul className={s.legend} aria-label="Rodzaje sygnałów">
        {KINDS.map((k) => {
          const Icon = SIGNAL_ICON[k]
          return (
            <li key={k}>
              <span className={s.legendHead}>
                <Icon size={16} aria-hidden="true" className={s.legendIcon} />
                {SIGNAL_SHORT[k]}: {count(k)}
              </span>{' '}
              <span className={s.legendDesc}>{SIGNAL_DESCRIPTION[k]}</span>
            </li>
          )
        })}
      </ul>
      {rows.length === 0 ? (
        <p className={s.muted}>Brak sygnałów w zespole.</p>
      ) : (
        <ResultTable label="Sygnały w zespole" columns={SIGNAL_COLUMNS}>
          {rows.map((r) => (
            <SignalRow key={`${r.m.personId}-${r.sg.kind}`} {...r} />
          ))}
        </ResultTable>
      )}
    </div>
  )
}

function SignalRow({ m, sg }: MemberSignal) {
  const [title, kind, level, why] = SIGNAL_COLUMNS.map((c) => c.label)
  const Icon = SIGNAL_ICON[sg.kind]
  const reason = sg.reasons[0]
  return (
    <ResultTableRow
      to={`/dobrostan/${encodeURIComponent(m.personId)}`}
      title={m.name}
      subtitle={m.position}
      titleLabel={title}
      cells={[
        {
          label: kind,
          value: (
            <span className={s.signalKind}>
              <Icon size={16} aria-hidden="true" className={s.legendIcon} />
              {SIGNAL_SHORT[sg.kind]}
            </span>
          ),
        },
        { label: level, value: <ResultStatus label={LEVEL_SHORT[sg.level]} tone={LEVEL_DOT[sg.level]} /> },
        {
          label: why,
          value: reason ? (
            <>
              <span>
                <span className={s.src}>{SOURCE_LABEL[reason.source]}</span>
              </span>
              <ClampText>{reason.text}</ClampText>
            </>
          ) : (
            <span className={s.muted}>brak szczegółów</span>
          ),
        },
      ]}
    />
  )
}

const shortDate = (iso: string) => fmtDate(iso).slice(0, 5)

function periodText(p: TeamPeriod, minGroupSize: number) {
  const range = `${shortDate(p.from)}–${shortDate(p.to)}`
  return p.index == null
    ? `${range}: za mało odpowiedzi (min. ${countLabel(minGroupSize, 'osoba', 'osoby', 'osób')})`
    : `${range}: indeks ${fmtNumber(p.index)}, odpowiedzi: ${p.respondents}`
}

/**
 * Line of the team index (1–5) per period (`PulseChart`, interactive), full width of the card: the end of each
 * period under the X axis, the latest value highlighted, a tooltip on hover and keyboard focus. A hidden period
 * (fewer than minGroupSize respondents) is a gap in the line marked "ukryte". Screen readers also get the list of values.
 */
function TeamChart({ team }: { team: PartnerTeam }) {
  const periods = team.aggregate
  return (
    <Card title="Średni indeks pulsu zespołu (1–5) w okresach 2-tygodniowych">
      <div className={s.stack}>
        <PulseChart
          interactive
          label="Średni indeks pulsu zespołu w kolejnych okresach"
          ticks={[1, 2, 3, 4, 5]}
          height={{ wide: 220, phone: 160 }}
          points={periods.map((p) => ({
            date: p.from,
            index: p.index,
            xLabel: shortDate(p.to),
            tip: periodText(p, team.minGroupSize),
          }))}
        />
        <ul className="visually-hidden">
          {periods.map((p) => (
            <li key={p.from}>
              {fmtDate(p.from)}–{fmtDate(p.to)}: {p.index == null ? p.hiddenReason : `indeks ${fmtNumber(p.index)}, odpowiedzi: ${p.respondents}`}
            </li>
          ))}
        </ul>
        <p className={s.muted}>
          Ostatni okres z wynikiem jest wyróżniony. Średnie pokazujemy tylko wtedy, gdy w okresie są odpowiedzi co najmniej{' '}
          {countLabel(team.minGroupSize, 'osoby', 'osób', 'osób')}; okres z mniejszą liczbą odpowiedzi jest przerwą w linii („ukryte”).
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
