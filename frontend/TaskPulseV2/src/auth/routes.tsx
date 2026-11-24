import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

function FullPageSpinner() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <span className="spinner spinner-dark" /> Loading…
    </div>
  )
}

/** Only for signed-in users; everyone else goes to /login. */
export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Only for signed-out users (login, sign up); signed-in users go home. */
export function GuestOnly() {
  const { user, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}
