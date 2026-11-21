import type { CaseDetail } from '../api/cases'

/**
 * Miejscowość wpisywana przy podpisach na arkuszu oceny („miejscowość, data”): w podglądzie arkusza
 * (`SheetDocument`) i przy podpisie oceniającego w części II. Pochodzi z konfiguracji urzędu w backendzie
 * (zmienna `OFFICE_CITY`, `CaseDetail.office`), więc każdy urząd ustawia ją bez zmiany kodu.
 */
export function officePlace(detail: Pick<CaseDetail, 'office'>): string {
  return detail.office?.city ?? ''
}
