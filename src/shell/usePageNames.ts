import { useQuery } from '@tanstack/react-query'
import type { CaseDetail } from '../api/cases'
import type { EmployeeDetail } from '../api/employees'

const never = () => Promise.reject(new Error('cache only'))

/**
 * Names for breadcrumbs of detail routes, read from the query cache the pages fill (never fetched here):
 * the person of `/kartoteka/:id`, of `/dobrostan/:id` and of the case `/teczka/:id`.
 */
export function usePageNames(pathname: string): { person: string | null; casePerson: { id: string; name: string } | null } {
  const emp = /^\/kartoteka\/([^/]+)/.exec(pathname)?.[1]
  const well = /^\/dobrostan\/([^/]+)/.exec(pathname)?.[1]
  const caseId = /^\/teczka\/([^/]+)/.exec(pathname)?.[1]
  const e = useQuery<EmployeeDetail>({ queryKey: ['employee', emp ? decodeURIComponent(emp) : ''], queryFn: never, enabled: false })
  const w = useQuery<{ name: string }>({ queryKey: ['partner-person', well ? decodeURIComponent(well) : ''], queryFn: never, enabled: false })
  const c = useQuery<CaseDetail>({ queryKey: ['case', caseId ? decodeURIComponent(caseId) : ''], queryFn: never, enabled: false })
  const person = emp && e.data ? `${e.data.firstName} ${e.data.lastName}` : well && w.data ? w.data.name : null
  const casePerson = caseId && c.data ? { id: c.data.person.id, name: `${c.data.person.firstName} ${c.data.person.lastName}` } : null
  return { person, casePerson }
}
