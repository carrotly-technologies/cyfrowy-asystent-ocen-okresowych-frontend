import { createContext, useContext, useState, type ReactNode } from 'react'

export type Role = 'SUPERVISOR' | 'HR'

const RoleCtx = createContext<{ role: Role; setRole: (r: Role) => void }>({
  role: 'SUPERVISOR',
  setRole: () => {},
})

function readRole(): Role {
  try {
    return localStorage.getItem('kompas.role') === 'HR' ? 'HR' : 'SUPERVISOR'
  } catch {
    return 'SUPERVISOR'
  }
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(readRole)
  const setRole = (r: Role) => {
    setRoleState(r)
    try {
      localStorage.setItem('kompas.role', r)
    } catch {
      // storage unavailable — role lives only in memory
    }
  }
  return <RoleCtx.Provider value={{ role, setRole }}>{children}</RoleCtx.Provider>
}

// eslint-disable-next-line react/only-export-components
export const useRole = () => useContext(RoleCtx)
