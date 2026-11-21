import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cx } from './cx'
import s from './ResultList.module.css'

export type ResultTone = 'ok' | 'accent' | 'warn' | 'danger' | 'neutral'

/** "Job-offer list" (civil-service partner pattern): divider rows, no cards or shadows. */
export function ResultList({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul className={s.list} aria-label={label}>
      {children}
    </ul>
  )
}

type Props = {
  /** Status block on the left: filled tile with an UPPERCASE label (text, never colour alone). */
  status: { label: string; sub?: string; tone: ResultTone }
  title: ReactNode
  /** Accessible name of the row link when the title alone is not enough. */
  linkLabel?: string
  /** Whole row opens this page (the title is the link; its hit area covers the row). */
  to?: string
  /** "LABEL: value" pairs under the title. */
  meta?: { label: string; value: ReactNode }[]
  /** Extra content under the pairs (e.g. stage dots). */
  children?: ReactNode
  /** Right column (deadline, actions); interactive elements stay above the row link. */
  aside?: ReactNode
}

export function ResultRow({ status, title, linkLabel, to, meta, children, aside }: Props) {
  return (
    <li className={cx(s.row, to && s.clickable)}>
      <div className={cx(s.status, s[status.tone])}>
        <span className={s.statusLabel}>{status.label}</span>
        {status.sub && <span className={s.statusSub}>{status.sub}</span>}
      </div>
      <div className={s.body}>
        <h3 className={s.title}>
          {to ? (
            <Link to={to} className={s.link} aria-label={linkLabel}>
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
        {meta && meta.length > 0 && (
          <dl className={s.meta}>
            {meta.map((m) => (
              <div key={m.label} className={s.pair}>
                <dt>{m.label}:</dt>
                <dd>{m.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {children}
      </div>
      {aside && <div className={s.aside}>{aside}</div>}
    </li>
  )
}
