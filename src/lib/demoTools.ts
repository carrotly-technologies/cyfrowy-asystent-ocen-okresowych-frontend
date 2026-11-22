import type { Role } from '../api/cases'

/**
 * Demo helpers in the top bar ("Reset" of the demo data, API status dot). Build-time `VITE_DEMO_TOOLS=false` hides
 * them for everyone; the assessed person (EMPLOYEE) and the dyrektor generalny (DIRECTOR) never see them.
 */
export function demoToolsFor(role: Role): boolean {
  if (import.meta.env.VITE_DEMO_TOOLS === 'false') return false
  return role !== 'EMPLOYEE' && role !== 'DIRECTOR'
}
