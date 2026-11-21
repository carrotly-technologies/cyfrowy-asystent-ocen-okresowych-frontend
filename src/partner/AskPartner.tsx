import { useMutation } from '@tanstack/react-query'
import { ShieldCheck, Sparkles } from 'lucide-react'
import { useId, useState } from 'react'
import { askPartner } from '../api/partner'
import { errorMessage } from '../api/client'
import { Button, InlineAlert, TextArea } from '../components/ui'
import s from './Partner.module.css'

const EXAMPLES = [
  'Jak przygotować rozmowę wspierającą?',
  'Jakie działania pomogą przy przeciążeniu?',
  'Jak docenić tę osobę?',
  'Jakie formy rozwoju zaproponować?',
]

/** "Zapytaj HR partnera": the question goes out pseudonymized; without an LLM the answer comes from the rules. */
export function AskPartner({ personId, caseId }: { personId?: string; caseId?: string }) {
  const id = useId()
  const [question, setQuestion] = useState('')
  const ask = useMutation({ mutationFn: (q: string) => askPartner({ question: q, personId, caseId }) })
  const send = (q: string) => {
    const text = q.trim()
    if (text.length < 3 || ask.isPending) return
    setQuestion(text)
    ask.mutate(text)
  }
  return (
    <section className={`${s.box} ${s.stack}`} aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className={s.row}>
        <Sparkles size={18} aria-hidden="true" /> Zapytaj HR partnera
      </h3>
      <form
        className={s.stack}
        onSubmit={(e) => {
          e.preventDefault()
          send(question)
        }}
      >
        <label htmlFor={`${id}-q`} className="visually-hidden">
          Pytanie do HR partnera
        </label>
        <TextArea id={`${id}-q`} rows={3} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Np. jak porozmawiać o obciążeniu pracą?" />
        <div className={s.row}>
          <Button type="submit" size="small" loading={ask.isPending}>
            Zapytaj
          </Button>
          {EXAMPLES.map((q) => (
            <Button key={q} type="button" size="small" variant="tertiary" onClick={() => send(q)}>
              {q}
            </Button>
          ))}
        </div>
      </form>
      <p className={`${s.row} ${s.muted}`}>
        <ShieldCheck size={16} aria-hidden="true" /> Dane zanonimizowane przed wysłaniem do modelu.
      </p>
      {ask.isError && <InlineAlert tone="error" live>{errorMessage(ask.error)}</InlineAlert>}
      {ask.data && (
        <div className={s.stack} role="status">
          <div className={s.answer}>{ask.data.answer.replace(/\*\*/g, '')}</div>
          <p className={s.muted}>
            {ask.data.mode === 'LLM'
              ? 'Odpowiedź modelu językowego na podstawie zanonimizowanego kontekstu.'
              : 'Odpowiedź z reguł HR partnera (model językowy nie jest skonfigurowany albo nie odpowiedział).'}{' '}
            {ask.data.disclaimer}
          </p>
          <details>
            <summary className={s.muted} style={{ cursor: 'pointer' }}>
              Co trafiłoby do modelu ({ask.data.replacements} zamienionych danych)
            </summary>
            <p className={s.muted}>{ask.data.anonymizationNote}</p>
            <pre className={s.prompt}>{ask.data.anonymizedPrompt}</pre>
          </details>
        </div>
      )}
    </section>
  )
}
