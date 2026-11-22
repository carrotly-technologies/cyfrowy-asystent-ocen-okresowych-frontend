import { FileText } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { InlineAlert } from '../../components/ui'
import { fmtDate } from '../../lib/format'
import type { StageProps } from '../CasePage'
import { SheetPartI } from './SheetPartI'
import { SheetPartII } from './SheetPartII'
import { SheetPartIII } from './SheetPartIII'
import { readSheetPart, SHEET_PARTS, type SheetPart } from './sheetParts'
import { SheetPartsStepper } from './SheetPartsStepper'
import { StageLayout } from './StageLayout'
import s from './OpeningTalkStage.module.css'

const PARTS = [1, 2, 3] as const

/**
 * Step 2: the opening talk, recorded in part I of the sheet and confirmed by the evaluator. Parts II and III are
 * shown read only as a preview (`?czesc=2|3`), so the evaluator sees the whole sheet before filling it at
 * „Rozmowa oceniająca i ocena”. Without a sheet only part I is shown.
 */
export function OpeningTalkStage(props: StageProps) {
  const { detail, stage } = props
  const info = detail.stages.find((x) => x.id === stage)!
  const confirmed = detail.partI.confirmedByEvaluatorOn
  const location = useLocation()
  const [params] = useSearchParams()
  const hasSheet = !!detail.sheetId
  const part: SheetPart = (hasSheet && readSheetPart(params.get('czesc'), PARTS)) || 1

  const linkTo = (n: SheetPart) => {
    const next = new URLSearchParams(params)
    next.set('czesc', String(n))
    return `${location.pathname}?${next.toString()}`
  }

  const title = part === 1 ? `Część I – ${hasSheet ? `Arkusz ${detail.sheetId}` : 'arkusz nieustalony'}` : `${SHEET_PARTS[part].name} – Arkusz ${detail.sheetId}`

  const status =
    part === 1 ? (
      confirmed && (
        <InlineAlert tone="success" title={`Część I potwierdzona przez oceniającego ${fmtDate(confirmed)}`}>
          Pola są tylko do odczytu. Zmiana jest możliwa tylko w trybie korekty błędów przez administratora.
        </InlineAlert>
      )
    ) : (
      <InlineAlert tone="info" title="Podgląd">
        Tę część wypełnisz na etapie »Rozmowa oceniająca i ocena«.
      </InlineAlert>
    )

  return (
    <StageLayout info={info} title={title} status={status}>
      {hasSheet ? (
        <div className={s.parts}>
          <SheetPartsStepper parts={PARTS} stateOf={(n) => (n === part ? 'current' : 'todo')} linkTo={linkTo} />
          <Link className={s.preview} to={`/teczka/${detail.id}/arkusz`} state={{ from: `${location.pathname}${location.search}` }}>
            <FileText size={18} aria-hidden="true" />
            Podgląd całego arkusza
          </Link>
        </div>
      ) : (
        <InlineAlert tone="info" title="Arkusz nieustalony">
          Części II i III zobaczysz, gdy arkusz oceny zostanie ustalony.
        </InlineAlert>
      )}
      {part === 1 && <SheetPartI {...props} />}
      {part === 2 && <SheetPartII {...props} readOnly />}
      {part === 3 && <SheetPartIII {...props} readOnly />}
    </StageLayout>
  )
}
