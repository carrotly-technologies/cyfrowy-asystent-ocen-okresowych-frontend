import type { Deadline } from '../api/cases'
import { fmtDate, fmtDaysLeft } from '../lib/format'

const TONE = { OK: 'ok', SOON: 'warn', OVERDUE: 'danger', NONE: 'none' } as const

/** The legal basis without the Civil Code citation of the working-day shift (jargon for the assessed person). */
function plainLegal(legalBasis: string): string {
  return legalBasis.replace(/\s*\(art\. 115 KC\)/g, '')
}

/**
 * "12.12.2026 · za 21 dni" with the relative part coloured by state. `plain`: for the assessed person, the shift to
 * the next working day is said in words only (no "art. 115 KC").
 */
export function DeadlineText({
  deadline: raw,
  showLabel = false,
  showLegal = false,
  plain = false,
}: {
  deadline: Deadline | null
  showLabel?: boolean
  showLegal?: boolean
  plain?: boolean
}) {
  if (!raw) return <span className="faint">—</span>
  const deadline = plain ? { ...raw, legalBasis: plainLegal(raw.legalBasis) } : raw
  const tone = TONE[deadline.state]
  const full = [
    showLabel ? deadline.label : '',
    deadline.date ? `${fmtDate(deadline.date)} · ${fmtDaysLeft(deadline.daysLeft)}` : showLabel ? '' : deadline.label,
    showLegal ? deadline.legalBasis : '',
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <span className="deadline" title={full}>
      {showLabel && <span className="deadline__label">{deadline.label} </span>}
      {deadline.date ? (
        <>
          <span className="deadline__date num">{fmtDate(deadline.date)}</span>
          <span className={`deadline__rel deadline__rel--${tone} num`}>{fmtDaysLeft(deadline.daysLeft)}</span>
        </>
      ) : (
        !showLabel && (
          <span className="faint">
            {/niezwłocznie/i.test(deadline.label) ? 'niezwłocznie' : deadline.label}
          </span>
        )
      )}
      {showLegal && deadline.legalBasis && <span className="legal deadline__legal">{deadline.legalBasis}</span>}
    </span>
  )
}
