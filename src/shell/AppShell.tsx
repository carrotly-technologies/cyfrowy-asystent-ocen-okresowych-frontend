import { useQueryClient } from '@tanstack/react-query'
import {
  BookOpen,
  ClipboardCheck,
  HeartHandshake,
  HeartPulse,
  LogOut,
  type LucideIcon,
  Menu,
  MoreHorizontal,
  RotateCcw,
  Scale,
  Settings,
  TableProperties,
  UserCog,
  FilePen,
  Users,
  Contact,
  ChartColumn,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { resetDemo, type Role } from '../api/cases'
import { ApiStatus } from '../components/ApiStatus'
import { NotificationBell } from '../notifications/NotificationBell'
import { ConfirmDialog, UserMenu } from '../components/ui'
import { demoToolsFor } from '../lib/demoTools'
import { ROLE_LABEL, useAuth, useMe } from '../lib/useAuth'
import { Breadcrumbs } from './Breadcrumbs'

/**
 * Layout of the gov.pl service family (review/design-mobywatel.md):
 * white header (our text wordmark, bell, settings, user) · navy service bar (role, office, demo tools) ·
 * side navigation from 1024px · "Menu" drawer below 1024px · bottom tab bar on phones for EMPLOYEE and SUPERVISOR ·
 * footer with a link bar and the note that this is not an official gov.pl / KPRM / mObywatel service.
 */
export function AppShell() {
  const me = useMe()
  const { signOut } = useAuth()
  const location = useLocation()
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerRef = useRef<HTMLDialogElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  // The drawer is a native modal <dialog>: focus trap, Esc and inert background come from the browser
  useEffect(() => {
    const d = drawerRef.current
    if (!d) return
    if (drawerOpen && !d.open) d.showModal()
    else if (!drawerOpen && d.open) {
      d.close()
      openerRef.current?.focus()
    }
  }, [drawerOpen])

  const openDrawer = (e: React.MouseEvent<HTMLElement>) => {
    openerRef.current = e.currentTarget
    setDrawerOpen(true)
  }

  const [resetOpen, setResetOpen] = useState(false)
  const onReset = async () => {
    try {
      await resetDemo()
    } finally {
      // keep the signed-in user, refetch the rest
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
    }
  }
  const demoTools = demoToolsFor(me.role)
  const items = navItems(me.role)
  const bottom = BOTTOM_NAV_ROLES.includes(me.role)

  const userRole = me.position || ROLE_LABEL[me.role]
  const settingsActive = isUnder(location.pathname, '/ustawienia')
  const isActive = (match: string[]) => match.some((p) => isUnder(location.pathname, p))

  const navList = (variant: 'side' | 'drawer') => (
    <ul className="sidenav__list">
      {items.map(({ to, label, Icon, match, group }, i) => {
        const active = isActive(match)
        return (
          <li key={to} className={group && i > 0 && !items[i - 1].group ? 'sidenav__group-start' : undefined}>
            <Link to={to} className={`sidenav__link ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined}>
              <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          </li>
        )
      })}
      {variant === 'drawer' && (
        <li className="sidenav__group-start">
          <Link
            to="/ustawienia"
            className={`sidenav__link ${settingsActive ? 'is-active' : ''}`}
            aria-current={settingsActive ? 'page' : undefined}
          >
            <Settings size={22} strokeWidth={1.75} aria-hidden="true" />
            <span>Ustawienia</span>
          </Link>
        </li>
      )}
    </ul>
  )

  const tools = demoTools && (
    <div className="sidenav__tools">
      <span className="sidenav__tools-label">Wersja demonstracyjna</span>
      <div className="sidenav__tools-row">
        <button type="button" className="sidenav__tool" onClick={() => setResetOpen(true)} title="Przywróć dane demonstracyjne">
          <RotateCcw size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>Reset danych</span>
        </button>
        <ApiStatus />
      </div>
    </div>
  )

  return (
    <div className={`shell ${bottom ? 'shell--bottom-nav' : ''}`}>
      <a className="skip-link" href="#main">
        Przejdź do treści
      </a>
      <header className="topbar">
        <button
          type="button"
          className="topbar__menu-btn"
          aria-expanded={drawerOpen}
          aria-controls="nav-drawer"
          onClick={openDrawer}
        >
          <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
          <span>Menu</span>
        </button>
        <Link to="/" className="topbar__brand" aria-label="Cyfrowy Asystent Ocen Okresowych: strona główna">
          <ClipboardCheck className="topbar__logo" size={26} strokeWidth={1.75} aria-hidden="true" />
          <span className="topbar__product">
            Cyfrowy Asystent<span className="topbar__product-tail"> Ocen Okresowych</span>
          </span>
        </Link>

        <div className="topbar__right">
          <NotificationBell role={me.role} />
          <Link
            to="/ustawienia"
            className={`topbar__icon-btn ${settingsActive ? 'is-active' : ''}`}
            aria-label="Ustawienia"
            title="Ustawienia"
            aria-current={settingsActive ? 'page' : undefined}
          >
            <Settings size={22} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <UserMenu
            name={me.name}
            role={userRole}
            note={`${ROLE_LABEL[me.role]} · ${officeLabel(me.officeName)}`}
            items={[{ label: 'Wyloguj', icon: <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />, onSelect: () => void signOut() }]}
          />
        </div>
      </header>

      <div className="servicebar">
        <span className="servicebar__role">{ROLE_LABEL[me.role]}</span>
        <span className="servicebar__office one-line" title={officeLabel(me.officeName)}>
          {officeLabel(me.officeName)}
        </span>
      </div>

      <div className="shell__body">
        <nav className="sidenav" aria-label="Nawigacja główna">
          {navList('side')}
          {tools}
        </nav>

        <main className="main" id="main" tabIndex={-1}>
          <Breadcrumbs />
          <div className="main__content">
            <Outlet />
          </div>
          <footer className="footer">
            <div className="footer__bar">
              <ul className="footer__links">
                <li>
                  <Link to="/baza-wiedzy">Pomoc i baza wiedzy</Link>
                </li>
                <li>
                  <Link to="/ustawienia">Ustawienia dostępności</Link>
                </li>
              </ul>
            </div>
            <div className="footer__note">
              <p>
                <strong>Cyfrowy Asystent Ocen Okresowych</strong> · narzędzie wewnętrzne urzędu do ocen okresowych w służbie
                cywilnej.
              </p>
              <p>Nie jest usługą portalu gov.pl, KPRM ani aplikacji mObywatel. Oprogramowanie otwarte na licencji EUPL-1.2.</p>
            </div>
          </footer>
        </main>
      </div>

      {bottom && (
        <nav className="bottomnav" aria-label="Nawigacja na telefonie">
          <ul className="bottomnav__list">
            {items
              .filter((i) => i.bottom)
              .map(({ to, label, short, Icon, match }) => {
                const active = isActive(match)
                return (
                  <li key={to}>
                    <Link to={to} className={`bottomnav__link ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined}>
                      <Icon size={24} strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
                      <span>{short ?? label}</span>
                    </Link>
                  </li>
                )
              })}
            <li>
              <button type="button" className="bottomnav__link" aria-expanded={drawerOpen} aria-controls="nav-drawer" onClick={openDrawer}>
                <MoreHorizontal size={24} strokeWidth={1.75} aria-hidden="true" />
                <span>Więcej</span>
              </button>
            </li>
          </ul>
        </nav>
      )}

      <dialog
        id="nav-drawer"
        ref={drawerRef}
        className="drawer"
        aria-label="Menu"
        onCancel={(e) => {
          e.preventDefault()
          setDrawerOpen(false)
        }}
        onClick={(e) => {
          // a click on the backdrop or on a link (navigation) closes the drawer
          if (e.target === drawerRef.current || (e.target as HTMLElement).closest('a')) setDrawerOpen(false)
        }}
      >
        <div className="drawer__inner">
          <div className="drawer__head">
            <span className="drawer__title">Menu</span>
            <button type="button" className="drawer__close" onClick={() => setDrawerOpen(false)} aria-label="Zamknij menu">
              <X size={22} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
          <nav aria-label="Nawigacja główna (menu)">{navList('drawer')}</nav>
          {tools}
          <button type="button" className="sidenav__link drawer__logout" onClick={() => void signOut()}>
            <LogOut size={22} strokeWidth={1.75} aria-hidden="true" />
            <span>Wyloguj</span>
          </button>
        </div>
      </dialog>

      <ConfirmDialog
        open={resetOpen}
        title="Przywrócić dane demonstracyjne?"
        confirmLabel="Przywróć dane"
        destructive
        onConfirm={onReset}
        onCancel={() => setResetOpen(false)}
      >
        <p>Wszystkie zmiany wprowadzone w wersji demonstracyjnej (oceny, decyzje, wpisy w kartotece) zostaną usunięte, a dane wrócą do stanu początkowego. Pozostaniesz zalogowany.</p>
      </ConfirmDialog>
    </div>
  )
}

