import { useQuery } from '@tanstack/react-query'
import { Award, ChevronRight, Flame, Gauge, TrendingDown, type LucideIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { getPartnerTeam, type PartnerTeam, type SignalKind, type SignalLevel, type TeamMember, type TeamPeriod } from '../api/partner'
import { ErrorState, LoadingState } from '../components/QueryState'
import { ButtonLink, Card, InlineAlert, ResultTable, ResultTableRow, StatusBadge, type ResultTableColumn } from '../components/ui'
import { countLabel, fmtDate, fmtNumber } from '../lib/format'
import { useMedia, useWidth } from './chartHooks'
import { PrivacyNote, SignalBadge, Sparkline, TrendBadge } from './common'
import {
  ASSISTANT_INTRO,
  ASSISTANT_NAME,
  ASSISTANT_SCOPE,
  LEVEL_SHORT,
  LEVEL_TONE,
  SIGNAL_DESCRIPTION,
  SIGNAL_SHORT,
  SOURCE_LABEL,
  TREND_LABEL,
} from './labels'
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
              <SignalTile kind={k} members={t.members} />
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
      title={
        <>
          {m.name}
          <span className={`${s.muted} block`}>{m.position}</span>
        </>
      }
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
const VISIBLE_PEOPLE = 3

/** A tile per kind of signal: what it means, how many people and who (with the level and the first reason). */
function SignalTile({ kind, members }: { kind: SignalKind; members: TeamMember[] }) {
  const [expanded, setExpanded] = useState(false)
  const listId = useId()
  const people = members
    .flatMap((m) => m.signals.filter((sg) => sg.kind === kind).map((sg) => ({ m, sg })))
    .sort((a, b) => LEVEL_ORDER[a.sg.level] - LEVEL_ORDER[b.sg.level])
  const Icon = SIGNAL_ICON[kind]
  const count = countLabel(people.length, 'osoba', 'osoby', 'osób')
  const shown = expanded ? people : people.slice(0, VISIBLE_PEOPLE)
  const more = people.length - VISIBLE_PEOPLE
  return (
    <Card
      className={`${s.counter} ${people.length === 0 ? s.counterEmpty : ''}`}
      title={
        <span className={s.tileHead}>
          <Icon size={20} aria-hidden="true" className={s.tileIcon} />
          <span>
            {SIGNAL_SHORT[kind]}
            <span className="visually-hidden">: </span>
          </span>
          <span className={s.tileCount}>{people.length === 0 ? 'Brak w zespole' : count}</span>
        </span>
      }
    >
      <p className={s.tileDesc}>{SIGNAL_DESCRIPTION[kind]}</p>
      {people.length > 0 && (
        <>
          <ul id={listId} className={s.people} aria-label={`${SIGNAL_SHORT[kind]}: kogo dotyczy`}>
            {shown.map(({ m, sg }) => {
              const reason = sg.reasons[0]
              return (
                <li key={m.personId}>
                  <span className={s.personHead}>
                    <Link to={`/dobrostan/${encodeURIComponent(m.personId)}`}>{m.name}</Link>
                    <StatusBadge tone={LEVEL_TONE[sg.level]}>{LEVEL_SHORT[sg.level]}</StatusBadge>
                  </span>
                  {reason && (
                    <span className={s.personWhy}>
                      <span className={s.src}>{SOURCE_LABEL[reason.source]}</span>
                      {reason.text}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
          {more > 0 && (
            <button type="button" className={s.moreBtn} aria-expanded={expanded} aria-controls={listId} onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Pokaż mniej' : `+${more} więcej`}
            </button>
          )}
        </>
      )}
    </Card>
  )
}

const PHONE = '(max-width: 767px)'

const shortDate = (iso: string) => fmtDate(iso).slice(0, 5)

function periodText(p: TeamPeriod, minGroupSize: number) {
  const range = `${shortDate(p.from)}–${shortDate(p.to)}`
  return p.index == null
    ? `${range}: za mało odpowiedzi (min. ${countLabel(minGroupSize, 'osoba', 'osoby', 'osób')})`
    : `${range}: indeks ${fmtNumber(p.index)}, odpowiedzi: ${p.respondents}`
}

/** Rounded top corners only (the bar stands on the axis). */
function barPath(x: number, y: number, w: number, h: number, r = 4) {
  const rr = Math.min(r, w / 2, h)
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`
}

/**
 * Bars of the team index (1–5) per period, full width of the card. The last period is highlighted, every bar has
 * its value above it and a tooltip on hover and keyboard focus; a hidden period (fewer than minGroupSize
 * respondents) is a low hatched bar labelled "ukryte". Screen readers also get the list of values.
 */
function TeamChart({ team }: { team: PartnerTeam }) {
  const periods = team.aggregate
  const [box, width] = useWidth<HTMLDivElement>(0)
  const wide = !useMedia(PHONE)
  const [active, setActive] = useState<number | null>(null)
  const patternId = `hatch-${useId().replace(/:/g, '')}`
  const w = Math.max(width, 240)
  const h = wide ? 220 : 160
  const pad = { left: 28, right: 4, top: 22, bottom: 24 }
  const plotH = h - pad.top - pad.bottom
  const slot = (w - pad.left - pad.right) / Math.max(periods.length, 1)
  const bw = Math.min(slot * 0.6, 72)
  const y = (v: number) => pad.top + ((5 - v) * plotH) / 4
  const base = y(1)
  const hiddenH = Math.min(18, plotH / 4)
  const last = periods.length - 1
  const tip = active == null ? null : periods[active]
  return (
    <Card title="Średni indeks pulsu zespołu (1–5) w okresach 2-tygodniowych">
      <div className={s.stack}>
        <div ref={box} className={s.chartBox} style={{ height: h }}>
          {width > 0 && (
            <svg
              className={s.teamChart}
              width={w}
              height={h}
              viewBox={`0 0 ${w} ${h}`}
              role="group"
              aria-label="Średni indeks pulsu zespołu w kolejnych okresach"
            >
              <defs>
                <pattern id={patternId} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect className={s.hatchBg} width={6} height={6} />
                  <line className={s.hatchLine} x1={0} y1={0} x2={0} y2={6} />
                </pattern>
              </defs>
              <g aria-hidden="true">
                {[1, 2, 3, 4, 5].map((v) => (
                  <g key={v}>
                    <line className={s.chartGrid} x1={pad.left} x2={w - pad.right} y1={y(v)} y2={y(v)} />
                    <text className={s.chartLabel} x={pad.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle">
                      {v}
                    </text>
                  </g>
                ))}
              </g>
              {periods.map((p, i) => {
                const cx = pad.left + i * slot + slot / 2
                const x = cx - bw / 2
                const hidden = p.index == null
                const top = hidden ? base - hiddenH : y(p.index!)
                const latest = i === last
                return (
                  <g
                    key={p.from}
                    className={s.barGroup}
                    tabIndex={0}
                    role="img"
                    aria-label={periodText(p, team.minGroupSize)}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive((a) => (a === i ? null : a))}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive((a) => (a === i ? null : a))}
                  >
                    {/* invisible hit area: the whole slot reacts to the pointer */}
                    <rect className={s.barHit} x={pad.left + i * slot} y={pad.top} width={slot} height={plotH} />
                    <path
                      className={`${s.barShape} ${hidden ? s.barHidden : latest ? s.barLatest : s.bar}`}
                      d={barPath(x, top, bw, base - top)}
                      fill={hidden ? `url(#${patternId})` : undefined}
                    />
                    <text className={`${s.barValue} ${latest ? s.strong : ''}`} x={cx} y={top - 6} textAnchor="middle" aria-hidden="true">
                      {hidden ? 'ukryte' : fmtNumber(p.index)}
                    </text>
                    <text className={`${s.chartLabel} ${latest ? s.strong : ''}`} x={cx} y={h - 6} textAnchor="middle" aria-hidden="true">
                      {shortDate(p.to)}
                    </text>
                  </g>
                )
              })}
            </svg>
          )}
          {tip && active != null && (
            <div
              className={s.tooltip}
              aria-hidden="true"
              style={{
                left: Math.min(Math.max(pad.left + active * slot + slot / 2, 80), w - 80),
                top: (tip.index == null ? base - hiddenH : y(tip.index)) - 24,
              }}
            >
              {periodText(tip, team.minGroupSize)}
            </div>
          )}
        </div>
        <ul className="visually-hidden">
          {periods.map((p) => (
            <li key={p.from}>
              {fmtDate(p.from)}–{fmtDate(p.to)}: {p.index == null ? p.hiddenReason : `indeks ${fmtNumber(p.index)}, odpowiedzi: ${p.respondents}`}
            </li>
          ))}
        </ul>
        <p className={s.muted}>
          Ostatni okres jest wyróżniony. Średnie pokazujemy tylko wtedy, gdy w okresie są odpowiedzi co najmniej{' '}
          {countLabel(team.minGroupSize, 'osoby', 'osób', 'osób')}.
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
