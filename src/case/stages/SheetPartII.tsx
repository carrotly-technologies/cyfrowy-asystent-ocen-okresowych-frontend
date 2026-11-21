import { useState, type FormEvent } from 'react'
import type { PreviousAssessment, PromotionAttached } from '../../api/cases'
import {
  Checkbox,
  DateInput,
  ErrorSummary,
  Field,
  InfoList,
  InfoRow,
  InlineAlert,
  RadioGroup,
  RadioMatrix,
  Select,
  TextArea,
  TextInput,
  type FormError,
  type RadioMatrixGroup,
} from '../../components/ui'
import { usePatchCase } from '../../lib/caseQueries'
import { DEMO_TODAY, fmtAvg, fmtDate, plPoints } from '../../lib/format'
import { partIIOpen } from '../../lib/stages'
import { criterionName } from '../../lib/model'
import { officePlace } from '../../lib/office'
import { liveResult } from '../../lib/result'
import type { StageProps } from '../CasePage'
import { PartHeading, PartSection, WizardActions } from './SheetWizardCommon'
import { StageError } from './StageLayout'
import layout from './StageLayout.module.css'
import s from './SheetWizard.module.css'

const DECISION_ID = 'decision'
/** DOM id of the first radio in a criterion's row of the RadioMatrix (ErrorSummary links to it). */
const decisionId = (c: string) => `${DECISION_ID}-${c}`
const JUST_ID = 'justification'
const IPRZ_ID = 'iprz'
const PREV_RESULT_ID = 'previous-result'
const PREV_LEVEL_ID = 'previous-level'
const PREV_DATE_ID = 'previous-date'
const ATTACHED_ID = 'promotion-attached'

const EMPTY_PREVIOUS: PreviousAssessment = { result: null, level: null, date: null }

/** Footnote 13 of the template: "Należy wpisać „pozytywna” lub „negatywna”". */
const RESULT_OPTIONS = [
  { value: 'POSITIVE', label: 'pozytywna' },
  { value: 'NEGATIVE', label: 'negatywna' },
]

const samePrevious = (a: PreviousAssessment, b: PreviousAssessment) => a.result === b.result && a.level === b.level && a.date === b.date

/**
 * Part II: the assessment itself. Editable from the assessment talk stage until the evaluator signs (field schema of
 * sheets A/B/C: „dostępne do edycji od etapu rozmowy oceniającej”); earlier the evaluator keeps observations and
 * notatki robocze. The backend decides (`partIIEditable` in patch.rules.ts).
 */
