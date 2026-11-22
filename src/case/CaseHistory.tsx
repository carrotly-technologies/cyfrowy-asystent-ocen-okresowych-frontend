import { Lock } from 'lucide-react'
import type { CaseDetail } from '../api/cases'
import { Disclosure } from '../components/ui'
import { fmtDate } from '../lib/format'

/**
 * Case history with the audit of the administrator's corrections („tryb korekty błędów”: who, when,
 * old → new value, reason) and the reasons why parts of the sheet are locked.
 */
export function CaseHistory({ detail }: { detail: CaseDetail }) {
  const corrections = detail.corrections ?? []
  const locks = [detail.locks?.partI, detail.locks?.partII].filter((x): x is string => !!x)
  return (
    <Disclosure
      className="case-history"
      title={
        <span>
          Historia sprawy ({detail.history.length})
          {corrections.length > 0 && <> · korekty administratora: {corrections.length}</>}
        </span>
      }
    >
      {locks.length > 0 && (
        <ul className="case-history__locks">
          {locks.map((l) => (
            <li key={l}>
              <Lock size={13} aria-hidden="true" /> {l}
            </li>
          ))}
        </ul>
      )}
      {corrections.length > 0 && (
        <div className="case-history__block">
          <h3 className="h-sub">Korekty błędów przez administratora</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Kiedy</th>
                <th>Kto</th>
                <th>Pole</th>
                <th>Było → jest</th>
                <th>Powód</th>
              </tr>
            </thead>
            <tbody>
              {corrections.map((c) => (
                <tr key={c.id}>
                  <td className="num">{new Date(c.at).toLocaleString('pl-PL')}</td>
                  <td>{c.by.name}</td>
                  <td>{c.section}: {c.label}</td>
                  <td>
                    {c.oldValue} → <strong>{c.newValue}</strong>
                  </td>
                  <td>{c.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ol className="case-history__list">
        {[...detail.history].reverse().map((h, i) => (
          <li key={i}>
            <span className="num faint">{fmtDate(h.date)}</span> {h.text}
          </li>
        ))}
      </ol>
    </Disclosure>
  )
}
