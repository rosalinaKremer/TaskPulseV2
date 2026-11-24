import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

/** Placeholder signed-in landing page until the dashboard is built. */
export default function Home() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function handleLogout() {
    setBusy(true)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="home-page">
      <nav className="home-nav">
        <div className="brand-logo">TaskPulse</div>
        <button type="button" className="btn-outline" onClick={handleLogout} disabled={busy}>
          {busy ? 'Logging out…' : 'Log out'}
        </button>
      </nav>
      <section className="home-card">
        <h1>Hi, {user?.full_name || user?.email}!</h1>
        <p>You&apos;re signed in as {user?.email}.</p>
      </section>
    </main>
  )
}
