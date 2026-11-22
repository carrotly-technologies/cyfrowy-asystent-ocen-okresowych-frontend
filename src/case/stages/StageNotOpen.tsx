import { Link } from 'react-router'
import type { CaseDetail, StageId } from '../../api/cases'
import { InlineAlert } from '../../components/ui'
import { caseUrl, stageTitle } from '../../lib/stages'
import { StageHeader } from './common'

const WHAT: Partial<Record<StageId, string>> = {
  OPENING_TALK: 'Omówisz z ocenianym obowiązki z opisu stanowiska, kryteria, oczekiwania i ewentualne cele, a potem potwierdzisz rozmowę (część I).',
  PART_I_ACK: 'Oceniany potwierdza na swoim koncie zapoznanie z kryteriami i terminem oceny. Od tej daty biegnie okres oceny.',
  OBSERVATION: 'Przez cały okres oceny zapisujesz obserwacje: sytuacja, działanie, rezultat.',
  ASSESSMENT: 'Przeprowadzisz rozmowę oceniającą, wybierzesz oceny cząstkowe (1/3/5/7/9) i wpiszesz uzasadnienie oraz wnioski do IPRZ.',
  SIGNATURE: 'System sprawdzi kompletność formalną; podpiszesz ocenę i przekażesz ją ocenianemu.',
  ACKNOWLEDGEMENT: 'Oceniany zapoznaje się z oceną na swoim koncie; od tego dnia biegnie 7 dni na sprzeciw.',
}

export function StageNotOpen({ detail, stage }: { detail: CaseDetail; stage: StageId }) {
  const info = detail.stages.find((s) => s.id === stage)!
  const current = detail.stages.find((s) => s.id === detail.currentStage)!
  return (
    <div className="stage">
      <StageHeader
        title={stageTitle(info)}
        status={
          <InlineAlert tone="info" title="Ten etap jeszcze się nie rozpoczął">
            <p>Najpierw trzeba zakończyć etap „{stageTitle(current)}”.</p>
            {stage === 'ACKNOWLEDGEMENT' && detail.objectionRight?.open === false ? (
              <p>Oceniany zapoznaje się ze zmienioną oceną na swoim koncie; od zmienionej oceny nie przysługuje kolejny sprzeciw.</p>
            ) : (
              WHAT[stage] && <p>{WHAT[stage]}</p>
            )}
          </InlineAlert>
        }
      />
      <div className="stage-pad">
        <Link className="btn btn--primary" to={caseUrl(detail.id, detail.currentStage)}>
          Przejdź do bieżącego etapu
        </Link>
      </div>
    </div>
  )
}
