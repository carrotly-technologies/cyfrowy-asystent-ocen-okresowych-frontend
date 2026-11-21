import { InlineAlert } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import type { StageProps } from '../CasePage'
import { SheetPartI } from './SheetPartI'
import { StageLayout } from './StageLayout'

/** Step 2: the opening talk, recorded in part I of the sheet and confirmed by the evaluator. */
export function OpeningTalkStage(props: StageProps) {
  const { detail, stage } = props
  const info = detail.stages.find((x) => x.id === stage)!
  const confirmed = detail.partI.confirmedByEvaluatorOn
  return (
    <StageLayout
      info={info}
      title={`Część I – ${detail.sheetId ? `Arkusz ${detail.sheetId}` : 'arkusz nieustalony'}`}
      status={
        confirmed && (
          <InlineAlert tone="success" title={`Część I potwierdzona przez oceniającego ${fmtDate(confirmed)}`}>
            Pola są tylko do odczytu. Zmiana jest możliwa tylko w trybie korekty błędów przez administratora.
          </InlineAlert>
        )
      }
    >
      <SheetPartI {...props} />
    </StageLayout>
  )
}
