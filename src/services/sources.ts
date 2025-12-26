/**
 * Vaulted - Source Aggregator & Auto-Picker
 * 
 * This service manages streaming sources and automatically picks the best available.
 * It integrates with:
 * - Stremio addons (Torrentio, etc.)
 * - Real-Debrid for cached torrents
 * - Direct streaming links
 */

export interface StreamSource {
  id: string
  name: string
  title: string
  quality: '4K' | '1080p' | '720p' | '480p' | 'Unknown'
  type: 'torrent' | 'debrid' | 'direct' | 'hls'
  url: string
  size?: string
  seeds?: number
  provider: string
  cached?: boolean // For debrid - if it's already cached
}

export interface SourceProvider {
  id: string
  name: string
  enabled: boolean
  priority: number // Lower = higher priority
  fetch: (imdbId: string, type: 'movie' | 'series', season?: number, episode?: number) => Promise<StreamSource[]>
}

// Quality ranking for auto-picker
const QUALITY_RANK: Record<string, number> = {
  '4K': 4,
  '1080p': 3,
  '720p': 2,
  '480p': 1,
  'Unknown': 0
}

// Parse quality from title string
export function parseQuality(title: string): StreamSource['quality'] {
  const lower = title.toLowerCase()
  if (lower.includes('2160p') || lower.includes('4k') || lower.includes('uhd')) return '4K'
  if (lower.includes('1080p') || lower.includes('fhd')) return '1080p'
  if (lower.includes('720p') || lower.includes('hd')) return '720p'
  if (lower.includes('480p') || lower.includes('sd')) return '480p'
  return 'Unknown'
}

// Parse size string to bytes for comparison
export function parseSize(size: string): number {
  const match = size.match(/(\d+\.?\d*)\s*(GB|MB|TB)/i)
  if (!match) return 0
  const num = parseFloat(match[1])
  const unit = match[2].toUpperCase()
  if (unit === 'TB') return num * 1024 * 1024 * 1024 * 1024
  if (unit === 'GB') return num * 1024 * 1024 * 1024
  if (unit === 'MB') return num * 1024 * 1024
  return num
}

class SourceAggregator {
  private providers: SourceProvider[] = []
  private debridApiKey: string | null = null

  constructor() {
    // Load saved config
    this.debridApiKey = localStorage.getItem('vaulted_debrid_key')
  }

  // Register a source provider
  registerProvider(provider: SourceProvider) {
    this.providers.push(provider)
    this.providers.sort((a, b) => a.priority - b.priority)
  }

  // Set Real-Debrid API key
  setDebridKey(key: string) {
    this.debridApiKey = key
    localStorage.setItem('vaulted_debrid_key', key)
  }

  getDebridKey(): string | null {
    return this.debridApiKey
  }

  // Enable/disable a provider
  setProviderEnabled(providerId: string, enabled: boolean) {
    const provider = this.providers.find(p => p.id === providerId)
    if (provider) {
      provider.enabled = enabled
      // Persist to localStorage
      localStorage.setItem(`vaulted_provider_${providerId}`, enabled ? 'true' : 'false')
    }
  }

  // Get all providers
  getProviders(): SourceProvider[] {
    return this.providers
  }

  // Get provider by ID
  getProvider(providerId: string): SourceProvider | undefined {
    return this.providers.find(p => p.id === providerId)
  }

