import { useState, type FormEvent } from 'react'
import {
  decideDueDateRequest,
  fileObjection,
  recordAckFiction,
  requestDueDateChange,
  type CaseDetail,
  type ObjectionView,
} from '../api/cases'
import { DeadlineText } from '../components/Deadline'
import { Button, Dialog, Field, InlineAlert, TextArea, TextInput } from '../components/ui'
import { useCase } from '../lib/caseQueries'
import { legalErrorText, useLegalMutation } from '../lib/legalQueries'
import { DEMO_TODAY, fmtDate } from '../lib/format'

/**
 * Post-assessment paths shown on the case: fikcja zapoznania, sprzeciw (art. 83 ustawy o służbie cywilnej) and the
 * assessed person's request to change the assessment date (art. 81 ust. 8 pkt 4). Rules (terms, 6 months, who may
 * act) come from the backend: `legalActions`, `dueDateRequestRule`, deadlines with their legal basis.
 */

const can = (d: CaseDetail, a: NonNullable<CaseDetail['legalActions']>[number]) => d.legalActions?.includes(a) ?? false

const OUTCOME_LABEL = {
  DISMISS: 'Sprzeciw nieuwzględniony (oddalony)',
  CHANGE: 'Sprzeciw uwzględniony: ocena zmieniona',
  REDO: 'Sprzeciw uwzględniony: ocena do ponownego sporządzenia',
} as const

// ---------------------------------------------------------------------------------------------------------------
// Sprzeciw: the assessed person's form and the status of each objection

export function ObjectionSection({ detail, notice }: { detail: CaseDetail; notice?: string }) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string>()
  const m = useLegalMutation(detail.id, (t: string) => fileObjection(detail.id, t))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return setError('Opisz, z czym się nie zgadzasz i dlaczego.')
    setError(undefined)
    m.mutate(text.trim(), { onSuccess: () => setText('') })
  }
  const showForm = can(detail, 'FILE_OBJECTION')
  if (!showForm && detail.objections.length === 0 && !detail.acknowledgedOn) return null
  return (
    <section className="section" aria-labelledby="objection-h">
      <h2 id="objection-h" className="h-section">Sprzeciw od oceny</h2>
      {notice && (
        <InlineAlert tone="info" title="Pouczenie">
          <p>{notice}</p>
        </InlineAlert>
      )}
      {detail.objections.map((o) => (
        <ObjectionStatus key={o.id} objection={o} />
      ))}
      {showForm && (
        <form className="panel legal-form" onSubmit={submit} noValidate>
          <p>
            Termin na sprzeciw: <DeadlineText deadline={detail.objectionDeadline} showLegal />
          </p>
          <Field label="Treść sprzeciwu" hint="Wskaż kryteria lub ustalenia, z którymi się nie zgadzasz, i uzasadnij to. Sprzeciw trafi do dyrektora generalnego urzędu." error={error}>
            {(c) => <TextArea {...c} rows={5} value={text} onChange={(e) => setText(e.target.value)} />}
          </Field>
          <Button type="submit" loading={m.isPending}>Wnieś sprzeciw do dyrektora generalnego</Button>
          {m.error ? <p role="alert" className="form-error">{legalErrorText(m.error)}</p> : null}
        </form>
      )}
      {!showForm && detail.objections.length === 0 && detail.acknowledgedOn && detail.objectionDeadline && (
        <p className="muted">
          Termin na sprzeciw: <DeadlineText deadline={detail.objectionDeadline} />
        </p>
      )}
    </section>
  )
}

