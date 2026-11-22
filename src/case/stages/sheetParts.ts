/** The three parts of sheet A/B/C, by number (`?czesc=1|2|3`). */
export const SHEET_PARTS = {
  1: { mark: 'I', name: 'Część I – kryteria oceny i termin' },
  2: { mark: 'II', name: 'Część II – ocena okresowa' },
  3: { mark: 'III', name: 'Część III – wniosek o kolejny stopień' },
} as const

export type SheetPart = keyof typeof SHEET_PARTS

/** `?czesc=` as one of `parts`, or null when missing or out of range. */
export function readSheetPart(raw: string | null, parts: readonly SheetPart[]): SheetPart | null {
  const n = Number(raw)
  return parts.find((p) => p === n) ?? null
}
