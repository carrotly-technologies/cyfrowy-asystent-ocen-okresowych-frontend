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
 * share one CSS grid; at ≤ 640px the header is visually hidden and every cell shows its own label. The last column
 * is either the status tile or an action (a button link such as „Zobacz kartę”).
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

export type ResultCell = {
  /** Column label, shown next to the value on narrow screens. */
  label: string
  value: ReactNode
}

type RowProps = {
  /** First cell: the row title; with `to` it is the link whose hit area covers the whole row. */
  title: ReactNode
  /** Label of the title column (for narrow screens). */
  titleLabel: string
  to?: string
  /** Accessible name of the row link when the title alone is not enough. */
  linkLabel?: string
  cells: ResultCell[]
  /** Last cell: filled tile with an UPPERCASE label (text, never colour alone). */
  status?: { label: string; sub?: string; tone: ResultTone }
  statusLabel?: string
  /** Last cell instead of the status: one control (e.g. „Zobacz kartę”), kept above the row link and clickable. */
  action?: ReactNode
  /** Extra controls under the title (e.g. a shortcut link); they sit above the row link and stay clickable. */
  actions?: ReactNode
}

export function ResultTableRow({ title, titleLabel, to, linkLabel, cells, status, statusLabel, actions, action }: RowProps) {
  return (
    <div role="row" className={cx(s.row, s.bodyRow, to && s.clickable)}>
      <div role="cell" className={cx(s.cell, s.titleCell)}>
        <span className={s.cellLabel} aria-hidden="true">{titleLabel}:</span>
        <span className={s.title}>
          {to ? (
            <Link to={to} className={s.link} aria-label={linkLabel}>
              {title}
            </Link>
          ) : (
            title
          )}
        </span>
        {actions && <span className={s.actions}>{actions}</span>}
      </div>
      {cells.map((c) => (
        <div key={c.label} role="cell" className={s.cell}>
          <span className={s.cellLabel} aria-hidden="true">{c.label}:</span>
          <span className={s.value}>{c.value}</span>
        </div>
      ))}
      {status && (
        <div role="cell" className={cx(s.cell, s.statusCell)}>
          <span className={s.cellLabel} aria-hidden="true">{statusLabel}:</span>
          <span className={cx(s.status, s[status.tone])}>
            <span className={s.statusLabel}>{status.label}</span>
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
