import type { Deadline } from '../api/cases'
import { fmtDate, fmtDaysLeft } from '../lib/format'

const TONE = { OK: 'ok', SOON: 'warn', OVERDUE: 'danger', NONE: 'none' } as const

/** "12.12.2026 · za 21 dni" with the relative part coloured by state. */
export function DeadlineText({ deadline, showLabel = false, showLegal = false }: { deadline: Deadline | null; showLabel?: boolean; showLegal?: boolean }) {
  if (!deadline) return <span className="faint">—</span>
  const tone = TONE[deadline.state]
  return (
    <span className="deadline">
      {showLabel && <span className="deadline__label">{deadline.label} </span>}
      {deadline.date ? (
        <>
          <span className="deadline__date num">{fmtDate(deadline.date)}</span>
          <span className={`deadline__rel deadline__rel--${tone} num`}>{fmtDaysLeft(deadline.daysLeft)}</span>
        </>
      ) : (
        !showLabel && (
          <span className="faint" title={deadline.label}>
            {/niezwłocznie/i.test(deadline.label) ? 'niezwłocznie' : deadline.label}
          </span>
        )
      )}
      {showLegal && deadline.legalBasis && <span className="legal deadline__legal">{deadline.legalBasis}</span>}
    </span>
  )
}
