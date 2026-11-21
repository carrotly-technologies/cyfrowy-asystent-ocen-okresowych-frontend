import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import { Link } from 'react-router'
import { downloadEmployeesTemplate, importEmployees, type EmployeesImportResult } from '../../api/employees'
import { MutationError } from '../../case/stages/common'
import { Button, Dialog, Field, FileInput, InlineAlert } from '../../components/ui'
import { countLabel } from '../../lib/format'

const ACTION_LABEL: Record<EmployeesImportResult['rows'][number]['action'], string> = {
  CREATE: 'nowy',
  UPDATE: 'aktualizacja',
  UNCHANGED: 'bez zmian',
}

/**
 * "Importuj pracowników (CSV)": HR picks the file, sees the preview (what will be created or updated and every bad
 * row with its number and reason), then saves. Bad rows never block the good ones.
 */
export function EmployeesImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [csv, setCsv] = useState('')
  const [template, setTemplate] = useState<unknown>(null)
  const preview = useMutation({ mutationFn: (text: string) => importEmployees(text, true) })
  const save = useMutation({
    mutationFn: (text: string) => importEmployees(text, false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['employee-units'] })
    },
  })
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setCsv(text)
    save.reset()
    preview.mutate(text)
  }
  const close = () => {
    setCsv('')
    preview.reset()
    save.reset()
    onClose()
  }
  const result = save.data ?? preview.data
  const toSave = preview.data ? preview.data.created + preview.data.updated : 0

  return (
    <Dialog
      open={open}
      onClose={close}
      wide
      title="Import pracowników (CSV)"
      actions={
        <>
          <Button variant="secondary" onClick={close}>
            Zamknij
          </Button>
          {!save.isSuccess && (
            <Button disabled={!preview.data || toSave === 0} loading={save.isPending} onClick={() => save.mutate(csv)}>
              {toSave > 0 ? `Zapisz ${countLabel(toSave, 'pracownika', 'pracowników', 'pracowników')}` : 'Zapisz'}
            </Button>
          )}
        </>
      }
    >
      <p className="small">
        Wczytaj listę pracowników z systemu kadrowego zamiast dodawać ich pojedynczo. Plik CSV z separatorem średnika
        (UTF-8), jeden pracownik w wierszu. Osoba już obecna w kartotece (ten sam identyfikator albo imię, nazwisko i
        komórka) zostanie zaktualizowana. Najpierw zobaczysz podgląd; nic nie zapisuje się bez Twojego potwierdzenia.
      </p>
      <p className="small">
        Kolumny: identyfikator (opcjonalnie), imię, nazwisko, komórka, stanowisko, kierownik urzędu, kieruje ludźmi,
        urzędnik mianowany (tak / nie), rok mianowania, stopień (I–IX), data zatrudnienia na czas nieokreślony,
        oceniający (login albo imię i nazwisko). Daty: RRRR-MM-DD lub DD.MM.RRRR.
      </p>
      <p>
        <Button
          variant="secondary"
          size="small"
          icon={<Download size={16} aria-hidden="true" />}
          onClick={() => {
            setTemplate(null)
            downloadEmployeesTemplate().catch(setTemplate)
          }}
        >
          Pobierz wzór CSV
        </Button>
      </p>
      <MutationError error={template} />
      <Field label="Plik CSV z listą pracowników">
        {(control) => <FileInput {...control} accept=".csv,text/csv" onChange={(e) => void onFile(e)} />}
      </Field>

      {preview.isPending && <p className="small" role="status">Sprawdzanie pliku…</p>}
      {result && (
        <>
          <InlineAlert
            tone={save.isSuccess ? 'success' : result.failed > 0 ? 'warning' : 'info'}
            live
            title={save.isSuccess ? 'Zapisano w kartotece' : 'Podgląd importu (jeszcze nie zapisano)'}
          >
            <p>
              {save.isSuccess ? 'Dodano' : 'Do dodania'}: {result.created} · {save.isSuccess ? 'zaktualizowano' : 'do aktualizacji'}:{' '}
              {result.updated} · bez zmian: {result.unchanged} · wiersze z błędami: {result.failed}
              {result.failed > 0 && !save.isSuccess && ' (zostaną pominięte; popraw je w pliku i wczytaj go ponownie)'}
            </p>
          </InlineAlert>
          {result.errors.length > 0 && (
            <InlineAlert tone="error" title={`Wiersze z błędami (${result.errors.length})`}>
              <ul className="import-rows">
                {result.errors.map((e) => (
                  <li key={e.line}>{e.message}</li>
                ))}
              </ul>
            </InlineAlert>
          )}
          {result.rows.length > 0 && (
            <ul className="import-rows" aria-label="Wiersze poprawne">
              {result.rows.map((r) => (
                <li key={r.line}>
                  <span className="num">w. {r.line}</span>
                  {' · '}
                  {save.isSuccess && r.employeeId ? (
                    <Link to={`/kartoteka/${encodeURIComponent(r.employeeId)}`} onClick={close}>
                      {r.name}
                    </Link>
                  ) : (
                    r.name
                  )}
                  {' · '}
                  {r.unit}
                  {' · oceniający: '}
                  {r.evaluatorName ?? 'nie wskazano'}
                  {' · sugerowany arkusz '}
                  {r.sheetId}
                  <span className="faint"> ({ACTION_LABEL[r.action]})</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <MutationError error={preview.error ?? save.error} />
    </Dialog>
  )
}
