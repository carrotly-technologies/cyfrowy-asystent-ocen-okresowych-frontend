import { useQuery } from '@tanstack/react-query'
import { getEmployee } from '../api/employees'

/**
 * Name of the person on `/zespol/:id` (for breadcrumbs and the browser tab), or null elsewhere and while loading.
 * Reads the `['employee', id]` cache that the person page fills; it never fetches on its own.
 */
export function useTeamPersonName(pathname: string): string | null {
  const raw = /^\/zespol\/([^/]+)/.exec(pathname)?.[1]
  const id = raw ? decodeURIComponent(raw) : ''
  const q = useQuery({ queryKey: ['employee', id], queryFn: ({ signal }) => getEmployee(id, signal), enabled: false })
  return id && q.data ? `${q.data.firstName} ${q.data.lastName}` : null
}
