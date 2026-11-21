import { Navigate, Route, Routes } from 'react-router'
import { CasePage } from './case/CasePage'
import { HrPage } from './pages/HrPage'
import { KnowledgePage } from './pages/KnowledgePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { TeamPage } from './pages/TeamPage'
import { SheetPage } from './sheet/SheetPage'
import { AppShell } from './shell/AppShell'

export default function App() {
  return (
    <Routes>
      <Route path="/teczka/:id/arkusz" element={<SheetPage />} />
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/zespol" replace />} />
        <Route path="/zespol" element={<TeamPage />} />
        <Route path="/teczka/:id/:stage?" element={<CasePage />} />
        <Route path="/hr" element={<HrPage />} />
        <Route path="/baza-wiedzy" element={<KnowledgePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
