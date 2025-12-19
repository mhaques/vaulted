import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { user, login, register, logout, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const navItems = [
    { path: '/', label: 'Discover', icon: '◉' },
    { path: '/search', label: 'Search', icon: '⌕' },
    { path: '/watchlist', label: 'Watchlist', icon: '◈' },
    { path: '/continue', label: 'Continue', icon: '▸' }
  ]

  const isActive = (path: string) => location.pathname === path

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)
    try {
      if (authMode === 'login') {
        await login(username, password)
      } else {
        await register(username, password)
      }
      setShowAuthModal(false)
      setUsername('')
      setPassword('')
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed')
    } finally {
      setAuthLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col md:flex-row bg-gradient-animate">
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass w-full max-w-sm rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full glass text-white px-4 py-3 rounded focus:outline-none focus:bg-white/10 transition placeholder-neutral-500"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass text-white px-4 py-3 rounded focus:outline-none focus:bg-white/10 transition placeholder-neutral-500"
                  required
                  minLength={4}
                />
              </div>

              {authError && (
                <p className="text-red-400 text-sm">{authError}</p>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded font-medium transition border border-white/10 disabled:opacity-50"
              >
                {authLoading ? '...' : authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <p className="text-center text-neutral-500 text-sm mt-4">
              {authMode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={() => setAuthMode('register')}
                    className="text-white hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => setAuthMode('login')}
                    className="text-white hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Sidebar for desktop/TV */}
      <aside className="hidden md:flex md:flex-col md:w-56 glass-dark min-h-screen sticky top-0 z-20">
        <Link to="/" className="text-2xl font-bold px-8 py-6 hover:text-white transition">
          Vaulted
        </Link>
        <nav className="flex-1 flex flex-col gap-1 px-4">
          {navItems.map(({ path, label, icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors text-base font-medium ${
                isActive(path)
                  ? 'bg-white/10 text-white border-l-2 border-white/50'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
              }`}
            >
              <span className="text-xl">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="px-4 py-4 border-t border-white/5">
          {loading ? (
            <div className="h-10 bg-neutral-800 rounded animate-pulse" />
          ) : user ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-300 truncate">{user.username}</span>
              <button
                onClick={logout}
                className="text-xs text-neutral-500 hover:text-white transition"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowAuthModal(true)
                setAuthMode('login')
              }}
              className="w-full text-sm text-neutral-400 hover:text-white transition py-2"
            >
              Sign in
            </button>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header for mobile */}
        <header className="md:hidden glass-dark px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold hover:text-white transition">
            Vaulted
          </Link>
          {!loading && (
            user ? (
              <button
                onClick={logout}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Sign out
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowAuthModal(true)
                  setAuthMode('login')
                }}
                className="text-xs text-neutral-400 hover:text-white"
              >
                Sign in
              </button>
            )
          )}
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          {children}
        </main>

        {/* Bottom Navigation for mobile */}
        <nav className="fixed bottom-0 left-0 right-0 glass-dark flex md:hidden z-20">
          {navItems.map(({ path, label, icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex-1 py-2 px-1 text-center transition-colors flex flex-col items-center ${
                isActive(path)
                  ? 'bg-white/10 text-white border-t-2 border-white/50'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <span className="text-lg mb-0.5">{icon}</span>
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
