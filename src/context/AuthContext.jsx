import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken } from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) { setLoading(false); return }
    api('/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const authenticate = useCallback(async (path, body) => {
    const { user, token } = await api(path, { method: 'POST', body })
    setToken(token)
    setUser(user)
    return user
  }, [])

  const login = useCallback((email, password) => authenticate('/auth/login', { email, password }), [authenticate])
  const signup = useCallback((name, email, password) => authenticate('/auth/signup', { name, email, password }), [authenticate])

  const logout = useCallback(async () => {
    try { await api('/auth/logout', { method: 'POST' }) } catch { /* the local session is cleared either way */ }
    setToken(null)
    setUser(null)
  }, [])

  const updateProfile = useCallback(async body => {
    const { user } = await api('/auth/me', { method: 'PATCH', body })
    setUser(user)
    return user
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    login,
    signup,
    logout,
    updateProfile,
    isStaff: Boolean(user && ['admin', 'instructor'].includes(user.role)),
    isAdmin: user?.role === 'admin'
  }), [user, loading, login, signup, logout, updateProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
