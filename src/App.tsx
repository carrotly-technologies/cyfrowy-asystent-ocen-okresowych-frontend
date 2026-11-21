import { Navigate, Route, Routes } from 'react-router'
import { CasePage } from './case/CasePage'
import { AdminCorrectionsPage } from './pages/AdminCorrectionsPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { HrPage } from './pages/HrPage'
import { KnowledgePage } from './pages/KnowledgePage'
import { LoginPage } from './pages/LoginPage'
import { MyAssessmentsPage, MyCasePage } from './pages/MyAssessmentsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { SettingsPage } from './pages/SettingsPage'
import { TeamPage } from './pages/TeamPage'
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
          </Route>
          <Route element={<RequireRole roles={['EMPLOYEE']} />}>
            <Route path="/moje-oceny" element={<MyAssessmentsPage />} />
            <Route path="/moje-oceny/:id" element={<MyCasePage />} />
          </Route>
          <Route element={<RequireRole roles={['HR']} />}>
            <Route path="/hr" element={<HrPage />} />
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
