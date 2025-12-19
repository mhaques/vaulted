import React, { useEffect, useState } from 'react'
import { getTrending, getPopularMovies, getTopRatedMovies, type MediaItem } from '../services/tmdb'
import { MediaRow } from '../components/MediaCard'

export default function Home() {
  const [trending, setTrending] = useState<MediaItem[]>([])
  const [popular, setPopular] = useState<MediaItem[]>([])
  const [topRated, setTopRated] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [trendingRes, popularRes, topRatedRes] = await Promise.all([
          getTrending('all', 'week'),
          getPopularMovies(),
          getTopRatedMovies()
        ])
        setTrending(trendingRes.results)
        setPopular(popularRes.results)
        setTopRated(topRatedRes.results)
      } catch (err) {
        console.error('Failed to fetch TMDB data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <div className="w-full max-w-full md:max-w-6xl mx-auto px-2 sm:px-4 md:px-8 py-4 md:py-8">
      <h1 className="text-2xl md:text-3xl font-semibold mb-1 tracking-tight text-white">Discover</h1>
      <p className="text-neutral-500 text-sm mb-6 md:mb-8">Personalized media discovery</p>

      <div className="space-y-6 md:space-y-8">
        <MediaRow title="Trending" items={trending} loading={loading} />
        <MediaRow title="Popular" items={popular} loading={loading} />
        <MediaRow title="Top Rated" items={topRated} loading={loading} />
      </div>
    </div>
  )
}
