/**
 * One wording for "who assesses" everywhere (Monitoring, Kartoteka): the
 * regular evaluator and, during a substitution, the substitute in brackets:
 * "Agnieszka Pawlak (zast. Robert Sikora)".
 */
export function evaluatorLabel(regular: string | null | undefined, effective: string | null | undefined): string {
  if (!regular) return effective ?? ''
  return effective && effective !== regular ? `${regular} (zast. ${effective})` : regular
}
