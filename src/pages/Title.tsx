import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  getMovieDetails,
  getTVDetails,
  getMovieCredits,
  getTVCredits,
  getSimilarMovies,
  getSimilarTV,
  IMG,
  type MovieDetails,
  type TVDetails,
  type CastMember,
  type MediaItem
} from '../services/tmdb'
import { useAuth } from '../contexts/AuthContext'
import { isInWatchlist, addToWatchlist, removeFromWatchlist } from '../services/api'

type Details = (MovieDetails & { media_type: 'movie' }) | (TVDetails & { media_type: 'tv' })

export default function Title() {
  const { type, id } = useParams<{ type: 'movie' | 'tv'; id: string }>()
  const { user } = useAuth()
  const [details, setDetails] = useState<Details | null>(null)
  const [cast, setCast] = useState<CastMember[]>([])
  const [similar, setSimilar] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [inWatchlist, setInWatchlist] = useState(false)
  const [watchlistLoading, setWatchlistLoading] = useState(false)

  useEffect(() => {
    if (!type || !id) return

    async function fetchData() {
      setLoading(true)
      try {
        const numId = parseInt(id!, 10)
        if (type === 'movie') {
          const [detailsRes, creditsRes, similarRes] = await Promise.all([
            getMovieDetails(numId),
            getMovieCredits(numId),
            getSimilarMovies(numId)
          ])
          setDetails({ ...detailsRes, media_type: 'movie' })
          setCast(creditsRes.cast.slice(0, 10))
          setSimilar(similarRes.results.slice(0, 5))
        } else {
          const [detailsRes, creditsRes, similarRes] = await Promise.all([
            getTVDetails(numId),
            getTVCredits(numId),
            getSimilarTV(numId)
          ])
          setDetails({ ...detailsRes, media_type: 'tv' })
          setCast(creditsRes.cast.slice(0, 10))
          setSimilar(similarRes.results.slice(0, 5))
        }
      } catch (err) {
        console.error('Failed to fetch title details:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [type, id])

  // Check watchlist status when user is logged in
  useEffect(() => {
    if (user && type && id) {
      isInWatchlist(type, parseInt(id, 10))
        .then(setInWatchlist)
        .catch(() => setInWatchlist(false))
    } else {
      setInWatchlist(false)
    }
  }, [user, type, id])

  const handleWatchlistToggle = async () => {
    if (!user || !details || !type || !id) return
    setWatchlistLoading(true)
    try {
      const numId = parseInt(id, 10)
      const title = details.media_type === 'movie' ? details.title : details.name
      if (inWatchlist) {
        await removeFromWatchlist(type, numId)
        setInWatchlist(false)
      } else {
        await addToWatchlist({
          media_type: type as 'movie' | 'tv',
          media_id: numId,
          title,
          poster_path: details.poster_path || undefined
        })
        setInWatchlist(true)
      }
    } catch (err) {
      console.error('Failed to update watchlist:', err)
    } finally {
      setWatchlistLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="animate-pulse">
          <div className="h-64 md:h-96 bg-neutral-900" />
          <div className="max-w-6xl mx-auto px-4 md:px-8 pb-12">
            <div className="flex flex-col md:flex-row gap-8 md:gap-12 -mt-20">
              <div className="w-32 md:w-48 glass rounded aspect-[2/3]" />
              <div className="flex-1 pt-24">
                <div className="bg-neutral-800 rounded h-8 w-64 mb-4" />
                <div className="bg-neutral-800 rounded h-4 w-48 mb-6" />
                <div className="bg-neutral-800 rounded h-20 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!details) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-neutral-500">Title not found</p>
      </div>
    )
  }

  const title = details.media_type === 'movie' ? details.title : details.name
  const year = details.media_type === 'movie'
    ? details.release_date?.slice(0, 4)
    : details.first_air_date?.slice(0, 4)
  const runtime = details.media_type === 'movie'
    ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
    : details.number_of_seasons + ' Season' + (details.number_of_seasons > 1 ? 's' : '')
  const genres = details.genres.map(g => g.name).join(', ')
  const backdrop = IMG.backdrop(details.backdrop_path)
  const poster = IMG.poster(details.poster_path, 'w500')

  return (
    <div className="min-h-screen">
      {/* Backdrop */}
      <div className="relative h-64 md:h-96 bg-black">
        {backdrop && (
          <img src={backdrop} alt="" className="w-full h-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      <div className="w-full max-w-full md:max-w-6xl mx-auto px-2 sm:px-4 md:px-8 pb-12">
        <div className="flex flex-col md:flex-row gap-6 md:gap-12">
          {/* Poster */}
          <div className="flex-shrink-0 w-32 md:w-48 -mt-20 relative z-10">
            {poster ? (
              <img src={poster} alt={title} className="w-full rounded shadow-2xl" />
            ) : (
              <div className="glass rounded aspect-[2/3]" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-semibold mb-2 tracking-tight text-white">{title}</h1>
            <div className="flex flex-wrap gap-2 md:gap-4 mb-4 text-sm text-neutral-500">
              <span>{year}</span>
              <span className="hidden md:inline">•</span>
              <span>{runtime}</span>
              <span className="hidden md:inline">•</span>
              <span>{genres}</span>
            </div>

            {/* Rating */}
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{details.vote_average.toFixed(1)}</span>
                <span className="text-white">★</span>
                <span className="text-neutral-600 text-sm">({details.vote_count.toLocaleString()} votes)</span>
              </div>
            </div>

            {/* Tagline */}
            {details.tagline && (
              <p className="text-neutral-600 italic mb-4">{details.tagline}</p>
            )}

            {/* Synopsis */}
            <p className="text-neutral-300 mb-6 leading-relaxed">{details.overview}</p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-8">
              <button className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded font-medium transition border border-white/10">
                ▸ Play
              </button>
              <button
                onClick={handleWatchlistToggle}
                disabled={!user || watchlistLoading}
                className={`px-6 py-3 rounded font-medium transition ${
                  inWatchlist
                    ? 'bg-white/20 text-white border border-white/20'
                    : 'glass hover:bg-white/10'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {watchlistLoading ? '...' : inWatchlist ? '✓ In Watchlist' : '+ Watchlist'}
              </button>
            </div>

            {/* Cast */}
            {cast.length > 0 && (
              <section className="mb-8">
                <h3 className="text-base font-medium mb-3 text-neutral-400 uppercase tracking-wide">Cast</h3>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {cast.map((member) => (
                    <div key={member.id} className="flex-shrink-0 w-20">
                      {IMG.profile(member.profile_path) ? (
                        <img
                          src={IMG.profile(member.profile_path)!}
                          alt={member.name}
                          className="w-20 h-28 object-cover rounded mb-2"
                        />
                      ) : (
                        <div className="w-20 h-28 glass rounded mb-2 flex items-center justify-center text-neutral-700">
                          <span>◻</span>
                        </div>
                      )}
                      <p className="text-xs text-neutral-300 truncate">{member.name}</p>
                      <p className="text-xs text-neutral-600 truncate">{member.character}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Similar */}
            {similar.length > 0 && (
              <section>
                <h3 className="text-base font-medium mb-3 text-neutral-400 uppercase tracking-wide">Similar Titles</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {similar.map((item) => {
                    const itemTitle = 'title' in item ? item.title : item.name
                    return (
                      <Link
                        key={item.id}
                        to={`/title/${item.media_type}/${item.id}`}
                        className="group"
                      >
                        {IMG.poster(item.poster_path) ? (
                          <img
                            src={IMG.poster(item.poster_path)!}
                            alt={itemTitle}
                            className="w-full rounded aspect-[2/3] object-cover hover:opacity-80 transition"
                          />
                        ) : (
                          <div className="glass rounded aspect-[2/3]" />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
