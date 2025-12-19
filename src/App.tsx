import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Layout } from './Layout'
import Home from './pages/Home'
import Search from './pages/Search'
import Title from './pages/Title'
import Watchlist from './pages/Watchlist'
import Continue from './pages/Continue'
import { Contact } from './pages/Contact'
import { Settings } from './pages/Settings'
import LiveTV from './pages/LiveTV'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
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
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  )
}
