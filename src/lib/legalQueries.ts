import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, errorMessage } from '../api/client'
import type { CaseDetail } from '../api/cases'
import { caseKey } from './caseQueries'

/** 403/409 from these flows already carry a Polish explanation; add what to do next. */
export function legalErrorText(err: unknown): string {
  if (err instanceof ApiError && err.status === 403) {
    return `${errorMessage(err)} Jeśli uważasz, że to błąd, skontaktuj się z kadrami.`
  }
  if (err instanceof ApiError && err.status === 409) {
    return `${errorMessage(err)} Odśwież stronę, żeby zobaczyć aktualny stan sprawy.`
  }
  return errorMessage(err)
}

/** POST that returns the case: puts it in the cache and refreshes the lists. */
export function useLegalMutation<T>(id: string, fn: (body: T) => Promise<CaseDetail>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData(caseKey(id), data)
      for (const key of ['team', 'hr', 'my-cases', 'objections']) qc.invalidateQueries({ queryKey: [key] })
    },
  })
}

export const OUTCOME_SHORT = {
  DISMISS: 'Oddalony',
  CHANGE: 'Zmiana oceny',
  REDO: 'Ponowne sporządzenie',
} as const

