import { useQuery } from '@tanstack/react-query'
import { CalendarPlus, CalendarClock, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { CaseDetail, TalkInvitation } from '../api/cases'
import { apiDownload, errorMessage } from '../api/client'
import { changeDueDate, getDeadlineRules, invitationIcsPath, inviteToTalk } from '../api/notifications'
import { Button, Dialog, Disclosure, Field, InlineAlert, Select, TextArea, TextInput } from '../components/ui'
import { legalErrorText, useLegalMutation } from '../lib/legalQueries'
import { DEMO_TODAY, fmtDate } from '../lib/format'
import { invitationState } from './invitations'

/**
 * Terms of the case: the evaluator changes the due date (art. 81 ust. 8 ustawy, written notice §8 rozp. 2016) and
 * invites the assessed person to the opening / assessment talk (with an .ics file). Reasons, the 6-month condition
 * and every check come from the API.
 */

const TALK_LABEL: Record<TalkInvitation['kind'], string> = {
  OPENING: 'Rozmowa rozpoczynająca (część I)',
  ASSESSMENT: 'Rozmowa oceniająca',
}

function IcsButton({ caseId, invitation }: { caseId: string; invitation: TalkInvitation }) {
  const [error, setError] = useState<string | null>(null)
  return (
    <>
      <button
        type="button"
        className="btn btn--sm"
        onClick={() =>
          void apiDownload(invitationIcsPath(caseId, invitation.id), `rozmowa-${invitation.date}.ics`).then(
            () => setError(null),
            (err: unknown) => setError(errorMessage(err)),
          )
        }
      >
        <CalendarPlus size={14} strokeWidth={1.75} aria-hidden="true" />
        Dodaj do kalendarza
      </button>
      {error && <span className="form-error" role="alert">{error}</span>}
    </>
  )
}

export function InvitationList({ detail }: { detail: CaseDetail }) {
  const list = detail.talkInvitations ?? []
  if (list.length === 0) return null
  const rows = list.map((i) => ({ i, ...invitationState(detail, i) }))
  const current = rows.filter((r) => !r.stale)
  const stale = rows.filter((r) => r.stale)
  const row = ({ i, note }: (typeof rows)[number]) => (
    <li key={i.id} className={note ? 'muted' : undefined}>
      <strong>{TALK_LABEL[i.kind]}</strong>: {fmtDate(i.date)}, godz. {i.time}, {i.place}
      {i.note ? <span className="small muted"> · {i.note}</span> : null}{' '}
      {note ? <span className="faint">({note})</span> : <IcsButton caseId={detail.id} invitation={i} />}
    </li>
  )
  return (
    <>
      {current.length > 0 ? <ul className="bullets">{current.map(row)}</ul> : <p className="small muted">Brak aktualnych zaproszeń.</p>}
      {stale.length > 0 && (
        <Disclosure compact title={`Wcześniejsze zaproszenia (${stale.length})`}>
          <ul className="bullets">{stale.map(row)}</ul>
        </Disclosure>
      )}
    </>
  )
}

/** Due-date changes with the §8 written notice (a copy goes with the sheet). */
export function DueDateNotices({ detail }: { detail: CaseDetail }) {
  const withNotice = detail.dueDateChanges.filter((c) => c.notice)
  if (withNotice.length === 0) return null
  return (
    <div className="legal-panel">
      {withNotice.map((c, i) => (
        <Disclosure
          key={c.id ?? i}
          compact
          title={
            <span>
              {fmtDate(c.changedOn)}: zawiadomienie o zmianie terminu oceny na <strong className="num">{fmtDate(c.to)}</strong>{' '}
              <span className="legal">{c.legalBasis}</span>
            </span>
          }
        >
          <p className="small" style={{ whiteSpace: 'pre-line' }}>{c.notice!.text}</p>
        </Disclosure>
      ))}
    </div>
  )
}

function DueDateChangeDialog({ detail, onClose }: { detail: CaseDetail; onClose: () => void }) {
  const rules = useQuery({ queryKey: ['deadline-rules'], queryFn: ({ signal }) => getDeadlineRules(signal), staleTime: Infinity })
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  // After the first submit the messages follow every change (a fixed field loses its error at once).
  const [attempted, setAttempted] = useState(false)
  const m = useLegalMutation(detail.id, (b: { date: string; reason: string; note?: string }) => changeDueDate(detail.id, b))
  const reasons = (rules.data?.reasons ?? []).filter((r) => r.selectable)
  const chosen = reasons.find((r) => r.id === reason)
  const check = () => ({
    reason: reason ? undefined : 'Wybierz przyczynę zmiany terminu.',
    date: !date
      ? 'Podaj nowy termin sporządzenia oceny (dd.mm.rrrr).'
      : date <= DEMO_TODAY
        ? 'Nowy termin musi przypadać po dniu dzisiejszym.'
        : undefined,
  })
  const errors: { reason?: string; date?: string } = attempted ? check() : {}
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const next = check()
    setAttempted(true)
    if (next.reason || next.date) return
    m.mutate({ date, reason, note: note.trim() || undefined }, { onSuccess: onClose })
  }
  return (
    <form className="legal-form" onSubmit={submit} noValidate>
      <p className="small muted">
        Obecny termin sporządzenia oceny: <strong className="num">{fmtDate(detail.partI.assessmentDue)}</strong>. Termin można zmienić tylko z
        jednej z przyczyn ustawowych, a oceniany zostanie pisemnie zawiadomiony (kopia pisma trafi do arkusza).
      </p>
      <Field label="Przyczyna zmiany (art. 81 ust. 8 ustawy o służbie cywilnej)" error={errors.reason}>
        {(c) => (
          <Select
            {...c}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={rules.isPending ? 'Wczytywanie…' : 'Wybierz przyczynę'}
            options={reasons.map((r) => ({ value: r.id, label: r.label }))}
          />
        )}
      </Field>
      {chosen && <p className="small legal">{chosen.legalBasis}</p>}
      <Field
        label="Nowy termin sporządzenia oceny"
        hint={
          /ABSENCE/.test(reason)
            ? 'Przy dłuższej nieobecności wyznacz termin po przewidywanym powrocie, np. przesuń go o długość nieobecności. Dzień wolny od pracy zostanie przesunięty na najbliższy dzień roboczy.'
            : 'Dzień wolny od pracy zostanie przesunięty na najbliższy dzień roboczy.'
        }
        error={errors.date}
      >
        {(c) => <TextInput {...c} type="date" min={DEMO_TODAY} value={date} onChange={(e) => setDate(e.target.value)} />}
      </Field>
      <Field label="Uzasadnienie (do zawiadomienia)" optional>
        {(c) => <TextArea {...c} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      {m.error ? <p role="alert" className="form-error">{legalErrorText(m.error)}</p> : null}
      <div className="legal-form__buttons">
        <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
        <Button type="submit" loading={m.isPending}>Zmień termin i zawiadom ocenianego</Button>
      </div>
    </form>
  )
}

function InvitationDialog({ detail, onClose }: { detail: CaseDetail; onClose: () => void }) {
  const [kind, setKind] = useState<TalkInvitation['kind']>(detail.partI.confirmedByEvaluatorOn ? 'ASSESSMENT' : 'OPENING')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [place, setPlace] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  const m = useLegalMutation(detail.id, (b: { kind: TalkInvitation['kind']; date: string; time: string; place: string; note?: string }) =>
    inviteToTalk(detail.id, b),
  )
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!date || !time || !place.trim()) return setError('Podaj datę, godzinę i miejsce rozmowy.')
    setError(undefined)
    m.mutate({ kind, date, time, place: place.trim(), note: note.trim() || undefined }, { onSuccess: onClose })
  }
  return (
    <form className="legal-form" onSubmit={submit} noValidate>
      <Field label="Rodzaj rozmowy">
        {(c) => (
          <Select
            {...c}
            value={kind}
            onChange={(e) => setKind(e.target.value as TalkInvitation['kind'])}
            options={[
              { value: 'OPENING', label: TALK_LABEL.OPENING },
              { value: 'ASSESSMENT', label: TALK_LABEL.ASSESSMENT },
            ]}
          />
        )}
      </Field>
      <Field label="Data" error={error && !date ? error : undefined}>
        {(c) => <TextInput {...c} type="date" min={DEMO_TODAY} value={date} onChange={(e) => setDate(e.target.value)} />}
      </Field>
      <Field label="Godzina">
        {(c) => <TextInput {...c} type="time" value={time} onChange={(e) => setTime(e.target.value)} />}
      </Field>
      <Field label="Miejsce" error={error && !place.trim() ? error : undefined}>
        {(c) => <TextInput {...c} value={place} placeholder="np. pokój 204 lub online" onChange={(e) => setPlace(e.target.value)} />}
      </Field>
      <Field label="Informacja dla ocenianego" optional>
        {(c) => <TextArea {...c} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      {m.error ? <p role="alert" className="form-error">{legalErrorText(m.error)}</p> : null}
      <div className="legal-form__buttons">
        <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
        <Button type="submit" loading={m.isPending}>Wyślij zaproszenie</Button>
      </div>
    </form>
  )
}

