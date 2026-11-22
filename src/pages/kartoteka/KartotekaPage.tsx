import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileUp, Trash2, UserPlus, Users } from 'lucide-react'
import { useMemo, useState, type ChangeEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  addSubstitution,
  createEmployee,
  deleteSubstitution,
  downloadEmployeesCsv,
  getEvaluators,
  getSubstitutions,
  getUnits,
  importHistory,
  listEmployees,
  type EmployeeView,
} from '../../api/employees'
import { DeadlineText } from '../../components/Deadline'
import { ErrorState, LoadingState } from '../../components/QueryState'
import { DateInput, Dialog, FileInput, InlineAlert, ResultList, ResultRow, type ResultTone } from '../../components/ui'
import { CASE_STATUS_LABEL } from '../../lib/stages'
import { MutationError } from '../../case/stages/common'
import { countLabel, fmtDate } from '../../lib/format'
import { evaluatorLabel } from '../../lib/evaluator'
import { useMe } from '../../lib/useAuth'
import { EmployeeForm } from './EmployeeForm'
import { EmployeesImportDialog } from './EmployeesImportDialog'
import { EMPTY_EMPLOYEE } from './emptyEmployee'
import './kartoteka.css'

type SortKey = 'name' | 'unit' | 'position' | 'evaluator' | 'deadline'

const SORTS: Record<SortKey, (e: EmployeeView) => string> = {
  name: (e) => `${e.lastName} ${e.firstName}`,
  unit: (e) => `${e.unit} ${e.lastName}`,
  position: (e) => e.position,
  evaluator: (e) => e.effectiveEvaluatorName ?? '￿',
  deadline: (e) => e.currentCase?.nextDeadline?.date ?? '9999',
}

const deptOf = (unit: string) => unit.split(',')[0]

/** Status block of a register row: the current assessment (overdue first), or none. */
function registerStatus(e: EmployeeView): { label: string; sub?: string; tone: ResultTone } {
  const c = e.currentCase
  if (!c || c.status === 'ZAKONCZONA') return { label: 'Bez oceny', sub: 'w toku', tone: 'neutral' }
  if (c.nextDeadline?.state === 'OVERDUE') return { label: 'Po terminie', tone: 'danger' }
  if (c.status === 'W_TOKU') return { label: 'W toku', tone: 'ok' }
  return { label: CASE_STATUS_LABEL[c.status], tone: 'accent' }
}

