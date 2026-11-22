import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { createEmployeeAccount, getPersonAccount } from '../../api/auth'
import { MutationError } from '../../case/stages/common'

/**
 * „Konto w systemie” on the HR register card: the assessed person's account, or „Utwórz konto dla pracownika”
 * (login + one-time temporary password shown once; only HR hands it over). Without an account the person cannot
 * confirm part I or the assessment.
 */
export function EmployeeAccount({ personId }: { personId: string }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['person-account', personId], queryFn: ({ signal }) => getPersonAccount(personId, signal) })
  const [login, setLogin] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const create = useMutation({
    mutationFn: (l: string) => createEmployeeAccount(personId, l),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['person-account', personId] }),
  })

  if (q.isPending || q.isError) return null
  const value = login ?? q.data.suggestedLogin
  const created = create.data

  const copy = async () => {
    if (!created) return
    try {
      await navigator.clipboard.writeText(`Login: ${created.account.login}\nHasło tymczasowe: ${created.temporaryPassword}`)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="panel panel__body section" aria-labelledby="account-h">
      <h2 id="account-h" className="h-section">Konto w systemie</h2>
      {created ? (
        <div className="notice notice--ok" role="status">
          <p><strong>Utworzono konto pracownika.</strong> Hasło tymczasowe jest pokazywane tylko teraz.</p>
          <dl className="dl">
            <dt>Login</dt><dd><code data-testid="account-login">{created.account.login}</code></dd>
            <dt>Hasło tymczasowe</dt><dd><code data-testid="account-password">{created.temporaryPassword}</code></dd>
          </dl>
          <button type="button" className="btn" onClick={copy}>
            <Copy size={15} aria-hidden="true" /> {copied ? 'Skopiowano' : 'Skopiuj'}
          </button>
          <p className="small">
            Przekaż dane pracownikowi bezpieczną drogą (osobiście lub inną drogą niż login), nie w jednej wiadomości e-mail.
            Po zamknięciu strony hasła nie da się odczytać ponownie.
          </p>
        </div>
      ) : q.data.account ? (
        <p>Konto: <strong>{q.data.account.login}</strong></p>
      ) : (
        <form
          style={{ display: 'grid', gap: '0.75rem', maxWidth: '32rem' }}
          onSubmit={(ev) => {
            ev.preventDefault()
            create.mutate(value.trim())
          }}
        >
          <p className="muted">
            Pracownik nie ma jeszcze konta, więc nie potwierdzi części I ani zapoznania się z oceną.
          </p>
          <label className="field">
            <span className="field__label">Login pracownika</span>
            <input className="input" value={value} onChange={(ev) => setLogin(ev.target.value)} autoComplete="off" required />
          </label>
          <div>
            <button type="submit" className="btn btn--primary" disabled={create.isPending || !value.trim()}>
              <KeyRound size={15} aria-hidden="true" /> Utwórz konto dla pracownika
            </button>
          </div>
          <MutationError error={create.error} />
        </form>
      )}
    </section>
  )
}