/** The evaluator's panel on the case page. */
export function EvaluatorDeadlinesPanel({ detail }: { detail: CaseDetail }) {
  const [dialog, setDialog] = useState<'due' | 'invite' | null>(null)
  const closed = !!detail.signedByEvaluatorOn
  const blocker = detail.dueDateChangeBlocker ?? null
  return (
    <div className="legal-panel">
      <div className="legal-form__buttons">
        {/* after the signature the date can no longer change: the button is not shown at all */}
        {!closed && (
          <button type="button" className="btn btn--sm" disabled={blocker !== null} title={blocker ?? undefined} onClick={() => setDialog('due')}>
            <CalendarClock size={14} strokeWidth={1.75} aria-hidden="true" />
            Zmień termin oceny
          </button>
        )}
        {!closed && (
          <button type="button" className="btn btn--sm" onClick={() => setDialog('invite')}>
            <Send size={14} strokeWidth={1.75} aria-hidden="true" />
            Zaproś na rozmowę
          </button>
        )}
      </div>
      {blocker && !closed && <p className="small muted">Zmiana terminu niedostępna: {blocker}</p>}
      {(detail.talkInvitations?.length ?? 0) > 0 && (
        <InlineAlert tone="info" title="Zaproszenia na rozmowy">
          <InvitationList detail={detail} />
        </InlineAlert>
      )}
      <DueDateNotices detail={detail} />
      <Dialog open={dialog === 'due'} onClose={() => setDialog(null)} title="Zmiana terminu oceny">
        {dialog === 'due' && <DueDateChangeDialog detail={detail} onClose={() => setDialog(null)} />}
      </Dialog>
      <Dialog open={dialog === 'invite'} onClose={() => setDialog(null)} title="Zaproszenie na rozmowę">
        {dialog === 'invite' && <InvitationDialog detail={detail} onClose={() => setDialog(null)} />}
      </Dialog>
    </div>
  )
}

/** The assessed person's view: invitations (.ics) and written notices of term changes. */
export function EmployeeDeadlinesSection({ detail }: { detail: CaseDetail }) {
  if ((detail.talkInvitations?.length ?? 0) === 0 && !detail.dueDateChanges.some((c) => c.notice)) return null
  return (
    <section className="section" aria-labelledby="talks-h">
      <h2 id="talks-h" className="h-section">Zaproszenia i zawiadomienia</h2>
      <InvitationList detail={detail} />
      <DueDateNotices detail={detail} />
    </section>
  )
}
