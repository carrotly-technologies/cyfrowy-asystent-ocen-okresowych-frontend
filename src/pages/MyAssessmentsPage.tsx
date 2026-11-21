import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { getCases, type CaseAction, type CaseDetail, type CaseSummary } from '../api/cases'
import { DeadlineText } from '../components/Deadline'
import { ErrorState, LoadingState } from '../components/QueryState'
import { BackLink, Button, InfoList, InfoRow, InlineAlert, StageStepper, StatusBadge } from '../components/ui'
import { useCase, useCaseAction } from '../lib/caseQueries'
import { fmtDate } from '../lib/format'
import { caseCriteria, criterionName, findCriterion, useCriteria, useSheets } from '../lib/model'
import { allows, caseSteps, CASE_STATUS_LABEL, STAGE_SHORT } from '../lib/stages'
import { useMe } from '../lib/useAuth'
import { AckFictionInfo, AssessmentVersions, CaseHistory, DueDateRequestSection, ObjectionSection } from '../case/LegalPaths'
import { legalErrorText } from '../lib/legalQueries'
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
        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>Cykl oceny</th>
                <th>Etap</th>
                <th>Najbliższy termin</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/moje-oceny/${c.id}`}>{c.cycleLabel}</Link>
                    <div className="faint small">{c.sheetId ? `Arkusz ${c.sheetId}` : 'Arkusz do ustalenia'}</div>
                  </td>
                  <td>{STAGE_SHORT[c.currentStage]}</td>
                  <td><DeadlineText deadline={c.nextDeadline} /></td>
                  <td><StatusBadge tone={STATUS_TONE[c.status]}>{CASE_STATUS_LABEL[c.status]}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
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
        <StatusBadge tone={STATUS_TONE[detail.status]}>{CASE_STATUS_LABEL[detail.status]}</StatusBadge>
      </header>

      <StageStepper label="Etapy oceny okresowej" steps={caseSteps(detail).map((s) => ({ key: s.key, label: s.label, status: s.status }))} />

      <section className="section">
        <EmployeeActions detail={detail} />
      </section>

      <section className="section" aria-labelledby="status-h">
        <h2 id="status-h" className="h-section">Stan i terminy</h2>
        <InfoList>
          <InfoRow label="Status" value={CASE_STATUS_LABEL[detail.status]} />
          <InfoRow label="Bieżący etap" value={STAGE_SHORT[detail.currentStage]} />
          <InfoRow label={detail.nextDeadline?.label ?? 'Najbliższy termin'} value={<DeadlineText deadline={detail.nextDeadline} showLegal />} />
          {detail.objectionDeadline && detail.objectionDeadline.date !== detail.nextDeadline?.date && <InfoRow label="Termin na sprzeciw" value={<DeadlineText deadline={detail.objectionDeadline} showLegal />} />}
        </InfoList>
      </section>

      <AckFictionInfo detail={detail} />
      <ObjectionSection detail={detail} notice={notice} />
      <DueDateRequestSection detail={detail} />

      {detail.sheetId && (
        <section className="section" aria-labelledby="crit-h">
          <h2 id="crit-h" className="h-section">Kryteria oceny i termin</h2>
          <InfoList>
            <InfoRow label="Termin sporządzenia oceny" value={detail.partI.assessmentDue ? fmtDate(detail.partI.assessmentDue) : '—'} />
          </InfoList>
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
        </section>
      )}

      {detail.sentForAckOn && (
        <section className="section" aria-label="Arkusz oceny">
          <p>
            <Link to={`/teczka/${detail.id}/arkusz`}>Otwórz arkusz na pełnym ekranie (druk, pobieranie PDF)</Link>
          </p>
          <div className="paper-preview">
            <SheetDocument detail={detail} model={model.data} criteria={criteria} />
          </div>
        </section>
      )}

      <AssessmentVersions detail={detail} />
      <CaseHistory detail={detail} />
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
    text: 'Przeczytaj arkusz poniżej. Potwierdzenie oznacza, że zapoznałeś(-aś) się z oceną; od tego dnia biegnie 7 dni na sprzeciw do dyrektora generalnego urzędu (art. 83 ust. 1 ustawy o służbie cywilnej).',
    button: 'Zapoznałem(-am) się z oceną',
  },
}

function EmployeeActions({ detail }: { detail: CaseDetail }) {
  const act = useCaseAction(detail.id, { follow: false })
  const action = (['EMPLOYEE_ACK_PART_I', 'EMPLOYEE_ACK_ASSESSMENT'] as const).find((a) => allows(detail, a))
  if (action) {
    const t = ACK_TEXT[action]!
    return (
      <InlineAlert tone="warning" title={t.title}>
        <p>{t.text}</p>
        <Button loading={act.isPending} onClick={() => act.mutate(action)}>
          {t.button}
        </Button>
        {act.error ? <p role="alert">{legalErrorText(act.error)}</p> : null}
      </InlineAlert>
    )
  }
  if (detail.acknowledgedOn) {
    return (
      <InlineAlert tone="info" title={`${detail.ackFiction ? 'Zapoznanie z oceną odnotowano' : 'Zapoznałeś(-aś) się z oceną'} ${fmtDate(detail.acknowledgedOn)}`}>
        {detail.objectionDeadline && (
          <p>
            Termin na sprzeciw: <DeadlineText deadline={detail.objectionDeadline} />
          </p>
        )}
      </InlineAlert>
    )
  }
  return (
    <InlineAlert tone="info" title={`Etap: ${STAGE_SHORT[detail.currentStage]}`}>
      Nie masz teraz nic do potwierdzenia. Ocena jest prowadzona przez oceniającego.
      {detail.partI.acknowledgedByEmployeeOn && <> Część I potwierdziłeś(-aś) {fmtDate(detail.partI.acknowledgedByEmployeeOn)}.</>}
    </InlineAlert>
  )
}
