import type { ReasonSource, Signal, SignalKind, SignalLevel, TrendKind } from '../api/partner'
import { LEVEL_LABEL, LEVEL_TONE, SIGNAL_SHORT, TREND_LABEL, TREND_TONE } from './labels'
import { Card, StatusBadge } from '../components/ui'
import { fmtDate, fmtNumber } from '../lib/format'
import s from './Partner.module.css'

const SOURCE_LABEL: Record<ReasonSource, string> = {
  PULSE: 'Puls',
  JOURNAL: 'Obserwacje',
  TASKS: 'Zadania',
  SCOPE: 'Zakres obowiązków',
  ABSENCE: 'Nieobecności',
}

export function SignalBadge({ kind, level }: { kind: SignalKind; level: SignalLevel }) {
  return <StatusBadge tone={LEVEL_TONE[level]}>{SIGNAL_SHORT[kind]}</StatusBadge>
}

export function TrendBadge({ kind }: { kind: TrendKind }) {
  return <StatusBadge tone={TREND_TONE[kind]}>{TREND_LABEL[kind]}</StatusBadge>
}

/** A flag with the data that triggered it ("dlaczego") and the suggested actions: the shared `Card` with a coloured left edge. */
export function SignalCard({ signal }: { signal: Signal }) {
  const levelClass = signal.level === 'ALERT' ? s.alert : signal.level === 'WATCH' ? s.watch : s.positive
  return (
    <Card className={`${s.signal} ${levelClass}`}>
      <div className={s.row}>
        <h3 className={s.signalTitle}>{signal.title}</h3>
        <SignalBadge kind={signal.kind} level={signal.level} />
        <span className={s.muted}>({LEVEL_LABEL[signal.level]})</span>
      </div>
      <p className={s.muted} style={{ marginTop: 'var(--s-2)' }}>Dlaczego:</p>
      <ul className={s.reasons}>
        {signal.reasons.map((r, i) => (
          <li key={i}>
            <span className={s.src}>{SOURCE_LABEL[r.source]}</span>
            {r.text}
          </li>
        ))}
      </ul>
      <p className={s.muted} style={{ marginTop: 'var(--s-3)' }}>Co możesz zrobić:</p>
      <ul className={s.actions}>
        {signal.actions.map((a) => (
          <li key={a.id}>
            <strong>{a.label}.</strong> {a.how}
          </li>
        ))}
      </ul>
    </Card>
  )
}

/** Small line chart of a 1–5 index; accessible as a list of values. */
export function Sparkline({
  points,
  width = 160,
  height = 40,
  label,
}: {
  points: { date: string; index: number }[]
  width?: number
  height?: number
  label: string
}) {
  if (points.length === 0) return <span className={s.muted}>brak odpowiedzi</span>
  const pad = 4
  const x = (i: number) => (points.length === 1 ? width / 2 : pad + (i * (width - 2 * pad)) / (points.length - 1))
  const y = (v: number) => pad + ((5 - v) * (height - 2 * pad)) / 4
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.index).toFixed(1)}`).join(' ')
  const desc = points.map((p) => `${fmtDate(p.date)}: ${fmtNumber(p.index)}`).join(', ')
  return (
    <svg className={s.chart} viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: width }} role="img" aria-label={`${label}: ${desc}`}>
      <line className={s.chartGrid} x1={0} x2={width} y1={y(3)} y2={y(3)} />
      <path className={s.chartLine} d={d} />
      {points.map((p, i) => (
        <circle key={i} className={s.chartDot} cx={x(i)} cy={y(p.index)} r={2.5} />
      ))}
    </svg>
  )
}

export function PrivacyNote({ items, title = 'Jak chronimy prywatność' }: { items: string[]; title?: string }) {
  return (
    <details className={s.box}>
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{title}</summary>
      <ul className={s.privacy} style={{ marginTop: 'var(--s-2)' }}>
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </details>
  )
}
