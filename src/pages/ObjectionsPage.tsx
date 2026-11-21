import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { decideObjection, getObjections, type CaseDetail, type ObjectionOutcome } from '../api/cases'
import { AssessmentVersions, CaseHistoryList, ObjectionStatus } from '../case/LegalPaths'
import { legalErrorText, OUTCOME_SHORT, useLegalMutation } from '../lib/legalQueries'
import { DeadlineText } from '../components/Deadline'
import { ErrorState, LoadingState } from '../components/QueryState'
import { BackLink, Button, Field, RadioGroup, Select, StatusBadge, TextArea } from '../components/ui'
import { useCase } from '../lib/caseQueries'
import { fmtDate } from '../lib/format'
import { caseCriteria, criterionName, useCriteria, useSheets, type CaseCriteria } from '../lib/model'
import { CASE_STATUS_LABEL } from '../lib/stages'
import { useMe } from '../lib/useAuth'
import { SheetDocument } from '../sheet/SheetDocument'

/** „Sprzeciwy”: objections to periodic assessments for the dyrektor generalny urzędu (art. 83 ustawy o służbie cywilnej). */
export function ObjectionsPage() {
  const me = useMe()
  const q = useQuery({ queryKey: ['objections'], queryFn: ({ signal }) => getObjections(signal) })
  if (q.isPending) return <div className="page"><LoadingState /></div>
  if (q.isError) return <div className="page"><ErrorState error={q.error} what="lista sprzeciwów" onRetry={() => q.refetch()} /></div>
  const pending = q.data.filter((o) => !o.objection.decision)
  const decided = q.data.filter((o) => o.objection.decision)
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="h-page">Sprzeciwy od ocen okresowych</h1>
          <p className="page-head__meta">{me.name} · {me.position}</p>
        </div>
      </header>
      <p className="muted">
        Sprzeciw rozpatruje się w terminie 14 dni od dnia wniesienia (art. 83 ust. 3 ustawy o służbie cywilnej). W razie
        uwzględnienia ocenę zmienia się albo sporządza po raz drugi (ust. 4).
      </p>
      <ObjectionTable id="pending-h" title="Do rozstrzygnięcia" rows={pending} empty="Brak sprzeciwów czekających na rozstrzygnięcie." />
      <ObjectionTable id="decided-h" title="Rozstrzygnięte" rows={decided} empty="Brak rozstrzygniętych sprzeciwów." />
    </div>
  )
}

