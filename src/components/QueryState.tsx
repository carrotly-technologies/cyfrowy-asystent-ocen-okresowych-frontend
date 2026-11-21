import { ApiError, errorMessage } from '../api/client'

export function LoadingState({ label = 'Wczytywanie…' }: { label?: string }) {
  return (
    <div className="state" role="status">
      <div className="skeleton" style={{ width: 220, marginBottom: 10 }} />
      <div className="skeleton" style={{ width: 360, marginBottom: 10 }} />
      <div className="skeleton" style={{ width: 300 }} />
      <span className="visually-hidden">{label}</span>
    </div>
  )
}

export function ErrorState({ error, onRetry, what }: { error: unknown; onRetry?: () => void; what: string }) {
  const notImplemented = error instanceof ApiError && error.status === 404
  return (
    <div className="state" role="alert">
      <p className="state__title">Nie udało się wczytać: {what}</p>
      <p className="small">
        {notImplemented
          ? 'Serwer API nie obsługuje jeszcze tego zasobu (kontrakt v2). Uruchom aktualny backend albo serwer deweloperski z MOCK_API=1.'
          : errorMessage(error)}
      </p>
      {onRetry && (
        <button type="button" className="btn btn--sm" style={{ marginTop: 12 }} onClick={onRetry}>
          Spróbuj ponownie
        </button>
      )}
    </div>
  )
}
