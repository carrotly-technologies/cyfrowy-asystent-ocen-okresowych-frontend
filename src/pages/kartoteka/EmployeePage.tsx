import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardPen, PlayCircle, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  addAbsence,
  deleteAbsence,
  deleteEmployee,
  getAbsenceTypes,
  getAbsences,
  getEmployee,
  getHistory,
  getUnits,
  listEmployees,
  startCycle,
  updateEmployee,
  type EmployeeFields,
  type EmployeeView,
} from '../../api/employees'
import { DeadlineText } from '../../components/Deadline'
import { ErrorState, LoadingState } from '../../components/QueryState'
import { BackLink, Button, ConfirmDialog, DateInput, Dialog, InlineAlert } from '../../components/ui'
import { errorMessage } from '../../api/client'
import { MutationError } from '../../case/stages/common'
import { days, DEMO_TODAY, fmtDate, fmtDaysLeft } from '../../lib/format'
import { evaluatorLabel } from '../../lib/evaluator'
import { CASE_STATUS_LABEL, caseUrl } from '../../lib/stages'
import { useMe } from '../../lib/useAuth'
import { EmployeeAccount } from './EmployeeAccount'
import { EmployeeForm } from './EmployeeForm'
import './kartoteka.css'

const resultLabel = (r: 'POSITIVE' | 'NEGATIVE' | null) => (r === 'POSITIVE' ? 'pozytywna' : r === 'NEGATIVE' ? 'negatywna' : '—')

function fieldsOf(e: EmployeeView): EmployeeFields {
  return {
    firstName: e.firstName,
    lastName: e.lastName,
    unit: e.unit,
    position: e.position,
    employment: e.employment,
    officeHead: e.officeHead,
    managesPeople: e.managesPeople,
    appointedYear: e.appointedYear,
    grade: e.grade,
    gradeGrantedOn: e.gradeGrantedOn,
    indefiniteSince: e.indefiniteSince,
    evaluatorId: e.evaluatorId,
  }
}

/**
 * One employee: the HR register card (`/kartoteka/:id`, variant `register`) or the supervisor's person page in
 * „Oceny zespołu” (`/zespol/:id`, variant `team`). The team variant has no „Bieżąca ocena” card: register data first
 * (with the current deadline and the predicted next periodic assessment), then the history with „Przeprowadź ocenę”
 * (opens the running case, or starts a new cycle, or is disabled with the reason), then absences.
 */
