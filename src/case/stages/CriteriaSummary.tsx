import { useId } from 'react'
import type { CriteriaCatalogue } from '../../api/reference'
import { Disclosure } from '../../components/ui'
import { criterionName, findCriterion } from '../../lib/model'
import layout from './StageLayout.module.css'
import s from './CriteriaSummary.module.css'

interface Props {
  /** Group title with its count, e.g. „Kryteria obowiązkowe (5)”, „Kryteria dodatkowe (2/3)”. */
  title: string
  ids: string[]
  model: CriteriaCatalogue | undefined
  /** Heading level under the surrounding section (h3 in a stage, h5 in a sheet part). */
  level?: 3 | 4 | 5
  /** Shown instead of the table when there are no criteria. */
  empty?: string
}

/**
 * Criteria already set, shown like the other filled-in data (a key–value `.table`, as „Dane w kartotece”): the name
 * as the row label, the first sentence of the description (załącznik nr 1) as the value and the rest under a compact
 * „Pełny opis”. Below 768px the label sits above the value. Used in step 1 („Arkusz i kryteria”) and in part I.
 */
export function CriteriaSummary({ title, ids, model, level = 3, empty }: Props) {
  const headingId = useId()
  const Heading = `h${level}` as const
  return (
    <section className={s.group} aria-labelledby={headingId}>
      <Heading id={headingId} className={s.title}>
        {title}
      </Heading>
      {ids.length === 0 ? (
        empty && <p className={layout.muted}>{empty}</p>
      ) : (
        <div className="panel table-scroll">
          <table className={`table ${s.kv}`} aria-labelledby={headingId}>
            <tbody>
              {ids.map((id) => {
                const [first, ...rest] = findCriterion(model, id)?.description ?? []
                return (
                  <tr key={id}>
                    <th scope="row">{criterionName(model, id)}</th>
                    <td>
                      {first ?? '—'}
                      {rest.length > 0 && (
                        <Disclosure compact title="Pełny opis" className={s.more}>
                          <ul className={layout.bullets}>
                            {rest.map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        </Disclosure>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
