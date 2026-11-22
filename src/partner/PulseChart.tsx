import { fmtDate, fmtNumber } from '../lib/format'
import { useMedia, useWidth } from './chartHooks'
import s from './Partner.module.css'

const PHONE = '(max-width: 767px)'

/**
 * Line chart of one person's 1–5 wellbeing index over the pulses, as wide as its container (/dobrostan/:personId).
 * The SVG is drawn in the container's own pixels (ResizeObserver), so dots, lines and labels never stretch.
 * Y axis 1 / 3 / 5 with grid lines like the team chart on /dobrostan, the first and last pulse date under the X axis.
 * Not colour only: every pulse is a dot on the line, and the values are in the label and in a hidden list.
 */
export function PulseChart({ points, label }: { points: { date: string; index: number }[]; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>(480)
  const phone = useMedia(PHONE)
  if (points.length === 0) return <p className={s.muted}>Brak odpowiedzi na puls.</p>

  const height = phone ? 120 : 160
  const left = 24
  const right = 8
  const top = 8
  const bottom = 24
  const x = (i: number) => (points.length === 1 ? (left + width - right) / 2 : left + (i * (width - left - right)) / (points.length - 1))
  const y = (v: number) => top + ((5 - v) * (height - top - bottom)) / 4
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.index).toFixed(1)}`).join(' ')
  const desc = points.map((p) => `${fmtDate(p.date)}: ${fmtNumber(p.index)}`).join(', ')
  const first = points[0]
  const last = points[points.length - 1]

  return (
    <div ref={ref} className={s.pulseChart}>
      <svg
        className={s.pulseSvg}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label}: ${desc}`}
      >
        {[1, 3, 5].map((v) => (
          <g key={v}>
            <line className={s.chartGrid} x1={left} x2={width - right} y1={y(v)} y2={y(v)} />
            <text className={s.chartLabel} x={4} y={y(v) + 4}>{v}</text>
          </g>
        ))}
        {points.length > 1 && <path className={s.chartLine} d={d} />}
        {points.map((p, i) => (
          <circle key={i} className={s.chartDot} cx={x(i)} cy={y(p.index)} r={4} />
        ))}
        {points.length === 1 ? (
          <text className={s.chartLabel} x={x(0)} y={height - 4} textAnchor="middle">{fmtDate(first.date)}</text>
        ) : (
          <>
            <text className={s.chartLabel} x={left} y={height - 4}>{fmtDate(first.date)}</text>
            <text className={s.chartLabel} x={width - right} y={height - 4} textAnchor="end">{fmtDate(last.date)}</text>
          </>
        )}
      </svg>
    </div>
  )
}
