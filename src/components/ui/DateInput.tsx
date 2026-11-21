import { CalendarDays } from 'lucide-react'
import { useId, useRef, useState, type ChangeEvent, type InputHTMLAttributes, type Ref } from 'react'
import { fmtDate, parsePlDate, parsePlTime } from '../../lib/format'
import { cx } from './cx'
import s from './Input.module.css'

type Width = 'full' | 5 | 10 | 20

type Base = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'onChange'> & {
  /** ISO value: "2026-11-21" (date) or "09:30" (time); '' when empty. */
  value?: string
  /**
   * Called with the ISO value in `e.target.value` (like a native date/time input), '' while the text is not a
   * complete, valid date/time.
   */
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
  width?: Width
  forceState?: 'focus'
  ref?: Ref<HTMLInputElement>
}

const widthCls = (w: Width) => (w === 'full' ? undefined : s[`w-${w}`])

/** Fake change event carrying only the value; callers read `e.target.value`. */
function emit(onChange: Base['onChange'], value: string, name?: string) {
  onChange?.({ target: { value, name }, currentTarget: { value, name } } as unknown as ChangeEvent<HTMLInputElement>)
}

/** Keeps the typed text while it is incomplete, and follows the ISO value when the parent changes it. */
function useTextValue(value: string, toText: (v: string) => string, parse: (t: string) => string | null) {
  const [text, setText] = useState(() => (value ? toText(value) : ''))
  const [seen, setSeen] = useState(value)
  if (value !== seen) {
    setSeen(value)
    if ((parse(text) ?? '') !== value) setText(value ? toText(value) : '')
  }
  return [text, setText] as const
}

function rangeError(iso: string, min?: string | number, max?: string | number): string {
  if (min && iso < String(min)) return `Podaj datę nie wcześniejszą niż ${fmtDate(String(min))}.`
  if (max && iso > String(max)) return `Podaj datę nie późniejszą niż ${fmtDate(String(max))}.`
  return ''
}

/**
 * Date field in the Polish format dd.mm.rrrr, the same in every browser (a native date input follows the browser
 * locale, e.g. mm/dd/yyyy). Typing works; the calendar button opens the browser's date picker.
 * Value in and out is ISO ("2026-11-21"), so it replaces `<input type="date">` one to one.
 */
export function DateInput({ value = '', onChange, width = 20, forceState, className, min, max, required, disabled, readOnly, name, ref, ...rest }: Base) {
  const [text, setText] = useTextValue(value, fmtDate, parsePlDate)
  const nativeRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLInputElement | null>(null)
  const id = useId()

  const validate = (el: HTMLInputElement | null, t: string) => {
    if (!el) return
    const iso = parsePlDate(t)
    if (!t.trim()) el.setCustomValidity('')
    else if (!iso) el.setCustomValidity('Wpisz datę w formacie dd.mm.rrrr, np. 21.11.2026.')
    else el.setCustomValidity(rangeError(iso, min, max))
  }

  const onText = (e: ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value
    setText(t)
    validate(e.target, t)
    const iso = parsePlDate(t) ?? ''
    if (iso !== value) emit(onChange, iso, name)
  }

  const openPicker = () => {
    const n = nativeRef.current
    if (!n) return
    try {
      n.showPicker()
    } catch {
      textRef.current?.focus()
    }
  }

  const locked = disabled || readOnly
  return (
    <span className={cx(s.dateWrap, widthCls(width))}>
      <input
        {...rest}
        ref={(el) => {
          textRef.current = el
          if (typeof ref === 'function') ref(el)
          else if (ref) ref.current = el
        }}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={rest.placeholder ?? 'dd.mm.rrrr'}
        name={name}
        value={text}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        onChange={onText}
        onBlur={(e) => {
          // tidy "1.2.2026" → "01.02.2026"
          const iso = parsePlDate(e.target.value)
          if (iso) setText(fmtDate(iso))
          rest.onBlur?.(e)
        }}
        data-force={forceState}
        className={cx(s.input, s.dateText, className)}
      />
      {!locked && (
        <button type="button" className={s.dateButton} onClick={openPicker} aria-label="Wybierz datę z kalendarza" title="Wybierz z kalendarza">
          <CalendarDays size={20} aria-hidden="true" />
        </button>
      )}
      <input
        ref={nativeRef}
        id={`${id}-picker`}
        type="date"
        lang="pl"
        tabIndex={-1}
        aria-hidden="true"
        className={s.datePicker}
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const iso = e.target.value
          setText(iso ? fmtDate(iso) : '')
          validate(textRef.current, iso ? fmtDate(iso) : '')
          emit(onChange, iso, name)
        }}
      />
    </span>
  )
}

const TIMES = Array.from({ length: 23 }, (_, i) => {
  const h = 7 + Math.floor(i / 2)
  return `${String(h).padStart(2, '0')}:${i % 2 ? '30' : '00'}`
})

/** Time field, 24-hour Polish format gg:mm in every browser (a native one may show "10:00 AM"). Value: "09:30". */
export function TimeInput({ value = '', onChange, width = 10, forceState, className, required, name, ref, ...rest }: Base) {
  const [text, setText] = useTextValue(value, (v) => v, parsePlTime)
  const listId = useId()
  return (
    <>
      <input
        {...rest}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={rest.placeholder ?? 'gg:mm'}
        list={listId}
        name={name}
        value={text}
        required={required}
        onChange={(e) => {
          const t = e.target.value
          setText(t)
          const hhmm = parsePlTime(t)
          e.target.setCustomValidity(t.trim() && !hhmm ? 'Wpisz godzinę w formacie gg:mm, np. 09:30.' : '')
          if ((hhmm ?? '') !== value) emit(onChange, hhmm ?? '', name)
        }}
        onBlur={(e) => {
          const hhmm = parsePlTime(e.target.value)
          if (hhmm) setText(hhmm)
          rest.onBlur?.(e)
        }}
        data-force={forceState}
        className={cx(s.input, widthCls(width), className)}
      />
      <datalist id={listId}>
        {TIMES.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </>
  )
}
