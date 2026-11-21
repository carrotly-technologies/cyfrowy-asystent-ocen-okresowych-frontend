import { useQuery } from '@tanstack/react-query'
import { evaluateAssessment, type EvaluateResponse } from '../api/reference'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router'
import { decideObjection, getObjections, type CaseDetail, type ObjectionOutcome } from '../api/cases'
import { AssessmentVersions, CaseHistoryList, ObjectionStatus } from '../case/LegalPaths'
import { legalErrorText, OUTCOME_SHORT, useLegalMutation } from '../lib/legalQueries'
import { DeadlineText } from '../components/Deadline'
import { ErrorState, LoadingState } from '../components/QueryState'
import { BackLink, Button, ConfirmDialog, Field, InlineAlert, RadioGroup, Select, StatusBadge, TextArea, TextInput } from '../components/ui'
import { useCase } from '../lib/caseQueries'
import { DEMO_TODAY, fmtAvg, fmtDate } from '../lib/format'
import { caseCriteria, criterionName, useCriteria, useSheets, type CaseCriteria } from '../lib/model'
import { CASE_STATUS_LABEL, caseUrl } from '../lib/stages'
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
                      <StatusBadge tone="warning">Czeka na Twoją decyzję</StatusBadge>
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
  const me = useMe()
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
      {/* Sheet A: the evaluator decides (art. 83 ust. 2) and comes back to the case, not to the DG list. */}
      <BackLink to={me.role === 'SUPERVISOR' ? caseUrl(detail.id) : '/sprzeciwy'} />
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
        {detail.objections.map((o) => <ObjectionStatus key={o.id} objection={o} who={detail.objectionAddressee?.who} />)}
      </section>
      <div className="objection-layout">
        {detail.sentForAckOn && (
          <section className="section objection-layout__sheet" aria-labelledby="sheet-h">
            <h2 id="sheet-h" className="h-section">Arkusz oceny, od której wniesiono sprzeciw</h2>
            <div className="paper-preview">
              <SheetDocument detail={detail} model={model.data} criteria={criteria} />
            </div>
          </section>
        )}
        {detail.legalActions?.includes('DECIDE_OBJECTION') && (
          <div className="objection-layout__form">
            <DecisionForm detail={detail} criteria={criteria} scale={scale} scaleLabels={model.data?.scale ?? []} names={(c) => criterionName(model.data, c)} />
          </div>
        )}
      </div>
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

type ScaleLabel = { points: number; label: string }

