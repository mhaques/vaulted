import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getContinueWatching, clearProgress, ProgressItem } from '../services/api'
import { IMG } from '../services/tmdb'
import { IconPlay, IconX } from '../components/Icons'

export default function Continue() {
  const { user } = useAuth()
  const [items, setItems] = useState<ProgressItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      getContinueWatching()
        .then(setItems)
        .catch(console.error)
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [user])

  const handleClear = async (mediaType: string, mediaId: number) => {
    try {
      await clearProgress(mediaType, mediaId)
      setItems(items.filter(item => !(item.media_type === mediaType && item.media_id === mediaId)))
    } catch (err) {
      console.error('Failed to clear progress:', err)
    }
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hrs > 0) {
      return `${hrs}h ${mins}m`
    }
    return `${mins}m`
  }

  if (!user) {
    return (
      <div className="w-full max-w-full md:max-w-6xl mx-auto px-2 sm:px-4 md:px-8 py-4 md:py-8">
        <h1 className="text-2xl md:text-3xl font-semibold mb-1 tracking-tight text-white">Continue Watching</h1>
        <div className="text-center py-16">
          <p className="text-neutral-400 mb-4">Sign in to track your progress</p>
          <p className="text-neutral-600 text-sm">Your progress will sync across devices</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full md:max-w-6xl mx-auto px-2 sm:px-4 md:px-8 py-4 md:py-8">
      <h1 className="text-2xl md:text-3xl font-semibold mb-1 tracking-tight text-white">Continue Watching</h1>
      <p className="text-neutral-500 text-sm mb-6 md:mb-8">{items.length} in progress</p>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse glass rounded p-4">
              <div className="flex gap-4">
                <div className="w-32 h-24 bg-neutral-800 rounded" />
                <div className="flex-1">
                  <div className="bg-neutral-800 rounded h-5 w-48 mb-2" />
                  <div className="bg-neutral-800 rounded h-3 w-24 mb-4" />
                  <div className="bg-neutral-800 rounded h-2 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => {
            const progressPercent = item.progress_percent || Math.round((item.progress_seconds / item.duration_seconds) * 100)
            return (
              <div key={`${item.media_type}-${item.media_id}`} className="group glass rounded overflow-hidden hover:bg-white/10 transition">
                <Link to={`/title/${item.media_type}/${item.media_id}`} className="flex gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-32 h-20 bg-neutral-900 rounded overflow-hidden">
                    {item.poster_path && (
                      <img
                        src={IMG.poster(item.poster_path, 'w185')!}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 py-1">
                    <h3 className="text-lg font-semibold mb-1 text-white">{item.title}</h3>
                    <p className="text-xs text-neutral-600 uppercase tracking-wide mb-3">
                      {item.media_type === 'movie' ? 'Movie' : 'TV Show'}
                      {item.season && item.episode && ` • S${item.season}E${item.episode}`}
                    </p>

                    {/* Progress Bar */}
                    <div>
                      <div className="bg-neutral-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-white/40 h-full transition-all"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">
                        {formatTime(item.progress_seconds)} / {formatTime(item.duration_seconds)}
                      </p>
                    </div>
                  </div>

                  {/* Play Button */}
                  <div className="flex items-center justify-center">
                    <button className="bg-white/10 hover:bg-white/20 p-3 rounded transition border border-white/10">
                      <IconPlay size={20} />
                    </button>
                  </div>
                </Link>
                <button
                  onClick={() => handleClear(item.media_type, item.media_id)}
                  className="absolute top-2 right-2 bg-black/80 hover:bg-red-600 text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition"
                >
                  <IconX size={14} />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-neutral-400 mb-4">Nothing in progress</p>
          <p className="text-neutral-600 text-sm">Start watching something to continue later</p>
        </div>
      )}
    </div>
  )
}
