import { AlertCircle } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { cx } from './cx'
import type { ResultTone } from './ResultList'
import s from './ResultTable.module.css'

export type ResultTableColumn = {
  label: string
  /** CSS grid track of the column, e.g. `minmax(0, 1fr)` or `7.5rem`. */
  width: string
  /** Header read by screen readers only (e.g. "Akcje" over a column of buttons). */
  hidden?: boolean
}

/**
 * Result list with column headers (ARIA table: a screen reader reads the header with each cell). Header and rows
 * share one CSS grid; at ≤ 640px the header is visually hidden and every cell shows its own label. Only the
 * underlined title (link to the person) and the action button at the end of the row are clickable; the status is
 * plain information (dot + name).
 */
export function ResultTable({ label, columns, children }: { label: string; columns: ResultTableColumn[]; children: ReactNode }) {
  const style = { '--result-table-cols': columns.map((c) => c.width).join(' ') } as CSSProperties
  return (
    <div role="table" aria-label={label} className={s.table} style={style}>
      <div role="rowgroup" className={s.head}>
        <div role="row" className={s.row}>
          {columns.map((c) => (
            <div key={c.label} role="columnheader" className={s.th}>
              {c.hidden ? <span className="visually-hidden">{c.label}</span> : c.label}
            </div>
          ))}
        </div>
      </div>
      <div role="rowgroup">{children}</div>
    </div>
  )
}

/**
 * Text cut to at most 3 lines with „…”. The cut is visual only: the full text stays in the DOM (screen readers read it)
 * and in `title` (tooltip on hover).
 */
export function ClampText({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cx(s.clamp, className)} title={children}>
      {children}
    </span>
  )
}

export type ResultCell = {
  /** Column label, shown next to the value on narrow screens. */
  label: string
  /** A string is clamped to 3 lines (`ClampText`); a node is shown as is (use `ClampText` inside it for its text). */
  value: ReactNode
}

type RowProps = {
  /** First cell: the row title (person's name); with `to` it is an underlined link (only the name, not the row). */
  title: string
  /** Second line under the title (e.g. the position), plain text. */
  subtitle?: string
  /** Label of the title column (for narrow screens). */
  titleLabel: string
  to?: string
  /** Accessible name of the title link when the title alone is not enough (must start with or contain the title). */
  linkLabel?: string
  cells: ResultCell[]
  /** Status cell: a coloured dot and the status name in plain text (danger also with an icon, never colour alone). */
  status?: { label: string; sub?: string; tone: ResultTone }
  statusLabel?: string
  /** Last cell: one control (e.g. „Prowadź ocenę”, „Zobacz kartę”), right-aligned on wide screens. */
  action?: ReactNode
}

export function ResultTableRow({ title, subtitle, titleLabel, to, linkLabel, cells, status, statusLabel, action }: RowProps) {
  return (
    <div role="row" className={cx(s.row, s.bodyRow)}>
      <div role="cell" className={cx(s.cell, s.titleCell)}>
        <span className={s.cellLabel} aria-hidden="true">{titleLabel}:</span>
        <span className={s.titleBox}>
          <span className={s.title}>
            {to ? (
              <Link to={to} className={cx(s.link, s.clamp)} aria-label={linkLabel} title={title}>
                {title}
              </Link>
            ) : (
              <ClampText>{title}</ClampText>
            )}
          </span>
          {subtitle && <ClampText className={s.subtitle}>{subtitle}</ClampText>}
        </span>
      </div>
      {cells.map((c) => (
        <div key={c.label} role="cell" className={s.cell}>
          <span className={s.cellLabel} aria-hidden="true">{c.label}:</span>
          <span className={s.value}>{typeof c.value === 'string' ? <ClampText>{c.value}</ClampText> : c.value}</span>
        </div>
      ))}
      {status && (
        <div role="cell" className={cx(s.cell, s.statusCell)}>
          <span className={s.cellLabel} aria-hidden="true">{statusLabel}:</span>
          <span className={s.status}>
            <span className={s.statusMain}>
              <span className={cx(s.dot, s[status.tone])} aria-hidden="true" />
              {status.tone === 'danger' && <AlertCircle size={14} className={s.statusIcon} aria-hidden="true" />}
              <span className={s.statusLabel}>{status.label}</span>
            </span>
            {status.sub && <span className={s.statusSub}>{status.sub}</span>}
          </span>
        </div>
      )}
      {action && (
        <div role="cell" className={cx(s.cell, s.actionCell)}>
          {action}
        </div>
      )}
    </div>
  )
}