export function KartotekaPage() {
  const me = useMe()
  // ADMIN is a technical role: it reads the register, data errors in cases go through „Tryb korekty”.
  const canEdit = me.role === 'HR'
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('widok') === 'zastepstwa' ? 'subs' : 'people'
  const setTab = (t: 'people' | 'subs') => setParams(t === 'subs' ? { widok: 'zastepstwa' } : {}, { replace: true })
  const q = useQuery({ queryKey: ['employees'], queryFn: ({ signal }) => listEmployees(signal) })
  const subsCount = useQuery({ queryKey: ['substitutions'], queryFn: ({ signal }) => getSubstitutions(signal) })
  const knownUnits = useQuery({ queryKey: ['employee-units'], queryFn: ({ signal }) => getUnits(signal), enabled: canEdit })
  const [search, setSearch] = useState('')
  const [unit, setUnit] = useState('')
  const [employment, setEmployment] = useState('')
  const [sheet, setSheet] = useState('')
  const [onlyWithout, setOnlyWithout] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'name', asc: true })
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importingEmployees, setImportingEmployees] = useState(false)

  const create = useMutation({
    mutationFn: createEmployee,
    onSuccess: (e) => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      setAdding(false)
      navigate(`/kartoteka/${e.id}`)
    },
  })

  const units = useMemo(() => [...new Set((q.data ?? []).map((e) => e.unit))].sort((a, b) => a.localeCompare(b, 'pl')), [q.data])
  const formUnits = useMemo(() => [...new Set([...units, ...(knownUnits.data ?? [])])].sort((a, b) => a.localeCompare(b, 'pl')), [units, knownUnits.data])

  if (q.isPending) return <div className="page"><LoadingState /></div>
  if (q.isError) return <div className="page"><ErrorState error={q.error} what="kartoteka pracowników" onRetry={() => q.refetch()} /></div>

  const needle = search.trim().toLocaleLowerCase('pl-PL')
  const rows = q.data
    .filter((e) => !needle || `${e.firstName} ${e.lastName} ${e.position} ${e.unit}`.toLocaleLowerCase('pl-PL').includes(needle))
    .filter((e) => !unit || e.unit === unit)
    .filter((e) => !employment || e.employment === employment)
    .filter((e) => !sheet || e.sheetId === sheet)
    .filter((e) => !onlyWithout || !e.currentCase || e.currentCase.status === 'ZAKONCZONA')
    .sort((a, b) => (sort.asc ? 1 : -1) * SORTS[sort.key](a).localeCompare(SORTS[sort.key](b), 'pl'))

  const sortButton = (key: SortKey, label: string) => {
    const on = sort.key === key
    return (
      <button
        type="button"
        className={`sort-bar__btn ${on ? 'is-on' : ''}`}
        aria-pressed={on}
        aria-label={`Sortuj: ${label}${on ? (sort.asc ? ', rosnąco' : ', malejąco') : ''}`}
        onClick={() => setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }))}
      >
        {label}
        <span aria-hidden="true">{on ? (sort.asc ? ' ▲' : ' ▼') : ''}</span>
      </button>
    )
  }
  const filtered = search || unit || employment || sheet || onlyWithout

  return (
    <div className="page page--wide">
      <header className="page-head">
        <div>
          <h1 className="h-page">Kartoteka pracowników</h1>
          <p className="page-head__meta">
            {canEdit
              ? 'Dane pracowników, podległość służbowa, nieobecności i historia ocen'
              : me.role === 'ADMIN'
                ? 'Podgląd kartoteki · tylko do odczytu'
                : 'Osoby, które oceniasz (także w zastępstwie) · tylko do odczytu'}
          </p>
        </div>
        {canEdit && (
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => void downloadEmployeesCsv()}>
              <Download size={15} aria-hidden="true" /> Pobierz kartotekę (CSV)
            </button>
            <button type="button" className="btn" onClick={() => setImportingEmployees(true)}>
              <Users size={15} aria-hidden="true" /> Importuj pracowników (CSV)
            </button>
            <button type="button" className="btn" onClick={() => setImporting(true)}>
              <FileUp size={15} aria-hidden="true" /> Import ocen historycznych
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
              <UserPlus size={15} aria-hidden="true" /> Dodaj pracownika
            </button>
          </div>
        )}
      </header>

      {me.role === 'ADMIN' && (
        <InlineAlert tone="info" title="Administrator widzi kartotekę tylko do odczytu (poza archiwizacją przed upływem okresu przechowywania)">
          Dane pracowników zmieniają kadry. Błąd w zablokowanym polu oceny poprawisz w <Link to="/admin/korekty">Trybie korekty</Link>.
        </InlineAlert>
      )}

      <div className="tabs" role="tablist" aria-label="Widok kartoteki">
        <button type="button" role="tab" id="tab-people" aria-controls="panel-people" aria-selected={tab === 'people'} className={`tabs__tab ${tab === 'people' ? 'is-on' : ''}`} onClick={() => setTab('people')}>
          Pracownicy <span className="tabs__n num">{q.data.length}</span>
        </button>
        <button type="button" role="tab" id="tab-subs" aria-controls="panel-subs" aria-selected={tab === 'subs'} className={`tabs__tab ${tab === 'subs' ? 'is-on' : ''}`} onClick={() => setTab('subs')}>
          Zastępstwa oceniających {subsCount.data && <span className="tabs__n num">{subsCount.data.length}</span>}
        </button>
      </div>

      {tab === 'subs' ? (
        <div role="tabpanel" id="panel-subs" aria-labelledby="tab-subs">
          <Substitutions canEdit={canEdit} />
        </div>
      ) : (
      <div role="tabpanel" id="panel-people" aria-labelledby="tab-people">
      <div className="filters filters--register">
        <input type="search" className="input filters__search" placeholder="Szukaj: nazwisko, stanowisko, komórka" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Szukaj pracownika" />
        <select className="select" value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Komórka organizacyjna">
          <option value="">Wszystkie komórki</option>
          {units.map((u) => <option key={u} value={u}>{deptOf(u)}</option>)}
        </select>
        <select className="select" value={employment} onChange={(e) => setEmployment(e.target.value)} aria-label="Status w służbie cywilnej">
          <option value="">Urzędnicy i pracownicy</option>
          <option value="URZEDNIK">Urzędnicy służby cywilnej</option>
          <option value="PRACOWNIK">Pracownicy służby cywilnej</option>
        </select>
        <select className="select" value={sheet} onChange={(e) => setSheet(e.target.value)} aria-label="Arkusz oceny">
          <option value="">Każdy arkusz</option>
          <option value="A">Arkusz A</option>
          <option value="B">Arkusz B</option>
          <option value="C">Arkusz C</option>
        </select>
        <label className="check-label small">
          <input type="checkbox" className="checkbox" checked={onlyWithout} onChange={(e) => setOnlyWithout(e.target.checked)} /> bez oceny w toku
        </label>
        <span className="faint small" role="status">{countLabel(rows.length, 'osoba', 'osoby', 'osób')}</span>
        {filtered && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setSearch(''); setUnit(''); setEmployment(''); setSheet(''); setOnlyWithout(false) }}>
            Wyczyść filtry
          </button>
        )}
      </div>

      <div className="sort-bar" role="group" aria-label="Sortowanie listy">
        <span className="sort-bar__label" aria-hidden="true">Sortuj:</span>
        {sortButton('name', 'Nazwisko')}
        {sortButton('unit', 'Komórka')}
        {sortButton('evaluator', 'Oceniający')}
        {sortButton('deadline', 'Termin')}
      </div>

      {rows.length === 0 ? (
        <p className="muted register-empty">Brak osób spełniających filtry.</p>
      ) : (
        <ResultList label="Kartoteka pracowników">
          {rows.map((e) => (
            <ResultRow
              key={e.id}
              to={`/kartoteka/${e.id}`}
              title={`${e.lastName} ${e.firstName}`}
              status={registerStatus(e)}
              meta={[
                { label: 'Stanowisko', value: e.position },
                { label: 'Komórka', value: <span title={e.unit}>{deptOf(e.unit)}</span> },
                { label: 'Status', value: e.employment === 'URZEDNIK' ? 'urzędnik' : 'pracownik' },
                {
                  label: 'Oceniający',
                  value: e.evaluatorId ? (
                    <>
                      {evaluatorLabel(e.evaluatorName, e.effectiveEvaluatorName)}
                      {e.substitution && <span className="faint"> (zastępstwo do {fmtDate(e.substitution.to)})</span>}
                    </>
                  ) : (
                    <span className="tag tag--danger">brak oceniającego</span>
                  ),
                },
                { label: 'Arkusz', value: `${e.sheetId ?? '—'}${!e.currentCase?.sheetId ? ' (sugestia)' : ''}` },
                {
                  label: 'Ostatnia ocena',
                  value: e.lastAssessment ? `${e.lastAssessment.result === 'POSITIVE' ? 'pozytywna' : 'negatywna'}, ${fmtDate(e.lastAssessment.assessedOn)}` : '—',
                },
              ]}
              aside={
                e.currentCase ? (
                  <>
                    <span className="small muted">{e.currentCase.stageName}</span>
                    {e.currentCase.nextDeadline && <DeadlineText deadline={e.currentCase.nextDeadline} />}
                  </>
                ) : undefined
              }
            >
              {e.obligatoryPromotion.due && (
                <p className="result-note">
                  <span className="tag tag--warn" title={e.obligatoryPromotion.reason}>obowiązkowy kolejny stopień</span>
                </p>
              )}
            </ResultRow>
          ))}
        </ResultList>
      )}

      </div>
      )}

      {canEdit && (
        <Dialog open={adding} onClose={() => setAdding(false)} title="Nowy pracownik w kartotece" wide>
          {adding && (
            <>
              <EmployeeForm initial={EMPTY_EMPLOYEE} units={formUnits} submitLabel="Dodaj pracownika" pending={create.isPending} onSubmit={(f) => create.mutate(f)} onCancel={() => setAdding(false)} />
              <MutationError error={create.error} />
            </>
          )}
        </Dialog>
      )}
      {canEdit && <ImportDialog open={importing} onClose={() => setImporting(false)} />}
      {canEdit && <EmployeesImportDialog open={importingEmployees} onClose={() => setImportingEmployees(false)} />}
    </div>
  )
}

