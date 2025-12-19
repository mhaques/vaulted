const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3456'

// Token management
let token: string | null = localStorage.getItem('vaulted_token')

export function setToken(newToken: string | null) {
  token = newToken
  if (newToken) {
    localStorage.setItem('vaulted_token', newToken)
  } else {
    localStorage.removeItem('vaulted_token')
  }
}

export function getToken() {
  return token
}

export function isAuthenticated() {
  return !!token
}

// API fetch helper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }

  return response.json()
}

// Auth API
export interface User {
  id: number
  username: string
}

export interface AuthResponse {
  token: string
  user: User
}

export async function register(username: string, password: string): Promise<AuthResponse> {
  const result = await apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setToken(result.token)
  return result
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const result = await apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setToken(result.token)
  return result
}

export async function logout() {
  setToken(null)
}

export async function getCurrentUser(): Promise<User> {
  return apiFetch<User>('/api/auth/me')
}

// Watchlist API
export interface WatchlistItem {
  media_type: 'movie' | 'tv'
  media_id: number
  title: string
  poster_path?: string
  added_at?: string
}

export async function getWatchlist(): Promise<WatchlistItem[]> {
  return apiFetch<WatchlistItem[]>('/api/watchlist')
}

export async function addToWatchlist(item: Omit<WatchlistItem, 'added_at'>): Promise<void> {
  await apiFetch('/api/watchlist', {
    method: 'POST',
    body: JSON.stringify(item),
  })
}

export async function removeFromWatchlist(mediaType: string, mediaId: number): Promise<void> {
  await apiFetch(`/api/watchlist/${mediaType}/${mediaId}`, {
    method: 'DELETE',
  })
}

export async function isInWatchlist(mediaType: string, mediaId: number): Promise<boolean> {
  const result = await apiFetch<{ inWatchlist: boolean }>(`/api/watchlist/${mediaType}/${mediaId}`)
  return result.inWatchlist
}

// Progress API
export interface ProgressItem {
  media_type: 'movie' | 'tv'
  media_id: number
  title: string
  poster_path?: string
  season?: number
  episode?: number
  progress_seconds: number
  duration_seconds: number
  progress_percent?: number
  updated_at?: string
}

export async function getContinueWatching(): Promise<ProgressItem[]> {
  return apiFetch<ProgressItem[]>('/api/progress')
}

export async function updateProgress(item: Omit<ProgressItem, 'updated_at' | 'progress_percent'>): Promise<void> {
  await apiFetch('/api/progress', {
    method: 'POST',
    body: JSON.stringify(item),
  })
}

// Alias for updateProgress with different parameter signature (used by VideoPlayer)
export async function saveProgress(params: {
  media_type: 'movie' | 'tv'
  media_id: number
  title: string
  poster_path?: string
  current_time: number
  duration: number
  season?: number
  episode?: number
}): Promise<void> {
  await updateProgress({
    media_type: params.media_type,
    media_id: params.media_id,
    title: params.title,
    poster_path: params.poster_path,
    season: params.season,
    episode: params.episode,
    progress_seconds: params.current_time,
    duration_seconds: params.duration,
  })
}

export async function getProgress(
  mediaType: string,
  mediaId: number,
  season?: number,
  episode?: number
): Promise<{ progress_seconds: number; duration_seconds: number; current_time?: number } | null> {
  let url = `/api/progress/${mediaType}/${mediaId}`
  if (season !== undefined && episode !== undefined) {
    url += `?season=${season}&episode=${episode}`
  }
  try {
    const result = await apiFetch<{ progress_seconds: number; duration_seconds: number }>(url)
    return { ...result, current_time: result.progress_seconds }
  } catch {
    return null
  }
}

export async function clearProgress(mediaType: string, mediaId: number): Promise<void> {
  await apiFetch(`/api/progress/${mediaType}/${mediaId}`, {
    method: 'DELETE',
  })
}

export async function getWatchHistory(): Promise<ProgressItem[]> {
  return apiFetch<ProgressItem[]>('/api/progress/history')
}
