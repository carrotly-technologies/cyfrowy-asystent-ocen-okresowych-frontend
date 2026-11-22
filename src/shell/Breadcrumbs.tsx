import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { STAGE_SHORT, stageFromSlug } from '../lib/stages'
import { useMe } from '../lib/useAuth'
import { usePageNames } from './usePageNames'
import { useTeamPersonName } from './useTeamPersonName'

type Crumb = { to: string; label: string }

/** Parent and current page for detail routes (depth ≥ 2); list pages get no breadcrumbs. */
function trail(
  path: string,
  personName: string | null,
  names: ReturnType<typeof usePageNames>,
  role: string,
): { parents: Crumb[]; current: string } | null {
  if (/^\/zespol\/[^/]+/.test(path)) return { parents: [{ to: '/zespol', label: 'Oceny zespołu' }], current: personName ?? 'Pracownik' }
  if (/^\/teczka\/[^/]+/.test(path)) {
    const supervisor = role === 'SUPERVISOR'
    const root =
      role === 'DIRECTOR' ? { to: '/sprzeciwy', label: 'Sprzeciwy' } : supervisor ? { to: '/zespol', label: 'Oceny zespołu' } : { to: '/hr', label: 'Monitoring' }
    const cp = names.casePerson
    const person = cp && role !== 'DIRECTOR' ? [{ to: supervisor ? `/zespol/${encodeURIComponent(cp.id)}` : `/kartoteka/${encodeURIComponent(cp.id)}`, label: cp.name }] : []
    // The last crumb names the stage shown (/teczka/:id/:stage), e.g. "Okres obserwacji"; the sheet view is "Arkusz".
    const stage = stageFromSlug(path.split('/')[3])
    const current = /^\/teczka\/[^/]+\/arkusz(\/|$)/.test(path) ? 'Arkusz' : stage ? STAGE_SHORT[stage] : 'Ocena'
    return { parents: [root, ...person], current }
  }
  if (/^\/dobrostan\/.+/.test(path)) return { parents: [{ to: '/dobrostan', label: 'Dobrostan zespołu' }], current: names.person ?? 'Pracownik' }
  if (/^\/moje-oceny\/.+/.test(path)) return { parents: [{ to: '/moje-oceny', label: 'Moje oceny' }], current: 'Ocena okresowa' }
  if (/^\/sprzeciwy\/.+/.test(path)) return { parents: [{ to: '/sprzeciwy', label: 'Sprzeciwy' }], current: 'Sprzeciw' }
  if (/^\/kartoteka\/.+/.test(path))
    return { parents: [{ to: '/kartoteka', label: 'Kartoteka' }], current: names.person ?? 'Pracownik' }
  return null
}

/**
 * gov.pl breadcrumbs above the page (from 768px). On phones only the page's own "‹ Powrót" link (BackLink) shows.
 */
export function Breadcrumbs() {
  const { pathname } = useLocation()
  const personName = useTeamPersonName(pathname)
  const names = usePageNames(pathname)
  const me = useMe()
  const t = trail(pathname, personName, names, me.role)
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
