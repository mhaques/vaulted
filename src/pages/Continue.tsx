import React from 'react'
import { Link } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'
import { useProfileStorage } from '../hooks/useProfileStorage'
import { IMG } from '../services/tmdb'
import { IconPlay, IconX } from '../components/Icons'

export default function Continue() {
  const { currentProfile } = useProfile()
  const { progress, removeProgress } = useProfileStorage()
  
  // Sort by most recently updated
  const items = [...progress].sort((a, b) => b.updated_at - a.updated_at)

  const handleClear = async (mediaType: string, mediaId: number, season?: number, episode?: number) => {
    await removeProgress(mediaType, mediaId, season, episode)
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hrs > 0) {
      return `${hrs}h ${mins}m`
    }
    return `${mins}m`
  }

  if (!currentProfile) {
    return (
      <div className="w-full max-w-full md:max-w-6xl mx-auto px-2 sm:px-4 md:px-8 py-4 md:py-8">
        <h1 className="text-2xl md:text-3xl font-semibold mb-1 tracking-tight text-white">Continue Watching</h1>
        <div className="text-center py-16">
          <p className="text-neutral-400 mb-4">No profile selected</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full md:max-w-6xl mx-auto px-2 sm:px-4 md:px-8 py-4 md:py-8">
      <h1 className="text-2xl md:text-3xl font-semibold mb-1 tracking-tight text-white">Continue Watching</h1>
      <p className="text-neutral-500 text-sm mb-6 md:mb-8">{items.length} in progress</p>

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => {
            const progressPercent = Math.round((item.current_time / item.duration) * 100)
            return (
              <div key={`${item.media_type}-${item.media_id}-${item.season || ''}-${item.episode || ''}`} className="group glass rounded overflow-hidden hover:bg-white/10 transition">
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
                        {formatTime(item.current_time)} / {formatTime(item.duration)}
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
                  onClick={() => handleClear(item.media_type, item.media_id, item.season, item.episode)}
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