export function EmployeePage({ variant = 'register' }: { variant?: 'register' | 'team' }) {
  const { id = '' } = useParams()
  const me = useMe()
  // ADMIN is a technical role: read only here, case data errors go through „Tryb korekty”.
  const canEdit = me.role === 'HR'
  // Archiving: HR after the retention period; ADMIN also earlier, with a reason (art. 94 pkt 9b KP).
  const canArchive = canEdit || me.role === 'ADMIN'
  const [archiveReason, setArchiveReason] = useState('')
  const qc = useQueryClient()
  const navigate = useNavigate()
  const q = useQuery({ queryKey: ['employee', id], queryFn: ({ signal }) => getEmployee(id, signal) })
  const people = useQuery({ queryKey: ['employees'], queryFn: ({ signal }) => listEmployees(signal), enabled: canEdit })
  const knownUnits = useQuery({ queryKey: ['employee-units'], queryFn: ({ signal }) => getUnits(signal), enabled: canEdit })
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmLateCycle, setConfirmLateCycle] = useState(false)
  // Same query as the absences section (cached): is there an absence > 1 month?
  const absences = useQuery({ queryKey: ['absences', id], queryFn: ({ signal }) => getAbsences(id, signal) })
  const longAbsence = absences.data?.continuous.some((p) => p.longerThanMonth) ?? false

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['employee', id] })
    qc.invalidateQueries({ queryKey: ['employees'] })
    qc.invalidateQueries({ queryKey: ['history', id] })
    qc.invalidateQueries({ queryKey: ['hr'] })
  }
  const save = useMutation({
    mutationFn: (f: EmployeeFields) => updateEmployee(id, f),
    onSuccess: () => {
      setEditing(false)
      refresh()
    },
  })
  const cycle = useMutation({
    mutationFn: () => startCycle(id),
    onSuccess: (res) => {
      refresh()
      // The supervisor goes straight to the new case; HR stays on the register card.
      if (variant === 'team') navigate(caseUrl(res.caseId))
    },
  })
  const remove = useMutation({
    mutationFn: () => deleteEmployee(id, archiveReason.trim() || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      navigate('/kartoteka')
    },
  })

  if (q.isPending) return <div className="page"><LoadingState /></div>
  if (q.isError) return <div className="page"><ErrorState error={q.error} what="dane pracownika" onRetry={() => q.refetch()} /></div>
  const e = q.data
  const open = e.currentCase && e.currentCase.status !== 'ZAKONCZONA' && e.currentCase.status !== 'OKRES_SPRZECIWU'
  const units = [...new Set([...(knownUnits.data ?? []), ...(people.data ?? []).map((p) => p.unit)])].sort((a, b) => a.localeCompare(b, 'pl'))
  const preview = e.nextCycle
  const lateOpening = preview?.openingTalk?.state === 'OVERDUE' ? preview.openingTalk : null
  const onStartCycle = () => (lateOpening ? setConfirmLateCycle(true) : cycle.mutate())
  const due = e.currentCase?.assessmentDue ?? null
  const beforeOpeningTalk = !!e.currentCase && ['SHEET_SELECTION', 'OPENING_TALK', 'PART_I_ACK'].includes(e.currentCase.stage)
  const team = variant === 'team'
  // An assessment in progress for „Przeprowadź ocenę” and „Bieżący termin” (everything but a closed case).
  const running = e.currentCase && e.currentCase.status !== 'ZAKONCZONA' ? e.currentCase : null
  const archive = e.archive
  const retentionRunning = !!archive?.retentionUntil && archive.retentionUntil > DEMO_TODAY
  // HR cannot archive before the retention ends; an ADMIN can, with a reason. Nobody while an assessment runs.
  const archiveBlocked = !!archive?.inProgress || (retentionRunning && me.role !== 'ADMIN')
  const archiveNeedsReason = me.role === 'ADMIN' && (retentionRunning || !archive)

  const nextEvaluation = (
    <>
      <dt>Następna ocena okresowa (przewidywana)</dt>
      <dd className="num">{fmtDate(e.nextEvaluationDueOn)}</dd>
    </>
  )
  const dataSection = (
    <section className="panel panel__body" aria-labelledby="data-h">
      <h2 id="data-h" className="h-section">Dane w kartotece</h2>
      {editing ? (
        <>
          <EmployeeForm initial={fieldsOf(e)} units={units.length ? units : [e.unit]} submitLabel="Zapisz zmiany" pending={save.isPending} onSubmit={(f) => save.mutate(f)} onCancel={() => setEditing(false)} />
          <p className="small faint">Zmiana oceniającego przenosi ocenę w toku do nowego oceniającego (wpis w historii teczki).</p>
          <MutationError error={save.error} />
        </>
      ) : (
        <dl className={team ? 'dl emp-cycle-dl' : 'dl'}>
          <dt>Status</dt><dd>{e.employment === 'URZEDNIK' ? 'urzędnik służby cywilnej' : 'pracownik służby cywilnej'}</dd>
          {e.employment === 'URZEDNIK' && (
            <>
              <dt>Mianowanie / stopień</dt>
              <dd>{e.appointedYear ?? '—'} · {e.grade ? `${e.grade} stopień` : 'brak danych'}{e.gradeGrantedOn && ` (od ${fmtDate(e.gradeGrantedOn)})`}</dd>
            </>
          )}
          <dt>Zatrudnienie na czas nieokreślony od</dt><dd>{e.indefiniteSince ? fmtDate(e.indefiniteSince) : '—'}</dd>
          <dt>Oceniający</dt>
          <dd>
            {e.evaluatorName ? evaluatorLabel(e.evaluatorName, e.effectiveEvaluatorName) : 'nie przypisano'}
            {e.substitution && <span className="small faint block">zastępstwo do {fmtDate(e.substitution.to)}</span>}
          </dd>
          <dt>Arkusz</dt>
          <dd className="emp-dl-text">
            {e.sheetId} {!e.currentCase?.sheetId && <span className="faint">— sugestia: {e.sheetSuggestion.reason} ({e.sheetSuggestion.legalBasis}); decyduje oceniający</span>}
          </dd>
          {team && (
            <>
              <dt>Bieżący termin</dt>
              <dd className="emp-dl-text">
                {running && running.nextDeadline ? (
                  <>
                    <span className="block small">
                      {due && due.date !== running.nextDeadline.date ? 'Najbliższy termin' : 'Termin'}: {running.nextDeadline.label}
                    </span>
                    <DeadlineText deadline={running.nextDeadline} />
                  </>
                ) : (
                  '—'
                )}
              </dd>
              {nextEvaluation}
            </>
          )}
        </dl>
      )}
    </section>
  )
  const cycleSection = (
    <section className="panel panel__body" aria-labelledby="cycle-h">
      <h2 id="cycle-h" className="h-section">Bieżąca ocena</h2>
      {e.currentCase ? (
        <dl className="dl emp-cycle-dl">
          <dt>Etap</dt><dd>{e.currentCase.stageName}</dd>
          <dt>Status</dt><dd>{CASE_STATUS_LABEL[e.currentCase.status]}</dd>
          {e.currentCase.nextDeadline && (
            <>
              <dt>{due && due.date !== e.currentCase.nextDeadline.date ? 'Najbliższy termin' : 'Termin'}</dt>
              <dd className="emp-dl-text">
                <span className="block small">{e.currentCase.nextDeadline.label}</span>
                <DeadlineText deadline={e.currentCase.nextDeadline} />
                <span className="small faint block">{e.currentCase.nextDeadline.legalBasis}</span>
                {longAbsence && beforeOpeningTalk && (
                  <span className="small block emp-due-note">
                    Termin rozmowy rozpoczynającej nie jest przedłużany o nieobecność; przedłuża się tylko termin sporządzenia oceny
                    (art. 81 ust. 7 ustawy o służbie cywilnej).
                  </span>
                )}
              </dd>
            </>
          )}
          {due && due.date !== e.currentCase.nextDeadline?.date && (
            <>
              <dt>Termin oceny</dt>
              <dd className="emp-dl-text">
                <DeadlineText deadline={due} />
                {due.extended && due.baseDate && (
                  <span className="small block">pierwotnie {fmtDate(due.baseDate)}, przedłużony o nieobecność dłuższą niż miesiąc</span>
                )}
              </dd>
            </>
          )}
          {due?.extended && due.date === e.currentCase.nextDeadline?.date && due.baseDate && (
            <>
              <dt>Przedłużenie</dt>
              <dd className="emp-dl-text small">pierwotnie {fmtDate(due.baseDate)}, przedłużony o nieobecność dłuższą niż miesiąc (art. 81 ust. 7)</dd>
            </>
          )}
          {nextEvaluation}
          {e.currentCase.sheetId && (<><dt>Arkusz</dt><dd><Link to={`/teczka/${e.currentCase.id}/arkusz`}>Podgląd arkusza {e.currentCase.sheetId}</Link></dd></>)}
        </dl>
      ) : (
        <>
          <p className="muted">Brak teczki oceny w systemie.</p>
          <dl className="dl emp-cycle-dl">{nextEvaluation}</dl>
        </>
      )}
      {canEdit && !open && (
        <>
          <button type="button" className="btn btn--primary" disabled={cycle.isPending || preview?.ok === false} onClick={onStartCycle}>
            <PlayCircle size={15} aria-hidden="true" /> Rozpocznij nowy cykl oceny
          </button>
          {preview?.ok === false ? (
            <p className="small" role="note">{preview.reason}</p>
          ) : preview?.openingTalk ? (
            <p className="small faint">
              Teczka trafi do oceniającego na etap wyboru arkusza. Rozmowa rozpoczynająca do{' '}
              <span className="num">{fmtDate(preview.openingTalk.date)}</span>
              {lateOpening && <strong> (termin już minął)</strong>}.
            </p>
          ) : (
            <p className="small faint">Teczka trafi do oceniającego na etap wyboru arkusza; termin rozmowy rozpoczynającej liczy system.</p>
          )}
        </>
      )}
      {cycle.isSuccess && <p className="notice notice--ok" role="status">Rozpoczęto cykl oceny. {cycle.data.reason}</p>}
      <MutationError error={cycle.error} />
    </section>
  )

  // „Przeprowadź ocenę” next to „Historia ocen” (team variant): open the running case, start a new cycle, or say why not.
  const assessAction = (
    <div className="emp-assess">
      {running ? (
        <Link to={caseUrl(running.id)} className="btn btn--primary">
          <ClipboardPen size={15} aria-hidden="true" /> Przeprowadź ocenę
        </Link>
      ) : (
        <button type="button" className="btn btn--primary" disabled={cycle.isPending || preview?.ok === false} onClick={onStartCycle}>
          <PlayCircle size={15} aria-hidden="true" /> Przeprowadź ocenę
        </button>
      )}
      {!running && preview?.ok === false && <p className="small" role="note">{preview.reason}</p>}
      {cycle.isSuccess && <p className="notice notice--ok" role="status">Rozpoczęto cykl oceny. {cycle.data.reason}</p>}
      <MutationError error={cycle.error} />
    </div>
  )

  return (
    <div className="page page--wide">
      {team ? <BackLink to="/zespol">Oceny zespołu</BackLink> : <BackLink to="/kartoteka">Kartoteka pracowników</BackLink>}
      <header className="page-head">
        <div>
          <h1 className="h-page">{e.firstName} {e.lastName}</h1>
          <p className="page-head__meta">{e.position} · {e.unit}</p>
        </div>
        {canArchive && !editing && (
          <div className="btn-row">
            {canEdit && <button type="button" className="btn" onClick={() => setEditing(true)}>Edytuj dane</button>}
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={15} aria-hidden="true" /> Archiwizuj i anonimizuj dane
            </button>
          </div>
        )}
      </header>

      {e.obligatoryPromotion.due && (
        <InlineAlert tone="warning" title="Obowiązkowy kolejny stopień służbowy">
          {e.obligatoryPromotion.reason} <span className="legal">({e.obligatoryPromotion.legalBasis})</span>
          {e.obligatoryPromotion.nextStep && <strong className="block">Następny krok: {e.obligatoryPromotion.nextStep}</strong>}
        </InlineAlert>
      )}

      {team ? (
        <>
          <div className="section">{dataSection}</div>
          <History employeeId={id} action={assessAction} />
          <Absences employeeId={id} canEdit={canEdit} onChange={refresh} dueShownIn="„Bieżący termin” w „Dane w kartotece”" />
        </>
      ) : (
        <>
          <div className="emp-grid">
            {dataSection}
            {cycleSection}
          </div>
          {canArchive && <EmployeeAccount personId={id} />}
          <Absences employeeId={id} canEdit={canEdit} onChange={refresh} />
          <History employeeId={id} />
        </>
      )}

      {(canEdit || team) && (
        <ConfirmDialog
          open={confirmLateCycle}
          title="Termin rozmowy rozpoczynającej już minął"
          confirmLabel="Rozpocznij mimo to"
          onCancel={() => setConfirmLateCycle(false)}
          onConfirm={() => cycle.mutateAsync().then(() => undefined)}
          errorText={errorMessage}
        >
          {lateOpening && (
            <p>
              Dla tego cyklu rozmowa rozpoczynająca powinna odbyć się do <strong className="num">{fmtDate(lateOpening.date)}</strong>{' '}
              ({fmtDaysLeft(lateOpening.daysLeft)}). Po rozpoczęciu teczka od razu pokaże przekroczony termin. Rozpocznij cykl i
              poproś oceniającego o jak najszybsze przeprowadzenie rozmowy.
            </p>
          )}
          {preview && <p className="small faint">{preview.reason}</p>}
        </ConfirmDialog>
      )}

      {canArchive && (
        <Dialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title="Zarchiwizować i zanonimizować dane pracownika?"
          actions={
            <>
              <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>Anuluj</button>
              <Button
                destructive
                loading={remove.isPending}
                disabled={archiveBlocked || (archiveNeedsReason && !archiveReason.trim())}
                onClick={() => remove.mutate()}
              >
                Archiwizuj i anonimizuj
              </Button>
            </>
          }
        >
          {archive?.inProgress ? (
            <InlineAlert tone="warning" title="Teraz nie można zarchiwizować">
              Pracownik ma ocenę w toku. Najpierw zakończ ocenę (zapoznanie ocenianego z oceną).
            </InlineAlert>
          ) : retentionRunning ? (
            <InlineAlert tone={me.role === 'ADMIN' ? 'info' : 'warning'} title={`Okres przechowywania trwa do ${fmtDate(archive!.retentionUntil!)}`}>
              Oceny okresowe są częścią akt osobowych (art. 94 pkt 9b Kodeksu pracy: 10 lat od ostatniej oceny).{' '}
              {me.role === 'ADMIN'
                ? 'Przed upływem tego okresu możesz zarchiwizować dane tylko z podanym powodem.'
                : 'Przed upływem tego okresu dane może zarchiwizować wyłącznie administrator, podając powód.'}
            </InlineAlert>
          ) : null}
          <p>
            Po archiwizacji dane z kartoteki, nieobecności i oceny z importu zostaną usunięte, a zakończone oceny w systemie
            zanonimizowane (zostają w statystykach bez danych osobowych). Tej operacji nie można cofnąć.
          </p>
          {archiveNeedsReason && !archive?.inProgress && (
            <label className="field">
              <span className="field__label">Powód archiwizacji przed upływem okresu przechowywania (tylko administrator)</span>
              <textarea className="textarea" rows={2} value={archiveReason} onChange={(ev) => setArchiveReason(ev.target.value)} />
            </label>
          )}
          <MutationError error={remove.error} />
        </Dialog>
      )}
    </div>
  )
}

