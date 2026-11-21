export const SCALE_LABELS: Record<number, string> = {
  1: 'Znacznie poniżej oczekiwań',
  3: 'Poniżej oczekiwań',
  5: 'Na poziomie oczekiwań',
  7: 'Powyżej oczekiwań',
  9: 'Znacznie powyżej oczekiwań',
}

export const SCALE_SHORT: Record<number, string> = {
  1: 'znacznie poniżej',
  3: 'poniżej',
  5: 'na poziomie',
  7: 'powyżej',
  9: 'znacznie powyżej',
}

export const PERIODIC_SCALE = [1, 3, 5, 7, 9] as const
export const FIRST_SCALE = [3, 5, 7] as const

/** Bands from §11 ust. 1 pkt 2 rozp. 2016 (compared on the exact average). */
export const BANDS = [
  { min: 1, max: 2, label: 'Znacznie poniżej oczekiwań', range: '1–2' },
  { min: 2, max: 4, label: 'Poniżej oczekiwań', range: '>2–4' },
  { min: 4, max: 6, label: 'Na poziomie oczekiwań', range: '>4–6' },
  { min: 6, max: 8, label: 'Powyżej oczekiwań', range: '>6–8' },
  { min: 8, max: 9, label: 'Znacznie powyżej oczekiwań', range: '>8–9' },
]

export function bandFor(avg: number) {
  return BANDS.find((b) => avg <= b.max) ?? BANDS[BANDS.length - 1]
}

/** Maps any point value to the closest palette step (FIRST uses 3/5/7). */
export function scoreClass(points: number | null | undefined): string {
  if (points === null || points === undefined) return 'score--none'
  return `score--${points}`
}
