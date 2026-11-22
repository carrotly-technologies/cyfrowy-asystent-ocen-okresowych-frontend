import type { ResultTone } from '../components/ui'
import type { ReasonSource, SignalKind, SignalLevel, TrendKind } from '../api/partner'

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
  BURNOUT_RISK: 'Sygnał z pulsu',
  APPRECIATION: 'Do docenienia',
}

export const LEVEL_TONE: Record<SignalLevel, 'warning' | 'error' | 'success'> = {
  WATCH: 'warning',
  ALERT: 'error',
  POSITIVE: 'success',
}

/** Short level label in the „Sygnały w zespole” table (next to the coloured dot, never colour alone). */
export const LEVEL_SHORT: Record<SignalLevel, string> = {
  ALERT: 'Alert',
  WATCH: 'Do obserwacji',
  POSITIVE: 'Do docenienia',
}

/** Dot colour of the level in a `ResultTable` (same meaning as `LEVEL_TONE`). */
export const LEVEL_DOT: Record<SignalLevel, ResultTone> = {
  ALERT: 'danger',
  WATCH: 'warn',
  POSITIVE: 'ok',
}

/**
 * What a signal means and what it comes from, in one sentence; follows the rules in the backend
 * (`src/partner/signals.rules.ts`), without their thresholds (those stay in the backend).
 */
export const SIGNAL_DESCRIPTION: Record<SignalKind, string> = {
  BURNOUT_RISK:
    'Wyczerpanie, które się utrzymuje: niska energia w dwóch kolejnych pulsach albo nagły spadek pulsu przy przeciążeniu; długie nieobecności to wzmacniają.',
  OVERLOAD:
    'Za dużo pracy: pracownik sygnalizuje to w pulsie albo ma wiele zadań po terminie; niedawna zmiana zakresu obowiązków to wzmacnia.',
  MOTIVATION_DROP:
    'Słabnące zaangażowanie: stopniowy spadek pulsu, niska satysfakcja z pracy albo niejasne priorytety; obserwacje „do rozwoju” bez mocnych stron to wzmacniają.',
  APPRECIATION:
    'Dobry moment na pochwałę: mocne strony w obserwacjach, poprawa pulsu albo wysoki, stabilny puls.',
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

/** Where the reason of a flag comes from (the employee card and the team signal table). */
export const SOURCE_LABEL: Record<ReasonSource, string> = {
  PULSE: 'Puls',
  JOURNAL: 'Obserwacje',
  TASKS: 'Zadania',
  SCOPE: 'Zakres obowiązków',
  ABSENCE: 'Nieobecności',
}
