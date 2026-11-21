import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import type { Role } from '../api/cases'

type Crumb = { to: string; label: string }

/** Parent and current page for detail routes (depth ≥ 2); list pages get no breadcrumbs. */
function trail(path: string, role: Role): { parents: Crumb[]; current: string } | null {
  if (/^\/teczka\/[^/]+/.test(path)) return { parents: [{ to: '/zespol', label: 'Mój zespół' }], current: 'Teczka oceny' }
  if (/^\/dobrostan\/.+/.test(path)) return { parents: [{ to: '/dobrostan', label: 'Dobrostan zespołu' }], current: 'Pracownik' }
  if (/^\/moje-oceny\/.+/.test(path)) return { parents: [{ to: '/moje-oceny', label: 'Moje oceny' }], current: 'Ocena okresowa' }
  if (/^\/sprzeciwy\/.+/.test(path)) return { parents: [{ to: '/sprzeciwy', label: 'Sprzeciwy' }], current: 'Sprzeciw' }
  if (/^\/kartoteka\/.+/.test(path))
    return { parents: [{ to: '/kartoteka', label: role === 'SUPERVISOR' ? 'Pracownicy' : 'Kartoteka' }], current: 'Pracownik' }
  return null
}

/**
 * gov.pl breadcrumbs above the page (from 768px). On phones only the page's own "‹ Powrót" link (BackLink) shows.
 */
export function Breadcrumbs({ role }: { role: Role }) {
  const { pathname } = useLocation()
  const t = trail(pathname, role)
  if (!t) return null
  return (
    <nav className="crumbs" aria-label="Okruszki">
      <ol className="crumbs__list">
        {t.parents.map((c) => (
          <li key={c.to}>
            <Link to={c.to}>{c.label}</Link>
            <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
          </li>
        ))}
        <li aria-current="page">{t.current}</li>
      </ol>
    </nav>
  )
}
