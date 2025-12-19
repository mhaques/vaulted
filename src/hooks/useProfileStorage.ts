import { useProfile } from '../contexts/ProfileContext'

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

  const getWatchlist = (): WatchlistItem[] => {
    if (!currentProfile) return []
    const key = `vaulted_watchlist_${currentProfile.id}`
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : []
  }

  const addToWatchlist = (item: Omit<WatchlistItem, 'added_at'>) => {
    if (!currentProfile) return
    const key = `vaulted_watchlist_${currentProfile.id}`
    const current = getWatchlist()
    const exists = current.find(i => i.media_type === item.media_type && i.media_id === item.media_id)
    if (!exists) {
      const updated = [...current, { ...item, added_at: Date.now() }]
      localStorage.setItem(key, JSON.stringify(updated))
    }
  }

  const removeFromWatchlist = (mediaType: string, mediaId: number) => {
    if (!currentProfile) return
    const key = `vaulted_watchlist_${currentProfile.id}`
    const current = getWatchlist()
    const updated = current.filter(i => !(i.media_type === mediaType && i.media_id === mediaId))
    localStorage.setItem(key, JSON.stringify(updated))
  }

  const isInWatchlist = (mediaType: string, mediaId: number): boolean => {
    const watchlist = getWatchlist()
    return watchlist.some(i => i.media_type === mediaType && i.media_id === mediaId)
  }

  const getProgress = (): ProgressItem[] => {
    if (!currentProfile) return []
    const key = `vaulted_progress_${currentProfile.id}`
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : []
  }

  const saveProgress = (item: Omit<ProgressItem, 'updated_at'>) => {
    if (!currentProfile) return
    const key = `vaulted_progress_${currentProfile.id}`
    const current = getProgress()
    
    // Remove old entry for this item
    const filtered = current.filter(i => {
      if (i.media_type !== item.media_type || i.media_id !== item.media_id) return true
      if (item.season !== undefined && item.episode !== undefined) {
        return !(i.season === item.season && i.episode === item.episode)
      }
      return false
    })
    
    // Add new entry
    const updated = [...filtered, { ...item, updated_at: Date.now() }]
    localStorage.setItem(key, JSON.stringify(updated))
  }

  const getItemProgress = (mediaType: string, mediaId: number, season?: number, episode?: number): ProgressItem | undefined => {
    const progress = getProgress()
    return progress.find(i => {
      if (i.media_type !== mediaType || i.media_id !== mediaId) return false
      if (season !== undefined && episode !== undefined) {
        return i.season === season && i.episode === episode
      }
      return true
    })
  }

  const removeProgress = (mediaType: string, mediaId: number, season?: number, episode?: number) => {
    if (!currentProfile) return
    const key = `vaulted_progress_${currentProfile.id}`
    const current = getProgress()
    const updated = current.filter(i => {
      if (i.media_type !== mediaType || i.media_id !== mediaId) return true
      if (season !== undefined && episode !== undefined) {
        return !(i.season === season && i.episode === episode)
      }
      return false
    })
    localStorage.setItem(key, JSON.stringify(updated))
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
