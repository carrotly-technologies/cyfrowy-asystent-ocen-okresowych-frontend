import { Navigate, Route, Routes } from 'react-router'
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
import { HomeRedirect, RequireAuth, RequireRole } from './shell/RequireAuth'

export default function App() {
  return (
    <Routes>
      <Route path="/logowanie" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<RequireRole roles={['SUPERVISOR', 'EMPLOYEE', 'HR']} />}>
          <Route path="/teczka/:id/arkusz" element={<SheetPage />} />
        </Route>
        <Route element={<AppShell />}>
          <Route index element={<HomeRedirect />} />
          <Route element={<RequireRole roles={['SUPERVISOR']} />}>
            <Route path="/zespol" element={<TeamPage />} />
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
            <Route path="/kartoteka" element={<KartotekaPage />} />
            <Route path="/kartoteka/:id" element={<EmployeePage />} />
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
  )
}
