import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlayCircle, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  addAbsence,
  deleteAbsence,
  deleteEmployee,
  getAbsenceTypes,
  getAbsences,
  getEmployee,
  getHistory,
  startCycle,
  updateEmployee,
  type EmployeeFields,
  type EmployeeView,
} from '../../api/employees'
import { DeadlineText } from '../../components/Deadline'
import { ErrorState, LoadingState } from '../../components/QueryState'
import { BackLink, DateInput, Dialog, InlineAlert } from '../../components/ui'
import { MutationError } from '../../case/stages/common'
import { days, fmtDate } from '../../lib/format'
import { CASE_STATUS_LABEL } from '../../lib/stages'
import { useMe } from '../../lib/useAuth'
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

export function EmployeePage() {
  const { id = '' } = useParams()
  const me = useMe()
  const canEdit = me.role === 'HR' || me.role === 'ADMIN'
  const qc = useQueryClient()
  const navigate = useNavigate()
  const q = useQuery({ queryKey: ['employee', id], queryFn: ({ signal }) => getEmployee(id, signal) })
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

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
  const cycle = useMutation({ mutationFn: () => startCycle(id), onSuccess: refresh })
  const remove = useMutation({
    mutationFn: () => deleteEmployee(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      navigate('/kartoteka')
    },
  })

  if (q.isPending) return <div className="page"><LoadingState /></div>
  if (q.isError) return <div className="page"><ErrorState error={q.error} what="dane pracownika" onRetry={() => q.refetch()} /></div>
  const e = q.data
  const open = e.currentCase && e.currentCase.status !== 'ZAKONCZONA' && e.currentCase.status !== 'OKRES_SPRZECIWU'

  return (
    <div className="page page--wide">
      <BackLink to="/kartoteka">Kartoteka pracowników</BackLink>
      <header className="page-head">
        <div>
          <h1 className="h-page">{e.firstName} {e.lastName}</h1>
          <p className="page-head__meta">{e.position} · {e.unit}</p>
        </div>
        {canEdit && !editing && (
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => setEditing(true)}>Edytuj dane</button>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={15} aria-hidden="true" /> Usuń dane pracownika
            </button>
          </div>
        )}
      </header>

      {e.obligatoryPromotion.due && (
        <InlineAlert tone="warning" title="Obowiązkowy kolejny stopień służbowy">
          {e.obligatoryPromotion.reason} <span className="legal">({e.obligatoryPromotion.legalBasis})</span>
        </InlineAlert>
      )}

      <div className="emp-grid">
        <section className="panel panel__body" aria-labelledby="data-h">
          <h2 id="data-h" className="h-section">Dane w kartotece</h2>
          {editing ? (
            <>
              <EmployeeForm initial={fieldsOf(e)} units={[e.unit]} submitLabel="Zapisz zmiany" pending={save.isPending} onSubmit={(f) => save.mutate(f)} onCancel={() => setEditing(false)} />
              <p className="small faint">Zmiana oceniającego przenosi ocenę w toku do nowego oceniającego (wpis w historii teczki).</p>
              <MutationError error={save.error} />
            </>
          ) : (
            <dl className="dl">
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
                {e.evaluatorName ?? 'nie przypisano'}
                {e.substitution && <> · w zastępstwie: {e.effectiveEvaluatorName} (do {fmtDate(e.substitution.to)})</>}
              </dd>
              <dt>Arkusz</dt>
              <dd>
                {e.sheetId} {!e.currentCase?.sheetId && <span className="faint">— sugestia: {e.sheetSuggestion.reason} ({e.sheetSuggestion.legalBasis}); decyduje oceniający</span>}
              </dd>
            </dl>
          )}
        </section>

        <section className="panel panel__body" aria-labelledby="cycle-h">
          <h2 id="cycle-h" className="h-section">Bieżąca ocena</h2>
          {e.currentCase ? (
            <dl className="dl">
              <dt>Etap</dt><dd>{e.currentCase.stageName}</dd>
              <dt>Status</dt><dd>{CASE_STATUS_LABEL[e.currentCase.status]}</dd>
              {e.currentCase.nextDeadline && (<><dt>Termin</dt><dd><DeadlineText deadline={e.currentCase.nextDeadline} /><span className="small faint block">{e.currentCase.nextDeadline.legalBasis}</span></dd></>)}
              {e.currentCase.sheetId && (<><dt>Arkusz</dt><dd><Link to={`/teczka/${e.currentCase.id}/arkusz`}>Podgląd arkusza {e.currentCase.sheetId}</Link></dd></>)}
            </dl>
          ) : (
            <p className="muted">Brak teczki oceny w systemie.</p>
          )}
          {canEdit && !open && (
            <>
              <button type="button" className="btn btn--primary" disabled={cycle.isPending} onClick={() => cycle.mutate()}>
                <PlayCircle size={15} aria-hidden="true" /> Rozpocznij nowy cykl oceny
              </button>
              <p className="small faint">Teczka trafi do oceniającego na etap wyboru arkusza; termin rozmowy rozpoczynającej liczy system.</p>
            </>
          )}
          {cycle.isSuccess && <p className="notice notice--ok" role="status">Rozpoczęto cykl oceny. {cycle.data.reason}</p>}
          <MutationError error={cycle.error} />
        </section>
      </div>

      <Absences employeeId={id} canEdit={canEdit} onChange={refresh} />
      <History employeeId={id} />

      {canEdit && (
        <Dialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title="Usunąć dane pracownika?"
          actions={
            <>
              <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>Anuluj</button>
              <button type="button" className="btn btn--primary" disabled={remove.isPending} onClick={() => remove.mutate()}>Usuń trwale</button>
            </>
          }
        >
          <p>
            Usunięte zostaną dane z kartoteki, nieobecności i oceny z importu. Zakończone oceny w systemie zostaną zanonimizowane
            (zostają w statystykach bez danych osobowych). Nie można usunąć osoby, której ocena jest w toku.
          </p>
          <MutationError error={remove.error} />
        </Dialog>
      )}
    </div>
  )
}

function Absences({ employeeId, canEdit, onChange }: { employeeId: string; canEdit: boolean; onChange: () => void }) {
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
              {fmtDate(p.from)} – {fmtDate(p.to)} ({days(p.days)}): termin oceny przedłuża się o czas tej nieobecności (dni wolne
              między nieobecnościami nie przerywają ciągłości).
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

function History({ employeeId }: { employeeId: string }) {
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
      <div className="section__head"><h2 id="hist-h" className="h-section">Historia ocen</h2></div>
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
