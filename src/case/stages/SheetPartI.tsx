import { useState, type FormEvent } from 'react'
import type { PartI } from '../../api/cases'
import { errorMessage } from '../../api/client'
import { Checkbox, ConfirmDialog, ErrorSummary, Field, Fieldset, InfoList, InfoRow, InlineAlert, TextArea, TextInput, type FormError } from '../../components/ui'
import { useCaseAction, usePatchCase } from '../../lib/caseQueries'
import { fmtDate } from '../../lib/format'
import { criterionName } from '../../lib/model'
import { allows } from '../../lib/stages'
import { useMe } from '../../lib/useAuth'
import type { StageProps } from '../CasePage'
import { AdditionalCriteriaPicker } from './AdditionalCriteriaPicker'
import { CriteriaSummary } from './CriteriaSummary'
import { MutationError } from './common'
import { PartHeading, PartSection, WizardActions } from './SheetWizardCommon'
import { StageError } from './StageLayout'
import s from './SheetWizard.module.css'

type TopicKey = keyof PartI['topics']

/** The four topics of the opening talk (§5 ust. 1 rozp. PRM z 4.04.2016). */
const TOPICS: { key: TopicKey; title: string; hint: string; optional?: boolean }[] = [
  { key: 'duties', title: 'Główne obowiązki wynikające z opisu stanowiska pracy', hint: 'Które zadania z opisu stanowiska są kluczowe w tym okresie?' },
  { key: 'criteria', title: 'Kryteria obowiązkowe i dodatkowe', hint: 'Omów, co każde kryterium oznacza na tym stanowisku.' },
  { key: 'expectations', title: 'Oczekiwania oceniającego co do spełniania kryteriów', hint: 'Szczegóły do każdego kryterium wpiszesz niżej.' },
  { key: 'goals', title: 'Cele na okres oceny i sposób ich realizacji', hint: 'Tylko jeśli uzasadnia to charakter obowiązków.', optional: true },
]

const topicId = (k: TopicKey) => `topic-${k}`
const expectId = (c: string) => `expect-${c}`
const DUE_ID = 'assessment-due'
const confirmId = (i: number) => `confirm-part-i-${i}`

/** A template line as a checkbox label: without the list punctuation ("…zagadnień," → "…zagadnień"). */
const asLabel = (line: string) => line.trim().replace(/[,;.]+$/, '')
/** First words of a long label, for the error summary. */
const shorten = (text: string, max = 80) => (text.length <= max ? text : `${text.slice(0, text.lastIndexOf(' ', max))}…`)

/**
 * Part I: office, assessed person and evaluator (read only), the opening talk, expectations and the due date.
 * „Zatwierdź” saves it and records the evaluator's confirmation; then the assessed person confirms on their account.
 */
