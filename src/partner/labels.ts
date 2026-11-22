import type { SignalKind, SignalLevel, TrendKind } from '../api/partner'

export const TREND_LABEL: Record<TrendKind, string> = {
  NO_DATA: 'za mało danych',
  STABLE: 'stabilnie',
  IMPROVING: 'poprawa',
  GRADUAL_DECLINE: 'stopniowy spadek',
  SUDDEN_DROP: 'nagły spadek',
}

export const TREND_TONE: Record<TrendKind, 'neutral' | 'success' | 'warning' | 'error'> = {
  NO_DATA: 'neutral',
  STABLE: 'neutral',
  IMPROVING: 'success',
  GRADUAL_DECLINE: 'warning',
  SUDDEN_DROP: 'error',
}

export const SIGNAL_SHORT: Record<SignalKind, string> = {
  OVERLOAD: 'Przeciążenie',
  MOTIVATION_DROP: 'Spadek motywacji',
  BURNOUT_RISK: 'Ryzyko wypalenia',
  APPRECIATION: 'Do docenienia',
}

export const LEVEL_TONE: Record<SignalLevel, 'warning' | 'error' | 'success'> = {
  WATCH: 'warning',
  ALERT: 'error',
  POSITIVE: 'success',
}

export const LEVEL_LABEL: Record<SignalLevel, string> = {
  WATCH: 'do obserwacji',
  ALERT: 'wymaga uwagi',
  POSITIVE: 'pozytywny',
}


/** User-facing name of the module (code and files keep "partner"): a feature of the app, not a person from HR. */
export const ASSISTANT_NAME = 'Wirtualny asystent HR'

/** What the supervisor sees and that nothing here affects the assessment; under /dobrostan and behind the "i" in the hints. */
export const ASSISTANT_INTRO = 'Wirtualny asystent HR to funkcja aplikacji, nie osoba.'
export const ASSISTANT_SCOPE =
  'Widzisz tylko ogólny wskaźnik pulsu i sygnały; pojedynczych odpowiedzi nie widzi nikt poza pracownikiem. Nic tutaj nie wpływa na ocenę okresową.'
