import type { ReactNode } from 'react'

type Props = {
  heading: string
  subtitle: string
  title: string
  wide?: boolean
  children: ReactNode
}

export function AuthLayout({ heading, subtitle, title, wide, children }: Props) {
  return (
    <main className="auth-page">
      <header className="auth-header">
        <div className="brand-logo">TaskPulse</div>
        <h1 className="welcome-text">{heading}</h1>
        <p className="welcome-subtitle">{subtitle}</p>
      </header>
      <section className={`form-card${wide ? ' form-card-wide' : ''}`} aria-label={title}>
        <h2 className="form-title">{title}</h2>
        {children}
      </section>
    </main>
  )
}