export function SheetPartI({ detail, model, criteria, onNext }: StageProps & { onNext?: () => void }) {
  const patch = usePatchCase(detail.id)
  const act = useCaseAction(detail.id)
  const confirmed = !!detail.partI.confirmedByEvaluatorOn
  // The backend accepts part I changes only at the opening talk, until the evaluator confirms it.
  const editable = !confirmed && detail.currentStage === 'OPENING_TALK'
  const afterNegative = detail.cycleLabel.toLowerCase().includes('negatyw')
  // Only the evaluator changes the additional criteria (the API answers 403 to anyone else), until part I is confirmed.
  const me = useMe()
  const criteriaEditable = editable && me.role === 'SUPERVISOR'
  const criteriaPatch = usePatchCase(detail.id)
  const [removing, setRemoving] = useState<string | null>(null)

  const [topics, setTopics] = useState(detail.partI.topics)
  // Every field the evaluator types starts empty; only what is already saved in the case is shown.
  const [expect, setExpect] = useState<Record<string, string>>(() =>
    Object.fromEntries(criteria.all.map((c) => [c, detail.partI.expectations[c] ?? ''])),
  )
  const [due, setDue] = useState(detail.partI.assessmentDue ?? '')

  // Each change is saved at once: the new criterion gets its expectations field, a removed one loses it (also in the API).
  const saveCriteria = (next: string[]) => criteriaPatch.mutateAsync({ partI: { additionalCriteria: next } })
  const removeCriterion = async (c: string) => {
    await saveCriteria(criteria.additional.filter((x) => x !== c))
    setExpect((v) => Object.fromEntries(Object.entries(v).filter(([k]) => k !== c)))
    clearError(expectId(c))
  }
  const toggleCriterion = (c: string, on: boolean) => {
    if (on) void saveCriteria([...criteria.additional, c]).catch(() => {})
    else if (expect[c]?.trim()) setRemoving(c)
    else void removeCriterion(c).catch(() => {})
  }

  // "Potwierdzamy: – …; – …" from the sheet template (GET /api/sheets). Ticking is kept only here: the record of the
  // confirmation is the existing action with its date (CONFIRM_PART_I, EMPLOYEE_ACK_PART_I).
  const confirmLines = (criteria.sheet?.template?.partIConfirmation ?? []).map(asLabel)
  const [errors, setErrors] = useState<FormError[]>([])
  const errorFor = (id: string) => errors.find((e) => e.id === id)?.message
  const [ticked, setTicked] = useState<boolean[]>(() => confirmLines.map(() => false))
  const canConfirm = editable && allows(detail, 'CONFIRM_PART_I')
  const maxAdditional = criteria.sheet?.maxAdditionalCriteria ?? 0
  const clearError = (id: string) => setErrors((v) => (v.some((e) => e.id === id) ? v.filter((e) => e.id !== id) : v))
  const tick = (i: number, on: boolean) => {
    setTicked((v) => confirmLines.map((_, j) => (j === i ? on : !!v[j])))
    if (on) clearError(confirmId(i))
  }
  const confirmErrors = (): FormError[] =>
    confirmLines.flatMap((l, i) => (ticked[i] ? [] : [{ id: confirmId(i), message: `Zaznacz potwierdzenie „${shorten(l)}”` }]))
  const confirmGroupError = confirmLines.some((_, i) => errorFor(confirmId(i)))
    ? 'Zaznacz wszystkie potwierdzenia oceniającego, zanim przejdziesz dalej'
    : undefined

  const validate = (): FormError[] => {
    const e: FormError[] = TOPICS.filter((t) => !t.optional && !topics[t.key]?.trim()).map((t) => ({
      id: topicId(t.key),
      message: `Wpisz notatkę do zagadnienia „${t.title}”`,
    }))
    for (const c of criteria.all) {
      if (!expect[c]?.trim()) e.push({ id: expectId(c), message: `Wpisz oczekiwania do kryterium „${criterionName(model, c)}”` })
    }
    if (!due) e.push({ id: DUE_ID, message: 'Wpisz termin sporządzenia oceny' })
    return e
  }

  const [confirming, setConfirming] = useState(false)
  const save = async () => {
    const expectations = Object.fromEntries(criteria.all.map((c) => [c, expect[c] ?? '']))
    await patch.mutateAsync({ partI: { topics, expectations, assessmentDue: due } })
    if (canConfirm) await act.mutateAsync('CONFIRM_PART_I')
  }
  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    // Errors of a mutation are shown by StageError under the form, and the user stays in part I.
    try {
      if (editable) {
        const e = [...validate(), ...(canConfirm ? confirmErrors() : [])]
        setErrors(e)
        if (e.length) return
        // Approving part I locks the criteria and the due date: ask first, with a short summary.
        if (canConfirm) {
          setConfirming(true)
          return
        }
        await save()
      }
      onNext?.()
    } catch {
      // shown by StageError
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className={s.form}>
      {/* The "Część I jest zatwierdzona" status is shown by SheetWizard under the stage title. */}
      {afterNegative && (
        <InlineAlert tone="warning" title="Ponowna ocena po ocenie negatywnej">
          Rozmowę rozpoczynającą przeprowadza się w ciągu 7 dni od sporządzenia oceny (§7 pkt 2 rozp. 2016), a ocenę po 6 miesiącach od
          zapoznania (art. 81 ust. 9 ustawy).
        </InlineAlert>
      )}

      <PartHeading roman="I">Kryteria oceny i termin sporządzenia oceny</PartHeading>
      <ErrorSummary errors={errors} />

      <PartSection title="Nazwa urzędu i dane" hint="Uzupełnione automatycznie z teczki. Nie można ich tu zmienić.">
        <InfoList>
          <InfoRow label="Nazwa urzędu" value={detail.officeName} />
        </InfoList>
        <div className={s.people}>
          <Person title="Dane ocenianego" p={detail.person} />
          <Person title="Dane oceniającego" p={detail.evaluator} />
        </div>
      </PartSection>

      <PartSection
        title="Kryteria oceny i termin sporządzenia oceny"
        hint={criteriaEditable ? 'Kryteria dodatkowe możesz zmienić do potwierdzenia części I.' : 'Kryteria ustalono w kroku „Arkusz i kryteria”.'}
      >
        <div className={s.criteria}>
          <CriteriaSummary title={`Kryteria obowiązkowe (${criteria.mandatory.length})`} ids={criteria.mandatory} model={model} level={5} />
          {criteriaEditable ? (
            <div>
              <AdditionalCriteriaPicker
                id="part-i-extra-criteria"
                model={model}
                mandatory={criteria.mandatory}
                max={maxAdditional}
                selected={criteria.additional}
                onToggle={toggleCriterion}
                disabled={criteriaPatch.isPending}
              />
              <MutationError error={criteriaPatch.error} />
            </div>
          ) : (
            <CriteriaSummary
              title={`Kryteria dodatkowe wybrane przez oceniającego (${criteria.additional.length}/${maxAdditional})`}
              ids={criteria.additional}
              model={model}
              level={5}
              empty="Nie wybrano kryteriów dodatkowych."
            />
          )}
        </div>
        <Field
          id={DUE_ID}
          label="Termin sporządzenia oceny"
          hint={`Wpisz datę (dd.mm.rrrr). Ocenę sporządza się ${afterNegative ? 'po 6 miesiącach (art. 81 ust. 9 ustawy)' : 'co 24 miesiące od zatrudnienia albo poprzedniej oceny (art. 81 ust. 4 ustawy)'}. Po zatwierdzeniu części I zmiana tylko w trybie zmiany terminu.`}
          error={errorFor(DUE_ID)}
        >
          {(p) => <TextInput {...p} type="date" width={20} placeholder="dd.mm.rrrr" readOnly={!editable} value={due} onChange={(e) => setDue(e.target.value)} />}
        </Field>
      </PartSection>

      <PartSection title="Zagadnienia rozmowy rozpoczynającej" hint="Rozporządzenie wymaga omówienia każdego zagadnienia (§5 ust. 1 rozp. PRM z 4.04.2016).">
        <div className={s.fields}>
          {TOPICS.map((t) => (
            <Field key={t.key} id={topicId(t.key)} label={t.title} hint={t.hint} optional={t.optional} error={errorFor(topicId(t.key))}>
              {(p) => (
                <TextArea
                  {...p}
                  rows={3}
                  readOnly={!editable}
                  value={topics[t.key] ?? ''}
                  onChange={(e) => setTopics((v) => ({ ...v, [t.key]: e.target.value }))}
                />
              )}
            </Field>
          ))}
        </div>
      </PartSection>

      <PartSection
        title="Oczekiwania wobec kryteriów"
        hint="Opisz, czego oczekujesz w każdym kryterium na tym stanowisku: to punkt odniesienia przy ocenie."
      >
        <div className={s.fields}>
          {criteria.all.map((c) => (
            <Field
              key={c}
              id={expectId(c)}
              label={criterionName(model, c)}
              error={errorFor(expectId(c))}
            >
              {(p) => (
                <TextArea {...p} rows={3} readOnly={!editable} value={expect[c] ?? ''} onChange={(e) => setExpect((v) => ({ ...v, [c]: e.target.value }))} />
              )}
            </Field>
          ))}
        </div>
      </PartSection>

      {/* Each confirmation is a checkbox ticked before "Dalej"; once recorded it stays ticked, locked, with the date. */}
      <PartSection title="Potwierdzenie części I" hint="Oceniający potwierdza rozmowę tutaj; oceniany potwierdza zapoznanie z kryteriami i terminem oceny na swoim koncie.">
        {confirmLines.length > 0 && (
          <Fieldset
            id="confirm-part-i"
            legend="Potwierdzenie oceniającego"
            hint={canConfirm ? 'Zaznacz wszystkie potwierdzenia. „Zatwierdź część I” zapisze ją, a kryteria i termin oceny zostaną zablokowane.' : undefined}
            error={confirmGroupError}
          >
            {confirmLines.map((l, i) => (
              <Checkbox
                key={l}
                id={confirmId(i)}
                label={l}
                hint={confirmed ? `Potwierdzono ${fmtDate(detail.partI.confirmedByEvaluatorOn)}` : undefined}
                checked={confirmed || !!ticked[i]}
                disabled={confirmed || !canConfirm}
                required={canConfirm}
                invalid={!!errorFor(confirmId(i))}
                onChange={(e) => tick(i, e.target.checked)}
              />
            ))}
          </Fieldset>
        )}
        <InfoList>
          <InfoRow
            label="Potwierdzenie ocenianego (od tej daty biegnie okres oceny)"
            value={detail.partI.acknowledgedByEmployeeOn ? fmtDate(detail.partI.acknowledgedByEmployeeOn) : 'Jeszcze nie: oceniany potwierdza na swoim koncie'}
          />
        </InfoList>
      </PartSection>

      <StageError error={patch.error ?? act.error} />
      <ConfirmDialog
        open={removing !== null}
        title="Usunąć kryterium i wpisane oczekiwania?"
        confirmLabel="Usuń kryterium"
        cancelLabel="Zostaw"
        destructive
        onConfirm={() => removeCriterion(removing!)}
        onCancel={() => setRemoving(null)}
        errorText={errorMessage}
      >
        <p>
          Kryterium „{removing ? criterionName(model, removing) : ''}” zniknie z części I razem z oczekiwaniami, które do niego wpisano.
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={confirming}
        title="Zatwierdzić część I?"
        confirmLabel="Zatwierdź część I"
        onConfirm={() => save().then(() => onNext?.())}
        onCancel={() => setConfirming(false)}
        errorText={errorMessage}
      >
        <ul className="bullets">
          <li>
            Kryteria oceny: <strong className="num">{criteria.all.length}</strong>
            {criteria.additional.length > 0 ? ` (w tym dodatkowe: ${criteria.additional.length})` : ''}.
          </li>
          <li>
            Termin sporządzenia oceny: <strong className="num">{due ? fmtDate(due) : '—'}</strong>.
          </li>
          <li>Po zatwierdzeniu kryteria i termin zostaną zablokowane, a oceniany dostanie prośbę o potwierdzenie części I.</li>
        </ul>
      </ConfirmDialog>
      {editable && <WizardActions loading={patch.isPending || act.isPending} nextLabel={canConfirm ? 'Zatwierdź część I' : 'Zapisz'} />}
    </form>
  )
}

function Person({ title, p }: { title: string; p: { firstName: string; lastName: string; unit: string; position: string } }) {
  return (
    <div>
      <p className={s.listLabel}>{title}</p>
      <InfoList>
        <InfoRow label="Imię" value={p.firstName} />
        <InfoRow label="Nazwisko" value={p.lastName} />
        <InfoRow label="Komórka organizacyjna" value={p.unit} />
        <InfoRow label="Stanowisko pracy" value={p.position} />
      </InfoList>
    </div>
  )
}
