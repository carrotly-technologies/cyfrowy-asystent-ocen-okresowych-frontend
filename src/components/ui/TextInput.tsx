import type { InputHTMLAttributes, Ref, TextareaHTMLAttributes } from 'react'
import { cx } from './cx'
import { DateInput, TimeInput } from './DateInput'
import s from './Input.module.css'

type Width = 'full' | 5 | 10 | 20

const widthCls = (w: Width) => (w === 'full' ? undefined : s[`w-${w}`])

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Approximate number of characters the answer needs. */
  width?: Width
  forceState?: 'focus'
  ref?: Ref<HTMLInputElement>
}

/**
 * Single-line text field. Put it inside a Field for the label, hint and error.
 * `type="date"` / `type="time"` render the Polish DateInput / TimeInput (dd.mm.rrrr, 24 h) with the same ISO value.
 */
export function TextInput({ width = 'full', forceState, className, type = 'text', ...rest }: InputProps) {
  if (type === 'date' || type === 'time') {
    const { value, defaultValue: _d, ...other } = rest
    const Comp = type === 'date' ? DateInput : TimeInput
    return <Comp {...other} value={value === undefined || value === null ? '' : String(value)} width={width} forceState={forceState} className={className} />
  }
  return <input {...rest} type={type} data-force={forceState} className={cx(s.input, widthCls(width), className)} />
}

type AreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  forceState?: 'focus'
  ref?: Ref<HTMLTextAreaElement>
}

export function TextArea({ forceState, className, rows = 4, ...rest }: AreaProps) {
  return <textarea {...rest} rows={rows} data-force={forceState} className={cx(s.input, s.textarea, className)} />
}
