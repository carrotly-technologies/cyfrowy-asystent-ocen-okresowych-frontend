import { useQuery } from '@tanstack/react-query'
import { useId, useState, type FormEvent } from 'react'
import type { EmployeeFields } from '../../api/employees'
import { getEvaluators } from '../../api/employees'
import { getCivilServiceGrades } from '../../api/reference'

type Props = {
  initial: EmployeeFields
  units: string[]
  submitLabel: string
  pending: boolean
  onSubmit: (fields: EmployeeFields) => void
  onCancel?: () => void
}

/** Create / edit form of the HR register. Validation messages come from the API (Polish). */
export function EmployeeForm({ initial, units, submitLabel, pending, onSubmit, onCancel }: Props) {
  const [f, setF] = useState<EmployeeFields>(initial)
  const evaluators = useQuery({ queryKey: ['evaluators'], queryFn: ({ signal }) => getEvaluators(signal) })
  const grades = useQuery({ queryKey: ['civil-service-grades'], queryFn: ({ signal }) => getCivilServiceGrades(signal) })
  const id = useId()
  const set = <K extends keyof EmployeeFields>(k: K, v: EmployeeFields[K]) => setF((old) => ({ ...old, [k]: v }))
  const urzednik = f.employment === 'URZEDNIK'

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(f)
  }

  const text = (k: 'firstName' | 'lastName' | 'position', label: string) => (
    <div className="field">
      <label className="field__label" htmlFor={`${id}-${k}`}>{label}</label>
      <input id={`${id}-${k}`} className="input" required value={f[k]} onChange={(e) => set(k, e.target.value)} />
    </div>
  )

  return (
    <form onSubmit={submit} className="emp-form">
      <div className="emp-form__grid">
        {text('firstName', 'Imię')}
        {text('lastName', 'Nazwisko')}
        <div className="field">
          <label className="field__label" htmlFor={`${id}-unit`}>Komórka organizacyjna</label>
          <input id={`${id}-unit`} className="input" required list={`${id}-units`} value={f.unit} onChange={(e) => set('unit', e.target.value)} />
          <datalist id={`${id}-units`}>{units.map((u) => <option key={u} value={u} />)}</datalist>
        </div>
        {text('position', 'Stanowisko')}
        <div className="field">
          <label className="field__label" htmlFor={`${id}-ev`}>Oceniający (bezpośredni przełożony)</label>
          <select id={`${id}-ev`} className="select" value={f.evaluatorId ?? ''} onChange={(e) => set('evaluatorId', e.target.value || null)}>
            <option value="">— nie przypisano —</option>
            {(evaluators.data ?? []).map((ev) => <option key={ev.id} value={ev.id}>{ev.name} ({ev.position})</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${id}-since`}>Zatrudnienie na czas nieokreślony / mianowanie od</label>
          <input id={`${id}-since`} type="date" className="input" value={f.indefiniteSince ?? ''} onChange={(e) => set('indefiniteSince', e.target.value || null)} />
          <span className="field__hint">Od tej daty liczy się termin pierwszej oceny.</span>
        </div>
      </div>

      <fieldset className="emp-form__set">
        <legend className="field__label">Status w służbie cywilnej</legend>
        <label className="checkbox">
          <input type="radio" name={`${id}-emp`} checked={f.employment === 'PRACOWNIK'} onChange={() => set('employment', 'PRACOWNIK')} /> pracownik służby cywilnej
        </label>
        <label className="checkbox">
          <input type="radio" name={`${id}-emp`} checked={urzednik} onChange={() => set('employment', 'URZEDNIK')} /> urzędnik służby cywilnej (mianowany)
        </label>
      </fieldset>

      {urzednik && (
        <div className="emp-form__grid">
          <div className="field">
            <label className="field__label" htmlFor={`${id}-year`}>Rok mianowania</label>
            <input id={`${id}-year`} type="number" inputMode="numeric" className="input" value={f.appointedYear ?? ''} onChange={(e) => set('appointedYear', e.target.value ? Number(e.target.value) : null)} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-grade`}>Stopień służbowy</label>
            <select id={`${id}-grade`} className="select" value={f.grade ?? ''} onChange={(e) => set('grade', e.target.value || null)}>
              <option value="">— brak danych —</option>
              {(grades.data?.grades ?? []).map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-gdate`}>Data przyznania stopnia</label>
            <input id={`${id}-gdate`} type="date" className="input" value={f.gradeGrantedOn ?? ''} onChange={(e) => set('gradeGrantedOn', e.target.value || null)} />
          </div>
        </div>
      )}

      <fieldset className="emp-form__set">
        <legend className="field__label">Stanowisko a wybór arkusza</legend>
        <label className="checkbox">
          <input type="checkbox" checked={f.officeHead} onChange={(e) => set('officeHead', e.target.checked)} /> kierownik urzędu (arkusz A)
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={f.managesPeople} onChange={(e) => set('managesPeople', e.target.checked)} /> bezpośrednio kieruje pracownikami (arkusz B)
        </label>
      </fieldset>

      <div className="btn-row">
        {onCancel && <button type="button" className="btn" onClick={onCancel}>Anuluj</button>}
        <button type="submit" className="btn btn--primary" disabled={pending}>{pending ? 'Zapisywanie…' : submitLabel}</button>
      </div>
    </form>
  )
}
