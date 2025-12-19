import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getWatchlist, removeFromWatchlist, WatchlistItem } from '../services/api'
import { IMG } from '../services/tmdb'
import { IconX, IconFilm } from '../components/Icons'

export default function Watchlist() {
  const { user } = useAuth()
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      getWatchlist()
        .then(setItems)
        .catch(console.error)
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [user])

  const handleRemove = async (mediaType: string, mediaId: number) => {
    try {
      await removeFromWatchlist(mediaType, mediaId)
      setItems(items.filter(item => !(item.media_type === mediaType && item.media_id === mediaId)))
    } catch (err) {
      console.error('Failed to remove from watchlist:', err)
    }
  }

  if (!user) {
    return (
      <div className="w-full max-w-full md:max-w-6xl mx-auto px-2 sm:px-4 md:px-8 py-4 md:py-8">
        <h1 className="text-2xl md:text-3xl font-semibold mb-1 tracking-tight text-white">Watchlist</h1>
        <div className="text-center py-16">
          <p className="text-neutral-400 mb-4">Sign in to save your watchlist</p>
          <p className="text-neutral-600 text-sm">Your watchlist will sync across devices</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full md:max-w-6xl mx-auto px-2 sm:px-4 md:px-8 py-4 md:py-8">
      <h1 className="text-2xl md:text-3xl font-semibold mb-1 tracking-tight text-white">Watchlist</h1>
      <p className="text-neutral-500 text-sm mb-6 md:mb-8">{items.length} items saved</p>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="glass rounded aspect-[2/3] mb-2" />
              <div className="bg-neutral-800 rounded h-3 w-3/4 mb-1" />
              <div className="bg-neutral-800 rounded h-2 w-1/2" />
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((item) => (
            <div key={`${item.media_type}-${item.media_id}`} className="group cursor-pointer relative">
              <Link to={`/title/${item.media_type}/${item.media_id}`}>
                <div className="glass rounded overflow-hidden mb-2 aspect-[2/3] hover:bg-white/10 transition">
                  {item.poster_path ? (
                    <img
                      src={IMG.poster(item.poster_path)!}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <IconFilm size={36} className="text-neutral-700" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-neutral-300 group-hover:text-white truncate">{item.title}</p>
                <p className="text-xs text-neutral-600 uppercase tracking-wide">
                  {item.media_type === 'movie' ? 'Movie' : 'TV'}
                </p>
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  handleRemove(item.media_type, item.media_id)
                }}
                className="absolute top-2 right-2 bg-black/80 hover:bg-red-600 text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition"
              >
                <IconX size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-neutral-400 mb-4">Your watchlist is empty</p>
          <p className="text-neutral-600 text-sm">Add titles from search or the Discover page</p>
        </div>
      )}
    </div>
  )
}
