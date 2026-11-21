import { BellRing } from 'lucide-react'
import { remindEmployee, type CaseDetail } from '../api/cases'
import { legalErrorText, useLegalMutation } from '../lib/legalQueries'
import { DEMO_TODAY } from '../lib/format'
import { useMe } from '../lib/useAuth'

/** „Przypomnij ocenianemu”: an in-app reminder to confirm part I or acknowledge the assessment (one a day). */
export function RemindButton({ detail }: { detail: CaseDetail }) {
  const me = useMe()
  const m = useLegalMutation(detail.id, () => remindEmployee(detail.id))
  if (me.role !== 'SUPERVISOR') return null
  const sentToday = m.isSuccess || detail.history.some((h) => h.date === DEMO_TODAY && h.text.startsWith('Oceniający przypomniał'))
  return (
    <div className="remind">
      <button type="button" className="btn btn--sm" disabled={m.isPending || sentToday} onClick={() => m.mutate(undefined)}>
        <BellRing size={14} strokeWidth={1.75} aria-hidden="true" />
        {sentToday ? 'Przypomnienie wysłane dziś' : 'Przypomnij ocenianemu'}
      </button>
      {m.error ? (
        <p role="alert" className="form-error">
          {legalErrorText(m.error)}
        </p>
      ) : null}
    </div>
  )
}
