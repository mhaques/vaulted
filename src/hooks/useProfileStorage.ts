import { useProfile } from '../contexts/ProfileContext'
import { useState, useEffect, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3456'

interface WatchlistItem {
  media_type: string
  media_id: number
  title: string
  poster_path: string | null
  release_date?: string
  first_air_date?: string
  added_at: number
}

interface ProgressItem {
  media_type: string
  media_id: number
  title: string
  poster_path: string | null
  current_time: number
  duration: number
  season?: number
  episode?: number
  updated_at: number
}

export function useProfileStorage() {
  const { currentProfile } = useProfile()
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [progress, setProgress] = useState<ProgressItem[]>([])

  // Load watchlist from API
  useEffect(() => {
    async function loadWatchlist() {
      if (!currentProfile) {
        setWatchlist([])
        return
      }

      try {
        console.log('[useProfileStorage] Loading watchlist for profile:', currentProfile.id)
        const res = await fetch(`${API_URL}/api/profiles/${currentProfile.id}/watchlist`)
        if (res.ok) {
          const data = await res.json()
          console.log('[useProfileStorage] Loaded watchlist:', data.length, 'items')
          // Map API response to our format
          setWatchlist(data.map((item: any) => ({
            media_type: item.mediaType || item.media_type,
            media_id: item.mediaId || item.media_id,
            title: item.title,
            poster_path: item.posterPath || item.poster_path,
            added_at: new Date(item.addedAt || item.added_at).getTime()
          })))
        } else {
          console.error('[useProfileStorage] Failed to load watchlist:', res.status)
        }
      } catch (err) {
        console.error('[useProfileStorage] Failed to load watchlist:', err)
      }
    }

    loadWatchlist()
  }, [currentProfile?.id])

  // Load progress from API
  useEffect(() => {
    async function loadProgress() {
      if (!currentProfile) {
        setProgress([])
        return
      }

      try {
        console.log('[useProfileStorage] Loading progress for profile:', currentProfile.id)
        const res = await fetch(`${API_URL}/api/profiles/${currentProfile.id}/progress`)
        if (res.ok) {
          const data = await res.json()
          console.log('[useProfileStorage] Loaded progress:', data.length, 'items')
          // Map API response to our format
          setProgress(data.map((item: any) => ({
            media_type: item.mediaType || item.media_type,
            media_id: item.mediaId || item.media_id,
            title: item.title,
            poster_path: item.posterPath || item.poster_path,
            current_time: item.currentTime || item.current_time,
            duration: item.duration,
            season: item.season,
            episode: item.episode,
            updated_at: new Date(item.updatedAt || item.updated_at).getTime()
          })))
        } else {
          console.error('[useProfileStorage] Failed to load progress:', res.status)
        }
      } catch (err) {
        console.error('[useProfileStorage] Failed to load progress:', err)
      }
    }

    loadProgress()
  }, [currentProfile?.id])

  const getWatchlist = useCallback((): WatchlistItem[] => {
    return watchlist
  }, [watchlist])

  const addToWatchlist = useCallback(async (item: Omit<WatchlistItem, 'added_at'>) => {
    if (!currentProfile) {
      console.error('[useProfileStorage] No profile selected for addToWatchlist')
      return
    }

    console.log('[useProfileStorage] Adding to watchlist:', item)

    try {
      const res = await fetch(`${API_URL}/api/profiles/${currentProfile.id}/watchlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          media_type: item.media_type,
          media_id: item.media_id,
          title: item.title,
          poster_path: item.poster_path
        })
      })

      if (res.ok) {
        console.log('[useProfileStorage] Added to watchlist successfully')
        // Add to local state immediately
        setWatchlist(prev => [{ ...item, added_at: Date.now() }, ...prev])
      } else {
        const error = await res.json()
        console.error('[useProfileStorage] Failed to add to watchlist:', error)
      }
    } catch (err) {
      console.error('[useProfileStorage] Failed to add to watchlist:', err)
    }
  }, [currentProfile?.id])

  const removeFromWatchlist = useCallback(async (mediaType: string, mediaId: number) => {
    if (!currentProfile) return

    console.log('[useProfileStorage] Removing from watchlist:', mediaType, mediaId)

    try {
      await fetch(`${API_URL}/api/profiles/${currentProfile.id}/watchlist/${mediaType}/${mediaId}`, {
        method: 'DELETE'
      })

      // Update local state
      setWatchlist(prev => prev.filter(i => !(i.media_type === mediaType && i.media_id === mediaId)))
    } catch (err) {
      console.error('[useProfileStorage] Failed to remove from watchlist:', err)
    }
  }, [currentProfile?.id])

  const isInWatchlist = useCallback((mediaType: string, mediaId: number): boolean => {
    return watchlist.some(i => i.media_type === mediaType && i.media_id === mediaId)
  }, [watchlist])

  const getProgress = useCallback((): ProgressItem[] => {
    return progress
  }, [progress])

  const saveProgress = useCallback(async (item: Omit<ProgressItem, 'updated_at'>) => {
    if (!currentProfile) {
      console.error('[useProfileStorage] No profile selected for saveProgress')
      return
    }

    // Don't save very short progress (less than 30 seconds)
    if (item.current_time < 30) {
      return
    }

    console.log('[useProfileStorage] Saving progress:', item)

    try {
      const res = await fetch(`${API_URL}/api/profiles/${currentProfile.id}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          media_type: item.media_type,
          media_id: item.media_id,
          title: item.title,
          poster_path: item.poster_path,
          current_time: Math.floor(item.current_time),
          duration: Math.floor(item.duration),
          season: item.season || null,
          episode: item.episode || null
        })
      })

      if (res.ok) {
        console.log('[useProfileStorage] Progress saved successfully')
        // Update local state
        setProgress(prev => {
          const filtered = prev.filter(i => {
            if (i.media_type !== item.media_type || i.media_id !== item.media_id) return true
            if (item.season !== undefined && item.episode !== undefined) {
              return !(i.season === item.season && i.episode === item.episode)
            }
            return false
          })
          return [{ ...item, updated_at: Date.now() }, ...filtered]
        })
      } else {
        console.error('[useProfileStorage] Failed to save progress:', res.status)
      }
    } catch (err) {
      console.error('[useProfileStorage] Failed to save progress:', err)
    }
  }, [currentProfile?.id])

  const getItemProgress = useCallback((mediaType: string, mediaId: number, season?: number, episode?: number): ProgressItem | undefined => {
    return progress.find(i => {
      if (i.media_type !== mediaType || i.media_id !== mediaId) return false
      if (season !== undefined && episode !== undefined) {
        return i.season === season && i.episode === episode
      }
      return i.season === undefined || i.season === null
    })
  }, [progress])

  const removeProgress = useCallback(async (mediaType: string, mediaId: number, season?: number, episode?: number) => {
    if (!currentProfile) return

    try {
      let url = `${API_URL}/api/profiles/${currentProfile.id}/progress/${mediaType}/${mediaId}`
      if (season !== undefined && episode !== undefined) {
        url += `?season=${season}&episode=${episode}`
      }
      await fetch(url, { method: 'DELETE' })

      // Update local state
      setProgress(prev => prev.filter(i => {
        if (i.media_type !== mediaType || i.media_id !== mediaId) return true
        if (season !== undefined && episode !== undefined) {
          return !(i.season === season && i.episode === episode)
        }
        return false
      }))
    } catch (err) {
      console.error('[useProfileStorage] Failed to remove progress:', err)
    }
  }, [currentProfile?.id])

  return {
    // Watchlist
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    watchlist, // Direct access to watchlist state
    // Progress
    getProgress,
    saveProgress,
    getItemProgress,
    removeProgress,
    progress // Direct access to progress state
  }
}

export type { WatchlistItem, ProgressItem }
