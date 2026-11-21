import { X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { InlineAlert } from './InlineAlert'
import s from './Overlay.module.css'

type Props = {
  open: boolean
  onClose: () => void
  title: ReactNode
  children?: ReactNode
  /** Buttons; put the main action last. */
  actions?: ReactNode
  /** Wider dialog (forms with two columns). */
  wide?: boolean
}

/**
 * Modal on native <dialog>, rendered through a portal to <body> so it never inherits styles from where it is used
 * (a table cell, a flex row). Focus trap, Esc and inert background come from the browser. Bottom sheet on phones.
 */
export function Dialog({ open, onClose, title, children, actions, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    else if (!open && d.open) d.close()
  }, [open])
  if (typeof document === 'undefined') return null
  return createPortal(
    <dialog
      ref={ref}
      className={wide ? `${s.dialog} ${s.dialogWide}` : s.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        // Esc: let React decide (the parent sets open=false), so state and DOM never drift apart
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        // click on the backdrop closes the dialog
        if (e.target === ref.current) onClose()
      }}
    >
      {open && (
        <div className={s.dialogInner}>
          <div className={s.dialogHead}>
            <h2 id={titleId} className={s.dialogTitle}>
              {title}
            </h2>
            <button type="button" className={s.dialogClose} onClick={onClose} aria-label="Zamknij">
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          {children && <div className={s.dialogBody}>{children}</div>}
          {actions && <div className={s.dialogActions}>{actions}</div>}
        </div>
      )}
    </dialog>,
    document.body,
  )
}

type ConfirmProps = {
  open: boolean
  /** Question or name of the action, e.g. "Wnieść sprzeciw?". */
  title: ReactNode
  /** What will happen; say plainly if it cannot be undone. */
  children?: ReactNode
  /** Primary button label, e.g. "Wnieś sprzeciw". */
  confirmLabel: string
  cancelLabel?: string
  /** Red primary button for irreversible actions. */
  destructive?: boolean
  /** May return a promise: the button shows a spinner and the dialog closes on success, shows the error otherwise. */
  onConfirm: () => unknown
  onCancel: () => void
  /** Optional mapper from the thrown error to a Polish message. */
  errorText?: (e: unknown) => string
}

/**
 * Confirmation before an important or irreversible action (no window.confirm): title, summary, "Anuluj" and the action.
 * The caller closes it in `onCancel`; after a successful `onConfirm` it calls `onCancel` too.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Anuluj',
  destructive,
  onConfirm,
  onCancel,
  errorText,
}: ConfirmProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancel = () => {
    setError(null)
    onCancel()
  }
  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      cancel()
    } catch (e) {
      setError(errorText ? errorText(e) : e instanceof Error && e.message ? e.message : 'Nie udało się wykonać czynności. Spróbuj ponownie.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) cancel()
      }}
      title={title}
      actions={
        <>
          <Button variant="secondary" onClick={cancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button destructive={destructive} onClick={() => void confirm()} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {error && (
        <InlineAlert tone="error" live className={s.dialogError}>
          {error}
        </InlineAlert>
      )}
    </Dialog>
  )
}
