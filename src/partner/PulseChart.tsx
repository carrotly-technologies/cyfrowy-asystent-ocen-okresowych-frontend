import { useState } from 'react'
import { fmtDate, fmtNumber } from '../lib/format'
import { useMedia, useWidth } from './chartHooks'
import s from './Partner.module.css'

const PHONE = '(max-width: 767px)'
/** Minimal distance between two labels under the X axis (px); closer labels are thinned out, the last one always stays. */
const LABEL_GAP = 44

export type PulseChartPoint = {
  date: string
  /** 1–5; `null` = no value for this point (a hidden period): a gap in the line, marked „ukryte”. */
  index: number | null
  /** Label under the X axis (interactive chart); defaults to the date. */
  xLabel?: string
  /** Tooltip and accessible name of the point (interactive chart). */
  tip?: string
}

type Props = {
  points: PulseChartPoint[]
  label: string
  /** Values with a grid line and a label on the Y axis. */
  ticks?: number[]
  /** Height in px from 768 px and on a phone. */
  height?: { wide: number; phone: number }
  /**
   * Team chart on /dobrostan: a label under every point, the last value highlighted with its number, and every point
   * reachable with Tab, with a tooltip on hover and focus.
   */
  interactive?: boolean
}

/**
 * Line chart of a 1–5 wellbeing index, as wide as its container: one person's pulses (/dobrostan/:personId) and the
 * team index per period (/dobrostan, `interactive`). The SVG is drawn in the container's own pixels (ResizeObserver),
 * so dots, lines and labels never stretch. Not colour only: every value is a dot on the line, and the values are in
 * the accessible names (and in a hidden list next to the team chart).
 */
export function PulseChart({ points, label, ticks = [1, 3, 5], height: heights = { wide: 160, phone: 120 }, interactive = false }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>(480)
  const phone = useMedia(PHONE)
  const [active, setActive] = useState<number | null>(null)
  if (points.length === 0) return <p className={s.muted}>Brak odpowiedzi na puls.</p>

  const height = phone ? heights.phone : heights.wide
  const left = interactive ? 40 : 24
  const right = interactive ? 20 : 8
  const top = interactive ? 24 : 8
  const bottom = 24
  const n = points.length
  const step = n > 1 ? (width - left - right) / (n - 1) : 0
  const x = (i: number) => (n === 1 ? (left + width - right) / 2 : left + i * step)
  const y = (v: number) => top + ((5 - v) * (height - top - bottom)) / 4
  const base = y(1)

  // One path, broken where a point has no value (no line across a hidden period).
  let d = ''
  let pen = false
  points.forEach((p, i) => {
    if (p.index == null) {
      pen = false
      return
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.index).toFixed(1)} `
    pen = true
  })
  const hasLine = d.includes('L')

  if (!interactive) {
    const values = points.filter((p): p is PulseChartPoint & { index: number } => p.index != null)
    const desc = values.map((p) => `${fmtDate(p.date)}: ${fmtNumber(p.index)}`).join(', ')
    const first = points[0]
    const last = points[n - 1]
    return (
      <div ref={ref} className={s.pulseChart}>
        <svg className={s.pulseSvg} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label}: ${desc}`}>
          <Grid ticks={ticks} y={y} left={left} right={width - right} />
          {hasLine && <path className={s.chartLine} d={d} />}
          {points.map((p, i) => p.index != null && <circle key={i} className={s.chartDot} cx={x(i)} cy={y(p.index)} r={4} />)}
          {n === 1 ? (
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

  const every = step > 0 ? Math.max(1, Math.ceil(LABEL_GAP / step)) : 1
  const latest = points.findLastIndex((p) => p.index != null)
  const slot = n > 1 ? step : width - left - right
  const tip = active == null ? null : points[active]
  return (
    <div ref={ref} className={s.pulseChart} style={{ height }}>
      <svg className={s.pulseSvg} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={label}>
        <Grid ticks={ticks} y={y} left={left} right={width - right} />
        {hasLine && <path className={s.chartLine} d={d} aria-hidden="true" />}
        {points.map((p, i) => {
          const cx = x(i)
          const isLatest = i === latest
          const labelled = (n - 1 - i) % every === 0
          return (
            <g
              key={p.date}
              className={s.point}
              tabIndex={0}
              role="img"
              aria-label={p.tip ?? `${p.xLabel ?? fmtDate(p.date)}: ${p.index == null ? 'ukryte' : fmtNumber(p.index)}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive((a) => (a === i ? null : a))}
              onFocus={() => setActive(i)}
              onBlur={() => setActive((a) => (a === i ? null : a))}
            >
              {/* invisible hit area: the whole slot reacts to the pointer; outlined on keyboard focus */}
              <rect className={s.pointHit} x={cx - slot / 2} y={top - 16} width={slot} height={base - top + 16} rx={4} />
              {p.index == null ? (
                <>
                  <line className={s.chartGap} x1={cx} x2={cx} y1={top} y2={base} />
                  {labelled && (
                    <text className={s.chartLabel} x={cx} y={base - 6} textAnchor="middle" aria-hidden="true">
                      ukryte
                    </text>
                  )}
                </>
              ) : (
                <circle className={isLatest ? s.chartDotLatest : s.chartDot} cx={cx} cy={y(p.index)} r={isLatest ? 6 : 4} />
              )}
              {isLatest && p.index != null && (
                <text className={s.pointValue} x={cx} y={y(p.index) - 12} textAnchor="middle" aria-hidden="true">
                  {fmtNumber(p.index)}
                </text>
              )}
              {labelled && (
                <text className={`${s.chartLabel} ${isLatest ? s.strong : ''}`} x={cx} y={height - 6} textAnchor="middle" aria-hidden="true">
                  {p.xLabel ?? fmtDate(p.date)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {tip && active != null && (
        <div
          className={s.tooltip}
          aria-hidden="true"
          style={{ left: Math.min(Math.max(x(active), 80), width - 80), top: (tip.index == null ? base - 20 : y(tip.index)) - 16 }}
        >
          {tip.tip ?? `${tip.xLabel ?? fmtDate(tip.date)}: ${tip.index == null ? 'ukryte' : fmtNumber(tip.index)}`}
        </div>
      )}
    </div>
  )
}

function Grid({ ticks, y, left, right }: { ticks: number[]; y: (v: number) => number; left: number; right: number }) {
  return (
    <g aria-hidden="true">
      {ticks.map((v) => (
        <g key={v}>
          <line className={s.chartGrid} x1={left} x2={right} y1={y(v)} y2={y(v)} />
          <text className={s.chartLabel} x={4} y={y(v) + 4}>{v}</text>
        </g>
      ))}
    </g>
  )
}
