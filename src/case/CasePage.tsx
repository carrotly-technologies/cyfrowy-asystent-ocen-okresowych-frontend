import { FileText, MessageSquareText, Printer } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import type { CaseDetail, StageId } from '../api/cases'
import { apiDownload, errorMessage } from '../api/client'
import type { CriteriaCatalogue } from '../api/reference'
import { EvaluatorLegalPanel } from './LegalPaths'
import { AssistantPanel } from '../assistant/AssistantPanel'
import { ErrorState, LoadingState } from '../components/QueryState'
import { BackLink, StageStepper, StatusBadge } from '../components/ui'
import { useCase } from '../lib/caseQueries'
import { useFeatures } from '../lib/features'
import { caseCriteria, useCriteria, useSheets, type CaseCriteria } from '../lib/model'
import { canOpenStage, caseSteps, caseUrl, CASE_STATUS_LABEL, stageFromSlug, stepTarget, STAGE_SHORT, STAGE_SLUG, viewStage } from '../lib/stages'
import { HOME_BY_ROLE, useMe } from '../lib/useAuth'
import { CaseHistory } from './CaseHistory'
import s from './CasePage.module.css'
import { DocumentStage } from './stages/DocumentStage'
import { ObservationStage } from './stages/ObservationStage'
import { OpeningTalkStage } from './stages/OpeningTalkStage'
import { PartIAckStage } from './stages/PartIAckStage'
import { SheetSelectionStage } from './stages/SheetSelectionStage'
import { SheetWizard } from './stages/SheetWizard'
import { StageNotOpen } from './stages/StageNotOpen'

export interface StageProps {
  detail: CaseDetail
  model: CriteriaCatalogue
  criteria: CaseCriteria
  stage: StageId
}

function readAssistantPref(): boolean {
  try {
    const v = localStorage.getItem('ocena.assistant')
    if (v !== null) return v === '1'
  } catch {
    // ignore
  }
  return window.innerWidth >= 1500
}

const STATUS_TONE = {
  W_TOKU: 'info',
  DO_ZAPOZNANIA: 'warning',
  OKRES_SPRZECIWU: 'warning',
  SPRZECIW_W_ROZPATRZENIU: 'warning',
  ZAKONCZONA: 'success',
} as const

