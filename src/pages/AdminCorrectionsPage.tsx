import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import { useState } from 'react'
import { errorMessage } from '../api/client'
import { getAdminCase, getAdminCases, postCorrection, type CorrectableField } from '../api/corrections'
import { CaseHistory } from '../case/CaseHistory'
import { ErrorState, LoadingState } from '../components/QueryState'
import { Field, InlineAlert, Select, Snackbar, TextArea, TextInput } from '../components/ui'
import { CASE_STATUS_LABEL } from '../lib/stages'
import './admin.css'

const RESULT_LABEL: Record<string, string> = { POSITIVE: 'pozytywna', NEGATIVE: 'negatywna', YES: 'TAK', NO: 'NIE' }
const MIN_REASON = 10

/** The value as the form control holds it (string), and back to what the API expects. */
function toInput(f: CorrectableField): string {
  if (f.value === null || f.value === undefined) return ''
  if (Array.isArray(f.value)) return f.value.join(', ')
  return String(f.value as string | number)
}
function fromInput(f: CorrectableField, raw: string): unknown {
  if (f.kind === 'TEXT') return raw
  if (raw.trim() === '') return f.kind === 'CRITERIA' ? [] : null
  if (f.kind === 'CRITERIA') return raw.split(',').map((x) => x.trim()).filter(Boolean)
  if (f.kind === 'SCORE' || f.kind === 'YEAR') return Number(raw)
  return raw
}

/**
 * ADMIN: „tryb korekty błędów przez administratora”. Fields locked after a confirmation can be changed only here,
 * one field at a time, with a mandatory reason; every change is audited in the case history.
 */
export function AdminCorrectionsPage() {
  const cases = useQuery({ queryKey: ['admin', 'cases'], queryFn: ({ signal }) => getAdminCases(signal) })
  const [caseId, setCaseId] = useState('')

  if (cases.isPending) return <div className="page"><LoadingState /></div>
  if (cases.isError) return <div className="page"><ErrorState error={cases.error} what="lista teczek" onRetry={() => cases.refetch()} /></div>

  return (
    <div className="page page--wide corr-page">
      <header className="page-head">
        <div>
          <h1 className="h-page">Tryb korekty błędów</h1>
          <p className="muted corr-lead">
            Pola arkusza blokują się po każdym potwierdzeniu. Zmienić je można wyłącznie tutaj, z podaniem powodu; każda
            korekta (kto, kiedy, stara → nowa wartość) trafia do historii teczki.
          </p>
        </div>
      </header>
      <section className="section">
        <Field id="corr-case" label="Teczka oceny">
          {(p) => (
            <Select
              {...p}
              placeholder="Wybierz teczkę"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              options={cases.data.map((c) => ({
                value: c.id,
                label: `${c.person.firstName} ${c.person.lastName} · arkusz ${c.sheetId ?? '—'} · ${CASE_STATUS_LABEL[c.status]} · oceniający: ${c.evaluatorName}${c.corrections ? ` · korekty: ${c.corrections}` : ''}`,
              }))}
            />
          )}
        </Field>
      </section>
      {caseId && <CaseCorrections key={caseId} id={caseId} />}
    </div>
  )
}

