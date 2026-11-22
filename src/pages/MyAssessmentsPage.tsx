import { useQuery } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { getCases, type CaseAction, type CaseDetail, type CaseSummary, type Deadline } from '../api/cases'
import { DeadlineText } from '../components/Deadline'
import { ErrorState, LoadingState } from '../components/QueryState'
import { BackLink, Button, ConfirmDialog, InfoList, InfoRow, InlineAlert, ResultList, ResultRow, StageStepper, StatusBadge, type ResultTone } from '../components/ui'
import { useCase, useCaseAction } from '../lib/caseQueries'
import { DEMO_TODAY, fmtDate } from '../lib/format'
import { caseCriteria, criterionName, findCriterion, useCriteria, useSheets } from '../lib/model'
import { allows, caseSteps, CASE_STATUS_LABEL, STAGE_SHORT } from '../lib/stages'
import { useMe } from '../lib/useAuth'
import { employeeTodo, isStalePast } from '../lib/employeeTodo'
import { AckFictionInfo, AssessmentVersions, CaseHistoryList, DueDateRequestSection, ObjectionSection } from '../case/LegalPaths'
import { legalErrorText } from '../lib/legalQueries'
import { EmployeeDeadlinesSection } from '../case/DeadlinesPanel'
import { SheetDocument } from '../sheet/SheetDocument'

const STATUS_TONE = {
  W_TOKU: 'info',
  DO_ZAPOZNANIA: 'warning',
  OKRES_SPRZECIWU: 'warning',
  SPRZECIW_W_ROZPATRZENIU: 'warning',
  ZAKONCZONA: 'success',
} as const

/** „Moje oceny”: the assessed person's own assessments (read only), newest cycle first. */
export function MyAssessmentsPage() {
  const me = useMe()
  const q = useQuery({ queryKey: ['my-cases'], queryFn: ({ signal }) => getCases(signal) })
  if (q.isPending) return <div className="page"><LoadingState /></div>
  if (q.isError) return <div className="page"><ErrorState error={q.error} what="lista Twoich ocen" onRetry={() => q.refetch()} /></div>
  const cases = [...q.data].reverse()
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="h-page">Moje oceny</h1>
          <p className="page-head__meta">{me.name} · {me.position}</p>
        </div>
      </header>
      <p className="muted">Tu widzisz swoje oceny okresowe: na jakim są etapie, czy masz coś do zrobienia i do kiedy.</p>
      {cases.length === 0 ? (
        <p className="muted">Nie masz jeszcze żadnej oceny okresowej w systemie.</p>
      ) : (
        <>
          <CaseTable id="current-h" title="Bieżące oceny" cases={cases.filter((c) => c.status !== 'ZAKONCZONA')} empty="Nie masz teraz oceny w toku." />
          <CaseTable id="past-h" title="Historia ocen" cases={cases.filter((c) => c.status === 'ZAKONCZONA')} empty="Brak zakończonych ocen." />
        </>
      )}
    </div>
  )
}

function CaseTable({ id, title, cases, empty }: { id: string; title: string; cases: CaseSummary[]; empty: string }) {
  return (
    <section className="section" aria-labelledby={id}>
      <h2 id={id} className="h-section">{title}</h2>
      {cases.length === 0 ? (
        <p className="muted">{empty}</p>
      ) : (
        <ResultList label={title}>
          {cases.map((c) => {
            const todo = employeeTodo(c)
            return (
              <ResultRow
                key={c.id}
                to={`/moje-oceny/${c.id}`}
                title={c.cycleLabel}
                status={statusOf(c, !!todo?.required)}
                meta={[
                  { label: 'Arkusz', value: c.sheetId ?? 'do ustalenia' },
                  { label: 'Etap', value: STAGE_SHORT[c.currentStage] },
                ]}
                aside={
                  <>
                    {c.nextDeadline && <span className="small muted">{deadlineName(c.nextDeadline)}</span>}
                    <EmployeeDeadline deadline={c.nextDeadline} closed={c.status === 'ZAKONCZONA'} />
                  </>
                }
              >
                {todo && <p className="result-note">{`${todo.text[0].toUpperCase()}${todo.text.slice(1)}.`}</p>}
              </ResultRow>
            )
          })}
        </ResultList>
      )}
    </section>
  )
}

