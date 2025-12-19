import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './Layout'
import Home from './pages/Home'
import Search from './pages/Search'
import Title from './pages/Title'
import Watchlist from './pages/Watchlist'
import Continue from './pages/Continue'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/title/:type/:id" element={<Title />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/continue" element={<Continue />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