  // Fetch sources from all providers
  async fetchAllSources(
    imdbId: string,
    type: 'movie' | 'series',
    season?: number,
    episode?: number
  ): Promise<StreamSource[]> {
    const enabledProviders = this.providers.filter(p => p.enabled)
    
    const results = await Promise.allSettled(
      enabledProviders.map(provider => 
        provider.fetch(imdbId, type, season, episode)
          .catch(err => {
            console.warn(`[${provider.name}] Error fetching sources:`, err)
            return []
          })
      )
    )

    const allSources: StreamSource[] = []
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        allSources.push(...result.value)
      }
    })

    return allSources
  }

  // Auto-pick best source based on quality, seeds, and cache status
  pickBestSource(sources: StreamSource[]): StreamSource | null {
    if (sources.length === 0) return null

    // Sort by: cached first, then quality, then seeds
    const sorted = [...sources].sort((a, b) => {
      // Cached debrid sources first (instant playback)
      if (a.cached && !b.cached) return -1
      if (!a.cached && b.cached) return 1

      // Then by quality
      const qualityDiff = QUALITY_RANK[b.quality] - QUALITY_RANK[a.quality]
      if (qualityDiff !== 0) return qualityDiff

      // Then by seeds (for torrents)
      if (a.seeds && b.seeds) {
        return b.seeds - a.seeds
      }

      return 0
    })

    return sorted[0]
  }

  // Get sources sorted by quality (for manual selection)
  getSortedSources(sources: StreamSource[]): StreamSource[] {
    return [...sources].sort((a, b) => {
      // Cached first
      if (a.cached && !b.cached) return -1
      if (!a.cached && b.cached) return 1
      
      // Quality
      const qualityDiff = QUALITY_RANK[b.quality] - QUALITY_RANK[a.quality]
      if (qualityDiff !== 0) return qualityDiff
      
      // Seeds
      return (b.seeds || 0) - (a.seeds || 0)
    })
  }

  // Try sources in order until one works
  async trySourcesInOrder(
    sources: StreamSource[],
    onTry: (source: StreamSource) => Promise<boolean>
  ): Promise<StreamSource | null> {
    const sorted = this.getSortedSources(sources)
    
    for (const source of sorted) {
      try {
        const success = await onTry(source)
        if (success) return source
      } catch (err) {
        console.warn(`Source ${source.name} failed, trying next...`)
      }
    }
    
    return null
  }
}

// Singleton instance
export const sourceAggregator = new SourceAggregator()

// ============================================
// PROVIDER: Torrentio (Stremio Addon)
// ============================================

// Use proxy in development to avoid CORS
const TORRENTIO_BASE = import.meta.env.DEV 
  ? '/torrentio' 
  : 'https://torrentio.strem.fun'

// Torrentio with common indexers configured
// Config: sort by quality, filter out low quality, English only
const TORRENTIO_CONFIG = 'sort=qualitysize|qualityfilter=480p,scr,cam|lang=english'

interface TorrentioStream {
  name: string
  title: string
  url?: string
  infoHash?: string
  fileIdx?: number
  behaviorHints?: {
    bingeGroup?: string
    filename?: string
  }
}

async function fetchTorrentio(
  imdbId: string,
  type: 'movie' | 'series',
  season?: number,
  episode?: number
): Promise<StreamSource[]> {
  let url = `${TORRENTIO_BASE}/${TORRENTIO_CONFIG}/stream/${type}/${imdbId}`
  
  if (type === 'series' && season !== undefined && episode !== undefined) {
    url += `:${season}:${episode}`
  }
  
  url += '.json'

  console.log('[Torrentio] Fetching:', url)

  try {
    const res = await fetch(url)
    if (!res.ok) {
      console.error('[Torrentio] HTTP error:', res.status, res.statusText)
      throw new Error(`Torrentio request failed: ${res.status}`)
    }
    
    const data = await res.json()
    console.log('[Torrentio] Response:', data)
    
    const streams: TorrentioStream[] = data.streams || []

    return streams.map((stream, idx) => {
      // Build magnet URL from infoHash if url not provided
      let streamUrl = stream.url || ''
      if (!streamUrl && stream.infoHash) {
        streamUrl = `magnet:?xt=urn:btih:${stream.infoHash}`
        if (stream.behaviorHints?.filename) {
          streamUrl += `&dn=${encodeURIComponent(stream.behaviorHints.filename)}`
        }
      }

      return {
        id: `torrentio-${idx}`,
        name: stream.name || 'Unknown',
        title: stream.title || '',
        quality: parseQuality(stream.title || stream.name || ''),
        type: 'torrent' as const,
        url: streamUrl,
        provider: 'Torrentio',
        seeds: extractSeeds(stream.title || ''),
        size: extractSize(stream.title || '')
      }
    }).filter(s => s.url) // Only return sources with valid URLs
  } catch (err) {
    console.error('[Torrentio] Error:', err)
    return []
  }
}

function extractSeeds(title: string): number {
  const match = title.match(/👤\s*(\d+)/i) || title.match(/seeds?:?\s*(\d+)/i)
  return match ? parseInt(match[1]) : 0
}

