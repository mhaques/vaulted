import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProfileProvider, useProfile } from './contexts/ProfileContext'
import { Layout } from './Layout'
import Home from './pages/Home'
import Search from './pages/Search'
import Title from './pages/Title'
import Watchlist from './pages/Watchlist'
import Continue from './pages/Continue'
import { Contact } from './pages/Contact'
import { Settings } from './pages/Settings'
import LiveTV from './pages/LiveTV'
import { Profiles } from './pages/Profiles'
import { ProfileManagement } from './pages/ProfileManagement'

function AppRoutes() {
  const { currentProfile, loading: profileLoading } = useProfile()

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  // Show profile selection if no profile selected
  if (!currentProfile) {
    return <Profiles />
  }

  // Everything else is handled by Layout (which shows auth modal if no user)
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/title/:type/:id" element={<Title />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/continue" element={<Continue />} />
        <Route path="/live" element={<LiveTV />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profiles" element={<ProfileManagement />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <ProfileProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ProfileProvider>
  )
}

