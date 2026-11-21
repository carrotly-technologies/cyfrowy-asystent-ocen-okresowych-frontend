import type { CaseDetail, Path, StageId } from '../api/cases'

/** URL slugs for /teczka/:id/:stage. */
export const STAGE_SLUG: Record<StageId, string> = {
  OSP_ANALYSIS: 'analiza-osp',
  OPENING_TALK: 'rozmowa-rozpoczynajaca',
  OBSERVATION: 'obserwacje',
  ASSESSMENT: 'ocena',
  JUSTIFICATION: 'uzasadnienie',
  DOCUMENT: 'dokument',
  INTRO_TALK: 'rozmowa-wstepna',
  REPORT: 'sprawozdanie',
  FIRST_ASSESSMENT: 'ocena-pierwsza',
  FIRST_CONDITIONS: 'warunki',
  FIRST_DOCUMENT: 'dokument-pierwsza',
}

export function stageFromSlug(slug: string | undefined): StageId | null {
  if (!slug) return null
  const hit = (Object.entries(STAGE_SLUG) as [StageId, string][]).find(([, s]) => s === slug)
  return hit ? hit[0] : null
}

export const caseUrl = (id: string, stage?: StageId) =>
  stage ? `/teczka/${id}/${STAGE_SLUG[stage]}` : `/teczka/${id}`

/** Short names used in compact places (team table, HR table, context chip). */
export const STAGE_SHORT: Record<StageId, string> = {
  OSP_ANALYSIS: 'Analiza OSP',
  OPENING_TALK: 'Rozmowa rozpoczynająca',
  OBSERVATION: 'Okres oceny',
  ASSESSMENT: 'Ocena',
  JUSTIFICATION: 'Uzasadnienie i IPRZ',
  DOCUMENT: 'Dokument',
  INTRO_TALK: 'Rozmowa wstępna',
  REPORT: 'Sprawozdanie',
  FIRST_ASSESSMENT: 'Ocena',
  FIRST_CONDITIONS: 'Warunki',
  FIRST_DOCUMENT: 'Dokument',
}

export function pathLabel(path: Path, sheetId: string | null): string {
  if (path === 'FIRST') return 'Pierwsza ocena'
  return sheetId ? `Okresowa · arkusz ${sheetId}` : 'Okresowa · arkusz do ustalenia'
}

export const CASE_STATUS_LABEL = {
  W_TOKU: 'W toku',
  DO_ZAPOZNANIA: 'Do zapoznania',
  OKRES_SPRZECIWU: 'Okres sprzeciwu',
  ZAKONCZONA: 'Zakończona',
} as const

const EVAL_GROUP: StageId[][] = [
  ['ASSESSMENT', 'JUSTIFICATION'],
  ['FIRST_ASSESSMENT', 'FIRST_CONDITIONS'],
]

/** A stage can be worked on when done/current, or when it shares the evaluation step with the current one. */
export function canOpenStage(detail: CaseDetail, stage: StageId): boolean {
  const info = detail.stages.find((s) => s.id === stage)
  if (!info) return false
  if (info.status === 'DONE' || info.status === 'CURRENT') return true
  return EVAL_GROUP.some((g) => g.includes(stage) && g.includes(detail.currentStage))
}

