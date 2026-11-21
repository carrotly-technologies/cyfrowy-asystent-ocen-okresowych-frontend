import type { Role } from '../api/cases'

/**
 * Demo helpers in the top bar ("Reset" of the demo data, API status dot). Build-time `VITE_DEMO_TOOLS=false` hides
 * them for everyone; an employee (oceniany) never sees them.
 */
export function demoToolsFor(role: Role): boolean {
  if (import.meta.env.VITE_DEMO_TOOLS === 'false') return false
  return role !== 'EMPLOYEE'
}
