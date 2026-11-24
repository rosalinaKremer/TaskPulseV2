import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, tokens, type User } from '../lib/api'
import { AuthContext } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => Boolean(tokens.refresh))

  // Restore the session on page load if we still hold a token.
  useEffect(() => {
    if (!tokens.refresh) return
    api
      .me()
      .then(setUser)
      .catch(() => tokens.clear())
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const data = await api.login(email, password)
    tokens.save(data.access, data.refresh, remember)
    setUser(data.user)
  }, [])

  const register = useCallback(async (fullName: string, email: string, password: string) => {
    const data = await api.register(fullName, email, password)
    tokens.save(data.access, data.refresh, true)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