function extractSize(title: string): string {
  const match = title.match(/💾\s*([\d.]+\s*[GMTK]B)/i) || title.match(/([\d.]+\s*[GMTK]B)/i)
  return match ? match[1] : ''
}

// Register Torrentio provider
sourceAggregator.registerProvider({
  id: 'torrentio',
  name: 'Torrentio',
  enabled: localStorage.getItem('vaulted_provider_torrentio') !== 'false',
  priority: 1,
  fetch: fetchTorrentio
})

// ============================================
// PROVIDER: VidSrc (Free direct streaming)
// ============================================

async function fetchVidSrc(
  imdbId: string,
  type: 'movie' | 'series',
  season?: number,
  episode?: number
): Promise<StreamSource[]> {
  // VidSrc provides embeds, we'll return the embed URL
  // Users can either embed in iframe or open directly
  
  const sources: StreamSource[] = []
  
  // VidSrc.to
  let vidsrcUrl = type === 'movie'
    ? `https://vidsrc.to/embed/movie/${imdbId}`
    : `https://vidsrc.to/embed/tv/${imdbId}/${season}/${episode}`
  
  sources.push({
    id: 'vidsrc-to',
    name: 'VidSrc.to',
    title: 'Free streaming embed',
    quality: '1080p',
    type: 'direct',
    url: vidsrcUrl,
    provider: 'VidSrc'
  })
  
  // VidSrc.me (backup)
  let vidsrcMeUrl = type === 'movie'
    ? `https://vidsrc.me/embed/movie?imdb=${imdbId}`
    : `https://vidsrc.me/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`
  
  sources.push({
    id: 'vidsrc-me',
    name: 'VidSrc.me',
    title: 'Free streaming embed (backup)',
    quality: '1080p',
    type: 'direct',
    url: vidsrcMeUrl,
    provider: 'VidSrc'
  })
  
  // 2embed.cc
  let embed2Url = type === 'movie'
    ? `https://www.2embed.cc/embed/${imdbId}`
    : `https://www.2embed.cc/embedtv/${imdbId}&s=${season}&e=${episode}`
  
  sources.push({
    id: '2embed',
    name: '2Embed',
    title: 'Free streaming embed',
    quality: '1080p',
    type: 'direct',
    url: embed2Url,
    provider: '2Embed'
  })
  
  return sources
}

sourceAggregator.registerProvider({
  id: 'vidsrc',
  name: 'VidSrc',
  enabled: localStorage.getItem('vaulted_provider_vidsrc') === 'true',
  priority: 2,
  fetch: fetchVidSrc
})

// ============================================
// PROVIDER: SuperEmbed (aggregates multiple sources)
// ============================================

async function fetchSuperEmbed(
  imdbId: string,
  type: 'movie' | 'series',
  season?: number,
  episode?: number
): Promise<StreamSource[]> {
  const sources: StreamSource[] = []
  
  // SuperEmbed aggregates multiple free sources
  let superEmbedUrl = type === 'movie'
    ? `https://multiembed.mov/directstream.php?video_id=${imdbId}`
    : `https://multiembed.mov/directstream.php?video_id=${imdbId}&s=${season}&e=${episode}`
  
  sources.push({
    id: 'superembed',
    name: 'MultiEmbed',
    title: 'Aggregated free sources',
    quality: '1080p',
    type: 'direct',
    url: superEmbedUrl,
    provider: 'MultiEmbed'
  })
  
  // NontonGo
  let nontongoUrl = type === 'movie'
    ? `https://www.NontonGo.win/embed/movie/${imdbId}`
    : `https://www.NontonGo.win/embed/tv/${imdbId}/${season}/${episode}`
  
  sources.push({
    id: 'nontongo',
    name: 'NontonGo',
    title: 'Free streaming',
    quality: '720p',
    type: 'direct',
    url: nontongoUrl,
    provider: 'NontonGo'
  })
  
  return sources
}

sourceAggregator.registerProvider({
  id: 'superembed',
  name: 'Free Sources',
  enabled: localStorage.getItem('vaulted_provider_superembed') === 'true',
  priority: 3,
  fetch: fetchSuperEmbed
})

// ============================================
// PROVIDER: Real-Debrid (for cached torrents)
// ============================================

const RD_API = `${import.meta.env.VITE_API_URL}/api/proxy/realdebrid`

