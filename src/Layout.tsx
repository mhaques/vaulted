import React from 'react'
import { Link, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Discover', icon: '◉' },
    { path: '/search', label: 'Search', icon: '⌕' },
    { path: '/watchlist', label: 'Watchlist', icon: '◈' },
    { path: '/continue', label: 'Continue', icon: '▸' }
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col md:flex-row bg-gradient-animate">
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
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header for mobile */}
        <header className="md:hidden glass-dark px-4 py-3 sticky top-0 z-10">
          <Link to="/" className="text-2xl font-bold hover:text-white transition">
            Vaulted
          </Link>
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
