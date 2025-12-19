import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useProfile } from './contexts/ProfileContext'
import { IconHome, IconSearch, IconTv, IconBookmark, IconPlay, IconSettings, IconLock, IconChevronLeft, IconChevronRight } from './components/Icons'

interface LayoutProps {
  children: React.ReactNode
}

const navIcons = {
  '/': IconHome,
  '/search': IconSearch,
  '/live': IconTv,
  '/watchlist': IconBookmark,
  '/continue': IconPlay,
  '/settings': IconSettings
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { currentProfile, lockProfile } = useProfile()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const navItems = [
    { path: '/', label: 'Discover' },
    { path: '/search', label: 'Search' },
    { path: '/live', label: 'Live TV' },
    { path: '/watchlist', label: 'Watchlist' },
    { path: '/continue', label: 'Continue' },
    { path: '/settings', label: 'Settings' }
  ]

  const isActive = (path: string) => location.pathname === path

  const sidebarWidth = sidebarCollapsed ? 'md:w-16' : 'md:w-56'
  const contentOffset = sidebarCollapsed ? 'md:left-16' : 'md:left-56'

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col md:flex-row bg-gradient-animate">
      {/* Sidebar for desktop/TV */}
      <aside className={`hidden md:flex md:flex-col ${sidebarWidth} bg-black/80 backdrop-blur-xl border-r border-white/5 min-h-screen fixed top-0 left-0 z-20 transition-all duration-300`}>
        <div className="flex items-center justify-between px-4 py-5">
          <Link to="/" className={`flex items-center gap-3 hover:opacity-90 transition ${sidebarCollapsed ? 'justify-center w-full' : ''}`}>
            <img src="/logo.svg" alt="Vaulted" className="w-8 h-8" />
            {!sidebarCollapsed && <span className="text-xl font-bold">Vaulted</span>}
          </Link>
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="text-neutral-500 hover:text-white transition p-1"
              title="Collapse sidebar"
            >
              <IconChevronLeft size={18} />
            </button>
          )}
        </div>
        
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="text-neutral-500 hover:text-white transition p-2 mx-auto mb-2"
            title="Expand sidebar"
          >
            <IconChevronRight size={18} />
          </button>
        )}

        <nav className="flex-1 flex flex-col gap-1 px-2">
          {navItems.map(({ path, label }) => {
            const Icon = navIcons[path as keyof typeof navIcons]
            return (
              <Link
                key={path}
                to={path}
                title={sidebarCollapsed ? label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-base font-medium ${
                  sidebarCollapsed ? 'justify-center' : ''
                } ${
                  isActive(path)
                    ? 'bg-white/10 text-white'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                }`}
              >
                <Icon size={20} />
                {!sidebarCollapsed && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Profile section */}
        <div className="px-3 py-4 border-t border-white/5">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} gap-2`}>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-2xl">{currentProfile?.avatar}</span>
                <span className="text-sm text-neutral-300 truncate">{currentProfile?.name}</span>
              </div>
            )}
            <button
              onClick={lockProfile}
              title="Lock profile"
              className={`text-neutral-500 hover:text-white transition p-2 rounded-lg hover:bg-white/5 ${sidebarCollapsed ? 'mx-auto' : ''}`}
            >
              <IconLock size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className={`flex-1 flex flex-col min-h-screen relative z-10 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-56'} transition-all duration-300`}>
        {/* Header for mobile */}
        <header className="md:hidden bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition">
            <img src="/logo.svg" alt="Vaulted" className="w-7 h-7" />
            <span className="text-xl font-bold">Vaulted</span>
          </Link>
          <button
            onClick={lockProfile}
            className="text-neutral-500 hover:text-white transition p-2"
            title="Lock profile"
          >
            <IconLock size={20} />
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-24 md:pb-8">
          {children}
          
          {/* Footer */}
          <footer className="mt-16 border-t border-white/5 py-8 px-4 md:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-neutral-500">
                  <img src="/logo.svg" alt="Vaulted" className="w-5 h-5 opacity-50" />
                  <span className="text-sm">Vaulted</span>
                  <span className="text-xs">•</span>
                  <span className="text-xs">Personal Media Portal</span>
                </div>
                <div className="flex items-center gap-6 text-xs text-neutral-600">
                  <Link to="/contact" className="hover:text-neutral-400 transition">Contact</Link>
                  <span>•</span>
                  <span>Powered by TMDB</span>
                  <span>•</span>
                  <span>Self-hosted</span>
                </div>
              </div>
            </div>
          </footer>
        </main>

        {/* Bottom Navigation for mobile */}
        <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/5 flex md:hidden z-20">
          {navItems.map(({ path, label }) => {
            const Icon = navIcons[path as keyof typeof navIcons]
            return (
              <Link
                key={path}
                to={path}
                className={`flex-1 py-2.5 px-1 text-center transition-colors flex flex-col items-center ${
                  isActive(path)
                    ? 'text-white'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <Icon size={20} className="mb-0.5" />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