export function CasePage() {
  const { id = '', stage: slug } = useParams()
  const me = useMe()
  const q = useCase(id)
  const model = useCriteria()
  const sheets = useSheets()
  const features = useFeatures()
  const [assistantPref, setAssistantOpen] = useState(readAssistantPref)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const assistantOpen = features.assistant && assistantPref
  const workRef = useRef<HTMLElement>(null)
  useEffect(() => {
    workRef.current?.scrollTo({ top: 0 })
  }, [slug])

  const toggleAssistant = () => {
    setAssistantOpen((v) => {
      try {
        localStorage.setItem('ocena.assistant', v ? '0' : '1')
      } catch {
        // ignore
      }
      return !v
    })
  }

  if (q.isPending || model.isPending || sheets.isPending) return <div className="page"><LoadingState /></div>
  if (q.isError) return <div className="page"><ErrorState error={q.error} what="teczka oceny" onRetry={() => q.refetch()} /></div>
  if (model.isError) return <div className="page"><ErrorState error={model.error} what="wykaz kryteriów oceny" /></div>

  const detail = q.data
  const stage = stageFromSlug(slug)
  if (!stage || !detail.stages.some((st) => st.id === stage)) return <Navigate to={caseUrl(detail.id, viewStage(detail.stages, detail.currentStage))} replace />
  // A stage shown in another stage's view (the assessment period → the sheet of step 3), e.g. an old /obserwacje link.
  const shown = viewStage(detail.stages, stage)
  if (shown !== stage) return <Navigate to={caseUrl(detail.id, shown)} replace />
  if (slug !== STAGE_SLUG[stage]) return <Navigate to={caseUrl(detail.id, stage)} replace />

  const criteria = caseCriteria(detail, sheets.data)
  const props: StageProps = { detail, model: model.data, criteria, stage }
  const name = `${detail.person.firstName} ${detail.person.lastName}`
  const sheetLabel = detail.sheetId ? `Arkusz ${detail.sheetId}` : 'Arkusz nieustalony'
  const steps = caseSteps(detail)
  const activeStep = steps.find((st) => st.stages.some((x) => x.id === stage))

  return (
    <div className={`${s.root} ${assistantOpen ? s.withAssistant : ''}`}>
      <header className={s.head}>
        <div className={s.headTop}>
          <BackLink to={HOME_BY_ROLE[me.role]} />
          <div className={s.actions}>
            <Link className="btn" to={`/teczka/${detail.id}/arkusz`}>
              <FileText size={15} strokeWidth={1.75} aria-hidden="true" />
              Podgląd arkusza
            </Link>
            <button
              type="button"
              className="btn"
              title={pdfError ?? 'PDF arkusza generowany na serwerze'}
              onClick={() =>
                void apiDownload(`/cases/${encodeURIComponent(detail.id)}/sheet.pdf`, `ocena-${detail.id}.pdf`).then(
                  () => setPdfError(null),
                  (err: unknown) => setPdfError(errorMessage(err)),
                )
              }
            >
              <Printer size={15} strokeWidth={1.75} aria-hidden="true" />
              Pobierz PDF
            </button>
            {features.assistant && (
              <button type="button" className={`btn ${assistantOpen ? 'btn--pressed' : ''}`} aria-pressed={assistantOpen} onClick={toggleAssistant}>
                <MessageSquareText size={15} strokeWidth={1.75} aria-hidden="true" />
                Asystent
              </button>
            )}
          </div>
        </div>
        <div className={s.person}>
          <h1 className={s.name}>{name}</h1>
          <StatusBadge tone={STATUS_TONE[detail.status]}>{CASE_STATUS_LABEL[detail.status]}</StatusBadge>
        </div>
        <p className={s.position}>
          {detail.person.position}
          <span className={s.cycle}> · {detail.cycleLabel} · {sheetLabel}</span>
        </p>
        <div className={s.stepper}>
          <StageStepper
            label="Etapy oceny okresowej"
            activeKey={activeStep?.key}
            steps={steps.map((st) => ({ key: st.key, label: st.label, status: st.status, to: caseUrl(detail.id, stepTarget(st)) }))}
          />
        </div>
        <EvaluatorLegalPanel detail={detail} />
      </header>

      {pdfError && <p className="sheet-bar__error" role="alert">{pdfError}</p>}
      <CaseHistory detail={detail} />
      <div className={s.body}>
        <section ref={workRef} className={`case-work ${s.work}`} aria-label={`Etap: ${STAGE_SHORT[stage]}`}>
          {canOpenStage(detail, stage) ? <StageWorkspace {...props} /> : <StageNotOpen detail={detail} stage={stage} />}
        </section>
        {assistantOpen && (
          <AssistantPanel
            context={{
              caseId: detail.id,
              stageId: stage,
              label: `${STAGE_SHORT[stage]} · ${name} · ${sheetLabel}`,
            }}
            onClose={toggleAssistant}
          />
        )}
      </div>
    </div>
  )
}

function StageWorkspace(p: StageProps) {
  switch (p.stage) {
    case 'SHEET_SELECTION':
      return <SheetSelectionStage {...p} />
    case 'OPENING_TALK':
      return <OpeningTalkStage {...p} />
    case 'PART_I_ACK':
      return <PartIAckStage {...p} />
    case 'OBSERVATION':
      return <ObservationStage {...p} />
    case 'ASSESSMENT':
      return <SheetWizard {...p} />
    case 'SIGNATURE':
    case 'ACKNOWLEDGEMENT':
      return <DocumentStage {...p} />
  }
}
