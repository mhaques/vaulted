import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  getMovieDetails,
  getTVDetails,
  getMovieCredits,
  getTVCredits,
  getSimilarMovies,
  getSimilarTV,
  getExternalIds,
  IMG,
  type MovieDetails,
  type TVDetails,
  type CastMember,
  type MediaItem
} from '../services/tmdb'
import { useAuth } from '../contexts/AuthContext'
import { isInWatchlist, addToWatchlist, removeFromWatchlist, saveProgress, getProgress } from '../services/api'
import { Tooltip } from '../components/Tooltip'
import { VideoPlayer } from '../components/VideoPlayer'
import sourceAggregator, { 
  type StreamSource, 
  checkDebridCache, 
  addToDebrid 
} from '../services/sources'
import { IconStar, IconPlay, IconLoader, IconBookmark, IconCheck, IconPlus, IconX, IconDisc } from '../components/Icons'

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
  
  // Playback state
  const [imdbId, setImdbId] = useState<string | null>(null)
  const [showSourcePicker, setShowSourcePicker] = useState(false)
  const [sources, setSources] = useState<StreamSource[]>([])
  const [sourcesLoading, setSourcesLoading] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState(1)
  const [selectedEpisode, setSelectedEpisode] = useState(1)
  const [playingSource, setPlayingSource] = useState<StreamSource | null>(null)
  const [playerUrl, setPlayerUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playError, setPlayError] = useState<string | null>(null)
  const [savedProgress, setSavedProgress] = useState<number>(0)

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

  // Fetch IMDB ID for source lookups
  useEffect(() => {
    if (!type || !id) return
    getExternalIds(type, parseInt(id, 10))
      .then(ids => setImdbId(ids.imdb_id || null))
      .catch(() => setImdbId(null))
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

  // Load saved progress
  useEffect(() => {
    if (user && type && id) {
      getProgress(type, parseInt(id, 10), type === 'tv' ? selectedSeason : undefined, type === 'tv' ? selectedEpisode : undefined)
        .then(progress => {
          if (progress?.current_time) {
            setSavedProgress(progress.current_time)
          }
        })
        .catch(() => {})
    }
  }, [user, type, id, selectedSeason, selectedEpisode])

  // Fetch sources and auto-play best one (no popup)
  const handlePlay = async () => {
    if (!imdbId || !type) return
    
    setSourcesLoading(true)
    setPlayError(null)
    setSources([])
    
    try {
      const mediaType = type === 'movie' ? 'movie' : 'series'
      const fetchedSources = await sourceAggregator.fetchAllSources(
        imdbId,
        mediaType,
        type === 'tv' ? selectedSeason : undefined,
        type === 'tv' ? selectedEpisode : undefined
      )
      
      // Check debrid cache status
      const magnetLinks = fetchedSources
        .filter(s => s.url.startsWith('magnet:'))
        .map(s => s.url)
      
      if (magnetLinks.length > 0 && sourceAggregator.getDebridKey()) {
        const cacheStatus = await checkDebridCache(magnetLinks)
        fetchedSources.forEach(source => {
          if (source.url.startsWith('magnet:')) {
            const hash = source.url.match(/btih:([a-fA-F0-9]+)/i)?.[1]?.toLowerCase()
            if (hash) {
              source.cached = cacheStatus[hash] || false
            }
          }
        })
      }
      
      const sorted = sourceAggregator.getSortedSources(fetchedSources)
      setSources(sorted)
      
      if (sorted.length === 0) {
        setPlayError('No sources found')
        return
      }
      
      // Auto-play the best source
      await tryPlaySource(sorted[0], sorted)
    } catch (err) {
      console.error('Failed to fetch sources:', err)
      setPlayError('Failed to fetch sources')
    } finally {
      setSourcesLoading(false)
    }
  }

  // Convert Real-Debrid URL to proxied URL for inline playback
  const getProxiedUrl = (url: string): string => {
    if (url.includes('real-debrid.com')) {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3456'
      return `${apiBase}/api/proxy/video?url=${encodeURIComponent(url)}`
    }
    return url
  }

  // Try to play a source, fallback to next if it fails
  const tryPlaySource = async (source: StreamSource, allSources: StreamSource[]) => {
    setPlayingSource(source)
    setPlayError(null)
    
    try {
      let streamUrl = source.url
      
      if (source.url.startsWith('magnet:')) {
        // For torrents, need debrid to get direct link
        if (sourceAggregator.getDebridKey()) {
          const directLink = await addToDebrid(source.url)
          if (directLink) {
            streamUrl = directLink
          } else {
            throw new Error('Failed to get debrid link')
          }
        } else {
          // No debrid - open magnet externally
          window.open(source.url, '_blank')
          return
        }
      }
      
      // Check for non-playable formats like .iso
      if (streamUrl.match(/\.(iso|rar|zip|7z|tar|gz)$/i)) {
        console.log('Non-playable format detected, trying next source')
        throw new Error('Non-playable format: ' + streamUrl.split('.').pop())
      }
      
      // Use proxy for Real-Debrid URLs to bypass CORS
      if (streamUrl.includes('real-debrid.com') || streamUrl.includes('download.real-debrid.com') || streamUrl.includes('rdb.so')) {
        streamUrl = getProxiedUrl(streamUrl)
        setPlayerUrl(streamUrl)
        setIsPlaying(true)
        return
      }
      
      // Check if it's a playable format for inline player
      if (streamUrl.match(/\.(mp4|mkv|webm|m3u8|avi|mov)$/i)) {
        setPlayerUrl(streamUrl)
        setIsPlaying(true)
      } else {
        // Open in new tab for other URLs (embeds, etc.)
        window.open(streamUrl, '_blank')
      }
    } catch (err) {
      console.error('Source failed:', source.name, err)
      
      // Try next source
      const currentIdx = allSources.findIndex(s => s.id === source.id)
      if (currentIdx < allSources.length - 1) {
        console.log('Trying next source...')
        await tryPlaySource(allSources[currentIdx + 1], allSources)
      } else {
        setPlayError('All sources failed. Try selecting manually.')
        setShowSourcePicker(true)
      }
    }
  }

  // Play a specific source from the picker
  const playSource = async (source: StreamSource) => {
    setShowSourcePicker(false)
    await tryPlaySource(source, sources)
  }

  // Handle progress saving
  const handleProgress = (currentTime: number, duration: number) => {
    // Only save if we have valid duration (prevents errors when video fails)
    if (user && type && id && details && duration > 0 && currentTime > 0) {
      const title = details.media_type === 'movie' ? details.title : details.name
      saveProgress({
        media_type: type as 'movie' | 'tv',
        media_id: parseInt(id, 10),
        title,
        poster_path: details.poster_path || undefined,
        current_time: Math.floor(currentTime),
        duration: Math.floor(duration),
        season: type === 'tv' ? selectedSeason : undefined,
        episode: type === 'tv' ? selectedEpisode : undefined
      }).catch(console.error)
    }
  }

  // Close player
  const closePlayer = () => {
    setIsPlaying(false)
    setPlayerUrl(null)
    setPlayingSource(null)
  }

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
                <IconStar className="text-yellow-400" size={20} />
                <span className="text-neutral-600 text-sm">({details.vote_count.toLocaleString()} votes)</span>
              </div>
            </div>

            {/* Tagline */}
            {details.tagline && (
              <p className="text-neutral-600 italic mb-4">{details.tagline}</p>
            )}

            {/* Synopsis */}
            <p className="text-neutral-300 mb-6 leading-relaxed">{details.overview}</p>

            {/* Season/Episode selector for TV */}
            {details.media_type === 'tv' && (
              <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 mb-4">
                  <IconPlay className="text-indigo-400" size={16} />
                  <span className="text-sm font-medium text-neutral-300">Select Episode</span>
                </div>
                
                {/* Season Pills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {details.seasons
                    .filter(s => s.season_number > 0)
                    .map((season) => (
                    <button
                      key={season.season_number}
                      onClick={() => {
                        setSelectedSeason(season.season_number)
                        setSelectedEpisode(1)
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        selectedSeason === season.season_number
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      S{season.season_number}
                    </button>
                  ))}
                </div>
                
                {/* Episode Grid */}
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                  {Array.from({ 
                    length: details.seasons.find(s => s.season_number === selectedSeason)?.episode_count || 10 
                  }, (_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setSelectedEpisode(i + 1)}
                      className={`aspect-square rounded-lg text-sm font-medium transition flex items-center justify-center ${
                        selectedEpisode === i + 1
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white/5 text-neutral-500 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                
                {/* Selected indicator */}
                <div className="mt-4 pt-3 border-t border-white/5 text-sm text-neutral-500">
                  Playing: <span className="text-white">Season {selectedSeason}, Episode {selectedEpisode}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-4">
              <Tooltip content={!imdbId ? "No IMDB ID available" : ""} disabled={!!imdbId}>
                <button 
                  onClick={handlePlay}
                  disabled={!imdbId || sourcesLoading}
                  className={`px-6 py-3 rounded font-medium transition flex items-center gap-2 ${
                    imdbId 
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white' 
                      : 'bg-white/10 border border-white/10 opacity-50 cursor-not-allowed'
                  }`}
                >
                  {sourcesLoading ? (
                    <>
                      <IconLoader size={18} />
                      Finding sources...
                    </>
                  ) : (
                    <><IconPlay size={18} /> Play {details.media_type === 'tv' ? `S${selectedSeason}:E${selectedEpisode}` : ''}</>
                  )}
                </button>
              </Tooltip>
              
              {/* Sources button - only show after sources loaded */}
              {sources.length > 0 && (
                <button
                  onClick={() => setShowSourcePicker(true)}
                  className="px-4 py-3 rounded font-medium transition glass hover:bg-white/10 flex items-center gap-2"
                >
                  <IconDisc className="text-neutral-400" size={18} />
                  Sources ({sources.length})
                </button>
              )}
              
              <Tooltip content="Sign in to save to watchlist" disabled={!user}>
                <button
                  onClick={handleWatchlistToggle}
                  disabled={!user || watchlistLoading}
                  className={`px-6 py-3 rounded font-medium transition ${
                    inWatchlist
                      ? 'bg-white/20 text-white border border-white/20'
                      : user 
                        ? 'glass hover:bg-white/10' 
                        : 'glass opacity-50 cursor-not-allowed'
                  }`}
                >
                  {watchlistLoading ? '...' : inWatchlist ? <><IconCheck size={16} /> In Watchlist</> : <><IconPlus size={16} /> Watchlist</>}
                </button>
              </Tooltip>
            </div>
            
            {/* Error message */}
            {playError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {playError}
              </div>
            )}
            
            {/* Currently playing indicator */}
            {playingSource && !isPlaying && (
              <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-300 text-sm flex items-center gap-2">
                <IconPlay size={16} />
                Now playing: {playingSource.name} ({playingSource.quality})
              </div>
            )}

            {/* Resume indicator */}
            {savedProgress > 0 && !isPlaying && (
              <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-lg text-neutral-400 text-sm">
                Resume from {Math.floor(savedProgress / 60)}:{(savedProgress % 60).toString().padStart(2, '0')}
              </div>
            )}

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

      {/* Video Player Overlay */}
      {isPlaying && playerUrl && (
        <VideoPlayer
          src={playerUrl}
          title={details.media_type === 'movie' 
            ? details.title 
            : `${details.name} S${selectedSeason}:E${selectedEpisode}`}
          startTime={savedProgress}
          onProgress={handleProgress}
          onClose={closePlayer}
          onError={() => {
            setPlayError('Playback failed. Try a different source.')
            closePlayer()
            setShowSourcePicker(true)
          }}
          imdbId={imdbId || undefined}
          season={type === 'tv' ? selectedSeason : undefined}
          episode={type === 'tv' ? selectedEpisode : undefined}
        />
      )}

      {/* Source Picker Modal */}
      {showSourcePicker && (
        <div className="fixed inset-0 bg-black/90 flex items-end md:items-center justify-center z-50">
          <div className="w-full max-w-2xl max-h-[80vh] bg-neutral-900 rounded-t-2xl md:rounded-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div>
                <h2 className="text-lg font-semibold">Select Source</h2>
                {details.media_type === 'tv' && (
                  <p className="text-sm text-neutral-500">
                    S{selectedSeason}:E{selectedEpisode}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowSourcePicker(false)}
                className="text-neutral-400 hover:text-white p-2"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Source List */}
            <div className="flex-1 overflow-auto p-4">
              {sourcesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
                </div>
              ) : sources.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <IconDisc size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No sources found</p>
                  <p className="text-sm mt-2">Try a different title or check your settings</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sources.map((source, idx) => (
                    <button
                      key={source.id || idx}
                      onClick={() => playSource(source)}
                      className={`w-full text-left p-3 rounded-lg transition flex items-start gap-3 ${
                        playingSource?.id === source.id
                          ? 'bg-indigo-600/20 border border-indigo-500/50'
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      {/* Quality Badge */}
                      <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                        source.quality === '4K' ? 'bg-purple-500/20 text-purple-300' :
                        source.quality === '1080p' ? 'bg-blue-500/20 text-blue-300' :
                        source.quality === '720p' ? 'bg-green-500/20 text-green-300' :
                        'bg-neutral-500/20 text-neutral-400'
                      }`}>
                        {source.quality}
                      </span>
                      
                      {/* Source Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{source.name}</p>
                        <p className="text-xs text-neutral-500 truncate">{source.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-neutral-600">
                          {source.size && <span>💾 {source.size}</span>}
                          {source.seeds !== undefined && source.seeds > 0 && (
                            <span>👤 {source.seeds}</span>
                          )}
                          <span className="text-neutral-700">{source.provider}</span>
                        </div>
                      </div>

                      {/* Cached Badge */}
                      {source.cached && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs flex-shrink-0">
                          ⚡ Cached
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hint */}
            {sources.length > 0 && (
              <div className="p-4 border-t border-white/5 text-center">
                <p className="text-xs text-neutral-600">
                  {sourceAggregator.getDebridKey() 
                    ? '⚡ Cached sources stream instantly via Real-Debrid'
                    : 'Add Real-Debrid in Settings for instant streaming'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
