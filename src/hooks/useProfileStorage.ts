import { useProfile } from '../contexts/ProfileContext'
import { useState, useEffect } from 'react'

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
        const res = await fetch(`${API_URL}/api/profiles/${currentProfile.id}/watchlist`)
        if (res.ok) {
          const data = await res.json()
          setWatchlist(data)
        }
      } catch (err) {
        console.error('Failed to load watchlist:', err)
      }
    }

    loadWatchlist()
  }, [currentProfile])

  // Load progress from API
  useEffect(() => {
    async function loadProgress() {
      if (!currentProfile) {
        setProgress([])
        return
      }

      try {
        const res = await fetch(`${API_URL}/api/profiles/${currentProfile.id}/progress`)
        if (res.ok) {
          const data = await res.json()
          setProgress(data)
        }
      } catch (err) {
        console.error('Failed to load progress:', err)
      }
    }

    loadProgress()
  }, [currentProfile])

  const getWatchlist = (): WatchlistItem[] => {
    return watchlist
  }

  const addToWatchlist = async (item: Omit<WatchlistItem, 'added_at'>) => {
    if (!currentProfile) return

    try {
      const res = await fetch(`${API_URL}/api/profiles/${currentProfile.id}/watchlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(item)
      })

      if (res.ok) {
        // Reload watchlist
        const newList = await fetch(`${API_URL}/api/profiles/${currentProfile.id}/watchlist`).then(r => r.json())
        setWatchlist(newList)
      }
    } catch (err) {
      console.error('Failed to add to watchlist:', err)
    }
  }

  const removeFromWatchlist = async (mediaType: string, mediaId: number) => {
    if (!currentProfile) return

    try {
      await fetch(`${API_URL}/api/profiles/${currentProfile.id}/watchlist/${mediaType}/${mediaId}`, {
        method: 'DELETE'
      })

      // Update local state
      setWatchlist(watchlist.filter(i => !(i.media_type === mediaType && i.media_id === mediaId)))
    } catch (err) {
      console.error('Failed to remove from watchlist:', err)
    }
  }

  const isInWatchlist = (mediaType: string, mediaId: number): boolean => {
    return watchlist.some(i => i.media_type === mediaType && i.media_id === mediaId)
  }

  const getProgress = (): ProgressItem[] => {
    return progress
  }

  const saveProgress = async (item: Omit<ProgressItem, 'updated_at'>) => {
    if (!currentProfile) return

    try {
      await fetch(`${API_URL}/api/profiles/${currentProfile.id}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(item)
      })

      // Update local state
      const filtered = progress.filter(i => {
        if (i.media_type !== item.media_type || i.media_id !== item.media_id) return true
        if (item.season !== undefined && item.episode !== undefined) {
          return !(i.season === item.season && i.episode === item.episode)
        }
        return false
      })
      setProgress([{ ...item, updated_at: Date.now() }, ...filtered])
    } catch (err) {
      console.error('Failed to save progress:', err)
    }
  }

  const getItemProgress = (mediaType: string, mediaId: number, season?: number, episode?: number): ProgressItem | undefined => {
    return progress.find(i => {
      if (i.media_type !== mediaType || i.media_id !== mediaId) return false
      if (season !== undefined && episode !== undefined) {
        return i.season === season && i.episode === episode
      }
      return true
    })
  }

  const removeProgress = async (mediaType: string, mediaId: number, season?: number, episode?: number) => {
    if (!currentProfile) return

    // For now, just update local state
    // Could add a DELETE endpoint if needed
    const updated = progress.filter(i => {
      if (i.media_type !== mediaType || i.media_id !== mediaId) return true
      if (season !== undefined && episode !== undefined) {
        return !(i.season === season && i.episode === episode)
      }
      return false
    })
    setProgress(updated)
  }

  return {
    // Watchlist
    getWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    // Progress
    getProgress,
    saveProgress,
    getItemProgress,
    removeProgress
  }
}

export type { WatchlistItem, ProgressItem }
