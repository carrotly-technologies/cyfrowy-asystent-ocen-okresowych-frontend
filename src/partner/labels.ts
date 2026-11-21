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