function DecisionForm({
  detail,
  criteria,
  scale,
  scaleLabels,
  names,
}: {
  detail: CaseDetail
  criteria: CaseCriteria
  scale: number[]
  scaleLabels: ScaleLabel[]
  names: (id: string) => string
}) {
  const [outcome, setOutcome] = useState<ObjectionOutcome | ''>('')
  const [reason, setReason] = useState('')
  // art. 83 ust. 5: the 14 days to the labour court run from the delivery of the decision.
  const [deliveredOn, setDeliveredOn] = useState(DEMO_TODAY)
  const [scores, setScores] = useState<Record<string, number>>(detail.decisions)
  const [error, setError] = useState<string>()
  const [confirming, setConfirming] = useState(false)
  const m = useLegalMutation(detail.id, (b: Parameters<typeof decideObjection>[1]) => decideObjection(detail.id, b))
  const changed = Object.fromEntries(Object.entries(scores).filter(([k, v]) => detail.decisions[k] !== v))
  const word = (p: number) => scaleLabels.find((l) => l.points === p)?.label
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!outcome) return setError('Wybierz rozstrzygnięcie.')
    if (outcome === 'CHANGE' && Object.keys(changed).length === 0) return setError('Zmień co najmniej jedną ocenę cząstkową albo wybierz inne rozstrzygnięcie.')
    if (!reason.trim()) return setError('Uzasadnij rozstrzygnięcie.')
    setError(undefined)
    setConfirming(true)
  }
  const chosen = OUTCOMES.find((o) => o.value === outcome)
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
              <Field key={c} label={names(c)} hint={`Obecnie: ${detail.decisions[c] ?? '—'}${detail.decisions[c] && word(detail.decisions[c]) ? ` — ${word(detail.decisions[c])}` : ''}`}>
                {(ctl) => (
                  <Select
                    {...ctl}
                    value={String(scores[c] ?? '')}
                    options={scale.map((p) => ({
                      value: String(p),
                      label: `${p}${word(p) ? ` — ${word(p)}` : ''}${detail.decisions[c] === p ? ' (obecnie)' : ''}`,
                    }))}
                    onChange={(e) => setScores({ ...scores, [c]: Number(e.target.value) })}
                  />
                )}
              </Field>
            ))}
            <ChangePreview detail={detail} criteria={criteria.all} scores={scores} />
          </fieldset>
        )}
        {outcome === 'DISMISS' && (
          <Field label="Data doręczenia rozstrzygnięcia ocenianemu" hint="Od tej daty biegnie 14 dni na odwołanie do sądu pracy (art. 83 ust. 5 ustawy o służbie cywilnej). Domyślnie dziś.">
            {(c) => <TextInput {...c} type="date" min={DEMO_TODAY} value={deliveredOn} onChange={(e) => setDeliveredOn(e.target.value || DEMO_TODAY)} />}
          </Field>
        )}
        <Field label="Uzasadnienie rozstrzygnięcia" error={error}>
          {(c) => <TextArea {...c} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />}
        </Field>
        <Button type="submit">Zapisz rozstrzygnięcie</Button>
      </form>
      <ConfirmDialog
        open={confirming}
        title="Zatwierdzić rozstrzygnięcie sprzeciwu?"
        confirmLabel="Tak, zatwierdzam"
        onCancel={() => setConfirming(false)}
        onConfirm={() => m.mutateAsync({ outcome: outcome as ObjectionOutcome, reason: reason.trim(), ...(outcome === 'CHANGE' ? { decisions: changed } : {}), ...(outcome === 'DISMISS' ? { deliveredOn } : {}) })}
        errorText={legalErrorText}
      >
        <p>
          <strong>{chosen?.label}</strong>
        </p>
        <p>{chosen?.hint}</p>
        {outcome === 'CHANGE' && (
          <ul className="bullets">
            {Object.entries(changed).map(([c, v]) => (
              <li key={c}>
                {names(c)}: {detail.decisions[c]} → <strong>{v}</strong>
                {word(v) ? ` (${word(v)})` : ''}
              </li>
            ))}
          </ul>
        )}
        <p>
          {detail.person.firstName} {detail.person.lastName} i oceniający zostaną powiadomieni. Rozstrzygnięcia nie można potem
          zmienić w aplikacji.
        </p>
      </ConfirmDialog>
    </section>
  )
}

/** Live result of the changed scores, computed by the API (average, level, positive/negative). */
function ChangePreview({ detail, criteria, scores }: { detail: CaseDetail; criteria: string[]; scores: Record<string, number> }) {
  const list = criteria.filter((c) => scores[c] !== undefined).map((c) => ({ criterionId: c, points: scores[c] }))
  const q = useQuery({
    queryKey: ['objection-preview', detail.id, list],
    queryFn: ({ signal }) => evaluateAssessment({ sheetId: detail.sheetId!, scores: list }, signal),
    enabled: !!detail.sheetId && list.length === criteria.length,
    placeholderData: (prev) => prev,
  })
  const before = detail.evaluation
  if (!q.data) return null
  const line = (e: Pick<EvaluateResponse, 'average' | 'level' | 'result'>) =>
    `średnia ${fmtAvg(e.average)}${e.level ? `, ${e.level.label.toLowerCase()}` : ''}, ocena ${e.result === 'POSITIVE' ? 'pozytywna' : 'negatywna'}`
  return (
    <InlineAlert tone={q.data.result === 'POSITIVE' ? 'success' : 'warning'} title="Wynik po zmianie" live>
      <p>Po zmianie: {line(q.data)}.</p>
      {before && <p className="small">Przed zmianą: {line(before)}.</p>}
      {q.data.reasons.length > 0 && <p className="small muted">{q.data.reasons.join(' ')}</p>}
    </InlineAlert>
  )
}
