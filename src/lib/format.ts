/** Fixed demo "today" — keep in sync with the backend's DEMO_TODAY. */
export const DEMO_TODAY = '2026-11-21'

const MONTHS_GEN = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
]

/** 2026-12-12 → 12.12.2026 (format used in the official sheets: dd.mm.rrrr). */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

/** 2026-12-12 → 12 grudnia 2026 */
export function fmtDateLong(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} ${MONTHS_GEN[m - 1]} ${y}`
}

/**
 * Polish plural form: plural(1, 'nieprzeczytane', 'nieprzeczytane', 'nieprzeczytanych'), (2–4, 22–24…) → few,
 * (0, 5–21, 25…) → many. Use countLabel() to get "5 dni".
 */
export function plural(n: number, one: string, few: string, many: string) {
  const abs = Math.abs(n)
  if (abs === 1) return one
  const d = abs % 10
  const h = abs % 100
  return d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many
}

export const days = (n: number) => `${n} ${plural(n, 'dzień', 'dni', 'dni')}`

/** Relative deadline text: "za 21 dni", "dziś", "po terminie 3 dni". */
export function fmtDaysLeft(daysLeft: number | null): string {
  if (daysLeft === null) return ''
  if (daysLeft === 0) return 'dziś'
  if (daysLeft === 1) return 'jutro'
  if (daysLeft > 0) return `za ${days(daysLeft)}`
  return `po terminie ${days(-daysLeft)}`
}

/** 4.2 → "4,20" (exact average, Polish decimal comma). */
export function fmtAvg(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toFixed(digits).replace('.', ',')
}

export function plPoints(n: number): string {
  return `${n} ${plural(n, 'punkt', 'punkty', 'punktów')}`
}

export function countLabel(n: number, one: string, few: string, many: string) {
  return `${n} ${plural(n, one, few, many)}`
}

/** "RZETELNOŚĆ" → "Rzetelność"; keeps "i ORIENTACJA" lower-cased too. */
export function sentenceCase(s: string): string {
  const lower = s.toLocaleLowerCase('pl-PL')
  return lower.charAt(0).toLocaleUpperCase('pl-PL') + lower.slice(1)
}

export function addDaysIso(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`
}

const NUM = new Map<number, Intl.NumberFormat>()

/** Number for display, Polish style: 4.6 → "4,6", 1234.5 → "1 234,5". `digits` = max fraction digits (default 1). */
export function fmtNumber(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  let f = NUM.get(digits)
  if (!f) {
    f = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: digits, useGrouping: true })
    NUM.set(digits, f)
  }
  return f.format(n)
}

/** 0.456 → "45,6%". */
export function fmtPercent(share: number | null | undefined, digits = 1): string {
  if (share === null || share === undefined || Number.isNaN(share)) return '—'
  return `${fmtNumber(share * 100, digits)}%`
}

/** "21.11.2026" / "21.11.26" / "1.2.2026" → "2026-11-21"; null when not a real date. */
export function parsePlDate(text: string): string | null {
  const m = /^\s*(\d{1,2})[.\-/ ](\d{1,2})[.\-/ ](\d{4})\s*$/.exec(text)
  if (!m) return null
  const d = Number(m[1])
  const mo = Number(m[2])
  const y = Number(m[3])
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** "9:30" / "0930" / "9" → "09:30" / "09:30" / "09:00" (24 h); null when not a valid time. */
export function parsePlTime(text: string): string | null {
  const t = text.trim()
  const m = /^(\d{1,2})(?:[:.]?(\d{2}))?$/.exec(t)
  if (!m) return null
  const h = Number(m[1])
  const min = m[2] === undefined ? 0 : Number(m[2])
  if (h > 23 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}
