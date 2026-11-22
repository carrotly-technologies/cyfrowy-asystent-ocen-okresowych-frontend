import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router'
import { CasePage } from './case/CasePage'
import { AdminCorrectionsPage } from './pages/AdminCorrectionsPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { HrPage } from './pages/HrPage'
import { EmployeePage } from './pages/kartoteka/EmployeePage'
import { KartotekaPage } from './pages/kartoteka/KartotekaPage'
import { StatisticsPage } from './pages/kartoteka/StatisticsPage'
import { KnowledgePage } from './pages/KnowledgePage'
import { LoginPage } from './pages/LoginPage'
import { MyAssessmentsPage, MyCasePage } from './pages/MyAssessmentsPage'
import { ObjectionCasePage, ObjectionsPage } from './pages/ObjectionsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SettingsPage } from './pages/SettingsPage'
import { TeamPage } from './pages/TeamPage'
import { MyPulsePage } from './partner/MyPulsePage'
import { PersonWellbeingPage } from './partner/PersonWellbeingPage'
import { TeamWellbeingPage } from './partner/TeamWellbeingPage'
import { SheetPage } from './sheet/SheetPage'
import { AppShell } from './shell/AppShell'
import { RouteTitle } from './shell/RouteTitle'
import { HomeRedirect, RequireAuth, RequireRole } from './shell/RequireAuth'
import { useMe } from './lib/useAuth'

export default function App() {
  return (
    <>
    <RouteTitle />
    <Routes>
      <Route path="/logowanie" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<RequireRole roles={['SUPERVISOR', 'EMPLOYEE', 'HR']} />}>
          <Route path="/teczka/:id/arkusz" element={<SheetPage />} />
        </Route>
        <Route element={<RequireRole roles={['EMPLOYEE']} />}>
          <Route path="/moje-oceny/:id/arkusz" element={<SheetPage />} />
        </Route>
        <Route element={<AppShell />}>
          <Route index element={<HomeRedirect />} />
          <Route element={<RequireRole roles={['SUPERVISOR']} />}>
            <Route path="/zespol" element={<TeamPage />} />
            <Route path="/zespol/:id" element={<EmployeePage variant="team" />} />
            <Route path="/teczka/:id/:stage?" element={<CasePage />} />
            <Route path="/dobrostan" element={<TeamWellbeingPage />} />
            <Route path="/dobrostan/:personId" element={<PersonWellbeingPage />} />
          </Route>
          <Route element={<RequireRole roles={['EMPLOYEE']} />}>
            <Route path="/moje-oceny" element={<MyAssessmentsPage />} />
            <Route path="/moje-oceny/:id" element={<MyCasePage />} />
            <Route path="/moj-puls" element={<MyPulsePage />} />
          </Route>
          <Route element={<RequireRole roles={['HR']} />}>
            <Route path="/hr" element={<HrPage />} />
          </Route>
          <Route element={<RequireRole roles={['DIRECTOR']} />}>
            <Route path="/sprzeciwy" element={<ObjectionsPage />} />
            <Route path="/sprzeciwy/:id" element={<ObjectionCasePage />} />
          </Route>
          <Route element={<RequireRole roles={['HR', 'ADMIN', 'SUPERVISOR']} />}>
            <Route path="/kartoteka" element={<SupervisorToTeam><KartotekaPage /></SupervisorToTeam>} />
            <Route path="/kartoteka/:id" element={<SupervisorToTeam><EmployeePage /></SupervisorToTeam>} />
          </Route>
          <Route element={<RequireRole roles={['HR', 'ADMIN', 'DIRECTOR']} />}>
            <Route path="/statystyki" element={<StatisticsPage />} />
          </Route>
          <Route element={<RequireRole roles={['ADMIN']} />}>
            <Route path="/admin/uzytkownicy" element={<AdminUsersPage />} />
            <Route path="/admin/korekty" element={<AdminCorrectionsPage />} />
            <Route path="/admin" element={<Navigate to="/admin/uzytkownicy" replace />} />
          </Route>
          <Route path="/baza-wiedzy" element={<KnowledgePage />} />
          <Route path="/ustawienia" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
    </>
  )
}

/** The supervisor has one place for their people: /kartoteka → /zespol, /kartoteka/:id → /zespol/:id (HR, ADMIN unchanged). */
function SupervisorToTeam({ children }: { children: ReactNode }) {
  const me = useMe()
  const { id } = useParams()
  if (me.role !== 'SUPERVISOR') return children
  return <Navigate to={id ? `/zespol/${encodeURIComponent(id)}` : '/zespol'} replace />
}
