const API_KEY = import.meta.env.VITE_TMDB_API_KEY || ''
const BASE_URL = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'

export const IMG = {
  poster: (path: string | null, size = 'w342') => path ? `${IMAGE_BASE}/${size}${path}` : null,
  backdrop: (path: string | null, size = 'w1280') => path ? `${IMAGE_BASE}/${size}${path}` : null,
  profile: (path: string | null, size = 'w185') => path ? `${IMAGE_BASE}/${size}${path}` : null,
}

export interface Movie {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  genre_ids: number[]
  media_type?: 'movie'
}

export interface TVShow {
  id: number
  name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  vote_average: number
  vote_count: number
  genre_ids: number[]
  media_type?: 'tv'
}

export interface MovieDetails extends Movie {
  runtime: number
  genres: { id: number; name: string }[]
  tagline: string
  status: string
  budget: number
  revenue: number
  production_companies: { id: number; name: string; logo_path: string | null }[]
}

export interface TVDetails extends TVShow {
  episode_run_time: number[]
  genres: { id: number; name: string }[]
  tagline: string
  status: string
  number_of_seasons: number
  number_of_episodes: number
  seasons: { id: number; name: string; episode_count: number; season_number: number; poster_path: string | null }[]
  created_by: { id: number; name: string }[]
}

export interface CastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
  order: number
}

export interface Credits {
  cast: CastMember[]
}

export type MediaItem = (Movie | TVShow) & { media_type: 'movie' | 'tv' }

async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`)
  url.searchParams.set('api_key', API_KEY)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TMDB API error: ${res.status}`)
  return res.json()
}

// Discover endpoints
export async function getTrending(mediaType: 'movie' | 'tv' | 'all' = 'all', timeWindow: 'day' | 'week' = 'week') {
  return fetchTMDB<{ results: MediaItem[] }>(`/trending/${mediaType}/${timeWindow}`)
}

export async function getPopularMovies() {
  const data = await fetchTMDB<{ results: Movie[] }>('/movie/popular')
  return { results: data.results.map(m => ({ ...m, media_type: 'movie' as const })) }
}

export async function getPopularTV() {
  const data = await fetchTMDB<{ results: TVShow[] }>('/tv/popular')
  return { results: data.results.map(t => ({ ...t, media_type: 'tv' as const })) }
}

export async function getTopRatedMovies() {
  const data = await fetchTMDB<{ results: Movie[] }>('/movie/top_rated')
  return { results: data.results.map(m => ({ ...m, media_type: 'movie' as const })) }
}

export async function getTopRatedTV() {
  const data = await fetchTMDB<{ results: TVShow[] }>('/tv/top_rated')
  return { results: data.results.map(t => ({ ...t, media_type: 'tv' as const })) }
}

// Search
export async function searchMulti(query: string) {
  return fetchTMDB<{ results: MediaItem[] }>('/search/multi', { query })
}

export async function searchMovies(query: string) {
  const data = await fetchTMDB<{ results: Movie[] }>('/search/movie', { query })
  return { results: data.results.map(m => ({ ...m, media_type: 'movie' as const })) }
}

export async function searchTV(query: string) {
  const data = await fetchTMDB<{ results: TVShow[] }>('/search/tv', { query })
  return { results: data.results.map(t => ({ ...t, media_type: 'tv' as const })) }
}

// Details
export async function getMovieDetails(id: number) {
  return fetchTMDB<MovieDetails>(`/movie/${id}`)
}

export async function getTVDetails(id: number) {
  return fetchTMDB<TVDetails>(`/tv/${id}`)
}

export async function getMovieCredits(id: number) {
  return fetchTMDB<Credits>(`/movie/${id}/credits`)
}

export async function getTVCredits(id: number) {
  return fetchTMDB<Credits>(`/tv/${id}/credits`)
}

export async function getSimilarMovies(id: number) {
  const data = await fetchTMDB<{ results: Movie[] }>(`/movie/${id}/similar`)
  return { results: data.results.map(m => ({ ...m, media_type: 'movie' as const })) }
}

export async function getSimilarTV(id: number) {
  const data = await fetchTMDB<{ results: TVShow[] }>(`/tv/${id}/similar`)
  return { results: data.results.map(t => ({ ...t, media_type: 'tv' as const })) }
}

// External IDs (for IMDB lookup)
export interface ExternalIds {
  imdb_id: string | null
  facebook_id: string | null
  instagram_id: string | null
  twitter_id: string | null
}

export async function getExternalIds(type: 'movie' | 'tv', id: number) {
  return fetchTMDB<ExternalIds>(`/${type}/${id}/external_ids`)
}

// Helper to get title from movie or tv
export function getTitle(item: MediaItem): string {
  return 'title' in item ? item.title : item.name
}

export function getReleaseYear(item: MediaItem): string {
  const date = 'release_date' in item ? item.release_date : item.first_air_date
  return date ? date.slice(0, 4) : ''
}
