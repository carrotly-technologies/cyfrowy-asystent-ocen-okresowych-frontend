import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Compass, RotateCcw, TableProperties, Users } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { getMe, resetDemo } from '../api/cases'
import { ApiStatus } from '../components/ApiStatus'
import { useRole, type Role } from '../lib/role'

export function AppShell() {
  const { role, setRole } = useRole()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const me = useQuery({ queryKey: ['me'], queryFn: ({ signal }) => getMe(signal), staleTime: Infinity })

  const switchRole = (r: Role) => {
    if (r === role) return
    setRole(r)
    navigate(r === 'HR' ? '/hr' : '/zespol')
  }

  const onReset = async () => {
    if (!window.confirm('Przywrócić dane demonstracyjne do stanu początkowego?')) return
    try {
      await resetDemo()
    } finally {
      qc.invalidateQueries()
    }
  }

  const userName = role === 'HR' ? 'Agnieszka Lis' : (me.data?.name ?? 'Joanna Kowalczyk')
  const userRole = role === 'HR' ? 'Biuro Dyrektora Generalnego · kadry' : (me.data?.position ?? 'naczelnik wydziału')

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar__brand">
          <Compass size={18} strokeWidth={1.75} aria-hidden="true" />
          <span className="topbar__product">Kompas Kompetencji</span>
          <span className="topbar__sep" aria-hidden="true" />
          <span className="topbar__office">{me.data?.officeName ?? 'Ministerstwo Cyfryzacji'} — dane demonstracyjne</span>
        </div>
        <div className="topbar__right">
          <div className="role-switch" role="radiogroup" aria-label="Rola w systemie">
            {(
              [
                ['SUPERVISOR', 'Przełożony'],
                ['HR', 'Kadry HR'],
              ] as const
            ).map(([r, label]) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={role === r}
                className={`role-switch__opt ${role === r ? 'is-on' : ''}`}
                onClick={() => switchRole(r)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="topbar__user">
            <span className="topbar__user-name">{userName}</span>
            <span className="topbar__user-role">{userRole}</span>
          </div>
        </div>
      </header>

      <nav className="sidenav" aria-label="Nawigacja główna">
        <ul className="sidenav__list">
          {role === 'SUPERVISOR' ? (
            <li>
              <NavLink to="/zespol" className={({ isActive }) => navCls(isActive || location.pathname.startsWith('/teczka'))}>
                <Users size={18} strokeWidth={1.75} aria-hidden="true" />
                <span>Mój zespół</span>
              </NavLink>
            </li>
          ) : (
            <li>
              <NavLink to="/hr" className={({ isActive }) => navCls(isActive)}>
                <TableProperties size={18} strokeWidth={1.75} aria-hidden="true" />
                <span>Monitoring</span>
              </NavLink>
            </li>
          )}
          <li>
            <NavLink to="/baza-wiedzy" className={({ isActive }) => navCls(isActive)}>
              <BookOpen size={18} strokeWidth={1.75} aria-hidden="true" />
              <span>Baza wiedzy</span>
            </NavLink>
          </li>
        </ul>
        <div className="sidenav__foot">
          <button type="button" className="sidenav__tool" onClick={onReset} title="Przywróć dane demonstracyjne">
            <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
            <span>Reset</span>
          </button>
          <ApiStatus />
        </div>
      </nav>

      <main className="main" id="main">
        <Outlet />
      </main>
    </div>
  )
}

const navCls = (active: boolean) => `sidenav__link ${active ? 'is-active' : ''}`
