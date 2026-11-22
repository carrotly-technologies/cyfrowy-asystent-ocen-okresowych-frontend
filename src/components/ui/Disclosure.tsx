import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'
import s from './Disclosure.module.css'

type Props = {
  /** Content of the always-visible title row (text, chips). */
  title: ReactNode
  children: ReactNode
  /** Initially open (uncontrolled, like the native attribute). */
  open?: boolean
  /** Smaller padding for a disclosure nested inside another panel. */
  compact?: boolean
  className?: string
  bodyClassName?: string
}

/**
 * Collapsible section on the case page (native <details>): one look for every fold-out there, light-blue background,
 * chevron on the left that turns when open. Keyboard: Tab to the title, Enter/Space toggles.
 */
export function Disclosure({ title, children, open, compact, className, bodyClassName }: Props) {
  return (
    <details className={cx(s.disclosure, compact && s.compact, className)} open={open || undefined}>
      <summary className={s.summary}>
        <ChevronDown className={s.chevron} size={16} strokeWidth={1.75} aria-hidden="true" />
        <span className={s.title}>{title}</span>
      </summary>
      <div className={cx(s.body, bodyClassName)}>{children}</div>
    </details>
  )
}
