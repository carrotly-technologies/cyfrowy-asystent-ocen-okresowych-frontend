import type { Role } from '../api/cases'

/**
 * Demo accounts of the functional POC, shown as one-click sign-in on /logowanie.
 * They mirror the seed in cyfrowy-asystent-ocen-okresowych-backend (`src/auth/users.seed.ts`, credentials in its README);
 * fictional people, update this list by hand when the seed changes.
 */
export type DemoAccount = {
  login: string
  name: string
  role: Role
  description: string
}

/**
 * Hidden with VITE_DEMO_ACCOUNTS=false at build time (e.g. a real deployment without demo data).
 * Vite inlines the value, so with `false` the list, the password and the section are dropped from the bundle.
 */
export const DEMO_ACCOUNTS_ENABLED = import.meta.env.VITE_DEMO_ACCOUNTS !== 'false'

/** Shared password of every demo account (POC only, the same as in the backend README). Never displayed. */
export const DEMO_PASSWORD = DEMO_ACCOUNTS_ENABLED ? 'Ocena2026!' : ''

export const DEMO_ACCOUNTS: readonly DemoAccount[] = DEMO_ACCOUNTS_ENABLED
  ? [
      { login: 'j.kaminska', name: 'Joanna Kamińska', role: 'SUPERVISOR', description: 'Zespół z 9 ocenami w toku (arkusze B i C)' },
      { login: 'a.nowak', name: 'Anna Nowak', role: 'EMPLOYEE', description: 'Oceniana: 2 oceny (poprzednia i bieżąca)' },
      { login: 'p.wojcik', name: 'Piotr Wójcik', role: 'EMPLOYEE', description: 'Oceniany: czeka na potwierdzenie części I' },
      { login: 'j.mazur', name: 'Julia Mazur', role: 'EMPLOYEE', description: 'Oceniana: ocena od wyboru arkusza' },
      { login: 'e.dabrowska', name: 'Ewa Dąbrowska', role: 'EMPLOYEE', description: 'Oceniana: biegnie 7 dni na sprzeciw' },
      { login: 't.jankowski', name: 'Tadeusz Jankowski', role: 'EMPLOYEE', description: 'Oceniany: sprzeciw czeka na dyrektora generalnego' },
      { login: 'r.sikora', name: 'Robert Sikora', role: 'SUPERVISOR', description: 'Zespół z 3 teczkami ocen (w tym fikcja zapoznania, sprzeciw)' },
      { login: 'a.pawlak', name: 'Agnieszka Pawlak', role: 'SUPERVISOR', description: 'Zespół z 2 teczkami ocen' },
      { login: 'b.wisniewska', name: 'Barbara Wiśniewska', role: 'DIRECTOR', description: 'Dyrektor generalny: rozstrzyga sprzeciwy' },
      { login: 'a.lis', name: 'Agnieszka Lis', role: 'HR', description: 'Monitoring ocen w całym urzędzie' },
      { login: 'admin', name: 'Marek Zając', role: 'ADMIN', description: 'Konta użytkowników i ich role' },
    ]
  : []