/** Sample file for HR: header and two example rows (fictional people). */
const CSV_TEMPLATE = [
  'pracownik;data_sporzadzenia;ocena;poziom;data_zapoznania',
  'Jan Przykładowy;2024-05-06;pozytywna;powyżej oczekiwań;2024-05-08',
  'p-identyfikator;12.03.2022;pozytywna;na poziomie oczekiwań;',
].join('\r\n')

function downloadTemplate() {
  // BOM so that a spreadsheet opens the Polish letters as UTF-8.
  const blob = new Blob(['﻿', CSV_TEMPLATE, '\r\n'], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'wzor-import-ocen.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [csv, setCsv] = useState('')
  const run = useMutation({
    mutationFn: importHistory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsv(await file.text())
    run.reset()
  }
  const close = () => {
    setCsv('')
    run.reset()
    onClose()
  }
  return (
    <Dialog
      open={open}
      onClose={close}
      wide
      title="Import ocen historycznych (CSV)"
      actions={
        <>
          <button type="button" className="btn" onClick={close}>Zamknij</button>
          <button type="button" className="btn btn--primary" disabled={!csv || run.isPending} onClick={() => run.mutate(csv)}>
            {run.isPending ? 'Importowanie…' : 'Importuj'}
          </button>
        </>
      }
    >
      <p className="small">
        Oceny okresowe sporządzone przed wdrożeniem systemu. Służą do wyliczenia początku kolejnego cyklu, uzupełnienia „danych
        dotyczących poprzedniej oceny” w arkuszu i sprawdzenia obowiązkowego kolejnego stopnia służbowego.
      </p>
      <p className="small">
        Nagłówek: <code>pracownik;data_sporzadzenia;ocena;poziom;data_zapoznania</code> (ostatnia kolumna opcjonalna). Pracownik:
        identyfikator z kartoteki albo „Imię Nazwisko”. Ocena: pozytywna / negatywna. Poziom: np. „powyżej oczekiwań”. Daty:
        RRRR-MM-DD lub DD.MM.RRRR. Plik z błędem nie jest importowany wcale; powtórzone oceny są pomijane.
      </p>
      <p>
        <button type="button" className="btn btn--sm" onClick={downloadTemplate}>
          <Download size={15} aria-hidden="true" /> Pobierz wzór CSV
        </button>
      </p>
      <div className="field">
        <label className="field__label" htmlFor="csv-file">Plik CSV</label>
        <FileInput id="csv-file" accept=".csv,text/csv" onChange={(e) => void onFile(e)} />
      </div>
      {run.isSuccess && (
        <div className="notice notice--ok" role="status">
          <p>
            Zaimportowano {countLabel(run.data.imported, 'ocenę', 'oceny', 'ocen')}
            {run.data.skipped > 0 && `, pominięto ${countLabel(run.data.skipped, 'powtórzoną', 'powtórzone', 'powtórzonych')}`}.
          </p>
          {run.data.rows.length > 0 && (
            <ul className="import-rows">
              {run.data.rows.map((r) => (
                <li key={r.line}>
                  <Link to={`/kartoteka/${r.employeeId}`} onClick={close}>{r.name}</Link>
                  {' · '}<span className="num">{fmtDate(r.assessedOn)}</span>
                  {' · '}{r.result === 'POSITIVE' ? 'pozytywna' : 'negatywna'}{r.level && `, ${r.level}`}
                  {r.skipped && <span className="faint"> (pominięta: już była w kartotece)</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <MutationError error={run.error} />
    </Dialog>
  )
}

function Substitutions({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient()
  const subs = useQuery({ queryKey: ['substitutions'], queryFn: ({ signal }) => getSubstitutions(signal) })
  const evaluators = useQuery({ queryKey: ['evaluators'], queryFn: ({ signal }) => getEvaluators(signal), enabled: canEdit })
  const [form, setForm] = useState({ evaluatorId: '', substituteId: '', from: '', to: '', note: '' })
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['substitutions'] })
    qc.invalidateQueries({ queryKey: ['employees'] })
  }
  const add = useMutation({
    mutationFn: () => addSubstitution(form),
    onSuccess: () => {
      setForm({ evaluatorId: '', substituteId: '', from: '', to: '', note: '' })
      invalidate()
    },
  })
  const remove = useMutation({ mutationFn: deleteSubstitution, onSuccess: invalidate })

  return (
    <section className="section" aria-labelledby="subs-h">
      <div className="section__head">
        <h2 id="subs-h" className="h-section">Zastępstwa oceniających</h2>
        {subs.isPending && <span className="visually-hidden" role="status">Wczytywanie zastępstw…</span>}
        <span className="faint small">W okresie zastępstwa osoba zastępująca widzi zespół zastępowanego</span>
      </div>
      <div className="panel table-scroll">
        <table className="table subs-table">
          <thead>
            <tr><th>Zastępowany</th><th>Zastępuje</th><th>Okres</th><th>Uwagi</th>{canEdit && <th><span className="visually-hidden">Akcje</span></th>}</tr>
          </thead>
          <tbody>
            {subs.isPending &&
              [0, 1].map((i) => (
                <tr key={i} aria-hidden="true">
                  {[0, 1, 2, 3].map((j) => <td key={j}><div className="skeleton" style={{ width: '70%' }} /></td>)}
                  {canEdit && <td />}
                </tr>
              ))}
            {subs.isError && <tr><td colSpan={5}><ErrorState error={subs.error} what="zastępstwa" onRetry={() => subs.refetch()} /></td></tr>}
            {subs.isSuccess && subs.data.length === 0 && <tr><td colSpan={5} className="muted">Brak zastępstw.</td></tr>}
            {(subs.data ?? []).map((s) => (
              <tr key={s.id}>
                <td>{s.evaluatorName}</td>
                <td>{s.substituteName}</td>
                <td className="num">
                  <span className="nowrap">{fmtDate(s.from)} –</span> <span className="nowrap">{fmtDate(s.to)}</span>{' '}
                  {s.active && <span className="tag tag--accent">trwa</span>}
                </td>
                <td className="subs-note">{s.note || <span className="faint">—</span>}</td>
                {canEdit && (
                  <td className="cell-action">
                    <button type="button" className="btn btn--sm btn--ghost" onClick={() => remove.mutate(s.id)} aria-label={`Usuń zastępstwo: ${s.evaluatorName}`}>
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
        <form className="inline-form" onSubmit={(e) => { e.preventDefault(); add.mutate() }}>
          <div className="field">
            <label className="field__label" htmlFor="sub-ev">Zastępowany oceniający</label>
            <select id="sub-ev" className="select" required value={form.evaluatorId} onChange={(e) => setForm({ ...form, evaluatorId: e.target.value })}>
              <option value="">— wybierz —</option>
              {(evaluators.data ?? []).map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="sub-sub">Osoba zastępująca</label>
            <select id="sub-sub" className="select" required value={form.substituteId} onChange={(e) => setForm({ ...form, substituteId: e.target.value })}>
              <option value="">— wybierz —</option>
              {(evaluators.data ?? []).map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="sub-from">Od</label>
            <DateInput id="sub-from" width="full" required value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="sub-to">Do</label>
            <DateInput id="sub-to" width="full" required value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="sub-note">Uwagi <span className="field__optional">(opcjonalnie)</span></label>
            <input id="sub-note" className="input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <button type="submit" className="btn btn--primary" disabled={add.isPending}>Dodaj zastępstwo</button>
        </form>
      )}
      <MutationError error={add.error ?? remove.error} />
    </section>
  )
}
