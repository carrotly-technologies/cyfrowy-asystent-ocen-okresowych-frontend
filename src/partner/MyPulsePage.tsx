import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, ShieldCheck, Unlock } from 'lucide-react'
import { useState } from 'react'
import { getMyPulse, type MyPulse, type PulseAnswers, sharePulse, submitPulse } from '../api/partner'
import { errorMessage } from '../api/client'
import { ErrorState, LoadingState } from '../components/QueryState'
import { Button, Checkbox, InlineAlert, RadioMatrix, TextArea } from '../components/ui'
import { fmtDate, fmtNumber } from '../lib/format'
import { Sparkline } from './common'
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
          <p className="page-head__meta">
            Pięć krótkich pytań raz na {p.intervalDays} dni o obciążenie, energię i wsparcie. Zajmie to minutę.
          </p>
        </div>
      </header>
      <PulsePrivacy minGroupSize={p.minGroupSize} />
      <section className="section">
        {p.canSubmit ? (
          <PulseForm info={p} />
        ) : (
          <InlineAlert tone="success">
            Dziękujemy, puls na ten okres jest wypełniony. Puls wypełnia się raz na {p.intervalDays} dni, następny możesz wypełnić od {fmtDate(p.nextDue)}.
          </InlineAlert>
        )}
      </section>
      <History pulse={p} />
    </div>
  )
}

/** Always visible: exactly what the supervisor can and cannot see. */
function PulsePrivacy({ minGroupSize }: { minGroupSize: number }) {
  return (
    <section className={`${s.box} ${s.stack}`} aria-labelledby="privacy-h">
      <h2 id="privacy-h" className="h-sub" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
        <ShieldCheck size={20} aria-hidden="true" /> Kto zobaczy Twoje odpowiedzi?
      </h2>
      <p>
        <strong>
          Przełożony widzi przy Twoim nazwisku tylko jeden ogólny wskaźnik samopoczucia, jego zmianę w czasie i ewentualne sygnały
          (np. przeciążenie). Nie widzi Twoich odpowiedzi na poszczególne pytania.
        </strong>
      </p>
      <ul className="bullets small">
        <li>Wyniki poszczególnych pytań przełożony widzi tylko jako średnią całego zespołu i tylko wtedy, gdy odpowiedziały co najmniej {minGroupSize} osoby.</li>
        <li>Komentarz przełożony zobaczy tylko wtedy, gdy sam(-a) go udostępnisz. Udostępnienie możesz w każdej chwili cofnąć.</li>
        <li>Puls jest dobrowolny i nie wpływa na ocenę okresową. Kadry (HR) nie widzą Twoich odpowiedzi.</li>
      </ul>
    </section>
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
  const count = info.scale.max - info.scale.min + 1
  // One convention: the columns are only numbers; what the ends mean is said by each question (its own low/high words).
  const columns = Array.from({ length: count }, (_, i) => {
    const v = String(info.scale.min + i)
    return { value: v, label: v }
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
      <div style={{ maxWidth: '36rem' }}>
      <RadioMatrix
        id="pulse"
        layout="stacked"
        label="Pytania pulsu"
        rowHeader="Stwierdzenie"
        columns={columns}
        rows={info.questions.map((q) => ({ id: q.id, label: `${q.statement} (${info.scale.min} — ${q.low}, ${info.scale.max} — ${q.high})` }))}
        value={values}
        onChange={(row, v) => setValues((cur) => ({ ...cur, [row]: v }))}
      />
      </div>
      <label htmlFor="pulse-comment" style={{ fontWeight: 600 }}>
        Komentarz (opcjonalnie)
      </label>
      <TextArea id="pulse-comment" rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
      <Checkbox
        label="Udostępnij komentarz przełożonemu"
        hint="Bez zaznaczenia komentarz widzisz tylko Ty."
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
        <Sparkline points={pulse.history} width={480} height={90} label="Mój ogólny wskaźnik samopoczucia" />
        {history.length === 0 && <p className={s.muted}>Nie masz jeszcze odpowiedzi.</p>}
        <ul className={s.privacy}>
          {history.map((r) => (
            <li key={r.id}>
              <strong>{fmtDate(r.date)}</strong> – wskaźnik {fmtNumber(r.index)} (
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