function CaseCorrections({ id }: { id: string }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['admin', 'case', id], queryFn: ({ signal }) => getAdminCase(id, signal) })
  const [fieldName, setFieldName] = useState('')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const [saved, setSaved] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: (body: { field: string; value: unknown; reason: string }) => postCorrection(id, body),
    onSuccess: (res) => {
      qc.setQueryData(['admin', 'case', id], { case: res.case, fields: res.fields })
      void qc.invalidateQueries({ queryKey: ['admin', 'cases'] })
      void qc.invalidateQueries({ queryKey: ['case', id] })
      setSaved(`Zapisano korektę pola „${res.correction.label}”: ${res.correction.oldValue} → ${res.correction.newValue}.`)
      setReason('')
    },
  })

  if (q.isPending) return <LoadingState />
  if (q.isError) return <ErrorState error={q.error} what="teczka" onRetry={() => q.refetch()} />

  const { case: detail, fields } = q.data
  const field = fields.find((f) => f.field === fieldName)
  const pick = (name: string) => {
    setFieldName(name)
    const f = fields.find((x) => x.field === name)
    setValue(f ? toInput(f) : '')
    save.reset()
  }
  const locks = [detail.locks?.partI, detail.locks?.partII].filter((x): x is string => !!x)
  const reasonLength = reason.trim().length
  const reasonOk = reasonLength >= MIN_REASON
  // Sections in sheet order (część I, II, III), each once.
  const sections = [...new Set(fields.map((f) => f.section))].sort((a, b) => a.localeCompare(b, 'pl'))

  return (
    <section className="section" aria-labelledby="corr-h">
      <h2 id="corr-h" className="h-section">
        {detail.person.firstName} {detail.person.lastName} · arkusz {detail.sheetId ?? '—'}
      </h2>
      {locks.length === 0 ? (
        <InlineAlert tone="info" title="Nic nie jest jeszcze zablokowane">
          Oceniający sam zmienia pola tej teczki do czasu potwierdzenia części I. Korekta dotyczy tylko pól zablokowanych.
        </InlineAlert>
      ) : (
        <ul className="case-history__locks">
          {locks.map((l) => (
            <li key={l}><Lock size={13} aria-hidden="true" /> {l}</li>
          ))}
        </ul>
      )}

      <div className="panel" style={{ padding: 16, display: 'grid', gap: 12, maxWidth: '48rem' }}>
        <Field id="corr-field" label="Pole do korekty" hint="Pola pogrupowane według części arkusza.">
          {(p) => (
            <select {...p} className="select" value={fieldName} onChange={(e) => pick(e.target.value)}>
              <option value="">Wybierz pole</option>
              {sections.map((section) => (
                <optgroup key={section} label={section}>
                  {fields
                    .filter((f) => f.section === section)
                    .map((f) => (
                      <option key={f.field} value={f.field}>{`${f.label} (obecnie: ${f.display})`}</option>
                    ))}
                </optgroup>
              ))}
            </select>
          )}
        </Field>
        {field && (
          <>
            <p className="small">
              Obecna wartość: <strong>{field.display}</strong>
            </p>
            <Field id="corr-value" label="Nowa wartość" hint={field.kind === 'CRITERIA' ? 'Identyfikatory kryteriów oddzielone przecinkami (najwyżej 3).' : undefined}>
              {(p) =>
                field.options ? (
                  <Select
                    {...p}
                    placeholder="(puste)"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    options={field.options.map((o) => ({ value: String(o), label: field.kind === 'SCORE' ? `${o} pkt` : (RESULT_LABEL[String(o)] ?? String(o)) }))}
                  />
                ) : field.kind === 'TEXT' ? (
                  <TextArea {...p} rows={5} value={value} onChange={(e) => setValue(e.target.value)} />
                ) : (
                  <TextInput {...p} type={field.kind === 'DATE' ? 'date' : field.kind === 'YEAR' ? 'number' : 'text'} value={value} onChange={(e) => setValue(e.target.value)} />
                )
              }
            </Field>
            <Field
              id="corr-reason"
              label="Powód korekty (wymagany)"
              hint={
                <>
                  Co najmniej {MIN_REASON} znaków; trafia do historii teczki.{' '}
                  <span className={reasonOk ? 'num' : 'num corr-count--short'} aria-live="polite">
                    {reasonOk ? `${reasonLength} znaków ✓` : `${reasonLength}/${MIN_REASON} znaków`}
                  </span>
                </>
              }
            >
              {(p) => <TextArea {...p} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />}
            </Field>
            {save.isError && (
              <InlineAlert tone="error" live title="Nie zapisano korekty">
                {errorMessage(save.error)}
              </InlineAlert>
            )}
            <div>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!reasonOk || save.isPending}
                onClick={() => save.mutate({ field: field.field, value: fromInput(field, value), reason })}
              >
                {save.isPending ? 'Zapisuję…' : 'Zapisz korektę'}
              </button>
            </div>
          </>
        )}
      </div>

      <CaseHistory detail={detail} />
      <Snackbar open={saved !== null} message={saved ?? ''} onClose={() => setSaved(null)} />
    </section>
  )
}
