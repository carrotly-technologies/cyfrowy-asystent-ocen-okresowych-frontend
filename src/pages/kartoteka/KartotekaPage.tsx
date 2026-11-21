import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileUp, Trash2, UserPlus } from 'lucide-react'
import { useMemo, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  addSubstitution,
  createEmployee,
  deleteSubstitution,
  downloadEmployeesCsv,
  getEvaluators,
  getSubstitutions,
  importHistory,
  listEmployees,
  type EmployeeView,
} from '../../api/employees'
import { DeadlineText } from '../../components/Deadline'
import { ErrorState, LoadingState } from '../../components/QueryState'
import { Dialog } from '../../components/ui'
import { MutationError } from '../../case/stages/common'
import { countLabel, fmtDate } from '../../lib/format'
import { useMe } from '../../lib/useAuth'
import { EmployeeForm } from './EmployeeForm'
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

export function KartotekaPage() {
  const me = useMe()
  const canEdit = me.role === 'HR' || me.role === 'ADMIN'
  const qc = useQueryClient()
  const navigate = useNavigate()
  const q = useQuery({ queryKey: ['employees'], queryFn: ({ signal }) => listEmployees(signal) })
  const [search, setSearch] = useState('')
  const [unit, setUnit] = useState('')
  const [employment, setEmployment] = useState('')
  const [sheet, setSheet] = useState('')
  const [onlyWithout, setOnlyWithout] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'name', asc: true })
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)

  const create = useMutation({
    mutationFn: createEmployee,
    onSuccess: (e) => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      setAdding(false)
      navigate(`/kartoteka/${e.id}`)
    },
  })

  const units = useMemo(() => [...new Set((q.data ?? []).map((e) => e.unit))].sort((a, b) => a.localeCompare(b, 'pl')), [q.data])

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

  const th = (key: SortKey, label: string) => (
    <th aria-sort={sort.key === key ? (sort.asc ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="th-sort" onClick={() => setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }))}>
        {label}
        <span aria-hidden="true">{sort.key === key ? (sort.asc ? ' ▲' : ' ▼') : ''}</span>
      </button>
    </th>
  )
  const filtered = search || unit || employment || sheet || onlyWithout

  return (
    <div className="page page--wide">
      <header className="page-head">
        <div>
          <h1 className="h-page">Kartoteka pracowników</h1>
          <p className="page-head__meta">
            {canEdit
              ? 'Dane pracowników, podległość służbowa, nieobecności i historia ocen'
              : 'Osoby, które oceniasz (także w zastępstwie) · tylko do odczytu'}
          </p>
        </div>
        {canEdit && (
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => void downloadEmployeesCsv()}>
              <Download size={15} aria-hidden="true" /> Pobierz kartotekę (CSV)
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
        <label className="checkbox small">
          <input type="checkbox" checked={onlyWithout} onChange={(e) => setOnlyWithout(e.target.checked)} /> bez oceny w toku
        </label>
        <span className="faint small" role="status">{countLabel(rows.length, 'osoba', 'osoby', 'osób')}</span>
        {filtered && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setSearch(''); setUnit(''); setEmployment(''); setSheet(''); setOnlyWithout(false) }}>
            Wyczyść filtry
          </button>
        )}
      </div>

      <div className="panel table-scroll">
        <table className="table">
          <caption className="visually-hidden">Kartoteka pracowników; nagłówki kolumn sortują listę</caption>
          <thead>
            <tr>
              {th('name', 'Pracownik')}
              {th('unit', 'Komórka')}
              <th>Status</th>
              {th('evaluator', 'Oceniający')}
              <th>Arkusz</th>
              {th('deadline', 'Bieżąca ocena')}
              <th>Ostatnia ocena</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="muted">Brak osób spełniających filtry.</td></tr>}
            {rows.map((e) => (
              <tr key={e.id}>
                <td>
                  <div className="person">
                    <Link to={`/kartoteka/${e.id}`} className="person__name">{e.lastName} {e.firstName}</Link>
                    <span className="person__meta">{e.position}</span>
                  </div>
                </td>
                <td className="cell-unit" title={e.unit}>{deptOf(e.unit)}</td>
                <td>
                  {e.employment === 'URZEDNIK' ? 'urzędnik' : 'pracownik'}
                  {e.obligatoryPromotion.due && <span className="tag tag--warn emp-tag" title={e.obligatoryPromotion.reason}>obowiązkowy kolejny stopień</span>}
                </td>
                <td>
                  {e.effectiveEvaluatorName ?? <span className="tag tag--danger">brak oceniającego</span>}
                  {e.substitution && <span className="cell-sub">zastępstwo do {fmtDate(e.substitution.to)}</span>}
                </td>
                <td>{e.sheetId}{!e.currentCase?.sheetId && <span className="cell-sub">sugestia</span>}</td>
                <td>
                  {e.currentCase ? (
                    <>
                      <span className="cell-sub">{e.currentCase.stageName}</span>
                      {e.currentCase.nextDeadline && <DeadlineText deadline={e.currentCase.nextDeadline} />}
                    </>
                  ) : (
                    <span className="faint">brak teczki</span>
                  )}
                </td>
                <td>
                  {e.lastAssessment ? (
                    <>
                      <span className={`tag ${e.lastAssessment.result === 'POSITIVE' ? 'tag--ok' : 'tag--danger'}`}>
                        {e.lastAssessment.result === 'POSITIVE' ? 'pozytywna' : 'negatywna'}
                      </span>
                      <span className="cell-sub num">{fmtDate(e.lastAssessment.assessedOn)}</span>
                    </>
                  ) : (
                    <span className="faint">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Substitutions canEdit={canEdit} />

      {canEdit && (
        <Dialog open={adding} onClose={() => setAdding(false)} title="Nowy pracownik w kartotece">
          {adding && (
            <>
              <EmployeeForm initial={EMPTY_EMPLOYEE} units={units} submitLabel="Dodaj pracownika" pending={create.isPending} onSubmit={(f) => create.mutate(f)} onCancel={() => setAdding(false)} />
              <MutationError error={create.error} />
            </>
          )}
        </Dialog>
      )}
      {canEdit && <ImportDialog open={importing} onClose={() => setImporting(false)} />}
    </div>
  )
}

function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [csv, setCsv] = useState('')
  const [fileName, setFileName] = useState('')
  const run = useMutation({
    mutationFn: importHistory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setCsv(await file.text())
    run.reset()
  }
  const close = () => {
    setCsv('')
    setFileName('')
    run.reset()
    onClose()
  }
  return (
    <Dialog
      open={open}
      onClose={close}
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
      <div className="field">
        <label className="field__label" htmlFor="csv-file">Plik CSV</label>
        <input id="csv-file" type="file" accept=".csv,text/csv" onChange={(e) => void onFile(e)} />
        {fileName && <span className="field__hint">{fileName}</span>}
      </div>
      {run.isSuccess && (
        <p className="notice notice--ok" role="status">
          Zaimportowano {countLabel(run.data.imported, 'ocenę', 'oceny', 'ocen')}
          {run.data.skipped > 0 && `, pominięto ${countLabel(run.data.skipped, 'powtórzoną', 'powtórzone', 'powtórzonych')}`}.
        </p>
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
        <span className="faint small">W okresie zastępstwa osoba zastępująca widzi zespół zastępowanego</span>
      </div>
      <div className="panel table-scroll">
        <table className="table">
          <thead>
            <tr><th>Zastępowany</th><th>Zastępuje</th><th>Okres</th><th>Uwagi</th>{canEdit && <th><span className="visually-hidden">Akcje</span></th>}</tr>
          </thead>
          <tbody>
            {(subs.data ?? []).length === 0 && <tr><td colSpan={5} className="muted">Brak zastępstw.</td></tr>}
            {(subs.data ?? []).map((s) => (
              <tr key={s.id}>
                <td>{s.evaluatorName}</td>
                <td>{s.substituteName}</td>
                <td className="num">
                  {fmtDate(s.from)} – {fmtDate(s.to)} {s.active && <span className="tag tag--accent">trwa</span>}
                </td>
                <td>{s.note || <span className="faint">—</span>}</td>
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
            <input id="sub-from" type="date" className="input" required value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="sub-to">Do</label>
            <input id="sub-to" type="date" className="input" required value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
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
