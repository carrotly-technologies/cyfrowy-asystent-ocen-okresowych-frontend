import { Info } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cx } from './cx'
import s from './InfoTip.module.css'

type Props = {
  /** Accessible name of the "i" button, e.g. "Co to jest wirtualny asystent HR?". */
  label: string
  children: ReactNode
  className?: string
}

/**
 * Toggletip: a 44px "i" button that opens a short explanation under it (click, Enter or Space). Esc and a click
 * outside close it and focus returns to the button. The text is not a tooltip on hover, so it works on touch screens
 * and for keyboard users; aligned to the right edge of the button, so it never makes the page scroll sideways.
 */
export function InfoTip({ label, children, className }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span ref={rootRef} className={cx(s.root, className)}>
      <button
        ref={buttonRef}
        type="button"
        className={s.button}
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
      >
        <Info size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <span id={id} role="status">
        {open && <span className={s.pop}>{children}</span>}
      </span>
    </span>
  )
}
