import { useState } from 'react'
import type { SheetId } from '../../api/reference'
import { Button, Checkbox, ConfirmDialog, Field, Fieldset, InlineAlert, RadioGroup, TextInput } from '../../components/ui'
import { useCaseAction, usePatchCase } from '../../lib/caseQueries'
import { fmtDate } from '../../lib/format'
import { criterionName, findCriterion, useSheets } from '../../lib/model'
import { allows } from '../../lib/stages'
import type { StageProps } from '../CasePage'
import { StageError, StageLayout } from './StageLayout'
import layout from './StageLayout.module.css'
import s from './SheetSelectionStage.module.css'

/**
 * Step 1: the evaluator chooses the sheet (the system proposes one from the person's position: kierownik urzędu → A,
 * directly manages people → B, else C), up to the sheet's limit of additional criteria from the catalogue
 * (descriptions from załącznik nr 1, no duplicates) and the assessment due date. „Zatwierdź” saves and moves on.
 */
export function SheetSelectionStage({ detail, model, stage }: StageProps) {
  const info = detail.stages.find((x) => x.id === stage)!
  const sheets = useSheets()
  const patch = usePatchCase(detail.id)
  const act = useCaseAction(detail.id)
  const suggestion = detail.sheetSuggestion
  const done = info.status === 'DONE'
  const canEdit = !done && allows(detail, 'ACCEPT_SHEET')
  // Until part I is confirmed (after the opening talk) the sheet and criteria can still be corrected.
  const canCorrect = done && detail.currentStage === 'OPENING_TALK' && !detail.partI.confirmedByEvaluatorOn
  const [correcting, setCorrecting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const [sheetId, setSheetId] = useState<SheetId>(detail.sheetId ?? suggestion.sheetId)
  const [chosen, setChosen] = useState<string[]>(detail.partI.additionalCriteria)
  const [due, setDue] = useState(detail.partI.assessmentDue ?? '')
  const sheet = (sheets.data ?? []).find((x) => x.id === sheetId)
  const mandatory = sheet?.mandatoryCriteria ?? []
  const max = sheet?.maxAdditionalCriteria ?? 0
  const selected = chosen.filter((c) => !mandatory.includes(c))
  const full = selected.length >= max
  const catalogue = model.criteria.filter((c) => !mandatory.includes(c.id))
  const toggle = (id: string, on: boolean) => setChosen((list) => (on ? [...list, id] : list.filter((x) => x !== id)))

  // Errors are shown in the dialog (ConfirmDialog) and by StageError.
  const accept = async () => {
    await patch.mutateAsync({ sheetId, partI: { additionalCriteria: selected, ...(due ? { assessmentDue: due } : {}) } })
    if (correcting) setCorrecting(false)
    else await act.mutateAsync('ACCEPT_SHEET')
  }

  if (!canEdit && !correcting) {
    return (
      <StageLayout
        info={info}
        status={
          <InlineAlert tone="success" title="Arkusz i kryteria zatwierdzone">
            Arkusz {detail.sheetId}, kryteria dodatkowe: {detail.partI.additionalCriteria.map((c) => criterionName(model, c)).join(', ') || 'brak'}
            {detail.partI.assessmentDue && <>, termin sporządzenia oceny: {fmtDate(detail.partI.assessmentDue)}</>}.
            {canCorrect && (
              <p>
                Do zatwierdzenia części I po rozmowie rozpoczynającej możesz jeszcze to poprawić.{' '}
                <Button variant="secondary" size="small" onClick={() => setCorrecting(true)}>
                  Popraw arkusz lub kryteria
                </Button>
              </p>
            )}
          </InlineAlert>
        }
      >
        <CriteriaList title="Kryteria obowiązkowe arkusza" ids={mandatory} model={model} />
      </StageLayout>
    )
  }

  return (
    <StageLayout info={info}>
      <InlineAlert tone="info" title={`Propozycja systemu: arkusz ${suggestion.sheetId}`}>
        <p>
          {suggestion.reason} <span className={layout.muted}>({suggestion.legalBasis})</span>
        </p>
        <p>To tylko propozycja: arkusz wybierasz i zatwierdzasz Ty.</p>
      </InlineAlert>

      <RadioGroup
        id="sheet-choice"
        name="sheet"
        legend="Arkusz oceny"
        value={sheetId}
        onChange={(v) => setSheetId(v as SheetId)}
        options={(sheets.data ?? []).map((x) => ({
          value: x.id,
          label: `Arkusz ${x.id}${x.id === suggestion.sheetId ? ' (propozycja systemu)' : ''}`,
          hint: x.appliesTo,
        }))}
      />

      <CriteriaList title={`Kryteria obowiązkowe arkusza ${sheetId}`} ids={mandatory} model={model} />

      <Fieldset
        id="extra-criteria"
        legend={`Kryteria dodatkowe (${selected.length}/${max})`}
        hint={`Najwyżej ${max}, najistotniejsze ze względu na obowiązki z opisu stanowiska (§5 ust. 2 rozp. PRM z 4.04.2016). Można nie wybrać żadnego.`}
      >
        <div className={s.checks}>
          {catalogue.map((c) => {
            const on = selected.includes(c.id)
            return (
              <Checkbox
                key={c.id}
                label={c.name}
                hint={c.description.join(' ')}
                checked={on}
                disabled={!on && full}
                onChange={(e) => toggle(c.id, e.target.checked)}
              />
            )
          })}
        </div>
      </Fieldset>

      <Field
        id="assessment-due"
        label="Termin sporządzenia oceny"
        optional
        hint="Zostaw puste, aby system wpisał termin z przepisów: 24 miesiące, a po ocenie negatywnej 6 miesięcy od zapoznania z nią."
      >
        {(p) => <TextInput {...p} type="date" width={20} value={due} onChange={(e) => setDue(e.target.value)} />}
      </Field>

      <StageError error={patch.error ?? act.error} />
      <div className={s.finalActions}>
        {correcting && (
          <Button variant="secondary" onClick={() => setCorrecting(false)}>
            Anuluj poprawki
          </Button>
        )}
        <Button loading={patch.isPending || act.isPending} onClick={() => setConfirming(true)}>
          {correcting ? 'Zapisz poprawki' : 'Zatwierdź arkusz i kryteria'}
        </Button>
      </div>
      <ConfirmDialog
        open={confirming}
        title={correcting ? 'Zapisać poprawki arkusza i kryteriów?' : 'Zatwierdzić arkusz i kryteria?'}
        confirmLabel={correcting ? 'Zapisz poprawki' : 'Zatwierdź'}
        cancelLabel="Popraw"
        onConfirm={accept}
        onCancel={() => setConfirming(false)}
      >
        <dl className={s.summary}>
          <dt>Arkusz</dt>
          <dd>
            {sheetId}
            {sheetId !== suggestion.sheetId && ` (inny niż propozycja systemu: ${suggestion.sheetId})`}
          </dd>
          <dt>Kryteria obowiązkowe</dt>
          <dd>{mandatory.map((c) => criterionName(model, c)).join(', ') || '—'}</dd>
          <dt>Kryteria dodatkowe ({selected.length}/{max})</dt>
          <dd>
            {selected.length > 0
              ? selected.map((c) => criterionName(model, c)).join(', ')
              : 'nie wybrano żadnego (to dopuszczalne, ale kryteria dodatkowe pozwalają ocenić najważniejsze obowiązki ze stanowiska)'}
          </dd>
          <dt>Termin sporządzenia oceny</dt>
          <dd>{due ? fmtDate(due) : 'z przepisów (system wpisze go automatycznie)'}</dd>
        </dl>
        {!correcting && <p>Arkusz i kryteria możesz jeszcze poprawić do zatwierdzenia części I po rozmowie rozpoczynającej.</p>}
      </ConfirmDialog>
    </StageLayout>
  )
}

function CriteriaList({ title, ids, model }: { title: string; ids: string[]; model: StageProps['model'] }) {
  return (
    <section aria-label={title}>
      <h3 className={s.questionsLabel}>{title}</h3>
      <ul className={s.indicators}>
        {ids.map((id) => (
          <li key={id}>
            <strong>{criterionName(model, id)}</strong>
            {findCriterion(model, id) && <span className={layout.muted}> — {findCriterion(model, id)!.description.join(' ')}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
