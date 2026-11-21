import { InfoList, InfoRow, InlineAlert } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import type { StageProps } from '../CasePage'
import { StageLayout } from './StageLayout'
import { RemindButton } from '../RemindButton'

/** Step 3 for the evaluator: part I waits for the assessed person's confirmation on their own account. */
export function PartIAckStage({ detail, stage }: StageProps) {
  const info = detail.stages.find((x) => x.id === stage)!
  const { confirmedByEvaluatorOn: confirmed, acknowledgedByEmployeeOn: acked, assessmentDue } = detail.partI
  return (
    <StageLayout
      info={info}
      status={
        acked ? (
          <InlineAlert tone="success" title={`Oceniany potwierdził część I ${fmtDate(acked)}`}>
            Od tej daty biegnie okres oceny. Oryginał części I trafia do akt osobowych, kopia do ocenianego (§6 ust. 3 rozp. PRM z 4.04.2016).
          </InlineAlert>
        ) : (
          <InlineAlert tone="warning" title="Czeka na potwierdzenie ocenianego">
            Oceniany potwierdza rozmowę i zapoznanie z kryteriami oraz terminem oceny na swoim koncie („Moje oceny”). Oceniający
            nie może tego zrobić za niego (§6 ust. 2 rozp. PRM z 4.04.2016).
            <RemindButton detail={detail} />
          </InlineAlert>
        )
      }
    >
      <InfoList>
        <InfoRow label="Rozmowę rozpoczynającą potwierdził oceniający" value={confirmed ? fmtDate(confirmed) : '—'} />
        <InfoRow label="Termin sporządzenia oceny" value={assessmentDue ? fmtDate(assessmentDue) : '—'} />
        <InfoRow label="Potwierdzenie ocenianego" value={acked ? fmtDate(acked) : 'Jeszcze nie'} />
      </InfoList>
    </StageLayout>
  )
}