function Absences({
  employeeId,
  canEdit,
  onChange,
  dueShownIn = 'karta „Bieżąca ocena”',
}: {
  employeeId: string
  canEdit: boolean
  onChange: () => void
  /** Where the page shows the extended assessment term. */
  dueShownIn?: string
}) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['absences', employeeId], queryFn: ({ signal }) => getAbsences(employeeId, signal) })
  const types = useQuery({ queryKey: ['absence-types'], queryFn: ({ signal }) => getAbsenceTypes(signal) })
  const [form, setForm] = useState({ type: '', from: '', to: '', note: '' })
  const done = () => {
    qc.invalidateQueries({ queryKey: ['absences', employeeId] })
    onChange()
  }
  const add = useMutation({
    mutationFn: () => addAbsence(employeeId, { ...form, note: form.note || undefined }),
    onSuccess: () => {
      setForm({ type: '', from: '', to: '', note: '' })
      done()
    },
  })
  const remove = useMutation({ mutationFn: (absenceId: string) => deleteAbsence(employeeId, absenceId), onSuccess: done })
  const label = (t: string) => types.data?.find((x) => x.id === t)?.label ?? t

  return (
    <section className="section" aria-labelledby="abs-h">
      <div className="section__head">
        <h2 id="abs-h" className="h-section">Nieobecności</h2>
        {q.data && <span className="legal">{q.data.legalBasis}</span>}
      </div>
      {q.isError && <ErrorState error={q.error} what="nieobecności" />}
      {q.data && q.data.continuous.some((p) => p.longerThanMonth) && (
        <InlineAlert tone="info" title="Nieobecność ciągła dłuższa niż miesiąc">
          {q.data.continuous.filter((p) => p.longerThanMonth).map((p) => (
            <span key={p.from} className="block">
              {fmtDate(p.from)} – {fmtDate(p.to)} ({days(p.days)}): termin sporządzenia oceny przedłuża się o czas tej
              nieobecności (dni wolne między nieobecnościami nie przerywają ciągłości). Termin rozmowy rozpoczynającej się nie
              zmienia. Przedłużony termin oceny (gdy jest już ustalony) pokazuje {dueShownIn}.
            </span>
          ))}
        </InlineAlert>
      )}
      <div className="panel table-scroll">
        <table className="table">
          <thead>
            <tr><th>Rodzaj</th><th>Od</th><th>Do</th><th>Usprawiedliwiona</th><th>Uwagi</th>{canEdit && <th><span className="visually-hidden">Akcje</span></th>}</tr>
          </thead>
          <tbody>
            {q.data?.absences.length === 0 && <tr><td colSpan={6} className="muted">Brak zapisanych nieobecności.</td></tr>}
            {q.data?.absences.map((a) => (
              <tr key={a.id}>
                <td>{label(a.type)}</td>
                <td className="num">{fmtDate(a.from)}</td>
                <td className="num">{fmtDate(a.to)}</td>
                <td>{a.justified ? 'tak' : <span className="tag tag--danger">nie</span>}</td>
                <td>{a.note || <span className="faint">—</span>}</td>
                {canEdit && (
                  <td className="cell-action">
                    <button type="button" className="btn btn--sm btn--ghost" onClick={() => remove.mutate(a.id)} aria-label={`Usuń nieobecność od ${fmtDate(a.from)}`}>
                      <Trash2 size={15} aria-hidden="true" /> Usuń
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <form className="inline-form" onSubmit={(ev) => { ev.preventDefault(); add.mutate() }}>
          <div className="field">
            <label className="field__label" htmlFor="abs-type">Rodzaj nieobecności</label>
            <select id="abs-type" className="select" required value={form.type} onChange={(ev) => setForm({ ...form, type: ev.target.value })}>
              <option value="">— wybierz —</option>
              {(types.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="abs-from">Od</label>
            <DateInput id="abs-from" width="full" required value={form.from} onChange={(ev) => setForm({ ...form, from: ev.target.value })} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="abs-to">Do (włącznie)</label>
            <DateInput id="abs-to" width="full" required value={form.to} onChange={(ev) => setForm({ ...form, to: ev.target.value })} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="abs-note">Uwagi <span className="field__optional">(opcjonalnie)</span></label>
            <input id="abs-note" className="input" value={form.note} onChange={(ev) => setForm({ ...form, note: ev.target.value })} />
          </div>
          <button type="submit" className="btn btn--primary" disabled={add.isPending}>Dodaj nieobecność</button>
        </form>
      )}
      <MutationError error={add.error ?? remove.error} />
    </section>
  )
}

function History({ employeeId, action }: { employeeId: string; action?: ReactNode }) {
  const q = useQuery({ queryKey: ['history', employeeId], queryFn: ({ signal }) => getHistory(employeeId, signal) })
  if (q.isError) return <ErrorState error={q.error} what="historia ocen" />
  const rows = [
    ...(q.data?.cases ?? []).map((c) => ({
      key: c.caseId,
      date: c.signedOn,
      what: `Cykl ${c.cycleLabel}${c.sheetId ? ` · arkusz ${c.sheetId}` : ''}`,
      status: c.signedOn ? CASE_STATUS_LABEL[c.status] : `w toku: ${c.stageName}`,
      result: c.result,
      level: c.level,
      link: c.sheetId ? `/teczka/${c.caseId}/arkusz` : null,
    })),
    ...(q.data?.imported ?? []).map((h) => ({
      key: h.id,
      date: h.assessedOn,
      what: 'Ocena sprzed systemu (import)',
      status: h.acknowledgedOn ? `zapoznano ${fmtDate(h.acknowledgedOn)}` : '—',
      result: h.result,
      level: h.level,
      link: null,
    })),
  ].sort((a, b) => (b.date ?? '9999').localeCompare(a.date ?? '9999'))

  return (
    <section className="section" aria-labelledby="hist-h">
      <div className="section__head">
        <h2 id="hist-h" className="h-section">Historia ocen</h2>
        {action}
      </div>
      <div className="panel table-scroll">
        <table className="table">
          <thead><tr><th>Data sporządzenia</th><th>Ocena</th><th>Wynik</th><th>Poziom</th><th>Stan</th></tr></thead>
          <tbody>
            {q.isPending && <tr><td colSpan={5} className="muted">Wczytywanie…</td></tr>}
            {q.data && rows.length === 0 && <tr><td colSpan={5} className="muted">Brak ocen w historii.</td></tr>}
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="num">{r.date ? fmtDate(r.date) : '—'}</td>
                <td>{r.link ? <Link to={r.link}>{r.what}</Link> : r.what}</td>
                <td>{r.result ? <span className={`tag ${r.result === 'POSITIVE' ? 'tag--ok' : 'tag--danger'}`}>{resultLabel(r.result)}</span> : '—'}</td>
                <td>{r.level ?? '—'}</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
