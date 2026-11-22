import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import {
  decideDueDateRequest,
  fileObjection,
  recordAckFiction,
  requestDueDateChange,
  withdrawDueDateRequest,
  type CaseDetail,
  type ObjectionView,
} from '../api/cases'
import { DeadlineText } from '../components/Deadline'
import { Button, ConfirmDialog, Dialog, Field, InlineAlert, TextArea, TextInput } from '../components/ui'
import { useCase } from '../lib/caseQueries'
import { legalErrorText, useLegalMutation } from '../lib/legalQueries'
import { DEMO_TODAY, fmtAvg, fmtDate } from '../lib/format'

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
  const [confirming, setConfirming] = useState(false)
  const m = useLegalMutation(detail.id, (t: string) => fileObjection(detail.id, t))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return setError('Opisz, z czym się nie zgadzasz i dlaczego.')
    setError(undefined)
    setConfirming(true)
  }
  const showForm = can(detail, 'FILE_OBJECTION')
  if (!showForm && detail.objections.length === 0 && !detail.acknowledgedOn) return null
  const termPassed = !!detail.objectionDeadline && (detail.objectionDeadline.daysLeft ?? 0) < 0
  const to = detail.objectionAddressee?.to ?? 'dyrektora generalnego urzędu'
  return (
    <section className="section" aria-labelledby="objection-h">
      <h2 id="objection-h" className="h-section">Sprzeciw od oceny</h2>
      {notice && (
        <InlineAlert tone="info" title="Pouczenie">
          <p>{notice}</p>
        </InlineAlert>
      )}
      {(showForm || detail.objectionRight?.open === false || (detail.objections.length > 0 && !detail.objections.every((o) => o.decision))) && (
        <ObjectionNextSteps detail={detail} />
      )}
      {detail.objections.map((o) => (
        <ObjectionStatus key={o.id} objection={o} who={detail.objectionAddressee?.who} />
      ))}
      {showForm && (
        <form className="panel legal-form" onSubmit={submit} noValidate>
          <p>
            Termin na sprzeciw: <DeadlineText deadline={detail.objectionDeadline} showLegal plain />
          </p>
          <Field label="Treść sprzeciwu" hint={`Wskaż kryteria lub ustalenia, z którymi się nie zgadzasz, i uzasadnij to. Sprzeciw trafi do ${to}.`} error={error}>
            {(c) => <TextArea {...c} rows={5} value={text} onChange={(e) => setText(e.target.value)} />}
          </Field>
          <Button type="submit" loading={m.isPending}>Wnieś sprzeciw</Button>
          {detail.objectionAddressee && <p className="small muted">Sprzeciw trafi do: {to} <span className="legal">{detail.objectionAddressee.legalBasis}</span></p>}
        </form>
      )}
      <ConfirmDialog
        open={confirming}
        title="Wnieść sprzeciw od oceny?"
        confirmLabel="Tak, wnoszę sprzeciw"
        onCancel={() => setConfirming(false)}
        onConfirm={() => m.mutateAsync(text.trim()).then(() => setText(''))}
        errorText={legalErrorText}
      >
        <ul className="bullets">
          <li>Sprzeciw trafi do {to}.{detail.objectionAddressee?.decider === 'EVALUATOR' ? '' : ' Osoba oceniająca zostanie o nim powiadomiona.'}</li>
          <li>Po wysłaniu nie można go wycofać ani zmienić jego treści.</li>
          {detail.objectionNextSteps?.[1] && <li>{detail.objectionNextSteps[1].text}</li>}
          <li>O rozstrzygnięciu dowiesz się w aplikacji.</li>
        </ul>
        <p className="small muted">Treść sprzeciwu: „{text.trim()}”</p>
      </ConfirmDialog>
      {!showForm && detail.objections.length === 0 && detail.acknowledgedOn && detail.objectionDeadline && (
        <p className="muted">
          {termPassed ? (
            <>Termin na wniesienie sprzeciwu minął {fmtDate(detail.objectionDeadline.date)}.</>
          ) : (
            <>Termin na sprzeciw: <DeadlineText deadline={detail.objectionDeadline} /></>
          )}
        </p>
      )}
    </section>
  )
}

