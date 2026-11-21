import { Upload } from 'lucide-react'
import { useId, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from 'react'
import { cx } from './cx'
import s from './Input.module.css'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Button text; default "Wybierz plik". */
  buttonLabel?: string
}

/**
 * File picker with Polish labels ("Wybierz plik" / "Nie wybrano pliku") in every browser. The real input stays
 * focusable (visually hidden), so the keyboard and an external <label htmlFor> keep working.
 */
export function FileInput({ buttonLabel = 'Wybierz plik', className, onChange, id, multiple, ...rest }: Props) {
  const auto = useId()
  const inputId = id ?? `file${auto}`
  const ref = useRef<HTMLInputElement>(null)
  const [names, setNames] = useState<string[]>([])
  const change = (e: ChangeEvent<HTMLInputElement>) => {
    setNames(Array.from(e.target.files ?? []).map((f) => f.name))
    onChange?.(e)
  }
  return (
    <span className={cx(s.file, className)}>
      <input {...rest} ref={ref} id={inputId} type="file" multiple={multiple} className={s.fileInput} onChange={change} />
      <label htmlFor={inputId} className={s.fileButton}>
        <Upload size={18} aria-hidden="true" />
        {buttonLabel}
      </label>
      <span className={s.fileName} aria-live="polite">
        {names.length === 0 ? 'Nie wybrano pliku' : names.join(', ')}
      </span>
    </span>
  )
}