/** Roles that get the bottom tab bar on phones (mObywatel pattern); the others use the "Menu" drawer. */
const BOTTOM_NAV_ROLES: Role[] = ['EMPLOYEE', 'SUPERVISOR']

type NavItem = {
  to: string
  label: string
  /** Shorter label for the bottom tab bar. */
  short?: string
  Icon: LucideIcon
  match: string[]
  /** Shown in the phone bottom tab bar (EMPLOYEE, SUPERVISOR). */
  bottom?: boolean
  /** Starts the shared group under a divider ("Baza wiedzy"). */
  group?: boolean
}

/**
 * Main links for a role; `match` lists the paths that highlight the link (a person page and a case file belong to "Mój zespół").
 * `/ustawienia` is the gear icon in the header (and a row in the drawer).
 */
function navItems(role: Role): NavItem[] {
  const byRole: Partial<Record<Role, NavItem[]>> = {
    SUPERVISOR: [
      { to: '/zespol', label: 'Mój zespół', short: 'Zespół', Icon: Users, match: ['/zespol', '/teczka'], bottom: true },
      { to: '/dobrostan', label: 'Dobrostan', Icon: HeartHandshake, match: ['/dobrostan'], bottom: true },
    ],
    EMPLOYEE: [
      { to: '/moje-oceny', label: 'Moje oceny', short: 'Oceny', Icon: ClipboardCheck, match: ['/moje-oceny'], bottom: true },
      { to: '/moj-puls', label: 'Puls', Icon: HeartPulse, match: ['/moj-puls'], bottom: true },
    ],
    HR: [{ to: '/hr', label: 'Monitoring', Icon: TableProperties, match: ['/hr'] }],
    ADMIN: [{ to: '/admin/uzytkownicy', label: 'Użytkownicy', Icon: UserCog, match: ['/admin/uzytkownicy'] }],
    DIRECTOR: [{ to: '/sprzeciwy', label: 'Sprzeciwy', Icon: Scale, match: ['/sprzeciwy'] }],
  }
  return [
    ...(byRole[role] ?? []),
    ...(role === 'ADMIN' ? [{ to: '/admin/korekty', label: 'Tryb korekty', Icon: FilePen, match: ['/admin/korekty'] }] : []),
    // The supervisor's people live in „Mój zespół” (/zespol/:id); /kartoteka redirects there.
    ...(role === 'HR' || role === 'ADMIN' ? [{ to: '/kartoteka', label: 'Kartoteka', Icon: Contact, match: ['/kartoteka'] }] : []),
    ...(role === 'HR' || role === 'ADMIN' || role === 'DIRECTOR' ? [{ to: '/statystyki', label: 'Statystyki', Icon: ChartColumn, match: ['/statystyki'] }] : []),
    { to: '/baza-wiedzy', label: 'Baza wiedzy', short: 'Wiedza', Icon: BookOpen, match: ['/baza-wiedzy'], group: true, bottom: role === 'EMPLOYEE' },
  ]
}

/** `path` is `base` or below it (`/teczka/c-001` is under `/teczka`, `/uiX` is not under `/ui`). */
const isUnder = (path: string, base: string) => path === base || path.startsWith(`${base}/`)

function officeLabel(name: string | undefined) {
  const n = name ?? 'Urząd'
  return /demonstr/i.test(n) ? n.replace(/\s*\((dane demonstracyjne)\)/i, ' — $1') : `${n} — dane demonstracyjne`
}