/** "Co dalej?": three plain-language steps of the objection path (texts and legal basis from the API). */
function ObjectionNextSteps({ detail }: { detail: CaseDetail }) {
  const steps = detail.objectionNextSteps ?? []
  if (steps.length === 0) return null
  return (
    <div className="panel legal-form">
      <h3 className="h-sub">Co dalej?</h3>
      <ol className="bullets">
        {steps.map((st) => (
          <li key={st.legalBasis}>
            {st.text} <span className="legal">{st.legalBasis}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function ObjectionStatus({ objection: o, who = 'Dyrektor generalny urzędu' }: { objection: ObjectionView; who?: string }) {
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
          {who} rozpatruje sprzeciw do: <DeadlineText deadline={o.decisionDeadline} showLegal plain />
        </p>
      )}
      {d && (
        <p className="small">
          <strong>Uzasadnienie ({d.decidedBy.name}):</strong> {d.reason}
        </p>
      )}
      {d?.deliveredOn && d.deliveredOn !== d.decidedOn && <p className="small">Rozstrzygnięcie doręczono {fmtDate(d.deliveredOn)}.</p>}
      {d?.outcome === 'CHANGE' && <p className="small">Zmienioną ocenę oceniający podpisuje i ponownie przekazuje do zapoznania.</p>}
      {d?.outcome === 'REDO' && <p className="small">Dotychczasowa ocena została anulowana; oceniający sporządza ją ponownie (etap „Rozmowa oceniająca i ocena”). Od nowej oceny przysługuje sprzeciw.</p>}
      {o.courtAppealDeadline && (
        <p className="small">
          Możliwość odwołania do sądu pracy: <DeadlineText deadline={o.courtAppealDeadline} showLegal plain />
        </p>
      )}
    </InlineAlert>
  )
}

/**
 * The upheld objection behind the current assessment (change or re-making), shown on the case above the work area:
 * the evaluator must see what the decider set and why (texts and changed scores from the API).
 */
export function ObjectionDecisionBanner({ detail, names }: { detail: CaseDetail; names: (criterionId: string) => string }) {
  const n = detail.objectionDecisionNotice
  if (!n) return null
  const pending = !detail.sentForAckOn
  return (
    <InlineAlert tone={pending ? 'warning' : 'info'} title={n.title}>
      <p className="small">
        <strong>Uzasadnienie ({n.decidedBy.name}):</strong> {n.reason}
      </p>
      {n.changes.length > 0 && (
        <ul className="bullets small">
          {n.changes.map((c) => (
            <li key={c.criterionId}>
              {names(c.criterionId)}: {c.from ?? '—'} → <strong>{c.to}</strong>
            </li>
          ))}
        </ul>
      )}
      <p className="small">
        {n.text} <span className="legal">{n.legalBasis}</span>
      </p>
    </InlineAlert>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Fikcja zapoznania: evaluator or HR

export function AckFictionForm({ detail, onDone, onCancel }: { detail: CaseDetail; onDone?: () => void; onCancel?: () => void }) {
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
      <div className="legal-form__buttons">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel} disabled={m.isPending}>Anuluj</Button>}
        <Button type="submit" variant={onCancel ? 'primary' : 'secondary'} loading={m.isPending}>Stwierdź fikcję zapoznania</Button>
      </div>
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
  const [withdrawing, setWithdrawing] = useState(false)
  const m = useLegalMutation(detail.id, (b: { reason: string; proposedDate: string | null }) => requestDueDateChange(detail.id, b))
  const w = useLegalMutation(detail.id, () => withdrawDueDateRequest(detail.id))
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
      <h2 id="ddr-h" className="h-section">Wniosek o zmianę terminu oceny</h2>
      {detail.dueDateChanges.map((c, i) => (
        <p key={i} className="small muted">
          {fmtDate(c.changedOn)}: termin zmieniony{c.from ? ` z ${fmtDate(c.from)}` : ''} na {fmtDate(c.to)} ({c.by.name}). {c.reason}
        </p>
      ))}
      {requests.map((r) => <DueDateRequestStatus key={r.id} request={r} />)}
      {can(detail, 'WITHDRAW_DUE_DATE_REQUEST') && (
        <div>
          <Button type="button" variant="secondary" size="small" onClick={() => setWithdrawing(true)}>Wycofaj wniosek</Button>
        </div>
      )}
      <ConfirmDialog
        open={withdrawing}
        title="Wycofać wniosek o zmianę terminu?"
        confirmLabel="Wycofaj wniosek"
        onCancel={() => setWithdrawing(false)}
        onConfirm={() => w.mutateAsync(undefined)}
        errorText={legalErrorText}
      >
        <p>Oceniający nie będzie już rozpatrywać wniosku, a termin oceny zostanie bez zmian. W razie potrzeby możesz później złożyć nowy wniosek.</p>
      </ConfirmDialog>
      {can(detail, 'REQUEST_DUE_DATE_CHANGE') ? (
        <form className="panel legal-form" onSubmit={submit} noValidate>
          <p className="small muted">{rule.reason} <span className="legal">{rule.legalBasis}</span></p>
          <Field label="Uzasadnienie wniosku o zmianę terminu oceny" error={error}>
            {(c) => <TextArea {...c} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
          <Field label="Proponowany termin" optional hint="Format: dd.mm.rrrr">
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
      {(rule.eligible || requests.some((r) => r.status === 'REJECTED')) && (
        <p className="small muted">
          Długa nieobecność (np. choroba, urlop rodzicielski) nie wymaga wniosku: jeśli usprawiedliwiona nieobecność trwa dłużej niż miesiąc, termin oceny przedłuża się o jej czas.
          Nieobecność odnotowują kadry, a nowy termin zobaczysz tutaj. W razie pytań skontaktuj się z kadrami. <span className="legal">art. 81 ust. 7 ustawy o służbie cywilnej</span>
        </p>
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
        : r.status === 'WITHDRAWN'
          ? `Wniosek z ${fmtDate(r.filedOn)} wycofany${r.decidedOn ? ` ${fmtDate(r.decidedOn)}` : ''}`
          : r.status === 'MOOT'
            ? `Wniosek z ${fmtDate(r.filedOn)} bezprzedmiotowy: ocena została już sporządzona`
            : `Wniosek z ${fmtDate(r.filedOn)} nieuwzględniony`
  return (
    <InlineAlert tone={r.status === 'APPROVED' ? 'success' : 'info'} title={title}>
      <p className="small">Uzasadnienie wniosku: {r.reason}{r.proposedDate ? ` · proponowany termin: ${fmtDate(r.proposedDate)}` : ''}</p>
      {r.decisionNote && r.status !== 'MOOT' && <p className="small">Odpowiedź oceniającego: {r.decisionNote}</p>}
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
            {v.result && <> · wynik: {v.result === 'POSITIVE' ? 'pozytywna' : 'negatywna'}{v.average !== null && ` (średnia ${fmtAvg(v.average)})`}</>}
            {v.signedByEvaluatorOn && <> · podpisana {fmtDate(v.signedByEvaluatorOn)}</>}
            <div className="small muted">Uzasadnienie rozstrzygnięcia: {v.reason}</div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function CaseHistoryList({ detail }: { detail: CaseDetail }) {
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
  // Sheet A: the objection goes to the person who made the assessment (art. 83 ust. 2), i.e. this evaluator.
  const decideObjection = can(detail, 'DECIDE_OBJECTION')
  if (!showFiction && !decide && !detail.ackFiction && detail.objections.length === 0) return null
  return (
    <div className="legal-panel">
      {decide && <DueDateDecisionForm detail={detail} />}
      {detail.objections.map((o) => <ObjectionStatus key={o.id} objection={o} who={detail.objectionAddressee?.who} />)}
      {decideObjection && (
        <InlineAlert tone="warning" title="Sprzeciw czeka na Twoje rozstrzygnięcie">
          <p className="small">
            Od oceny na arkuszu A sprzeciw wnosi się do osoby, która dokonała oceny. <span className="legal">{detail.objectionAddressee?.legalBasis}</span>
          </p>
          <Link className="btn btn--sm" to={`/sprzeciwy/${encodeURIComponent(detail.id)}`}>Rozpatrz sprzeciw</Link>
        </InlineAlert>
      )}
      <AckFictionInfo detail={detail} />
      {showFiction && (
        <InlineAlert tone="info" title="Oceniany nie potwierdza zapoznania z oceną?">
          {detail.sentForAckOn === DEMO_TODAY ? (
            <p className="small">{FICTION_TOO_EARLY}</p>
          ) : fiction ? (
            <AckFictionForm detail={detail} onDone={() => setFiction(false)} />
          ) : (
            <Button type="button" variant="secondary" size="small" onClick={() => setFiction(true)}>Stwierdź fikcję zapoznania</Button>
          )}
        </InlineAlert>
      )}
    </div>
  )
}

/** Shown instead of the action on the day the assessment was handed over: the assessed person still has time. */
const FICTION_TOO_EARLY =
  'Ocena została przekazana dziś. Fikcję zapoznania stwierdza się dopiero wtedy, gdy oceniany mimo doręczenia nie potwierdza zapoznania (odmowa, nieobecność): ta możliwość pojawi się od następnego dnia.'

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
  const close = (
    <div className="legal-form__buttons">
      <Button type="button" variant="secondary" onClick={onDone}>Anuluj</Button>
    </div>
  )
  if (q.isPending) return <p className="muted">Wczytywanie…</p>
  if (q.isError) return <><p role="alert" className="form-error">{legalErrorText(q.error)}</p>{close}</>
  if (!q.data.legalActions?.includes('RECORD_ACK_FICTION')) {
    return <><p className="muted">W tej sprawie nie można teraz odnotować fikcji zapoznania (ocena nie została przekazana albo zapoznanie jest już odnotowane).</p>{close}</>
  }
  if (q.data.sentForAckOn === DEMO_TODAY) return <><p className="muted">{FICTION_TOO_EARLY}</p>{close}</>
  return <AckFictionForm detail={q.data} onDone={onDone} onCancel={onDone} />
}