function ObjectionTable({ id, title, rows, empty }: { id: string; title: string; rows: Awaited<ReturnType<typeof getObjections>>; empty: string }) {
  return (
    <section className="section" aria-labelledby={id}>
      <h2 id={id} className="h-section">{title}</h2>
      {rows.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>Oceniany</th>
                <th>Oceniający</th>
                <th>Wniesiony</th>
                <th>Termin rozpatrzenia</th>
                <th>Rozstrzygnięcie</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.objection.id}>
                  <td>
                    <Link to={`/sprzeciwy/${r.caseId}`}>{r.person.firstName} {r.person.lastName}</Link>
                    <div className="faint small">{r.person.position}</div>
                  </td>
                  <td>{r.evaluatorName}</td>
                  <td className="num">{fmtDate(r.objection.filedOn)}</td>
                  <td>{r.objection.decision ? <span className="faint">—</span> : <DeadlineText deadline={r.objection.decisionDeadline} />}</td>
                  <td>
                    {r.objection.decision ? (
                      <>{OUTCOME_SHORT[r.objection.decision.outcome]} <span className="faint small num">{fmtDate(r.objection.decision.decidedOn)}</span></>
                    ) : (
                      <StatusBadge tone="warning">{CASE_STATUS_LABEL[r.status]}</StatusBadge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

/** One objection: the assessment sheet, the objection and the decision form. */
export function ObjectionCasePage() {
  const { id = '' } = useParams()
  const q = useCase(id)
  const model = useCriteria()
  const sheets = useSheets()
  if (q.isPending || model.isPending || sheets.isPending) return <div className="page"><LoadingState /></div>
  if (q.isError) return <div className="page"><ErrorState error={q.error} what="sprawa ze sprzeciwem" onRetry={() => q.refetch()} /></div>
  if (model.isError) return <div className="page"><ErrorState error={model.error} what="wykaz kryteriów oceny" /></div>
  const detail = q.data
  const criteria = caseCriteria(detail, sheets.data)
  const scale = sheets.data?.find((sh) => sh.id === detail.sheetId)?.scale ?? []
  return (
    <div className="page">
      <BackLink to="/sprzeciwy" />
      <header className="page-head">
        <div>
          <h1 className="h-page">Sprzeciw: {detail.person.firstName} {detail.person.lastName}</h1>
          <p className="page-head__meta">
            {detail.cycleLabel} · oceniający: {detail.evaluator.firstName} {detail.evaluator.lastName}
          </p>
        </div>
        <StatusBadge tone="warning">{CASE_STATUS_LABEL[detail.status]}</StatusBadge>
      </header>
      <section className="section legal-panel" aria-label="Sprzeciwy">
        {detail.objections.map((o) => <ObjectionStatus key={o.id} objection={o} />)}
      </section>
      {detail.legalActions?.includes('DECIDE_OBJECTION') && (
        <DecisionForm detail={detail} criteria={criteria} scale={scale} names={(c) => criterionName(model.data, c)} />
      )}
      {detail.sentForAckOn && (
        <section className="section" aria-label="Arkusz oceny">
          <div className="paper-preview">
            <SheetDocument detail={detail} model={model.data} criteria={criteria} />
          </div>
        </section>
      )}
      <AssessmentVersions detail={detail} />
      <CaseHistoryList detail={detail} />
    </div>
  )
}

const OUTCOMES = [
  { value: 'DISMISS', label: 'Nie uwzględniam sprzeciwu (oddalenie)', hint: 'Sprawa się kończy; oceniany może odwołać się do sądu pracy w 14 dni (art. 83 ust. 5).' },
  { value: 'CHANGE', label: 'Uwzględniam: zmieniam ocenę', hint: 'Wskaż nowe oceny cząstkowe; oceniający podpisuje zmienioną ocenę, oceniany ponownie się z nią zapoznaje.' },
  { value: 'REDO', label: 'Uwzględniam: ocena do ponownego sporządzenia', hint: 'Ocena zostaje anulowana; sprawa wraca do etapu „Rozmowa oceniająca i ocena”. Od nowej oceny przysługuje sprzeciw.' },
] as const

function DecisionForm({ detail, criteria, scale, names }: { detail: CaseDetail; criteria: CaseCriteria; scale: number[]; names: (id: string) => string }) {
  const [outcome, setOutcome] = useState<ObjectionOutcome | ''>('')
  const [reason, setReason] = useState('')
  const [scores, setScores] = useState<Record<string, number>>(detail.decisions)
  const [error, setError] = useState<string>()
  const m = useLegalMutation(detail.id, (b: Parameters<typeof decideObjection>[1]) => decideObjection(detail.id, b))
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!outcome) return setError('Wybierz rozstrzygnięcie.')
    if (!reason.trim()) return setError('Uzasadnij rozstrzygnięcie.')
    setError(undefined)
    const changed = Object.fromEntries(Object.entries(scores).filter(([k, v]) => detail.decisions[k] !== v))
    m.mutate({ outcome, reason: reason.trim(), ...(outcome === 'CHANGE' ? { decisions: changed } : {}) })
  }
  return (
    <section className="section" aria-labelledby="decision-h">
      <h2 id="decision-h" className="h-section">Rozstrzygnięcie sprzeciwu</h2>
      <form className="panel legal-form" onSubmit={submit} noValidate>
        <RadioGroup
          id="outcome"
          name="outcome"
          legend="Rozstrzygnięcie"
          options={OUTCOMES}
          value={outcome}
          onChange={(v) => setOutcome(v as ObjectionOutcome)}
        />
        {outcome === 'CHANGE' && (
          <fieldset className="legal-form">
            <legend className="h-sub">Oceny cząstkowe po zmianie</legend>
            {criteria.all.map((c) => (
              <Field key={c} label={names(c)}>
                {(ctl) => (
                  <Select
                    {...ctl}
                    value={String(scores[c] ?? '')}
                    options={scale.map((p) => ({ value: String(p), label: `${p}${detail.decisions[c] === p ? ' (obecnie)' : ''}` }))}
                    onChange={(e) => setScores({ ...scores, [c]: Number(e.target.value) })}
                  />
                )}
              </Field>
            ))}
          </fieldset>
        )}
        <Field label="Uzasadnienie rozstrzygnięcia" error={error}>
          {(c) => <TextArea {...c} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        <Button type="submit" loading={m.isPending}>Zapisz rozstrzygnięcie</Button>
        {m.error ? <p role="alert" className="form-error">{legalErrorText(m.error)}</p> : null}
      </form>
    </section>
  )
}
