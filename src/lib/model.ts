import { useQuery } from '@tanstack/react-query'
import type { CaseDetail } from '../api/cases'
import { getCivilServiceGrades, getCriteria, getSheets, type CriteriaCatalogue, type Criterion, type Sheet } from '../api/reference'

export function useCriteria() {
  return useQuery({
    queryKey: ['criteria'],
    queryFn: ({ signal }) => getCriteria(signal),
    staleTime: Infinity,
  })
}

export function useSheets() {
  return useQuery({
    queryKey: ['sheets'],
    queryFn: ({ signal }) => getSheets(signal),
    staleTime: Infinity,
  })
}

export function useCivilServiceGrades() {
  return useQuery({
    queryKey: ['civil-service-grades'],
    queryFn: ({ signal }) => getCivilServiceGrades(signal),
    staleTime: Infinity,
  })
}

export function criterionName(catalogue: CriteriaCatalogue | undefined, id: string): string {
  return catalogue?.criteria.find((x) => x.id === id)?.name ?? id
}

export function findCriterion(catalogue: CriteriaCatalogue | undefined, id: string): Criterion | undefined {
  return catalogue?.criteria.find((x) => x.id === id)
}

export interface CaseCriteria {
  sheet: Sheet | undefined
  mandatory: string[]
  additional: string[]
  all: string[]
  scale: number[]
}

/** Criteria assessed in this case: mandatory for the sheet + additional from part I. */
export function caseCriteria(detail: Pick<CaseDetail, 'sheetId' | 'partI'>, sheets: Sheet[] | undefined): CaseCriteria {
  const sheet = sheets?.find((s) => s.id === detail.sheetId)
  const mandatory = sheet?.mandatoryCriteria ?? []
  const additional = detail.partI.additionalCriteria
  return {
    sheet,
    mandatory,
    additional,
    all: [...mandatory, ...additional],
    scale: sheet?.scale ?? [],
  }
}
