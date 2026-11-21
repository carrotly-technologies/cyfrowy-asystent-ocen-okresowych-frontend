import type { AssistantMode } from '../api/assistant'
import type { StageId } from '../api/cases'

type Bank = Partial<Record<StageId | 'GENERAL', string[]>>

const FORMAL: Bank = {
  GENERAL: [
    'Kiedy przeprowadza się rozmowę rozpoczynającą?',
    'Jak często sporządza się ocenę okresową?',
    'Ile dni ma oceniany na sprzeciw i do kogo go składa?',
  ],
  SHEET_SELECTION: [
    'Kiedy stosuje się arkusz A, B, a kiedy C?',
    'Ile kryteriów dodatkowych mogę wybrać i na jakiej podstawie?',
    'Czy mogę nie wybrać żadnego kryterium dodatkowego?',
  ],
  OPENING_TALK: [
    'Jakie zagadnienia muszę omówić na rozmowie rozpoczynającej?',
    'Jak ustalić termin sporządzenia oceny?',
    'Od kiedy liczy się okres podlegania ocenie?',
  ],
  OBSERVATION: [
    'Co zrobić, gdy pracownik jest długo nieobecny w okresie oceny?',
    'Czy zmiana oceniającego wpływa na termin oceny?',
    'Kiedy powinna odbyć się rozmowa oceniająca?',
  ],
  ASSESSMENT: [
    'Czy jedna ocena 1 pkt oznacza ocenę negatywną?',
    'Co jeśli średnia wynosi dokładnie 4,00?',
    'Kiedy uzasadnienie oceny jest obowiązkowe?',
  ],
  SIGNATURE: [
    'Kiedy uzasadnienie oceny jest obowiązkowe?',
    'Co powinny zawierać wnioski do IPRZ?',
    'Kto zatwierdza indywidualny program rozwoju zawodowego?',
  ],
  ACKNOWLEDGEMENT: [
    'Co się dzieje po złożeniu sprzeciwu?',
    'Kiedy zaczyna się kolejny cykl oceny?',
    'Gdzie trafia oryginał arkusza?',
  ],
  PART_I_ACK: [
    'Co potwierdza oceniany po rozmowie rozpoczynającej?',
    'Od kiedy liczy się okres podlegania ocenie?',
  ],
}

const CONVERSATION: Bank = {
  GENERAL: [
    'Jak przygotować się do rozmowy oceniającej?',
    'Jak przekazać trudną informację zwrotną?',
  ],
  SHEET_SELECTION: ['Jak wyjaśnić pracownikowi wybór kryteriów dodatkowych?'],
  OPENING_TALK: [
    'Zaproponuj pytania otwierające rozmowę rozpoczynającą.',
    'Jak sformułować mierzalne oczekiwania dla kryterium Komunikacja?',
    'Jak ustalić cele na okres oceny?',
  ],
  OBSERVATION: [
    'Jak zapisywać obserwacje, żeby były obiektywne?',
    'Jak udzielać bieżącej informacji zwrotnej?',
  ],
  ASSESSMENT: [
    'Zaproponuj pytania do rozmowy o kryterium Współpraca.',
    'Jak omówić obszar do rozwoju bez demotywowania?',
    'Pomóż uporządkować argumenty do tej oceny.',
  ],
  SIGNATURE: [
    'Pomóż napisać szkic uzasadnienia na podstawie moich decyzji.',
    'Zaproponuj działania rozwojowe dla najsłabszego kryterium.',
  ],
  ACKNOWLEDGEMENT: ['Jak rozmawiać z pracownikiem, który nie zgadza się z oceną?'],
}

export function suggestedQuestions(mode: AssistantMode, stage: StageId | undefined): string[] {
  const bank = mode === 'FORMAL' ? FORMAL : CONVERSATION
  return (stage && bank[stage]) || bank.GENERAL || []
}
