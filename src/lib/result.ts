import type { CaseDetail } from '../api/cases'
import type { CriteriaCatalogue } from '../api/reference'
import { fmtAvg } from './format'
import { criterionName } from './model'
import { bandFor } from './scale'

export interface LiveResult {
  decided: number
  total: number
  complete: boolean
  average: number | null
  band: { label: string; range: string } | null
  result: 'POSITIVE' | 'NEGATIVE' | null
  /** true when the result can still change (not every criterion decided) */
  provisional: boolean
  reason: string
  legal: string
}

const R16 = 'rozp. PRM z 4.04.2016'

/**
 * Live result for the sticky bar. Mirrors §11 rozp. 2016; thresholds compared on the
 * exact average. When the backend has computed `evaluation` (all decisions present) it takes precedence.
 */
export function liveResult(detail: CaseDetail, criteria: string[], model: CriteriaCatalogue | undefined): LiveResult {
  const pts = criteria.map((c) => detail.decisions[c]).filter((p): p is number => p !== undefined && p !== null)
  const decided = pts.length
  const total = criteria.length
  const complete = decided === total && total > 0
  const average = decided ? pts.reduce((a, b) => a + b, 0) / decided : null
  const ev = complete ? detail.evaluation : null

  const band = ev?.level ?? (average !== null ? bandFor(average) : null)
  const ones = criteria.filter((c) => detail.decisions[c] === 1)
  if (ones.length) {
    return {
      decided, total, complete, average, band, result: 'NEGATIVE', provisional: false,
      reason: `${ones.map((c) => `„${criterionName(model, c)}”`).join(', ')}: 1 pkt — ocena negatywna niezależnie od średniej.`,
      legal: `§11 ust. 1 pkt 4 ${R16}`,
    }
  }
  if (average === null) {
    return { decided, total, complete, average, band: null, result: null, provisional: true, reason: 'Wynik i średnia pojawią się, gdy wybierzesz ocenę cząstkową przynajmniej jednego kryterium.', legal: `§11 ust. 1 ${R16}` }
  }
  const avg = ev?.average ?? average
  const positive = ev ? ev.result === 'POSITIVE' : avg > 4
  let reason: string
  if (avg === 4) reason = 'Średnia wynosi dokładnie 4,00. Ocena pozytywna wymaga średniej wyższej niż 4 pkt.'
  else if (positive) reason = 'Średnia powyżej 4 pkt i żadna ocena cząstkowa nie wynosi 1 pkt.'
  else reason = `Średnia ${fmtAvg(avg)} nie przekracza 4 pkt.`
  if (!complete) reason = `Wstępnie, po ${decided} z ${total} kryteriów. ${reason}`
  return { decided, total, complete, average: avg, band, result: positive ? 'POSITIVE' : 'NEGATIVE', provisional: !complete, reason, legal: `§11 ust. 1 pkt 2–4 ${R16}` }
}
