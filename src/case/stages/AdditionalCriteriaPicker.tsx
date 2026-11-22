import type { CriteriaCatalogue } from '../../api/reference'
import { Checkbox, Fieldset } from '../../components/ui'
import s from './AdditionalCriteriaPicker.module.css'

interface Props {
  id: string
  model: CriteriaCatalogue
  /** Mandatory criteria of the sheet: not offered as additional ones. */
  mandatory: string[]
  /** The sheet's limit (`maxAdditionalCriteria` from GET /api/sheets). */
  max: number
  selected: string[]
  onToggle: (id: string, on: boolean) => void
  disabled?: boolean
}

/**
 * Additional criteria chosen from the catalogue (załącznik nr 1): checkboxes with descriptions, the counter N/max and
 * the rest disabled once the limit is reached. Used in step 1 („Arkusz i kryteria”) and in part I until it is confirmed.
 */
export function AdditionalCriteriaPicker({ id, model, mandatory, max, selected, onToggle, disabled }: Props) {
  const full = selected.length >= max
  const catalogue = model.criteria.filter((c) => !mandatory.includes(c.id))
  return (
    <Fieldset
      id={id}
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
              disabled={disabled || (!on && full)}
              onChange={(e) => onToggle(c.id, e.target.checked)}
            />
          )
        })}
      </div>
    </Fieldset>
  )
}
