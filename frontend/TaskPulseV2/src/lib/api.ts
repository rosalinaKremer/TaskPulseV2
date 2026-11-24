// Thin fetch wrapper for the Django API.
// The base URL comes from VITE_API_URL (set in Vercel), e.g. https://taskpulse-api.onrender.com
const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/+$/, '')

export type User = {
  id: number
  email: string
  full_name: string
  date_joined: string
}

export type AuthResponse = {
  user: User
  access: string
  refresh: string
}

export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string>

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

// ── Token storage ──────────────────────────────────────────────────────────
// "Remember me" keeps tokens in localStorage; otherwise they live only for the
// browser session.
const ACCESS_KEY = 'taskpulse.access'
const REFRESH_KEY = 'taskpulse.refresh'

function store(): Storage {
  return localStorage.getItem(REFRESH_KEY) ? localStorage : sessionStorage
}

export const tokens = {
  get access() {
    return store().getItem(ACCESS_KEY)
  },
  get refresh() {
    return store().getItem(REFRESH_KEY)
  },
  save(access: string, refresh: string, remember?: boolean) {
    const target = remember === undefined ? store() : remember ? localStorage : sessionStorage
    tokens.clear()
    target.setItem(ACCESS_KEY, access)
    target.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    for (const s of [localStorage, sessionStorage]) {
      s.removeItem(ACCESS_KEY)
      s.removeItem(REFRESH_KEY)
    }
  },
}

// ── Error parsing ──────────────────────────────────────────────────────────
// DRF returns {"field": ["msg"]} or {"detail": "msg"} or {"non_field_errors": [...]}.
function parseError(status: number, body: unknown): ApiError {
  if (body && typeof body === 'object') {
    const data = body as Record<string, unknown>
    const fieldErrors: Record<string, string> = {}
    let general = ''
    for (const [key, value] of Object.entries(data)) {
      const msg = Array.isArray(value) ? String(value[0]) : String(value)
      if (key === 'detail' || key === 'non_field_errors') general = msg
      else fieldErrors[key] = msg
    }
    const message = general || Object.values(fieldErrors)[0] || 'Something went wrong. Please try again.'
    return new ApiError(message, status, fieldErrors)
  }
  if (status >= 500) return new ApiError('The server had a problem. Please try again shortly.', status)
  return new ApiError('Something went wrong. Please try again.', status)
}

async function rawRequest<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  if (auth && tokens.access) headers.set('Authorization', `Bearer ${tokens.access}`)

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  } catch {
    // Render's free tier sleeps when idle; the first request can take ~a minute.
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0)
  }

  const text = await res.text()
  const body = text ? safeJson(text) : null
  if (!res.ok) throw parseError(res.status, body)
  return body as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

let refreshing: Promise<boolean> | null = null

async function refreshAccess(): Promise<boolean> {
  const refresh = tokens.refresh
  if (!refresh) return false
  refreshing ??= rawRequest<{ access: string; refresh?: string }>('/api/auth/refresh/', {
    method: 'POST',
    body: JSON.stringify({ refresh }),
  })
    .then((data) => {
      tokens.save(data.access, data.refresh ?? refresh)
      return true
    })
    .catch(() => {
      tokens.clear()
      return false
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

/** Authenticated request that refreshes the access token once on a 401. */
async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, init, true)
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && (await refreshAccess())) {
      return rawRequest<T>(path, init, true)
    }
    throw err
  }
}

// ── Endpoints ──────────────────────────────────────────────────────────────

export const api = {
  login(email: string, password: string) {
    return rawRequest<AuthResponse>('/api/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },
  register(fullName: string, email: string, password: string) {
    return rawRequest<AuthResponse>('/api/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ full_name: fullName, email, password }),
    })
  },
  me() {
    return authRequest<User>('/api/auth/me/')
  },
  async logout() {
    const refresh = tokens.refresh
    try {
      if (refresh) await authRequest('/api/auth/logout/', { method: 'POST', body: JSON.stringify({ refresh }) })
    } finally {
      tokens.clear()
    }
  },
}
