// OpenSubtitles.com API integration
const OPENSUBTITLES_API = 'https://api.opensubtitles.com/api/v1'

// Default API key (free tier) - users can override in settings
const DEFAULT_API_KEY = 'lhAqyGtSJf1IaTYYOQc8rMCyclhNX5U9'
let apiKey = localStorage.getItem('vaulted_opensubtitles_key') || DEFAULT_API_KEY

export interface Subtitle {
  id: string
  label: string
  language: string
  languageCode: string
  src: string
  downloads: number
  fps?: number
  hearing_impaired: boolean
}

interface OpenSubtitlesResult {
  id: string
  attributes: {
    subtitle_id: string
    language: string
    download_count: number
    fps: number
    hearing_impaired: boolean
    foreign_parts_only: boolean
    files: Array<{
      file_id: number
      file_name: string
    }>
    feature_details?: {
      title: string
      year: number
      imdb_id: number
    }
  }
}

interface SearchResponse {
  total_count: number
  data: OpenSubtitlesResult[]
}

const languageNames: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
  hi: 'Hindi',
  nl: 'Dutch',
  pl: 'Polish',
  tr: 'Turkish',
  sv: 'Swedish',
  no: 'Norwegian',
  da: 'Danish',
  fi: 'Finnish',
  el: 'Greek',
  he: 'Hebrew',
  hu: 'Hungarian',
  cs: 'Czech',
  ro: 'Romanian',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
  ms: 'Malay'
}

export function setOpenSubtitlesApiKey(key: string) {
  apiKey = key
  localStorage.setItem('vaulted_opensubtitles_key', key)
}

export function getOpenSubtitlesApiKey(): string {
  return apiKey
}

export async function searchSubtitles(
  imdbId: string,
  season?: number,
  episode?: number,
  languages: string[] = ['en']
): Promise<Subtitle[]> {
  if (!apiKey) {
    console.log('No OpenSubtitles API key set')
    return []
  }

  try {
    // Build query parameters
    const params = new URLSearchParams()
    
    // IMDB ID without 'tt' prefix for the API
    const imdbNumber = imdbId.replace('tt', '')
    params.append('imdb_id', imdbNumber)
    
    if (season !== undefined) {
      params.append('season_number', String(season))
    }
    if (episode !== undefined) {
      params.append('episode_number', String(episode))
    }
    
    // Add language filter
    if (languages.length > 0) {
      params.append('languages', languages.join(','))
    }
    
    // Order by download count (most popular)
    params.append('order_by', 'download_count')
    params.append('order_direction', 'desc')

    const response = await fetch(`${OPENSUBTITLES_API}/subtitles?${params}`, {
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'Vaulted v1.0'
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        console.error('OpenSubtitles: Invalid API key')
      } else if (response.status === 429) {
        console.error('OpenSubtitles: Rate limit exceeded')
      }
      return []
    }

    const data: SearchResponse = await response.json()
    
    // Convert to our subtitle format
    const subtitles: Subtitle[] = data.data.map(result => {
      const lang = result.attributes.language
      const langName = languageNames[lang] || lang.toUpperCase()
      const isHI = result.attributes.hearing_impaired
      
      return {
        id: result.attributes.subtitle_id,
        label: `${langName}${isHI ? ' (CC)' : ''}`,
        language: langName,
        languageCode: lang,
        src: '', // Will be filled when downloading
        downloads: result.attributes.download_count,
        fps: result.attributes.fps,
        hearing_impaired: isHI,
        fileId: result.attributes.files[0]?.file_id
      } as Subtitle & { fileId?: number }
    })

    // Remove duplicates (keep highest download count per language)
    const uniqueByLang = new Map<string, Subtitle>()
    subtitles.forEach(sub => {
      const key = `${sub.languageCode}-${sub.hearing_impaired}`
      if (!uniqueByLang.has(key) || uniqueByLang.get(key)!.downloads < sub.downloads) {
        uniqueByLang.set(key, sub)
      }
    })

    return Array.from(uniqueByLang.values()).slice(0, 10)
  } catch (err) {
    console.error('Failed to search subtitles:', err)
    return []
  }
}

export async function getSubtitleDownloadUrl(fileId: number): Promise<string | null> {
  if (!apiKey) return null

  try {
    const response = await fetch(`${OPENSUBTITLES_API}/download`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'Vaulted v1.0'
      },
      body: JSON.stringify({
        file_id: fileId
      })
    })

    if (!response.ok) {
      console.error('Failed to get subtitle download URL')
      return null
    }

    const data = await response.json()
    return data.link || null
  } catch (err) {
    console.error('Failed to get subtitle download URL:', err)
    return null
  }
}

// Proxy the subtitle through our backend to handle CORS
export function getProxiedSubtitleUrl(url: string): string {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3456'
  return `${apiBase}/api/proxy/subtitle?url=${encodeURIComponent(url)}`
}
