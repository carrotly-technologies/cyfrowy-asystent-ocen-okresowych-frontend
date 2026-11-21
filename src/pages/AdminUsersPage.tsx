import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getUsers, updateUserRole, type UserView } from '../api/auth'
import type { Role } from '../api/cases'
import { errorMessage } from '../api/client'
import { ErrorState, LoadingState } from '../components/QueryState'
import { InlineAlert, Select, Snackbar, StatusBadge } from '../components/ui'
import { ROLE_LABEL, useMe } from '../lib/useAuth'
import { countLabel } from '../lib/format'

/** Drafts without the given user. */
const without = (d: Record<string, Role>, id: string) => Object.fromEntries(Object.entries(d).filter(([k]) => k !== id)) as Record<string, Role>

const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))

/** ADMIN: accounts and their roles. A new role applies when that user signs in again. */
export function AdminUsersPage() {
  const me = useMe()
  const qc = useQueryClient()
  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: ({ signal }) => getUsers(signal) })
  // A role is chosen in the row and applied only with „Zapisz”; the toast offers „Cofnij”.
  const [drafts, setDrafts] = useState<Record<string, Role>>({})
  const [saved, setSaved] = useState<{ text: string; undo?: { id: string; role: Role } } | null>(null)
  const change = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role; previous?: Role }) => updateUserRole(id, role),
    onSuccess: (u, vars) => {
      qc.setQueryData<UserView[]>(['admin', 'users'], (list) => list?.map((x) => (x.id === u.id ? u : x)))
      setDrafts((d) => without(d, u.id))
      setSaved({
        text: vars.previous
          ? `Zapisano: ${u.name} ma teraz rolę „${ROLE_LABEL[u.role]}”. Zmiana obowiązuje od następnego logowania tej osoby.`
          : `Cofnięto: ${u.name} ma znowu rolę „${ROLE_LABEL[u.role]}”.`,
        undo: vars.previous ? { id: u.id, role: vars.previous } : undefined,
      })
    },
  })

  if (users.isPending) return <div className="page"><LoadingState /></div>
  if (users.isError) return <div className="page"><ErrorState error={users.error} what="lista użytkowników" onRetry={() => users.refetch()} /></div>

  return (
    <div className="page page--wide">
      <header className="page-head">
        <div>
          <h1 className="h-page">Użytkownicy</h1>
          <p className="page-head__meta">Konta i role w systemie · {countLabel(users.data.length, 'konto', 'konta', 'kont')}</p>
        </div>
      </header>

      {change.isError && (
        <InlineAlert tone="error" live title="Nie udało się zmienić roli">
          {errorMessage(change.error)}
        </InlineAlert>
      )}

      <section className="section" aria-labelledby="users-h">
        <h2 id="users-h" className="visually-hidden">Lista kont</h2>
        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>Imię i nazwisko</th>
                <th>Login</th>
                <th>Stanowisko i komórka</th>
                <th>Rola</th>
                <th><span className="visually-hidden">Zapis zmiany roli</span></th>
              </tr>
            </thead>
            <tbody>
              {users.data.map((u) => {
                const self = u.id === me.id
                const pending = change.isPending && change.variables?.id === u.id
                const draft = drafts[u.id]
                return (
                  <tr key={u.id}>
                    <td>
                      <span className="person__name">{u.name}</span>
                      {self && <> <StatusBadge tone="info">to Ty</StatusBadge></>}
                    </td>
                    <td className="num">{u.login}</td>
                    <td>
                      <div>{u.position}</div>
                      <div className="faint small">{u.unit}</div>
                    </td>
                    <td style={{ minWidth: 200 }}>
                      <Select
                        aria-label={`Rola: ${u.name}`}
                        options={ROLE_OPTIONS.map((o) => ({ ...o, disabled: self && o.value !== 'ADMIN' }))}
                        value={draft ?? u.role}
                        disabled={pending}
                        onChange={(e) => {
                          const role = e.target.value as Role
                          setDrafts((d) => (role === u.role ? without(d, u.id) : { ...d, [u.id]: role }))
                        }}
                      />
                    </td>
                    <td className="cell-action">
                      {draft && (
                        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                          <button type="button" className="btn btn--sm btn--ghost" disabled={pending} onClick={() => setDrafts((d) => without(d, u.id))}>
                            Anuluj
                          </button>
                          <button
                            type="button"
                            className="btn btn--sm btn--primary"
                            disabled={pending}
                            aria-label={`Zapisz rolę „${ROLE_LABEL[draft]}” dla: ${u.name}`}
                            onClick={() => change.mutate({ id: u.id, role: draft, previous: u.role })}
                          >
                            {pending ? 'Zapisywanie…' : 'Zapisz'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="faint small" style={{ marginTop: 12 }}>
          Wybierz rolę i kliknij „Zapisz”. Nie możesz odebrać sobie roli administratora. Przełożony widzi tylko teczki, w
          których jest oceniającym. Administrator to rola techniczna: konta i tryb korekty, kartoteka tylko do odczytu.
        </p>
      </section>

      <Snackbar
        open={saved !== null}
        message={saved?.text ?? ''}
        duration={saved?.undo ? 10000 : 6000}
        onClose={() => setSaved(null)}
        action={
          saved?.undo
            ? {
                label: 'Cofnij',
                onClick: () => {
                  const undo = saved.undo!
                  setSaved(null)
                  change.mutate({ id: undo.id, role: undo.role })
                },
              }
            : undefined
        }
      />
    </div>
  )
}
