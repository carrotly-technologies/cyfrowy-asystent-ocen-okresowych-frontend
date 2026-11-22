import { FormProgress, type FormProgressState } from '../../components/ui'
import { SHEET_PARTS, type SheetPart } from './sheetParts'

/**
 * „Części arkusza”: the stepper of the sheet's parts, shared by „Rozmowa rozpoczynająca” (I · II · III, II and III
 * as a preview) and „Rozmowa oceniająca i ocena” (II · III). `stateOf` decides done / current / todo; with `linkTo`
 * every part is a link (keyboard reachable), otherwise plain text.
 */
export function SheetPartsStepper({
  parts,
  stateOf,
  linkTo,
}: {
  parts: readonly SheetPart[]
  stateOf: (part: SheetPart) => FormProgressState
  linkTo?: (part: SheetPart) => string
}) {
  return (
    <FormProgress
      unit="Krok"
      label="Części arkusza"
      steps={parts.map((n) => ({ key: String(n), mark: SHEET_PARTS[n].mark, label: SHEET_PARTS[n].name, state: stateOf(n), to: linkTo?.(n) }))}
    />
  )
}
