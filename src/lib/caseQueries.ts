import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addObservation,
  getCase,
  patchCase,
  runCaseAction,
  type CaseAction,
  type CaseDetail,
  type CasePatch,
  type Observation,
} from '../api/cases'

export const caseKey = (id: string) => ['case', id] as const

export function useCase(id: string) {
  return useQuery({
    queryKey: caseKey(id),
    queryFn: ({ signal }) => getCase(id, signal),
  })
}

function mergeNullable<T>(prev: Record<string, T>, patch: Record<string, T | null> | undefined): Record<string, T> {
  if (!patch) return prev
  const next = { ...prev }
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete next[k]
    else next[k] = v
  }
  return next
}

function applyPatch(prev: CaseDetail, patch: CasePatch): CaseDetail {
  return {
    ...prev,
    ...(patch.sheetId ? { sheetId: patch.sheetId } : {}),
    partI: patch.partI ? { ...prev.partI, ...patch.partI, topics: { ...prev.partI.topics, ...(patch.partI.topics ?? {}) } } : prev.partI,
    ratings: patch.ratings ? { ...prev.ratings, ...patch.ratings } : prev.ratings,
    decisions: mergeNullable(prev.decisions, patch.decisions),
    deviationNotes: mergeNullable(prev.deviationNotes, patch.deviationNotes),
    justification: patch.justification ?? prev.justification,
    iprz: patch.iprz ?? prev.iprz,
    firstConditions:
      patch.firstConditions && prev.firstConditions
        ? { ...prev.firstConditions, ...patch.firstConditions }
        : prev.firstConditions,
  }
}

/** PATCH with optimistic update; the server response replaces the cache. */
export function usePatchCase(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: CasePatch) => patchCase(id, patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: caseKey(id) })
      const prev = qc.getQueryData<CaseDetail>(caseKey(id))
      if (prev) qc.setQueryData(caseKey(id), applyPatch(prev, patch))
      return { prev }
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(caseKey(id), ctx.prev)
    },
    onSuccess: (data) => {
      qc.setQueryData(caseKey(id), data)
      qc.invalidateQueries({ queryKey: ['team'] })
      qc.invalidateQueries({ queryKey: ['hr'] })
    },
  })
}

export function useCaseAction(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (action: CaseAction) => runCaseAction(id, action),
    onSuccess: (data) => {
      qc.setQueryData(caseKey(id), data)
      qc.invalidateQueries({ queryKey: ['team'] })
      qc.invalidateQueries({ queryKey: ['hr'] })
    },
  })
}

export function useAddObservation(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (o: Omit<Observation, 'id'>) => addObservation(id, o),
    onSuccess: (data) => qc.setQueryData(caseKey(id), data),
  })
}
