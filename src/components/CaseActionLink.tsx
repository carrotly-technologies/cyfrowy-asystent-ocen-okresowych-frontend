import { ClipboardPen, Eye } from 'lucide-react'
import { Link } from 'react-router'
import type { CaseStatus, Role } from '../api/cases'
import { caseUrl } from '../lib/stages'

/**
 * The button to a case (`/teczka/:id`), labelled with what the click does: the supervisor runs an assessment in progress
 * („Prowadź ocenę”, primary), everyone else and every closed assessment only looks at it („Zobacz ocenę”, secondary).
 * DO_ZAPOZNANIA, OKRES_SPRZECIWU and SPRZECIW_W_ROZPATRZENIU count as in progress: the supervisor still has deadlines there.
 */
export function CaseActionLink({
  caseId,
  status,
  role,
  name,
  small = false,
  className,
}: {
  caseId: string
  status: CaseStatus
  role: Role
  /** Person's full name, added to the accessible name (rows of a list). */
  name?: string
  small?: boolean
  className?: string
}) {
  const runs = role === 'SUPERVISOR' && status !== 'ZAKONCZONA'
  const label = runs ? 'Prowadź ocenę' : 'Zobacz ocenę'
  const Icon = runs ? ClipboardPen : Eye
  const classes = ['btn', runs && 'btn--primary', small && 'btn--sm', className].filter(Boolean).join(' ')
  return (
    <Link to={caseUrl(caseId)} className={classes} aria-label={name ? `${label}: ${name}` : undefined}>
      <Icon size={15} aria-hidden="true" /> {label}
    </Link>
  )
}