export function ObjectionStatus({ objection: o }: { objection: ObjectionView }) {
  const d = o.decision
  return (
    <InlineAlert
      tone={d ? (d.outcome === 'DISMISS' ? 'info' : 'success') : 'warning'}
      title={d ? `${OUTCOME_LABEL[d.outcome]} (${fmtDate(d.decidedOn)})` : `Sprzeciw z ${fmtDate(o.filedOn)} czeka na rozstrzygnięcie`}
    >
      <p className="small">
        <strong>Treść sprzeciwu{o.round > 1 ? ` (od oceny sporządzonej po raz ${o.round === 2 ? 'drugi' : o.round})` : ''}:</strong> {o.text}
      </p>
      {!d && (
        <p className="small">
          Dyrektor generalny rozpatruje sprzeciw do: <DeadlineText deadline={o.decisionDeadline} showLegal />
        </p>
      )}
      {d && (
        <p className="small">
          <strong>Uzasadnienie ({d.decidedBy.name}):</strong> {d.reason}
        </p>
      )}
      {d?.outcome === 'CHANGE' && <p className="small">Zmienioną ocenę oceniający podpisuje i ponownie przekazuje do zapoznania.</p>}
      {d?.outcome === 'REDO' && <p className="small">Dotychczasowa ocena została anulowana; oceniający sporządza ją ponownie (etap „Rozmowa oceniająca i ocena”). Od nowej oceny przysługuje sprzeciw.</p>}
      {o.courtAppealDeadline && (
        <p className="small">
          Możliwość odwołania do sądu pracy: <DeadlineText deadline={o.courtAppealDeadline} showLegal />
        </p>
      )}
    </InlineAlert>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Fikcja zapoznania: evaluator or HR

export function AckFictionForm({ detail, onDone }: { detail: CaseDetail; onDone?: () => void }) {
  const [date, setDate] = useState(DEMO_TODAY)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string>()
  const m = useLegalMutation(detail.id, (b: { date: string; reason: string }) => recordAckFiction(detail.id, b))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return setError('Podaj powód, np. odmowa podpisu, długotrwała nieobecność, ocena doręczona pocztą.')
    setError(undefined)
    m.mutate({ date, reason: reason.trim() }, { onSuccess: () => onDone?.() })
  }
  return (
    <form className="legal-form" onSubmit={submit} noValidate>
      <p className="small muted">
        Użyj, gdy ocena dotarła do ocenianego, ale nie mógł lub nie chciał potwierdzić zapoznania. Zapoznanie zostanie
        odnotowane z tą datą i od niej biegnie 7-dniowy termin na sprzeciw.
      </p>
      <Field label="Data, w której ocena dotarła do ocenianego">
        {(c) => <TextInput {...c} type="date" value={date} min={detail.sentForAckOn ?? undefined} max={DEMO_TODAY} onChange={(e) => setDate(e.target.value)} />}
      </Field>
      <Field label="Powód braku potwierdzenia" error={error}>
        {(c) => <TextArea {...c} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
      </Field>
      <Button type="submit" variant="secondary" loading={m.isPending}>Stwierdź fikcję zapoznania</Button>
      {m.error ? <p role="alert" className="form-error">{legalErrorText(m.error)}</p> : null}
    </form>
  )
}

export function AckFictionInfo({ detail }: { detail: CaseDetail }) {
  const f = detail.ackFiction
  if (!f) return null
  return (
    <InlineAlert tone="info" title={`Fikcja zapoznania z oceną: ${fmtDate(f.date)}`}>
      <p className="small">
        Ocena dotarła do ocenianego, ale nie potwierdził zapoznania. Powód: {f.reason}. Odnotował(a): {f.recordedBy.name} ({f.recordedBy.role}), {fmtDate(f.recordedOn)}.
      </p>
    </InlineAlert>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Zmiana terminu oceny na wniosek ocenianego

export function DueDateRequestSection({ detail }: { detail: CaseDetail }) {
  const [reason, setReason] = useState('')
  const [proposed, setProposed] = useState('')
  const [error, setError] = useState<string>()
  const m = useLegalMutation(detail.id, (b: { reason: string; proposedDate: string | null }) => requestDueDateChange(detail.id, b))
  const rule = detail.dueDateRequestRule
  const requests = detail.dueDateRequests
  if ((!detail.partI.assessmentDue || detail.signedByEvaluatorOn) && requests.length === 0) return null
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return setError('Uzasadnij wniosek, np. przewidywana dłuższa nieobecność albo zmiana zadań.')
    setError(undefined)
    m.mutate({ reason: reason.trim(), proposedDate: proposed || null }, { onSuccess: () => { setReason(''); setProposed('') } })
  }
  return (
    <section className="section" aria-labelledby="ddr-h">
      <h2 id="ddr-h" className="h-section">Termin oceny</h2>
      <p>
        Termin sporządzenia oceny: <strong className="num">{detail.partI.assessmentDue ? fmtDate(detail.partI.assessmentDue) : '—'}</strong>
      </p>
      {detail.dueDateChanges.map((c, i) => (
        <p key={i} className="small muted">
          {fmtDate(c.changedOn)}: termin zmieniony{c.from ? ` z ${fmtDate(c.from)}` : ''} na {fmtDate(c.to)} ({c.by.name}). {c.reason}
        </p>
      ))}
      {requests.map((r) => <DueDateRequestStatus key={r.id} request={r} />)}
      {can(detail, 'REQUEST_DUE_DATE_CHANGE') ? (
        <form className="panel legal-form" onSubmit={submit} noValidate>
          <p className="small muted">{rule.reason} <span className="legal">{rule.legalBasis}</span></p>
          <Field label="Uzasadnienie wniosku o zmianę terminu oceny" error={error}>
            {(c) => <TextArea {...c} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
          <Field label="Proponowany termin" optional>
            {(c) => <TextInput {...c} type="date" min={DEMO_TODAY} value={proposed} onChange={(e) => setProposed(e.target.value)} />}
          </Field>
          <Button type="submit" variant="secondary" loading={m.isPending}>Złóż wniosek do oceniającego</Button>
          {m.error ? <p role="alert" className="form-error">{legalErrorText(m.error)}</p> : null}
        </form>
      ) : (
        !requests.some((r) => r.status === 'PENDING') && (
          <p className="small muted">
            Wniosek o zmianę terminu: {rule.reason} <span className="legal">{rule.legalBasis}</span>
          </p>
        )
      )}
    </section>
  )
}

function DueDateRequestStatus({ request: r }: { request: CaseDetail['dueDateRequests'][number] }) {
  const title =
    r.status === 'PENDING'
      ? `Wniosek o zmianę terminu z ${fmtDate(r.filedOn)} czeka na decyzję oceniającego`
      : r.status === 'APPROVED'
        ? `Wniosek z ${fmtDate(r.filedOn)} uwzględniony: nowy termin ${fmtDate(r.newDate!)}`
        : `Wniosek z ${fmtDate(r.filedOn)} nieuwzględniony`
  return (
    <InlineAlert tone={r.status === 'PENDING' ? 'warning' : r.status === 'APPROVED' ? 'success' : 'info'} title={title}>
      <p className="small">Uzasadnienie wniosku: {r.reason}{r.proposedDate ? ` · proponowany termin: ${fmtDate(r.proposedDate)}` : ''}</p>
      {r.decisionNote && <p className="small">Odpowiedź oceniającego: {r.decisionNote}</p>}
    </InlineAlert>
  )
}

/** The evaluator decides a pending request. */
export function DueDateDecisionForm({ detail }: { detail: CaseDetail }) {
  const pending = detail.dueDateRequests.find((r) => r.status === 'PENDING')
  const [newDate, setNewDate] = useState(pending?.proposedDate ?? '')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  const m = useLegalMutation(detail.id, (b: { approve: boolean; newDate?: string | null; note?: string | null }) => decideDueDateRequest(detail.id, b))
  if (!pending) return null
  const decide = (approve: boolean) => {
    if (approve && !newDate) return setError('Podaj nowy termin oceny.')
    if (!approve && !note.trim()) return setError('Odmawiając, podaj uzasadnienie dla ocenianego.')
    setError(undefined)
    m.mutate({ approve, newDate: approve ? newDate : null, note: note.trim() || null })
  }
  return (
    <InlineAlert tone="warning" title={`Wniosek ocenianego o zmianę terminu oceny (${fmtDate(pending.filedOn)})`}>
      <p className="small">{pending.reason}</p>
      <p className="small">
        Obecny termin: {detail.partI.assessmentDue ? fmtDate(detail.partI.assessmentDue) : '—'}
        {pending.proposedDate ? ` · proponowany: ${fmtDate(pending.proposedDate)}` : ''} <span className="legal">art. 81 ust. 8 pkt 4 ustawy o służbie cywilnej</span>
      </p>
      <div className="legal-form">
        <Field label="Nowy termin oceny (przy uwzględnieniu)">
          {(c) => <TextInput {...c} type="date" min={DEMO_TODAY} value={newDate} onChange={(e) => setNewDate(e.target.value)} />}
        </Field>
        <Field label="Uzasadnienie / informacja dla ocenianego" optional error={error}>
          {(c) => <TextArea {...c} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>
        <div className="legal-form__buttons">
          <Button type="button" loading={m.isPending && m.variables?.approve} onClick={() => decide(true)}>Uwzględnij i zmień termin</Button>
          <Button type="button" variant="secondary" loading={m.isPending && !m.variables?.approve} onClick={() => decide(false)}>Nie uwzględniaj</Button>
        </div>
        {m.error ? <p role="alert" className="form-error">{legalErrorText(m.error)}</p> : null}
      </div>
    </InlineAlert>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// History of the case and of replaced assessments (read only)

export function AssessmentVersions({ detail }: { detail: CaseDetail }) {
  if (detail.assessmentVersions.length === 0) return null
  return (
    <section className="section" aria-labelledby="versions-h">
      <h2 id="versions-h" className="h-section">Wcześniejsze wersje oceny</h2>
      <ul className="bullets">
        {detail.assessmentVersions.map((v) => (
          <li key={v.round}>
            <strong>{v.status === 'CANCELLED' ? 'Anulowana' : 'Zmieniona'}</strong> {fmtDate(v.closedOn)} po sprzeciwie
            {v.result && <> · wynik: {v.result === 'POSITIVE' ? 'pozytywna' : 'negatywna'}{v.average !== null && ` (średnia ${v.average.toFixed(2).replace('.', ',')})`}</>}
            {v.signedByEvaluatorOn && <> · podpisana {fmtDate(v.signedByEvaluatorOn)}</>}
            <div className="small muted">Uzasadnienie rozstrzygnięcia: {v.reason}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function CaseHistory({ detail }: { detail: CaseDetail }) {
  if (detail.history.length === 0) return null
  return (
    <section className="section" aria-labelledby="history-h">
      <h2 id="history-h" className="h-section">Historia sprawy</h2>
      <ul className="legal-history panel">
        {[...detail.history].reverse().map((h, i) => (
          <li key={i}>
            <span className="num faint">{fmtDate(h.date)}</span>
            <span>{h.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * The evaluator's panel on the case file: a pending request to decide, the fiction of acknowledgement, the
 * objection status. Renders nothing when none applies.
 */
export function EvaluatorLegalPanel({ detail }: { detail: CaseDetail }) {
  const [fiction, setFiction] = useState(false)
  const showFiction = can(detail, 'RECORD_ACK_FICTION')
  const decide = can(detail, 'DECIDE_DUE_DATE_REQUEST')
  if (!showFiction && !decide && !detail.ackFiction && detail.objections.length === 0) return null
  return (
    <div className="legal-panel">
      {decide && <DueDateDecisionForm detail={detail} />}
      {detail.objections.map((o) => <ObjectionStatus key={o.id} objection={o} />)}
      <AckFictionInfo detail={detail} />
      {showFiction && (
        <InlineAlert tone="info" title="Oceniany nie potwierdza zapoznania z oceną?">
          {fiction ? (
            <AckFictionForm detail={detail} onDone={() => setFiction(false)} />
          ) : (
            <Button type="button" variant="secondary" size="small" onClick={() => setFiction(true)}>Stwierdź fikcję zapoznania</Button>
          )}
        </InlineAlert>
      )}
    </div>
  )
}

/** HR (kadry): records the fiction of acknowledgement from the monitoring table, in a dialog. */
export function AckFictionButton({ caseId, name }: { caseId: string; name: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="btn btn--sm" onClick={() => setOpen(true)}>Fikcja zapoznania</button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Fikcja zapoznania z oceną: ${name}`}>
        {open && <AckFictionLoader caseId={caseId} onDone={() => setOpen(false)} />}
      </Dialog>
    </>
  )
}

function AckFictionLoader({ caseId, onDone }: { caseId: string; onDone: () => void }) {
  const q = useCase(caseId)
  if (q.isPending) return <p className="muted">Wczytywanie…</p>
  if (q.isError) return <p role="alert" className="form-error">{legalErrorText(q.error)}</p>
  if (!q.data.legalActions?.includes('RECORD_ACK_FICTION')) {
    return <p className="muted">W tej sprawie nie można teraz odnotować fikcji zapoznania (ocena nie została przekazana albo zapoznanie jest już odnotowane).</p>
  }
  return <AckFictionForm detail={q.data} onDone={onDone} />
}
