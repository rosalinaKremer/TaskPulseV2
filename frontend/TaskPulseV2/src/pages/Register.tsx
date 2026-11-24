import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'
import { Field } from '../components/Field'
import { useAuth } from '../auth/useAuth'
import { ApiError } from '../lib/api'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type FieldName = 'full_name' | 'email' | 'password' | 'confirm' | 'terms'
type Errors = Partial<Record<FieldName, string>>

type Form = { fullName: string; email: string; password: string; confirm: string; terms: boolean }

function validate(f: Form): Errors {
  const errors: Errors = {}
  const name = f.fullName.trim()
  if (!name) errors.full_name = 'Full name is required'
  else if (name.length < 2) errors.full_name = 'Full name must be at least 2 characters'
  if (!f.email.trim()) errors.email = 'Email is required'
  else if (!EMAIL_RE.test(f.email.trim())) errors.email = 'Enter a valid email address'
  if (!f.password) errors.password = 'Password is required'
  else if (f.password.length < 8) errors.password = 'Password must be at least 8 characters'
  else if (/^\d+$/.test(f.password)) errors.password = 'Password can’t be only numbers'
  if (!f.confirm) errors.confirm = 'Please confirm your password'
  else if (f.password !== f.confirm) errors.confirm = 'Passwords do not match'
  if (!f.terms) errors.terms = 'Please agree to the Terms & Conditions'
  return errors
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<Form>({ fullName: '', email: '', password: '', confirm: '', terms: false })
  const [errors, setErrors] = useState<Errors>({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  function update<K extends keyof Form>(key: K, value: Form[K], errorKey: FieldName) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((p) => ({ ...p, [errorKey]: undefined }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setApiError('')
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length) return

    setLoading(true)
    try {
      await register(form.fullName.trim(), form.email.trim(), form.password)
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors)
        // Field problems show under their inputs; only show a banner for the rest.
        if (!Object.keys(err.fieldErrors).length) setApiError(err.message)
      } else {
        setApiError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout heading="Join TaskPulse" subtitle="Create an account to post tasks and start bidding" title="Create account" wide>
      {apiError && (
        <div className="alert alert-error" role="alert">
          {apiError}
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate>
        <Field
          label="Full name"
          autoComplete="name"
          placeholder="Juan Dela Cruz"
          value={form.fullName}
          error={errors.full_name}
          onChange={(e) => update('fullName', e.target.value, 'full_name')}
        />
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          error={errors.email}
          onChange={(e) => update('email', e.target.value, 'email')}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={form.password}
          error={errors.password}
          onChange={(e) => update('password', e.target.value, 'password')}
        />
        <Field
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={form.confirm}
          error={errors.confirm}
          onChange={(e) => update('confirm', e.target.value, 'confirm')}
        />
        <div className="terms-section">
          <label className="checkbox-row">
            <input
              type="checkbox"
              className="checkbox"
              checked={form.terms}
              onChange={(e) => update('terms', e.target.checked, 'terms')}
            />
            <span className="checkbox-label">I agree to the Terms &amp; Conditions and Privacy Policy</span>
          </label>
          {errors.terms && <p className="field-error">{errors.terms}</p>}
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading && <span className="spinner" />}
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="switch-link">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  )
}
