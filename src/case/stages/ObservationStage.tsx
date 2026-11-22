import { Plus } from 'lucide-react'
import { Fragment, useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import type { Observation } from '../../api/cases'
import { useAddObservation, useCaseAction, usePatchCase } from '../../lib/caseQueries'
import { DEMO_TODAY, fmtDate } from '../../lib/format'
import { criterionName } from '../../lib/model'
import { allows, caseUrl } from '../../lib/stages'
import type { StageProps } from '../CasePage'
import { MutationError, StageHeader } from './common'
import { DateInput, Disclosure } from '../../components/ui'
import css from './ObservationStage.module.css'

const empty = (crit: string): Omit<Observation, 'id'> => ({
  date: DEMO_TODAY,
  criterionId: crit,
  kind: 'STRENGTH',
  situation: '',
  action: '',
  result: '',
})

export function ObservationStage({ detail, model, criteria, stage }: StageProps) {
  const info = detail.stages.find((s) => s.id === stage)!
  const done = info.status === 'DONE'
  const add = useAddObservation(detail.id)
  const act = useCaseAction(detail.id)
  const navigate = useNavigate()
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(() => empty(criteria.all[0] ?? ''))
  const [filter, setFilter] = useState<string>('')

  const counts = Object.fromEntries(criteria.all.map((c) => [c, detail.observations.filter((o) => o.criterionId === c).length]))
  const thin = criteria.all.filter((c) => counts[c] < 2)
  const list = [...detail.observations].filter((o) => !filter || o.criterionId === filter).sort((a, b) => b.date.localeCompare(a.date))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    add.mutate(form, {
      onSuccess: () => {
        setForm(empty(form.criterionId))
        setFormOpen(false)
      },
    })
  }

  const start = () =>
    act.mutate('START_ASSESSMENT', { onSuccess: () => navigate(caseUrl(detail.id, 'ASSESSMENT')) })

  return (
    <div className="stage">
      <StageHeader title={info.name} />

      <div className={`stage-pad ${css.page}`}>
        <section className={css.section} aria-labelledby="obs-coverage">
          <h3 id="obs-coverage" className="h-section">Pokrycie kryteriów dowodami</h3>
          <p className="small muted">Kliknij nazwę kryterium, żeby zobaczyć w dzienniku tylko jego obserwacje. Ponowne kliknięcie pokazuje wszystkie.</p>
          <table className={`table ${css.coverage}`}>
            <caption className="visually-hidden">Liczba obserwacji dla każdego kryterium</caption>
            <thead>
              <tr>
                <th scope="col">Kryterium</th>
                <th scope="col">Obserwacje</th>
                <th scope="col" className={css.stateCol}>Stan</th>
              </tr>
            </thead>
            <tbody>
              {criteria.all.map((c) => {
                const isThin = counts[c] < 2
                const state = (
                  <span className={`tag ${isThin ? 'tag--warn' : 'tag--ok'}`}>{isThin ? 'Mało dowodów' : 'Wystarczająco'}</span>
                )
                return (
                  <tr key={c} className={filter === c ? css.active : undefined}>
                    <th scope="row" className={css.critCell}>
                      <button
                        type="button"
                        className={`btn btn--link ${css.critBtn}`}
                        aria-pressed={filter === c}
                        onClick={() => setFilter(filter === c ? '' : c)}
                      >
                        {criterionName(model, c)}
                      </button>
                      <span className={css.stateInline}>{state}</span>
                    </th>
                    <td>
                      <span className={css.countCell}>
                        <span className={css.bar} aria-hidden="true">
                          {Array.from({ length: Math.max(3, counts[c]) }, (_, i) => (
                            <span key={i} className={i < counts[c] ? css.on : ''} />
                          ))}
                        </span>
                        <span><strong className="num">{counts[c]}</strong> {obsWord(counts[c])}</span>
                      </span>
                    </td>
                    <td className={css.stateCol}>{state}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {thin.length > 0 && (
            <p className="notice notice--warn">
              {thin.length > 3 ? `Mniej niż 2 obserwacje w ${thin.length} z ${criteria.all.length} kryteriów.` : `Mało dowodów: ${thin.map((c) => criterionName(model, c)).join(', ')}.`} Bez przykładów ocena opiera się na ogólnym wrażeniu — zbieraj je przed rozmową oceniającą.
            </p>
          )}
        </section>

        <section className={css.section} aria-labelledby="obs-journal">
          <div>
            <div className={css.journalHead}>
              <h3 id="obs-journal" className="h-section">Dziennik obserwacji <span className="faint num">({detail.observations.length})</span></h3>
              <div className={css.journalTools}>
                {!done && (
                  <button type="button" className="btn" onClick={() => setFormOpen((v) => !v)} aria-expanded={formOpen}>
                    <Plus size={15} aria-hidden="true" /> Dodaj obserwację
                  </button>
                )}
              </div>
            </div>
            <p className={`small ${css.filterStatus}`} aria-live="polite">
              {filter && (
                <>
                  Pokazano: <strong>{criterionName(model, filter)}</strong> ·{' '}
                  <button type="button" className="btn btn--link" onClick={() => setFilter('')}>Pokaż wszystkie</button>
                </>
              )}
            </p>
          </div>

          {formOpen && (
            <form className="obs-form panel" onSubmit={submit}>
              <div className="obs-form__row">
                <label className="field">
                  <span className="field__label">Data</span>
                  <DateInput width="full" value={form.date} max={DEMO_TODAY} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </label>
                <label className="field" style={{ flex: 1 }}>
                  <span className="field__label">Kryterium</span>
                  <select className="select" value={form.criterionId} onChange={(e) => setForm({ ...form, criterionId: e.target.value })}>
                    {criteria.all.map((c) => (
                      <option key={c} value={c}>{criterionName(model, c)}</option>
                    ))}
                  </select>
                </label>
                <fieldset className="field obs-form__kind">
                  <legend className="field__label">Rodzaj</legend>
                  <div className="radio-row">
                    {(['STRENGTH', 'DEVELOPMENT'] as const).map((k) => (
                      <label key={k} className={`radio-pill ${form.kind === k ? 'is-on' : ''}`}>
                        <input type="radio" name="kind" checked={form.kind === k} onChange={() => setForm({ ...form, kind: k })} />
                        {k === 'STRENGTH' ? 'Mocna strona' : 'Do rozwoju'}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
              <div className="obs-form__sdr">
                {SDR.map(([k, label, ph]) => (
                  <label key={k} className="field">
                    <span className="field__label">{label}</span>
                    <textarea className="textarea" rows={3} required placeholder={ph} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                  </label>
                ))}
              </div>
              <div className="btn-row">
                <button type="submit" className="btn btn--primary" disabled={add.isPending}>Zapisz obserwację</button>
                <button type="button" className="btn btn--ghost" onClick={() => setFormOpen(false)}>Anuluj</button>
              </div>
              <MutationError error={add.error} />
            </form>
          )}

          {list.length === 0 ? (
            <p className="muted">Brak obserwacji{filter ? ' dla tego kryterium' : ''}. Zapisuj je na bieżąco — po kilku miesiącach trudno odtworzyć szczegóły.</p>
          ) : (
            <ol className="timeline" aria-label="Obserwacje">
              {list.map((o) => (
                <li key={o.id} className="timeline__item">
                  <span className="timeline__date num">{fmtDate(o.date)}</span>
                  <div className="timeline__body">
                    <div className="timeline__meta">
                      <strong title={criterionName(model, o.criterionId)}>{criterionName(model, o.criterionId)}</strong>
                      <span className={`tag ${o.kind === 'STRENGTH' ? 'tag--ok' : 'tag--warn'}`}>{o.kind === 'STRENGTH' ? 'mocna strona' : 'do rozwoju'}</span>
                    </div>
                    <dl className="sdr">
                      {SDR.map(([k, label]) => (
                        <Fragment key={k}>
                          <dt>{label}</dt>
                          <dd>{o[k]}</dd>
                        </Fragment>
                      ))}
                    </dl>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {!detail.signedByEvaluatorOn && <WorkingNotes caseId={detail.id} initial={detail.workingNotes ?? ''} />}

        {!done && (
          <section className={css.next} aria-labelledby="obs-next">
            <h3 id="obs-next" className="h-section">Co dalej?</h3>
            <p className="small">Gdy zbliża się termin oceny, zakończ okres obserwacji i przejdź do rozmowy oceniającej.</p>
            <button type="button" className="btn btn--primary" disabled={act.isPending || !allows(detail, 'START_ASSESSMENT')} onClick={start}>
              Zakończ obserwacje i przejdź do oceny
            </button>
            <MutationError error={act.error} />
          </section>
        )}
      </div>
    </div>
  )
}

const SDR = [
  ['situation', 'Sytuacja', 'Co się działo, kiedy, w jakim kontekście?'],
  ['action', 'Działanie', 'Co konkretnie zrobił(a) oceniany?'],
  ['result', 'Rezultat', 'Jaki był skutek?'],
] as const

/** Polish plural of „obserwacja” for a count (1 obserwacja, 2–4 obserwacje, 5+ obserwacji). */
function obsWord(n: number): string {
  if (n === 1) return 'obserwacja'
  const d = n % 10
  const t = n % 100
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? 'obserwacje' : 'obserwacji'
}

/**
 * Notatki robocze: the evaluator's free text without legal effect (never on the sheet, not visible to the assessed
 * person). Part II of the sheet itself opens only at the assessment talk stage (field schema of sheets A/B/C).
 */
/** Saved shortly after typing stops, on blur and when leaving the stage; closing the tab with unsaved text warns. */
function WorkingNotes({ caseId, initial }: { caseId: string; initial: string }) {
  const patch = usePatchCase(caseId)
  const [text, setText] = useState(initial)
  const saved = useRef(initial)
  const latest = useRef(text)
  latest.current = text
  const mutate = useRef(patch.mutate)
  mutate.current = patch.mutate
  const save = () => {
    if (latest.current === saved.current) return
    saved.current = latest.current
    mutate.current({ workingNotes: latest.current })
  }
  // autosave 800 ms after the last keystroke
  useEffect(() => {
    if (text === saved.current) return
    const t = setTimeout(save, 800)
    return () => clearTimeout(t)
  })
  // leaving the stage (another route) saves; closing or reloading the tab with unsaved text asks first
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (latest.current !== saved.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('beforeunload', warn)
      save()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <Disclosure title="Notatki robocze" bodyClassName={css.notesBody}>
      <p className="small muted">
        Tylko dla Ciebie, bez skutków prawnych: nie trafiają do arkusza ani do ocenianego. Oceny cząstkowe, uzasadnienie i
        IPRZ wpiszesz na etapie rozmowy oceniającej.
      </p>
      <textarea
        className="textarea"
        rows={5}
        aria-label="Notatki robocze"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
      />
      <p className="small muted" aria-live="polite">
        {patch.isPending ? 'Zapisywanie…' : text !== saved.current ? 'Zmiany zapiszą się automatycznie.' : patch.isSuccess ? 'Zapisano.' : ''}
      </p>
      <MutationError error={patch.error} />
    </Disclosure>
  )
}
