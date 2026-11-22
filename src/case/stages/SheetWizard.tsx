import { useEffect, type ReactNode } from 'react'
import { CaseHintsPanel } from '../../partner/CaseHintsPanel'
import { useNavigate, useSearchParams } from 'react-router'
import type { CaseDetail } from '../../api/cases'
import { InlineAlert } from '../../components/ui'
import { useCaseAction } from '../../lib/caseQueries'
import { fmtDate } from '../../lib/format'
import { allows, caseUrl } from '../../lib/stages'
import type { StageProps } from '../CasePage'
import { SheetPartII } from './SheetPartII'
import { SheetPartIII } from './SheetPartIII'
import { readSheetPart } from './sheetParts'
import { SheetPartsStepper } from './SheetPartsStepper'
import { StageLayout } from './StageLayout'
import { scrollToCaseWork } from '../scroll'

/** Parts of the sheet filled at the assessment stage (part I is the opening talk). */
const PARTS = [2, 3] as const
const readPart = (raw: string | null) => readSheetPart(raw, PARTS)

function status(detail: CaseDetail): ReactNode {
  if (detail.signedByEvaluatorOn) {
    return (
      <InlineAlert tone="info" title="Ocena jest podpisana">
        Oceniający podpisał ocenę {fmtDate(detail.signedByEvaluatorOn)}, więc pola są tylko do odczytu.
      </InlineAlert>
    )
  }
  if (detail.assessmentTalkOn) {
    return (
      <InlineAlert tone="success" title={`Rozmowa oceniająca: ${fmtDate(detail.assessmentTalkOn)}`}>
        Do podpisu możesz jeszcze poprawić ocenę, uwzględniając wnioski z rozmowy (§11 ust. 2 rozp. PRM z 4.04.2016).
      </InlineAlert>
    )
  }
  return null
}

/**
 * „Rozmowa oceniająca i ocena”: part II (partial scores, result, justification, IPRZ) and part III of the sheet.
 * The part lives in the URL (`?czesc=2|3`). „Dalej” after part III records the assessment talk and moves on to the
 * signature.
 */
export function SheetWizard(props: StageProps) {
  const { detail, stage } = props
  const info = detail.stages.find((x) => x.id === stage)!
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const part = readPart(params.get('czesc')) ?? 2
  const act = useCaseAction(detail.id, { follow: false })

  useEffect(() => {
    if (readPart(params.get('czesc')) === null) {
      setParams((p) => { p.set('czesc', '2'); return p }, { replace: true })
    }
  }, [params, setParams])

  const goTo = (n: number) => {
    setParams((p) => { p.set('czesc', String(n)); return p })
    requestAnimationFrame(scrollToCaseWork)
  }

  const finish = async () => {
    if (act.isPending) return
    try {
      if (allows(detail, 'COMPLETE_ASSESSMENT_TALK')) await act.mutateAsync('COMPLETE_ASSESSMENT_TALK')
      navigate(caseUrl(detail.id, 'SIGNATURE'))
    } catch {
      // shown by StageError in part III
    }
  }

  const title = `Ocena okresowa – ${detail.sheetId ? `Arkusz ${detail.sheetId}` : 'arkusz nieustalony'}`

  return (
    <StageLayout info={info} title={title} status={status(detail)}>
      <SheetPartsStepper parts={PARTS} stateOf={(n) => (n < part ? 'done' : n === part ? 'current' : 'todo')} />
      <CaseHintsPanel caseId={detail.id} />
      {part === 2 && <SheetPartII {...props} onNext={() => goTo(3)} />}
      {part === 3 && (
        <SheetPartIII
          {...props}
          onBack={() => goTo(2)}
          onNext={() => void finish()}
          nextPending={act.isPending}
          nextError={act.error}
          nextLabel={allows(detail, 'COMPLETE_ASSESSMENT_TALK') ? 'Rozmowa oceniająca przeprowadzona' : 'Dalej'}
        />
      )}
    </StageLayout>
  )
}
