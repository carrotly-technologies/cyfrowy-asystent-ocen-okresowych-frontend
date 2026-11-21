import { ArrowLeft, Download, Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiDownload, errorMessage } from '../api/client'
import { Link, useParams, useSearchParams } from 'react-router'
import { ErrorState, LoadingState } from '../components/QueryState'
import { useCase } from '../lib/caseQueries'
import { caseCriteria, useCriteria, useSheets } from '../lib/model'
import { caseUrl } from '../lib/stages'
import { HOME_BY_ROLE, useMe } from '../lib/useAuth'
import { SheetDocument } from './SheetDocument'

/** `ocena-<nazwisko>-<data>`: the same name as the server PDF (GET /api/cases/:id/sheet.pdf). */
function fileBase(lastName: string, date: string): string {
  const ascii = lastName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .toLowerCase()
  return `ocena-${ascii}-${date}`
}

/**
 * Full-page document preview for the evaluator, the assessed person and HR. „Pobierz PDF” downloads the PDF
 * generated on the server; „Drukuj” uses the browser's print stylesheet (the same layout as on screen).
 */
export function SheetPage() {
  const { id = '' } = useParams()
  const me = useMe()
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [params] = useSearchParams()
  const q = useCase(id)
  const model = useCriteria()
  const sheets = useSheets()
  const ready = q.isSuccess && model.isSuccess && sheets.isSuccess
  const autoPrint = params.get('druk') === '1'

  useEffect(() => {
    if (!ready) return
    const name = fileBase(q.data.person.lastName, q.data.signedByEvaluatorOn ?? new Date().toISOString().slice(0, 10))
    const prev = document.title
    document.title = `Arkusz oceny — ${q.data.person.firstName} ${q.data.person.lastName}`
    if (autoPrint) {
      document.title = name
      const t = window.setTimeout(() => window.print(), 400)
      return () => {
        window.clearTimeout(t)
        document.title = prev
      }
    }
    return () => {
      document.title = prev
    }
  }, [ready, autoPrint, q.data])

  if (q.isError) return <div className="page"><ErrorState error={q.error} what="arkusz" /></div>
  if (!ready) return <div className="page"><LoadingState /></div>

  const detail = q.data
  const name = `${detail.person.firstName} ${detail.person.lastName}`
  const back =
    me.role === 'SUPERVISOR' ? caseUrl(detail.id, detail.currentStage) : me.role === 'EMPLOYEE' ? `/moje-oceny/${detail.id}` : HOME_BY_ROLE[me.role]
  const download = async () => {
    setDownloading(true)
    setDownloadError(null)
    try {
      await apiDownload(`/cases/${encodeURIComponent(detail.id)}/sheet.pdf`, `${fileBase(detail.person.lastName, detail.signedByEvaluatorOn ?? '')}.pdf`)
    } catch (err) {
      setDownloadError(errorMessage(err))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="sheet-view">
      <header className="sheet-bar">
        <Link to={back} className="btn btn--ghost">
          <ArrowLeft size={15} aria-hidden="true" /> Wróć
        </Link>
        <div className="sheet-bar__title">
          <strong>Podgląd arkusza</strong>
          <span className="muted">
            {name} · {`arkusz ${detail.sheetId ?? '—'}`} · stan na dziś, wypełnia się z decyzji w teczce
          </span>
        </div>
        {downloadError && <span className="sheet-bar__error" role="alert">{downloadError}</span>}
        <button type="button" className="btn btn--ghost" onClick={() => window.print()}>
          <Printer size={15} aria-hidden="true" /> Drukuj
        </button>
        <button type="button" className="btn btn--primary" disabled={downloading} onClick={() => void download()}>
          <Download size={15} aria-hidden="true" /> {downloading ? 'Przygotowuję PDF…' : 'Pobierz PDF'}
        </button>
      </header>
      <div className="sheet-scroll">
        <SheetDocument detail={detail} model={model.data} criteria={caseCriteria(detail, sheets.data)} />
      </div>
    </div>
  )
}
