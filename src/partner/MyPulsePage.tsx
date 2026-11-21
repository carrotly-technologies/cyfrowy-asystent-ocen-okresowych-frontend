import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, Unlock } from 'lucide-react'
import { useState } from 'react'
import { getMyPulse, type MyPulse, type PulseAnswers, sharePulse, submitPulse } from '../api/partner'
import { errorMessage } from '../api/client'
import { ErrorState, LoadingState } from '../components/QueryState'
import { Button, Checkbox, InlineAlert, RadioMatrix, TextArea } from '../components/ui'
import { fmtDate } from '../lib/format'
import { PrivacyNote, Sparkline } from './common'
import s from './Partner.module.css'

/** The employee's pulse: a short voluntary check-in every two weeks, with own history. */
export function MyPulsePage() {
  const q = useQuery({ queryKey: ['my-pulse'], queryFn: ({ signal }) => getMyPulse(signal) })
  if (q.isPending) return <div className="page"><LoadingState /></div>
  if (q.isError) return <div className="page"><ErrorState error={q.error} what="mój puls" onRetry={() => q.refetch()} /></div>
  const p = q.data
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="h-page">Mój puls</h1>
          <p className="page-head__meta">Krótkie pytania co {p.intervalDays} dni o obciążenie, energię i wsparcie. Zajmie to minutę.</p>
        </div>
      </header>
      <PrivacyNote items={p.privacy} title="Kto zobaczy moje odpowiedzi?" />
      <section className="section">{p.canSubmit ? <PulseForm info={p} /> : <InlineAlert tone="success">Dziękujemy, puls na ten okres jest wypełniony. Następny: {fmtDate(p.nextDue)}.</InlineAlert>}</section>
      <History pulse={p} />
    </div>
  )
}

function PulseForm({ info }: { info: MyPulse }) {
  const qc = useQueryClient()
  const [values, setValues] = useState<Partial<Record<string, string>>>({})
  const [comment, setComment] = useState('')
  const [share, setShare] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = useMutation({
    mutationFn: submitPulse,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-pulse'] }),
  })
  const columns = Array.from({ length: info.scale.max - info.scale.min + 1 }, (_, i) => {
    const v = info.scale.min + i
    return { value: String(v), label: String(v), sublabel: v === info.scale.min ? 'najgorzej' : v === info.scale.max ? 'najlepiej' : undefined }
  })
  const onSubmit = () => {
    const missing = info.questions.filter((q) => !values[q.id])
    if (missing.length) {
      setError(`Odpowiedz na wszystkie pytania (brakuje: ${missing.map((m) => m.label).join(', ')}).`)
      return
    }
    setError(null)
    const answers = Object.fromEntries(info.questions.map((q) => [q.id, Number(values[q.id])])) as PulseAnswers
    submit.mutate({ answers, comment: comment.trim() || null, shareComment: share && !!comment.trim() })
  }
  return (
    <form
      className={`${s.box} ${s.stack}`}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <h2 className="h-section">Jak się masz w pracy w ostatnich dwóch tygodniach?</h2>
      <RadioMatrix
        id="pulse"
        label="Pytania pulsu"
        rowHeader="Stwierdzenie"
        columns={columns}
        rows={info.questions.map((q) => ({ id: q.id, label: `${q.statement} (1 – ${q.low}, 5 – ${q.high})` }))}
        value={values}
        onChange={(row, v) => setValues((cur) => ({ ...cur, [row]: v }))}
      />
      <label htmlFor="pulse-comment" style={{ fontWeight: 600 }}>
        Komentarz (opcjonalnie)
      </label>
      <TextArea id="pulse-comment" rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
      <Checkbox
        label="Udostępnij komentarz przełożonemu"
        hint="Bez zaznaczenia komentarz widzisz tylko Ty. Przełożony zobaczy wtedy jedynie, że komentarz istnieje."
        checked={share}
        disabled={!comment.trim()}
        onChange={(e) => setShare(e.target.checked)}
      />
      {error && <InlineAlert tone="error" live>{error}</InlineAlert>}
      {submit.isError && <InlineAlert tone="error" live>{errorMessage(submit.error)}</InlineAlert>}
      <div>
        <Button type="submit" loading={submit.isPending}>
          Wyślij puls
        </Button>
      </div>
    </form>
  )
}

function History({ pulse }: { pulse: MyPulse }) {
  const qc = useQueryClient()
  const share = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => sharePulse(id, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-pulse'] }),
  })
  const history = [...pulse.history].reverse()
  return (
    <section className="section" aria-labelledby="hist-h">
      <h2 id="hist-h" className="h-section">Moja historia</h2>
      <div className={`${s.box} ${s.stack}`}>
        <Sparkline points={pulse.history} width={480} height={90} label="Mój indeks pulsu" />
        {history.length === 0 && <p className={s.muted}>Nie masz jeszcze odpowiedzi.</p>}
        <ul className={s.privacy}>
          {history.map((r) => (
            <li key={r.id}>
              <strong>{fmtDate(r.date)}</strong> – indeks {r.index} (
              {pulse.questions.map((q) => `${q.label.toLowerCase()} ${r.answers[q.id]}`).join(', ')})
              {r.comment && (
                <div className={s.row}>
                  <span className={s.muted}>„{r.comment}”</span>
                  <Button
                    type="button"
                    size="small"
                    variant="tertiary"
                    icon={r.shareComment ? <Unlock size={14} aria-hidden="true" /> : <Lock size={14} aria-hidden="true" />}
                    loading={share.isPending && share.variables?.id === r.id}
                    onClick={() => share.mutate({ id: r.id, value: !r.shareComment })}
                  >
                    {r.shareComment ? 'Udostępniony – cofnij' : 'Prywatny – udostępnij'}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
