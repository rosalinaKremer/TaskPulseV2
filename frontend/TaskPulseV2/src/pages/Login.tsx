import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { Field } from '../components/Field'
import { useAuth } from '../auth/useAuth'
import { ApiError } from '../lib/api'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Errors = Partial<Record<'email' | 'password', string>>

function validate(email: string, password: string): Errors {
  const errors: Errors = {}
  if (!email.trim()) errors.email = 'Email is required'
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address'
  if (!password) errors.password = 'Password is required'
  return errors
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<Errors>({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setApiError('')
    const errs = validate(email, password)
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    try {
      await login(email.trim(), password, remember)
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors)
        setApiError(err.message)
      } else {
        setApiError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout heading="Welcome back" subtitle="Sign in to your account to continue" title="Log in">
      {apiError && (
        <div className="alert alert-error" role="alert">
          {apiError}
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          error={errors.email}
          onChange={(e) => {
            setEmail(e.target.value)
            setErrors((p) => ({ ...p, email: undefined }))
          }}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          error={errors.password}
          onChange={(e) => {
            setPassword(e.target.value)
            setErrors((p) => ({ ...p, password: undefined }))
          }}
        />
        <div className="form-options">
          <label className="checkbox-row">
            <input type="checkbox" className="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span className="checkbox-label">Remember me</span>
          </label>
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading && <span className="spinner" />}
          {loading ? 'Signing in…' : 'Log in'}
        </button>
      </form>
      <p className="switch-link">
        Don&apos;t have an account? <Link to="/register">Sign up</Link>
      </p>
    </AuthLayout>
  )
}