export async function checkDebridCache(magnetLinks: string[]): Promise<Record<string, boolean>> {
  const apiKey = sourceAggregator.getDebridKey()
  if (!apiKey || magnetLinks.length === 0) return {}

  try {
    // Extract hashes from magnet links
    const hashes = magnetLinks
      .map(m => {
        const match = m.match(/btih:([a-fA-F0-9]{40}|[a-zA-Z2-7]{32})/i)
        return match ? match[1].toLowerCase() : null
      })
      .filter((h): h is string => h !== null)

    if (hashes.length === 0) return {}

    // Real-Debrid wants hashes separated by / but max ~50 at a time
    const batchSize = 50
    const cached: Record<string, boolean> = {}
    
    for (let i = 0; i < hashes.length; i += batchSize) {
      const batch = hashes.slice(i, i + batchSize)
      
      try {
        const res = await fetch(`${RD_API}/torrents/instantAvailability/${batch.join('/')}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        })

        if (res.ok) {
          const data = await res.json()
          for (const [hash, info] of Object.entries(data)) {
            // Real-Debrid returns nested object with "rd" key if cached
            const rdInfo = info as any
            cached[hash.toLowerCase()] = !!(rdInfo && rdInfo.rd && rdInfo.rd.length > 0)
          }
        }
      } catch (batchErr) {
        console.warn('Debrid cache batch error:', batchErr)
      }
    }

    return cached
  } catch (err) {
    console.error('Debrid cache check error:', err)
    return {}
  }
}

// Check if a single torrent is cached (to avoid rate limits, only call this once per play attempt)
// Helper to delete a torrent from Real-Debrid
async function deleteTorrent(apiKey: string, torrentId: string): Promise<void> {
  try {
    await fetch(`${RD_API}/torrents/delete/${torrentId}?apiKey=${apiKey}`, {
      method: 'DELETE'
    })
    console.log('[RD] Deleted torrent:', torrentId)
  } catch (err) {
    console.warn('[RD] Failed to delete torrent:', err)
  }
}

// Helper to wait for torrent links to be available (handles queued/downloading status)
async function waitForTorrentLinks(apiKey: string, torrentId: string, maxAttempts = 30): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${RD_API}/torrents/info/${torrentId}?apiKey=${apiKey}`)
    
    if (res.status === 400) {
      await deleteTorrent(apiKey, torrentId)
      throw new Error('Torrent not available')
    }
    
    if (!res.ok) throw new Error('Failed to get torrent info')
    
    const info = await res.json()
    
    if (info.status === 'downloaded' && info.links && info.links.length > 0) {
      return info
    } else if (info.status === 'magnet_error' || info.status === 'error' || info.status === 'virus' || info.status === 'dead') {
      await deleteTorrent(apiKey, torrentId)
      throw new Error(`Torrent error: ${info.status}`)
    }
    
    // queued, downloading, uploading, compressing, etc - wait and retry
    console.log(`[RD] Torrent status: ${info.status}, waiting... (${i + 1}/${maxAttempts})`)
    await new Promise(r => setTimeout(r, 2000))
  }
  
  // Timeout - torrent not ready in time
  console.error('[RD] Torrent download timeout')
  throw new Error('Torrent download timeout')
}

// Helper to wait for torrent to be ready
async function waitForTorrentReady(apiKey: string, torrentId: string, maxAttempts = 10): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${RD_API}/torrents/info/${torrentId}?apiKey=${apiKey}`)
    
    // 400 means torrent not cached - delete it and fail
    if (res.status === 400) {
      await deleteTorrent(apiKey, torrentId)
      throw new Error('Torrent not cached on Real-Debrid')
    }
    
    if (!res.ok) {
      console.error('[RD] Torrent info failed:', res.status)
      throw new Error('Failed to get torrent info')
    }
    
    const info = await res.json()
    
    // Status: waiting_files_selection, downloading, downloaded, etc.
    if (info.status === 'waiting_files_selection') {
      return info
    } else if (info.status === 'downloaded') {
      return info
    } else if (info.status === 'magnet_error' || info.status === 'error' || info.status === 'virus' || info.status === 'dead') {
      await deleteTorrent(apiKey, torrentId)
      throw new Error(`Torrent error: ${info.status}`)
    }
    
    // Wait a bit before checking again
    await new Promise(r => setTimeout(r, 500))
  }
  
  await deleteTorrent(apiKey, torrentId)
  throw new Error('Torrent not ready in time')
}

export async function addToDebrid(magnetLink: string): Promise<string | null> {
  const apiKey = sourceAggregator.getDebridKey()
  if (!apiKey) {
    console.error('No Real-Debrid API key configured')
    return null
  }

  try {
    // Step 1: Add magnet
    console.log('[RD] Adding magnet...')
    const addRes = await fetch(`${RD_API}/torrents/addMagnet`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `magnet=${encodeURIComponent(magnetLink)}`
    })

    if (!addRes.ok) {
      const errText = await addRes.text()
      console.error('[RD] Add magnet failed:', addRes.status, errText)
      throw new Error(`Failed to add magnet: ${addRes.status}`)
    }
    
    const addData = await addRes.json()
    const torrentId = addData.id
    console.log('[RD] Torrent ID:', torrentId)

    // Step 2: Wait for torrent to be ready for file selection
    console.log('[RD] Waiting for torrent...')
    const info = await waitForTorrentReady(apiKey, torrentId)
    
    // Step 3: If status is waiting_files_selection, select files
    if (info.status === 'waiting_files_selection') {
      console.log('[RD] Selecting files...')
      
      // Find playable video files (exclude .iso, .rar, etc.)
      const playableExtensions = /\.(mp4|mkv|avi|mov|wmv|webm|m4v|ts|m2ts)$/i
      const videoFiles = info.files?.filter((f: any) => 
        playableExtensions.test(f.path) && f.selected === 0
      ) || []
      
      let fileIds = 'all'
      if (videoFiles.length > 0) {
        // Select the largest playable video file
        const largest = videoFiles.reduce((a: any, b: any) => a.bytes > b.bytes ? a : b)
        fileIds = String(largest.id)
        console.log('[RD] Selected video file:', largest.path)
      } else {
        // No playable video files found
        console.error('[RD] No playable video files found in torrent')
        // Still try 'all' as fallback
      }
      
      const selectRes = await fetch(`${RD_API}/torrents/selectFiles/${torrentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `files=${fileIds}`
      })
      
      if (!selectRes.ok) {
        console.error('[RD] Select files failed:', selectRes.status)
        // Continue anyway, might still work
      }
      
      // Wait a moment for processing
      await new Promise(r => setTimeout(r, 1000))
    }

    // Step 4: Wait for torrent to download (if queued/downloading) and get links
    console.log('[RD] Getting download links...')
    const finalInfo = await waitForTorrentLinks(apiKey, torrentId)
    console.log('[RD] Torrent status:', finalInfo.status, 'Links:', finalInfo.links?.length || 0)
    
    // Step 5: Unrestrict the link
    if (finalInfo.links && finalInfo.links.length > 0) {
      // Filter out non-playable links like .iso
      const playableLinks = finalInfo.links.filter((link: string) => 
        !link.match(/\.(iso|rar|zip|7z|tar|gz)$/i)
      )
      
      if (playableLinks.length === 0) {
        console.error('[RD] No playable links (only .iso or archives)')
        return null
      }
      
      console.log('[RD] Unrestricting link...')
      const unrestrictRes = await fetch(`${RD_API}/unrestrict/link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `link=${encodeURIComponent(playableLinks[0])}`
      })

      if (!unrestrictRes.ok) {
        const errText = await unrestrictRes.text()
        console.error('[RD] Unrestrict failed:', unrestrictRes.status, errText)
        throw new Error('Failed to unrestrict link')
      }

      const unrestricted = await unrestrictRes.json()
      
      // Final check - make sure the download URL is playable
      if (unrestricted.download?.match(/\.(iso|rar|zip|7z|tar|gz)$/i)) {
        console.error('[RD] Unrestricted URL is non-playable format:', unrestricted.download)
        return null
      }
      
      console.log('[RD] Got download URL:', unrestricted.download?.substring(0, 50) + '...')
      return unrestricted.download || null
    }

    console.error('[RD] No links available')
    return null
  } catch (err) {
    console.error('[RD] Error:', err)
    return null
  }
}

export default sourceAggregator