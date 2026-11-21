import type { CaseSummary, Deadline } from '../api/cases'
import { fmtDate } from './format'

/** What the assessed person should do now in a case, in plain words (null: nothing). */
export interface EmployeeTodo {
  /** "Wymaga Twojego działania: …" when `required`, otherwise a hint ("Możesz …"). */
  text: string
  required: boolean
}

type Facts = Pick<CaseSummary, 'currentStage' | 'stages' | 'status' | 'nextDeadline'>

/**
 * Derived from the stage and status the API returns: part I waits for the person's confirmation in the stage
 * PART_I_ACK, the signed assessment waits for acknowledgement while the status is DO_ZAPOZNANIA, and while the
 * objection term runs the person may (but does not have to) file a sprzeciw.
 */
export function employeeTodo(c: Facts): EmployeeTodo | null {
  const current = c.stages.find((s) => s.status === 'CURRENT')?.id ?? c.currentStage
  if (c.status === 'DO_ZAPOZNANIA') return { text: 'zapoznaj się z oceną i potwierdź to', required: true }
  if (c.status === 'W_TOKU' && current === 'PART_I_ACK') {
    return { text: 'potwierdź rozmowę rozpoczynającą i kryteria oceny (część I)', required: true }
  }
  if (c.status === 'OKRES_SPRZECIWU') {
    const until = c.nextDeadline?.date ? ` do ${fmtDate(c.nextDeadline.date)}` : ''
    return { text: `jeśli nie zgadzasz się z oceną, możesz wnieść sprzeciw${until}`, required: false }
  }
  return null
}

/** A deadline that has passed in a finished matter: shown neutrally, not as an alarm. */
export function isStalePast(deadline: Deadline | null | undefined): boolean {
  return !!deadline && deadline.daysLeft !== null && deadline.daysLeft < 0
}
