import React from 'react'
import { Link } from 'react-router-dom'
import { IMG, getTitle, getReleaseYear, type MediaItem } from '../services/tmdb'
import { IconStar, IconFilm } from './Icons'

interface MediaCardProps {
  item: MediaItem
  size?: 'sm' | 'md' | 'lg'
}

export function MediaCard({ item, size = 'md' }: MediaCardProps) {
  const title = getTitle(item)
  const year = getReleaseYear(item)
  const poster = IMG.poster(item.poster_path)

  return (
    <Link
      to={`/title/${item.media_type}/${item.id}`}
      className="group cursor-pointer block"
    >
      <div className="glass rounded overflow-hidden mb-1 md:mb-2 aspect-[2/3] hover:bg-white/10 transition-all relative">
        {poster ? (
          <img
            src={poster}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-neutral-700">
            <IconFilm size={36} />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1 text-xs">
            <IconStar className="text-yellow-400" size={12} />
            <span>{item.vote_average.toFixed(1)}</span>
          </div>
        </div>
      </div>
      <p className="text-xs md:text-sm text-neutral-300 group-hover:text-white truncate">{title}</p>
      <p className="text-xs text-neutral-600">{year} • {item.media_type === 'movie' ? 'Movie' : 'TV'}</p>
    </Link>
  )
}

interface MediaRowProps {
  title: string
  items: MediaItem[]
  loading?: boolean
}

export function MediaRow({ title, items, loading }: MediaRowProps) {
  return (
    <section>
      <h2 className="text-base md:text-lg font-medium mb-3 text-neutral-400 uppercase tracking-wide">{title}</h2>
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3 md:gap-4">
        {loading ? (
          [...Array(7)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="glass rounded aspect-[2/3] mb-1 md:mb-2" />
              <div className="bg-neutral-800 rounded h-3 w-3/4 mb-1" />
              <div className="bg-neutral-800 rounded h-2 w-1/2" />
            </div>
          ))
        ) : (
          items.slice(0, 7).map((item) => (
            <MediaCard key={`${item.media_type}-${item.id}`} item={item} />
          ))
        )}
      </div>
    </section>
  )
}
