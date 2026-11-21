import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { Role } from '../api/cases'
import { errorMessage } from '../api/client'
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  runReminders,
  type AppNotification,
} from '../api/notifications'
import { countLabel, fmtDate } from '../lib/format'
import s from './NotificationBell.module.css'

const KEY = ['notifications'] as const

/** Where a notification about a case leads, per role (the HR monitoring has no case page). */
function caseLink(role: Role, caseId: string | null): string | null {
  if (!caseId) return null
  switch (role) {
    case 'SUPERVISOR':
      return `/teczka/${encodeURIComponent(caseId)}`
    case 'EMPLOYEE':
      return `/moje-oceny/${encodeURIComponent(caseId)}`
    case 'HR':
      return '/hr'
    case 'DIRECTOR':
      return `/sprzeciwy/${encodeURIComponent(caseId)}`
    default:
      return null
  }
}

/** Bell with the unread count and the user's own inbox (reminders of the scheduler, changes of terms, invitations). */
export function NotificationBell({ role }: { role: Role }) {
  const [open, setOpen] = useState(false)
  const [runInfo, setRunInfo] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: KEY, queryFn: ({ signal }) => getNotifications(signal), refetchInterval: 60_000 })
  const refresh = () => qc.invalidateQueries({ queryKey: KEY })
  const readOne = useMutation({ mutationFn: markNotificationRead, onSettled: refresh })
  const readAll = useMutation({ mutationFn: markAllNotificationsRead, onSettled: refresh })
  const run = useMutation({
    mutationFn: runReminders,
    onSuccess: (r) => setRunInfo(r.created > 0 ? `Utworzono ${r.created} nowych powiadomień.` : 'Brak nowych przypomnień na dziś.'),
    onError: (err) => setRunInfo(errorMessage(err)),
    onSettled: refresh,
  })

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      btnRef.current?.focus()
    }
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  const unread = q.data?.unread ?? 0
  const items = q.data?.items ?? []

  const choose = (n: AppNotification) => {
    if (!n.readAt) readOne.mutate(n.id)
    const to = caseLink(role, n.caseId)
    if (to) {
      setOpen(false)
      navigate(to)
    }
  }

  return (
    <div className={s.root} ref={rootRef}>
      <button
        type="button"
        ref={btnRef}
        className={s.button}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unread > 0 ? `Powiadomienia: ${countLabel(unread, 'nieprzeczytane', 'nieprzeczytane', 'nieprzeczytanych')}` : 'Powiadomienia'}
        title="Powiadomienia"
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={20} strokeWidth={1.75} aria-hidden="true" />
        {unread > 0 && <span className={s.badge} aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className={s.panel} role="dialog" aria-label="Powiadomienia">
          <div className={s.head}>
            <h2 className={s.title}>Powiadomienia</h2>
            <button type="button" className={s.linkBtn} disabled={unread === 0 || readAll.isPending} onClick={() => readAll.mutate()}>
              Oznacz wszystkie jako przeczytane
            </button>
          </div>
          {q.isError ? (
            <p className={s.empty} role="alert">{errorMessage(q.error)}</p>
          ) : items.length === 0 ? (
            <p className={s.empty}>{q.isPending ? 'Wczytywanie…' : 'Brak powiadomień.'}</p>
          ) : (
            <ul className={s.list}>
              {items.map((n) => (
                <li key={n.id} className={`${s.item} ${n.readAt ? s.read : s.unread}`}>
                  <button type="button" className={s.itemBtn} onClick={() => choose(n)}>
                    <span className={s.itemTitle}>{n.title}</span>
                    <span className={s.itemBody}>{n.body}</span>
                    <span className={s.itemDate}>{fmtDate(n.createdOn)}{n.readAt ? '' : ' · nowe'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {(role === 'HR' || role === 'ADMIN') && (
            <div className={s.foot}>
              <span>{runInfo ?? 'Harmonogram działa automatycznie; możesz go uruchomić ręcznie.'}</span>
              <button type="button" className={s.linkBtn} disabled={run.isPending} onClick={() => run.mutate()}>
                Uruchom przypomnienia teraz
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
