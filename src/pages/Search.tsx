import React, { useState, useEffect, useCallback } from 'react'
import { searchMulti, searchMovies, searchTV, type MediaItem } from '../services/tmdb'
import { MediaCard } from '../components/MediaCard'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchType, setSearchType] = useState<'all' | 'movies' | 'tv'>('all')

  const performSearch = useCallback(async (q: string, type: 'all' | 'movies' | 'tv') => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      let data
      if (type === 'movies') {
        data = await searchMovies(q)
      } else if (type === 'tv') {
        data = await searchTV(q)
      } else {
        data = await searchMulti(q)
      }
      // Filter only movies and TV shows
      const filtered = data.results.filter(
        (item) => item.media_type === 'movie' || item.media_type === 'tv'
      )
      setResults(filtered)
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, searchType)
    }, 400)
    return () => clearTimeout(timer)
  }, [query, searchType, performSearch])

  return (
    <div className="w-full max-w-full md:max-w-4xl mx-auto px-2 sm:px-4 md:px-8 py-4 md:py-8">
      <h1 className="text-2xl md:text-3xl font-semibold mb-6 tracking-tight text-white">Search</h1>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search movies, TV shows..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 glass text-white px-4 py-3 rounded focus:outline-none focus:bg-white/10 transition placeholder-neutral-500"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'movies', 'tv'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSearchType(type)}
              className={`px-4 py-2 rounded text-sm font-medium transition ${
                searchType === type
                  ? 'bg-white/10 text-white border border-white/20'
                  : 'glass text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="glass rounded aspect-[2/3] mb-2" />
              <div className="bg-neutral-800 rounded h-3 w-3/4 mb-1" />
              <div className="bg-neutral-800 rounded h-2 w-1/2" />
            </div>
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {results.map((item) => (
            <MediaCard key={`${item.media_type}-${item.id}`} item={item} />
          ))}
        </div>
      ) : query ? (
        <p className="text-neutral-500 text-center py-12">No results found</p>
      ) : (
        <p className="text-neutral-500 text-center py-12">Start typing to search</p>
      )}
    </div>
  )
}
