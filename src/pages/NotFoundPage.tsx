import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="page">
      <h1 className="h-page">Nie ma takiej strony</h1>
      <p className="muted" style={{ marginTop: 8 }}>
        Adres mógł się zmienić. <Link to="/zespol">Wróć do listy zespołu</Link>.
      </p>
    </div>
  )
}
