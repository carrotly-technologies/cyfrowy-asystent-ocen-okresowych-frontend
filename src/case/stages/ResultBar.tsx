import { useState } from 'react'
import type { CaseDetail } from '../../api/cases'
import type { CompetencyModel } from '../../api/kompas'
import { fmtAvg } from '../../lib/format'
import { competencyName } from '../../lib/model'
import { liveResult } from '../../lib/result'
import { scoreClass } from '../../lib/scale'

/** Sticky live result: decisions per criterion, exact average on the 1–9 scale, POZYTYWNA/NEGATYWNA and why. */
export function ResultBar({
  detail,
  criteria,
  model,
  onPick,
  active,
}: {
  detail: CaseDetail
  criteria: string[]
  model: CompetencyModel
  onPick?: (id: string) => void
  active?: string
}) {
  const [open, setOpen] = useState(false)
  const r = liveResult(detail, criteria, model)
  const isFirst = detail.path === 'FIRST'
  const min = isFirst ? 3 : 1
  const max = isFirst ? 7 : 9
  const pos = (v: number) => `${((v - min) / (max - min)) * 100}%`
  const reasons = r.complete ? (detail.evaluation?.reasons ?? []) : []

  return (
    <div className="resultbar" role="region" aria-label="Wynik na żywo">
      {open && reasons.length > 0 && (
        <ul className="resultbar__reasons">
          {reasons.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
      <div className="resultbar__inner">
        <div className="resultbar__crit">
          <span className="resultbar__label">
            Oceny cząstkowe <span className="num">{r.decided}/{r.total}</span>
          </span>
          <ol className="resultbar__chips">
            {criteria.map((c) => {
              const p = detail.decisions[c]
              return (
                <li key={c}>
                  <button
                    type="button"
                    className={`mini-chip ${scoreClass(p)} ${active === c ? 'is-active' : ''}`}
                    title={`${competencyName(model, c)}: ${p != null ? `${p} pkt` : 'nieocenione'}`}
                    onClick={() => onPick?.(c)}
                  >
                    <span className="num">{p ?? '·'}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="resultbar__scale" aria-hidden="true">
          <div className="scale-track">
            {isFirst ? (
              <>
                <span className="scale-track__band score--3" style={{ left: 0, width: pos(5) }} />
                <span className="scale-track__band score--7" style={{ left: pos(5), right: 0 }} />
                <span className="scale-track__threshold" style={{ left: pos(5) }} />
              </>
            ) : (
              <>
                <span className="scale-track__band score--1" style={{ left: 0, width: pos(2) }} />
                <span className="scale-track__band score--3" style={{ left: pos(2), width: `calc(${pos(4)} - ${pos(2)})` }} />
                <span className="scale-track__band score--5" style={{ left: pos(4), width: `calc(${pos(6)} - ${pos(4)})` }} />
                <span className="scale-track__band score--7" style={{ left: pos(6), width: `calc(${pos(8)} - ${pos(6)})` }} />
                <span className="scale-track__band score--9" style={{ left: pos(8), right: 0 }} />
                <span className="scale-track__threshold" style={{ left: pos(4) }} />
              </>
            )}
            {r.average !== null && <span className="scale-track__marker" style={{ left: pos(Math.min(max, Math.max(min, r.average))) }} />}
          </div>
          <div className="scale-ticks num">
            {(isFirst ? [3, 5, 7] : [1, 2, 4, 6, 8, 9]).map((t) => (
              <span key={t} style={{ left: pos(t) }}>{t}</span>
            ))}
          </div>
        </div>

        <div className="resultbar__avg">
          <span className="resultbar__label">{isFirst ? 'Ocena łączna' : 'Średnia'}</span>
          <span className="resultbar__num num">{fmtAvg(r.average)}</span>
          {r.band && <span className="resultbar__band">{r.band.label.toLowerCase()} <span className="faint num">({r.band.range})</span></span>}
        </div>

        <div className="resultbar__verdict">
          {r.result ? (
            <span className={`verdict-tag ${r.result === 'POSITIVE' ? 'verdict-tag--pos' : 'verdict-tag--neg'} ${r.provisional ? 'is-provisional' : ''}`}>
              {r.result === 'POSITIVE' ? 'POZYTYWNA' : 'NEGATYWNA'}
              {r.provisional && <span className="verdict-tag__note">wstępnie</span>}
            </span>
          ) : (
            <span className="verdict-tag verdict-tag--none">brak wyniku</span>
          )}
          <span className="resultbar__reason">
            {r.reason} <span className="legal">{r.legal}</span>
            {reasons.length > 0 && (
              <button type="button" className="btn--link resultbar__more" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                {open ? 'ukryj podstawę' : 'pełna podstawa'}
              </button>
            )}
          </span>
        </div>
      </div>
    </div>
  )
}