export function SheetPartII({ detail, model, criteria, onBack, onNext }: StageProps & { onBack?: () => void; onNext: () => void }) {
  const patch = usePatchCase(detail.id)
  const signed = detail.signedByEvaluatorOn
  const editable = partIIOpen(detail)
  const [justification, setJustification] = useState(detail.justification)
  const [iprz, setIprz] = useState(detail.iprz)
  const [previous, setPrevious] = useState<PreviousAssessment>(detail.previousAssessment ?? EMPTY_PREVIOUS)
  const urzednik = detail.person.employment === 'URZEDNIK'
  const attached = detail.promotionRequest.attached
  const template = criteria.sheet?.template
  const [errors, setErrors] = useState<FormError[]>([])
  const errorFor = (id: string) => errors.find((e) => e.id === id)?.message

  const r = liveResult(detail, criteria.all, model)
  const negative = r.result === 'NEGATIVE'
  // Defaults per the field schema: talk today; period from the criteria day to today (or the due date if passed).
  const conversationDate = detail.assessmentTalkOn ?? DEMO_TODAY
  const periodFrom = detail.assessmentPeriod?.from ?? detail.partI.confirmedByEvaluatorOn
  const periodTo = detail.assessmentPeriod?.to ?? signed ?? DEMO_TODAY
  // Points come from the sheet and their labels from the competency model (both from the API), as in the template.
  const columns = criteria.scale.map((p) => ({ value: String(p), label: model.scale.find((x) => x.points === p)?.label ?? '', sublabel: plPoints(p) }))
  const row = (c: string) => ({ id: c, label: criterionName(model, c), error: errorFor(decisionId(c)) })
  const groups: RadioMatrixGroup[] = [
    { heading: 'Kryteria obowiązkowe', rows: criteria.mandatory.map(row) },
    ...(criteria.additional.length ? [{ heading: 'Kryteria dodatkowe wybrane przez oceniającego', rows: criteria.additional.map(row) }] : []),
  ]
  const scores = Object.fromEntries(criteria.all.map((c) => [c, detail.decisions[c] != null ? String(detail.decisions[c]) : '']))

  const decide = (c: string, v: string) => patch.mutate({ decisions: { [c]: Number(v) } })

  const validate = (): FormError[] => {
    const e: FormError[] = criteria.all
      .filter((c) => detail.decisions[c] == null)
      .map((c) => ({ id: decisionId(c), message: `Wybierz ocenę cząstkową kryterium „${criterionName(model, c)}”` }))
    if (negative && !justification.trim()) e.push({ id: JUST_ID, message: 'Wpisz uzasadnienie: przy ocenie negatywnej jest obowiązkowe' })
    if (!iprz.trim()) e.push({ id: IPRZ_ID, message: 'Wpisz wnioski dotyczące indywidualnego programu rozwoju zawodowego' })
    if (urzednik && attached === null) {
      e.push({ id: ATTACHED_ID, message: 'Zaznacz, czy do oceny okresowej dołączono wniosek o przyznanie kolejnego stopnia służbowego' })
    }
    return e
  }

  const previousDirty = urzednik && !samePrevious(previous, detail.previousAssessment ?? EMPTY_PREVIOUS)
  const dirty = justification !== detail.justification || iprz !== detail.iprz || previousDirty
  const changes = () => ({ justification, iprz, ...(previousDirty ? { previousAssessment: previous } : {}) })

  // "Wstecz" keeps what was typed: unsaved text goes to the server without the checks of "Dalej".
  const back = onBack
    ? () => {
        if (editable && dirty) patch.mutate(changes())
        onBack()
      }
    : undefined

  // The answer decides whether part III is attached, so it is saved at once (like the partial scores).
  // NIE DOTYCZY is never chosen by hand: the backend sets it for a pracownik służby cywilnej, and then it is locked.
  const answer = (v: string) => patch.mutate({ promotionRequest: { attached: v as PromotionAttached } })
  const attachedOptions = [
    {
      value: 'YES',
      label: 'TAK',
      disabled: !editable || !urzednik || negative,
      hint: negative && urzednik ? 'Niedostępne: wniosek o kolejny stopień można dołączyć tylko do oceny pozytywnej, a obecny wynik jest negatywny.' : undefined,
    },
    { value: 'NO', label: 'NIE', disabled: !editable || !urzednik },
    { value: 'NOT_APPLICABLE', label: 'NIE DOTYCZY (oceniany jest pracownikiem służby cywilnej)', disabled: true },
  ]
  const levelOptions = model.scale.map((x) => ({ value: x.label.toLowerCase(), label: x.label.toLowerCase() }))
  const evaluator = detail.evaluator

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!editable) return onNext()
    const e = validate()
    setErrors(e)
    if (e.length) return
    try {
      if (dirty) await patch.mutateAsync(changes())
      onNext()
    } catch {
      // the error is shown under the form
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className={s.form}>
      <PartHeading roman="II">Ocena okresowa</PartHeading>
      <ErrorSummary errors={errors} />

      {template && (
        <InlineAlert tone="info" title="Pouczenie">
          <p>{template.objectionNotice}</p>
          {template.objectionNoticeNote && <p className={layout.muted}>{template.objectionNoticeNote}</p>}
        </InlineAlert>
      )}

      <PartSection
        title="Rozmowa i okres oceny"
        hint={editable ? 'Wpisane domyślnie: rozmowa dziś, okres od ustalenia kryteriów do dziś (albo do terminu oceny, jeśli minął). Popraw, jeśli trzeba; zapisuje się od razu.' : undefined}
      >
        {editable ? (
          <div className={s.fields}>
            <Field id="talk-date" label="Data przeprowadzenia rozmowy oceniającej">
              {(p) => (
                <DateInput
                  {...p}
                  value={conversationDate}
                  min={detail.partI.acknowledgedByEmployeeOn ?? undefined}
                  max={DEMO_TODAY}
                  onChange={(e) => e.target.value && patch.mutate({ assessmentTalkOn: e.target.value })}
                />
              )}
            </Field>
            <Field id="period-from" label="Okres oceny: od">
              {(p) => (
                <DateInput {...p} value={periodFrom ?? ''} max={periodTo ?? DEMO_TODAY} onChange={(e) => patch.mutate({ assessmentPeriod: { from: e.target.value || null } })} />
              )}
            </Field>
            <Field id="period-to" label="Okres oceny: do">
              {(p) => (
                <DateInput {...p} value={periodTo ?? ''} min={periodFrom ?? undefined} max={DEMO_TODAY} onChange={(e) => patch.mutate({ assessmentPeriod: { to: e.target.value || null } })} />
              )}
            </Field>
          </div>
        ) : (
          <InfoList>
            <InfoRow label="Data przeprowadzenia rozmowy oceniającej" value={detail.assessmentTalkOn ? fmtDate(detail.assessmentTalkOn) : 'Po rozmowie oceniającej'} />
            <InfoRow
              label="Okres, w którym oceniany podlegał ocenie"
              value={periodFrom ? `od ${fmtDate(periodFrom)} do ${periodTo ? fmtDate(periodTo) : '—'}` : 'Od dnia ustalenia kryteriów (część I)'}
            />
          </InfoList>
        )}
      </PartSection>

      <PartSection title="Oceny cząstkowe" hint="Ocenę cząstkową każdego kryterium wybierasz Ty. Wybór zapisuje się od razu.">
        <RadioMatrix
          id={DECISION_ID}
          label="Oceny cząstkowe"
          rowHeader="Kryterium"
          columns={columns}
          groups={groups}
          value={scores}
          onChange={decide}
          readOnly={!editable}
        />
      </PartSection>

      <PartSection title="Przyznanie oceny" hint="Liczone przez system z ocen cząstkowych.">
        <InfoList>
          <InfoRow label="Średnia arytmetyczna z ocen cząstkowych" value={r.average === null ? '—' : `${fmtAvg(r.average)}${r.complete ? '' : ` (wstępnie, ${r.decided} z ${r.total})`}`} />
          <InfoRow label="Ogólny poziom spełniania kryteriów oceny" value={r.band ? r.band.label.toLowerCase() : '—'} />
          <InfoRow
            label="Ocena okresowa w służbie cywilnej"
            value={r.result === 'POSITIVE' ? 'Pozytywna' : r.result === 'NEGATIVE' ? 'Negatywna' : '—'}
          />
        </InfoList>
        <p className={layout.muted} aria-live="polite">
          {r.reason} <span className={s.legal}>{r.legal}</span>
        </p>
      </PartSection>

      <Field
        id={JUST_ID}
        label="Uzasadnienie przyznanej oceny okresowej"
        optional={!negative}
        hint="Obowiązkowe przy ocenie negatywnej. Odnieś się do kryteriów po nazwie i do przyznanego poziomu (§11 ust. 3–4 rozp. PRM z 4.04.2016)."
        error={errorFor(JUST_ID)}
      >
        {(p) => <TextArea {...p} rows={6} readOnly={!editable} value={justification} onChange={(e) => setJustification(e.target.value)} />}
      </Field>

      <Field
        id={IPRZ_ID}
        label="Wnioski dotyczące indywidualnego programu rozwoju zawodowego"
        hint="Obszar, forma rozwoju, termin lub sposób monitorowania, oczekiwany efekt. Ocena zawiera wnioski dotyczące IPRZ (art. 81 ust. 5 ustawy o służbie cywilnej; §11 ust. 1 pkt 5 rozp. PRM z 4.04.2016)."
        error={errorFor(IPRZ_ID)}
      >
        {(p) => <TextArea {...p} rows={5} readOnly={!editable} value={iprz} onChange={(e) => setIprz(e.target.value)} />}
      </Field>

      <PartSection
        title="Dane dotyczące poprzedniej oceny okresowej urzędnika służby cywilnej"
        hint={urzednik ? 'Jeśli poprzednia ocena jest w systemie, dane są już wpisane: sprawdź je. W przeciwnym razie wpisz je z poprzedniego arkusza.' : undefined}
      >
        {urzednik ? (
          <div className={s.fields}>
            <Field id={PREV_RESULT_ID} label="Ocena" optional>
              {(p) => (
                <Select
                  {...p}
                  disabled={!editable}
                  placeholder="Wybierz"
                  options={RESULT_OPTIONS}
                  value={previous.result ?? ''}
                  onChange={(ev) => setPrevious((v) => ({ ...v, result: (ev.target.value || null) as PreviousAssessment['result'] }))}
                />
              )}
            </Field>
            <Field id={PREV_LEVEL_ID} label="Poziom" hint="Na jakim poziomie przyznano poprzednią ocenę, np. „na poziomie oczekiwań”." optional>
              {(p) => (
                <Select
                  {...p}
                  disabled={!editable}
                  placeholder="Wybierz"
                  options={levelOptions}
                  value={previous.level ?? ''}
                  onChange={(ev) => setPrevious((v) => ({ ...v, level: ev.target.value || null }))}
                />
              )}
            </Field>
            <Field id={PREV_DATE_ID} label="Data sporządzenia" optional>
              {(p) => (
                <TextInput
                  {...p}
                  type="date"
                  width={20}
                  placeholder="dd.mm.rrrr"
                  readOnly={!editable}
                  value={previous.date ?? ''}
                  onChange={(ev) => setPrevious((v) => ({ ...v, date: ev.target.value || null }))}
                />
              )}
            </Field>
          </div>
        ) : (
          <p className={layout.muted}>Nie dotyczy: oceniany jest pracownikiem służby cywilnej.</p>
        )}
      </PartSection>

      <RadioGroup
        id={ATTACHED_ID}
        name={ATTACHED_ID}
        legend="Czy do oceny okresowej dołączono wniosek o przyznanie kolejnego stopnia służbowego?"
        hint={
          urzednik
            ? 'Przy odpowiedzi TAK wypełnisz wniosek w części III. Wniosek można dołączyć tylko do oceny pozytywnej. Wybór zapisuje się od razu.'
            : 'Oceniany jest pracownikiem służby cywilnej, więc odpowiedź jest ustawiona na stałe.'
        }
        error={errorFor(ATTACHED_ID)}
        options={attachedOptions}
        value={attached ?? ''}
        onChange={answer}
      />

      <PartSection title="Dane oceniającego" hint="Uzupełnione automatycznie z teczki.">
        <InfoList>
          <InfoRow label="Imię" value={evaluator.firstName} />
          <InfoRow label="Nazwisko" value={evaluator.lastName} />
          <InfoRow label="Komórka organizacyjna" value={evaluator.unit} />
          <InfoRow label="Stanowisko pracy" value={evaluator.position} />
        </InfoList>
        {signed && (
          <InlineAlert tone="success" title="Data i podpis oceniającego">
            Podpisano elektronicznie: {evaluator.firstName} {evaluator.lastName}, {officePlace(detail)}, {fmtDate(signed)}
          </InlineAlert>
        )}
      </PartSection>

      <PartSection title="Zapoznanie ocenianego z oceną">
        {/* Read only: the assessed person confirms in the step "Dokument"; the box mirrors that action and its date. */}
        <Checkbox
          id="employee-acknowledgement"
          label={template?.employeeAcknowledgement ?? 'Oceniany zapoznał się z oceną okresową'}
          hint={
            detail.acknowledgedOn
              ? `Potwierdzono ${fmtDate(detail.acknowledgedOn)}, ${detail.person.firstName} ${detail.person.lastName}`
              : 'Jeszcze nie: oceniany potwierdza na swoim koncie po przekazaniu oceny'
          }
          checked={!!detail.acknowledgedOn}
          disabled
          readOnly
        />
      </PartSection>

      <StageError error={patch.error} />
      <WizardActions onBack={back} loading={patch.isPending} />
    </form>
  )
}