/** "Termin sporządzenia oceny" / "Rozmowa rozpoczynająca (część I) do" → a name without the trailing "do". */
function deadlineName(d: Deadline): string {
  return d.label.replace(/,?\s+do$/, '')
}

/** A deadline; once the matter is closed a passed date is shown neutrally (no red "po terminie"). */
function EmployeeDeadline({ deadline, closed, showLegal }: { deadline: Deadline | null; closed: boolean; showLegal?: boolean }) {
  if (deadline && closed && isStalePast(deadline)) return <span className="faint num">{fmtDate(deadline.date)} · minął</span>
  return <DeadlineText deadline={deadline} showLegal={showLegal} plain />
}

/** Status block of a row: "your action needed" first, then the case status. */
function statusOf(c: CaseSummary, actionNeeded: boolean): { label: string; tone: ResultTone } {
  if (actionNeeded) return { label: 'Do działania', tone: 'warn' }
  if (c.status === 'ZAKONCZONA') return { label: CASE_STATUS_LABEL[c.status], tone: 'neutral' }
  if (c.status === 'W_TOKU') return { label: CASE_STATUS_LABEL[c.status], tone: 'ok' }
  return { label: CASE_STATUS_LABEL[c.status], tone: 'accent' }
}

/** One assessment of the signed-in assessed person: read only, with their two confirmations. */
export function MyCasePage() {
  const { id = '' } = useParams()
  const q = useCase(id)
  const model = useCriteria()
  const sheets = useSheets()
  if (q.isPending || model.isPending || sheets.isPending) return <div className="page"><LoadingState /></div>
  if (q.isError) return <div className="page"><ErrorState error={q.error} what="ocena" onRetry={() => q.refetch()} /></div>
  if (model.isError) return <div className="page"><ErrorState error={model.error} what="wykaz kryteriów oceny" /></div>
  const detail = q.data
  const criteria = caseCriteria(detail, sheets.data)
  const template = sheets.data?.find((sh) => sh.id === detail.sheetId)?.template
  const notice = detail.sentForAckOn && template ? [template.objectionNotice, template.objectionNoticeNote].filter(Boolean).join(' ') : undefined
  const todo = employeeTodo(detail)
  const closed = detail.status === 'ZAKONCZONA'
  const objectionFiled = detail.objections.length > 0
  const ackPartI = allows(detail, 'EMPLOYEE_ACK_PART_I')
  const criteriaList = (
    <ul className="bullets">
      {criteria.all.map((c) => (
        <li key={c}>
          <strong>{criterionName(model.data, c)}</strong>
          {criteria.additional.includes(c) && <span className="faint"> (kryterium dodatkowe)</span>}
          <div className="small muted">{findCriterion(model.data, c)?.description.join(' ')}</div>
          {detail.partI.expectations[c] && <div className="small">Oczekiwania: {detail.partI.expectations[c]}</div>}
        </li>
      ))}
    </ul>
  )
  // The objection term matters only while no sprzeciw was filed and it has not passed.
  const showObjectionTerm = !!detail.objectionDeadline && !objectionFiled && !isStalePast(detail.objectionDeadline) && detail.objectionDeadline.date !== detail.nextDeadline?.date
  const dueIsNext = detail.nextDeadline?.label === 'Termin sporządzenia oceny'
  return (
    <div className="page">
      <BackLink to="/moje-oceny" />
      <header className="page-head">
        <div>
          <h1 className="h-page">{detail.cycleLabel}</h1>
          <p className="page-head__meta">
            {detail.sheetId ? `Arkusz ${detail.sheetId}` : 'Arkusz do ustalenia'} · oceniający: {detail.evaluator.firstName} {detail.evaluator.lastName}
          </p>
        </div>
        <StatusBadge tone={todo?.required ? 'warning' : STATUS_TONE[detail.status]}>
          {todo?.required ? 'Wymaga Twojego działania' : CASE_STATUS_LABEL[detail.status]}
        </StatusBadge>
      </header>
      <p className="muted">
        Ocenę prowadzi Twój oceniający. Tutaj potwierdzasz kolejne kroki, widzisz terminy i możesz wnieść sprzeciw, jeśli nie zgadzasz się z oceną.
      </p>

      <StageStepper label="Etapy oceny okresowej" steps={caseSteps(detail).map((s) => ({ key: s.key, label: s.label, shortLabel: s.shortLabel, status: s.status }))} />

      <section className="section">
        <EmployeeActions detail={detail} criteria={ackPartI && detail.sheetId ? criteriaList : null} />
      </section>

      <section className="section" aria-labelledby="status-h">
        <h2 id="status-h" className="h-section">Stan i terminy</h2>
        <InfoList>
          <InfoRow label="Status" value={todo?.required ? `Wymaga Twojego działania: ${todo.text}` : CASE_STATUS_LABEL[detail.status]} />
          <InfoRow label="Bieżący etap" value={STAGE_SHORT[detail.currentStage]} />
          {detail.nextDeadline && (
            <InfoRow label={deadlineName(detail.nextDeadline)} value={<EmployeeDeadline deadline={detail.nextDeadline} closed={closed} showLegal />} />
          )}
          {detail.partI.assessmentDue && !dueIsNext && !detail.signedByEvaluatorOn && !ackPartI && (
            <InfoRow label="Termin sporządzenia oceny" value={<span className="num">{fmtDate(detail.partI.assessmentDue)}</span>} />
          )}
          {showObjectionTerm && <InfoRow label="Termin na sprzeciw" value={<DeadlineText deadline={detail.objectionDeadline} showLegal plain />} />}
        </InfoList>
      </section>

      <AckFictionInfo detail={detail} />
      <ObjectionSection detail={detail} notice={notice} />
      <DueDateRequestSection detail={detail} />
      <EmployeeDeadlinesSection detail={detail} />

      {detail.sheetId && !ackPartI && (
        <section className="section" aria-labelledby="crit-h">
          <h2 id="crit-h" className="h-section">Kryteria oceny</h2>
          {criteriaList}
        </section>
      )}

      {detail.sentForAckOn && (
        <section className="section" aria-label="Arkusz oceny">
          <p>
            <Link to={`/moje-oceny/${detail.id}/arkusz`}>Otwórz arkusz na pełnym ekranie (druk, pobieranie PDF)</Link>
          </p>
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

const ACK_TEXT: Partial<Record<CaseAction, { title: string; text: string; button: string }>> = {
  EMPLOYEE_ACK_PART_I: {
    title: 'Potwierdź rozmowę rozpoczynającą',
    text: 'Potwierdzam przeprowadzenie ze mną rozmowy rozpoczynającej oraz zapoznanie się z kryteriami oceny i terminem sporządzenia oceny (§6 ust. 2 rozp. PRM z 4.04.2016).',
    button: 'Potwierdzam',
  },
  EMPLOYEE_ACK_ASSESSMENT: {
    title: 'Zapoznaj się z oceną',
    text: 'Przeczytaj arkusz poniżej. Potwierdzenie oznacza, że zapoznałeś(-aś) się z oceną; od tego dnia biegnie 7 dni na sprzeciw do {to} (art. 83 ustawy o służbie cywilnej).',
    button: 'Zapoznałem(-am) się z oceną',
  },
}

function EmployeeActions({ detail, criteria }: { detail: CaseDetail; criteria: ReactNode }) {
  const act = useCaseAction(detail.id, { follow: false })
  const [confirmAck, setConfirmAck] = useState(false)
  const action = (['EMPLOYEE_ACK_PART_I', 'EMPLOYEE_ACK_ASSESSMENT'] as const).find((a) => allows(detail, a))
  const to = detail.objectionAddressee?.to ?? 'dyrektora generalnego urzędu'
  // art. 83 ust. 4: no further sprzeciw from an assessment changed after one (the API's rule, with its note).
  const closedNote = detail.objectionRight && !detail.objectionRight.open ? detail.objectionRight.note : null
  if (action) {
    const t = ACK_TEXT[action]!
    const text =
      action === 'EMPLOYEE_ACK_ASSESSMENT' && closedNote
        ? `Przeczytaj zmienioną ocenę w arkuszu poniżej i potwierdź, że się z nią zapoznałeś(-aś). ${closedNote}`
        : t.text.replace('{to}', to)
    return (
      <InlineAlert tone="warning" title={`Wymaga Twojego działania: ${t.title.toLowerCase()}`}>
        <p>{text}</p>
        {action === 'EMPLOYEE_ACK_PART_I' && criteria && (
          <>
            <p>
              <strong>Kryteria, według których będziesz oceniany(-a):</strong>
            </p>
            {criteria}
            {detail.partI.assessmentDue && (
              <p>
                <strong>Termin sporządzenia oceny:</strong> <span className="num">{fmtDate(detail.partI.assessmentDue)}</span>
              </p>
            )}
          </>
        )}
        <Button loading={act.isPending} onClick={() => (action === 'EMPLOYEE_ACK_ASSESSMENT' ? setConfirmAck(true) : act.mutate(action))}>
          {t.button}
        </Button>
        {act.error ? <p role="alert">{legalErrorText(act.error)}</p> : null}
        <ConfirmDialog
          open={confirmAck}
          title="Potwierdzić zapoznanie z oceną?"
          confirmLabel="Potwierdzam zapoznanie"
          onCancel={() => setConfirmAck(false)}
          onConfirm={() => act.mutateAsync('EMPLOYEE_ACK_ASSESSMENT')}
          errorText={legalErrorText}
        >
          <ul className="bullets">
            <li>
              Data zapoznania: <strong className="num">{fmtDate(DEMO_TODAY)}</strong>.
            </li>
            {closedNote ? (
              <li>{closedNote}</li>
            ) : (
              <li>
                Od tego dnia biegnie 7 dni na wniesienie sprzeciwu do {to}. Jeśli ostatni dzień wypada w dzień wolny od pracy, termin
                przesuwa się na najbliższy dzień roboczy.
              </li>
            )}
            <li>Potwierdzenie nie oznacza zgody z oceną. Tej czynności nie można cofnąć.</li>
          </ul>
        </ConfirmDialog>
      </InlineAlert>
    )
  }
  if (detail.acknowledgedOn) {
    const d = detail.objectionDeadline
    const filed = detail.objections.at(-1)
    return (
      <InlineAlert tone="info" title={`${detail.ackFiction ? 'Zapoznanie z oceną odnotowano' : 'Zapoznałeś(-aś) się z oceną'} ${fmtDate(detail.acknowledgedOn)}`}>
        {filed ? (
          <p>
            {filed.decision
              ? `Sprzeciw z ${fmtDate(filed.filedOn)} został rozstrzygnięty ${fmtDate(filed.decision.decidedOn)}. Szczegóły poniżej.`
              : `Wniosłeś(-aś) sprzeciw ${fmtDate(filed.filedOn)}. Czeka na rozstrzygnięcie; szczegóły poniżej.`}
          </p>
        ) : closedNote ? (
          <p>Od zmienionej oceny nie przysługuje kolejny sprzeciw; szczegóły poniżej, w sekcji „Sprzeciw od oceny”.</p>
        ) : d && isStalePast(d) ? (
          <p>Termin na wniesienie sprzeciwu minął {fmtDate(d.date)}.</p>
        ) : d ? (
          <p>
            Termin na sprzeciw: <DeadlineText deadline={d} plain />
          </p>
        ) : null}
      </InlineAlert>
    )
  }
  return (
    <InlineAlert tone="info" title={`Etap: ${STAGE_SHORT[detail.currentStage]}`}>
      Nie masz teraz nic do potwierdzenia. Ocenę prowadzi Twój oceniający.
      {detail.partI.acknowledgedByEmployeeOn && <> Część I potwierdziłeś(-aś) {fmtDate(detail.partI.acknowledgedByEmployeeOn)}.</>}
    </InlineAlert>
  )
}
