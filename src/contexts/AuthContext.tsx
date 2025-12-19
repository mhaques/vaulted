import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, getCurrentUser, login as apiLogin, register as apiRegister, logout as apiLogout, getToken } from '../services/api'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    if (getToken()) {
      getCurrentUser()
        .then(setUser)
        .catch(() => {
          // Token invalid, clear it
          apiLogout()
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (username: string, password: string) => {
    const result = await apiLogin(username, password)
    setUser(result.user)
  }

  const register = async (username: string, password: string) => {
    const result = await apiRegister(username, password)
    setUser(result.user)
  }

  const logout = () => {
    apiLogout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
