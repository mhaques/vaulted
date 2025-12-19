import { useState, useEffect } from 'react'
import { VideoPlayer } from '../components/VideoPlayer'
import { IconTv, IconPlay } from '../components/Icons'

// Channel categories
type ChannelCategory = 'news' | 'sports' | 'entertainment' | 'movies' | 'music' | 'documentary' | 'kids' | 'other'

interface Channel {
  id: string
  name: string
  logo?: string
  category: ChannelCategory
  url: string
  country?: string
  language?: string
}

// Free IPTV sources from iptv-org
// These are legal free-to-air channels
const IPTV_PLAYLIST_URL = 'https://iptv-org.github.io/iptv/index.m3u'

// Category icons
const CATEGORY_ICONS: Record<ChannelCategory, string> = {
  news: '📰',
  sports: '⚽',
  entertainment: '🎬',
  movies: '🎥',
  music: '🎵',
  documentary: '🌍',
  kids: '🧸',
  other: '📺'
}

const CATEGORY_LABELS: Record<ChannelCategory, string> = {
  news: 'News',
  sports: 'Sports',
  entertainment: 'Entertainment',
  movies: 'Movies & TV',
  music: 'Music',
  documentary: 'Documentary',
  kids: 'Kids',
  other: 'Other'
}

// Sample channels (we can load more from IPTV playlists)
const SAMPLE_CHANNELS: Channel[] = [
  // News
  { id: 'al-jazeera', name: 'Al Jazeera English', category: 'news', country: 'QA', 
    url: 'https://live-hls-web-aje.getaj.net/AJE/01.m3u8', 
    logo: 'https://i.imgur.com/fZLm4nT.png' },
  { id: 'france24-en', name: 'France 24 English', category: 'news', country: 'FR',
    url: 'https://www.youtube.com/live/h3MuIUNCCzI?si=XgS5XXb_Xl5fFJLf',
    logo: 'https://i.imgur.com/kGKC6Wm.png' },
  { id: 'dw', name: 'DW English', category: 'news', country: 'DE',
    url: 'https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8',
    logo: 'https://i.imgur.com/cOdXWG0.png' },
  { id: 'cgtn', name: 'CGTN', category: 'news', country: 'CN',
    url: 'https://news.cgtn.com/resource/live/english/cgtn-news.m3u8',
    logo: 'https://i.imgur.com/qIoZZF3.png' },
  { id: 'rt', name: 'RT America', category: 'news', country: 'RU',
    url: 'https://rt-glb.rttv.com/live/rtnews/playlist.m3u8',
    logo: 'https://i.imgur.com/wHPNZ1Y.png' },
  { id: 'nhk', name: 'NHK World', category: 'news', country: 'JP',
    url: 'https://nhkwlive-ojp.akamaized.net/hls/live/2003459/nhkwlive-ojp-en/index.m3u8',
    logo: 'https://i.imgur.com/pL3DuBY.png' },
  
  // Documentary
  { id: 'nasa-tv', name: 'NASA TV', category: 'documentary', country: 'US',
    url: 'https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8',
    logo: 'https://i.imgur.com/3i7Mc5g.png' },
  
  // Music
  { id: 'mtv-live', name: 'MTV Live', category: 'music', country: 'US',
    url: 'https://mtv.akamaized.net/hls/live/2037509/mtvhd/master.m3u8',
    logo: 'https://i.imgur.com/6cMy4xE.png' },
  
  // Entertainment
  { id: 'pluto-comedy', name: 'Pluto TV Comedy', category: 'entertainment', country: 'US',
    url: 'https://service-stitcher.clusters.pluto.tv/stitch/hls/channel/5f406d4d8e00bb00074a88d4/master.m3u8?deviceType=web',
    logo: 'https://i.imgur.com/bfLH0pS.png' },
]

export default function LiveTV() {
  const [channels, setChannels] = useState<Channel[]>(SAMPLE_CHANNELS)
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<ChannelCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [playingChannel, setPlayingChannel] = useState<Channel | null>(null)
  const [customPlaylistUrl, setCustomPlaylistUrl] = useState('')
  const [showAddPlaylist, setShowAddPlaylist] = useState(false)

  // Filter channels
  const filteredChannels = channels.filter(ch => {
    if (selectedCategory !== 'all' && ch.category !== selectedCategory) return false
    if (searchQuery && !ch.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // Group by category
  const channelsByCategory = filteredChannels.reduce((acc, ch) => {
    if (!acc[ch.category]) acc[ch.category] = []
    acc[ch.category].push(ch)
    return acc
  }, {} as Record<ChannelCategory, Channel[]>)

  // Parse M3U playlist
  const parseM3U = (content: string): Channel[] => {
    const lines = content.split('\n')
    const channels: Channel[] = []
    let currentChannel: Partial<Channel> = {}

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line.startsWith('#EXTINF:')) {
        // Parse channel info
        const nameMatch = line.match(/,(.+)$/)
        const logoMatch = line.match(/tvg-logo="([^"]+)"/)
        const groupMatch = line.match(/group-title="([^"]+)"/)
        const countryMatch = line.match(/tvg-country="([^"]+)"/)
        
        currentChannel = {
          name: nameMatch?.[1] || 'Unknown',
          logo: logoMatch?.[1],
          country: countryMatch?.[1],
          category: mapGroupToCategory(groupMatch?.[1] || '')
        }
      } else if (line.startsWith('http') && currentChannel.name) {
        channels.push({
          id: `custom-${channels.length}`,
          name: currentChannel.name!,
          logo: currentChannel.logo,
          category: currentChannel.category || 'other',
          country: currentChannel.country,
          url: line
        })
        currentChannel = {}
      }
    }

    return channels
  }

  // Map M3U group to category
  const mapGroupToCategory = (group: string): ChannelCategory => {
    const lower = group.toLowerCase()
    if (lower.includes('news')) return 'news'
    if (lower.includes('sport')) return 'sports'
    if (lower.includes('movie') || lower.includes('cinema')) return 'movies'
    if (lower.includes('music')) return 'music'
    if (lower.includes('documentary') || lower.includes('doc')) return 'documentary'
    if (lower.includes('kid') || lower.includes('children')) return 'kids'
    if (lower.includes('entertainment') || lower.includes('general')) return 'entertainment'
    return 'other'
  }

  // Load custom playlist
  const loadCustomPlaylist = async () => {
    if (!customPlaylistUrl) return
    setLoading(true)
    try {
      const res = await fetch(customPlaylistUrl)
      const text = await res.text()
      const newChannels = parseM3U(text)
      setChannels(prev => [...prev, ...newChannels])
      setShowAddPlaylist(false)
      setCustomPlaylistUrl('')
      // Save to localStorage
      const savedPlaylists = JSON.parse(localStorage.getItem('vaulted_iptv_playlists') || '[]')
      savedPlaylists.push(customPlaylistUrl)
      localStorage.setItem('vaulted_iptv_playlists', JSON.stringify(savedPlaylists))
    } catch (err) {
      console.error('Failed to load playlist:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load saved playlists on mount
  useEffect(() => {
    const savedPlaylists = JSON.parse(localStorage.getItem('vaulted_iptv_playlists') || '[]')
    savedPlaylists.forEach((url: string) => {
      fetch(url)
        .then(res => res.text())
        .then(text => {
          const newChannels = parseM3U(text)
          setChannels(prev => [...prev, ...newChannels])
        })
        .catch(console.error)
    })
  }, [])

  // Play channel
  const playChannel = (channel: Channel) => {
    setPlayingChannel(channel)
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Live TV</h1>
            <p className="text-neutral-500">Free-to-air channels from around the world</p>
          </div>
          
          {/* Search & Add */}
          <div className="flex gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search channels..."
              className="px-4 py-2 rounded-lg glass border border-white/10 focus:border-indigo-500 focus:outline-none w-64"
            />
            <button
              onClick={() => setShowAddPlaylist(true)}
              className="px-4 py-2 rounded-lg glass hover:bg-white/10 transition flex items-center gap-2"
            >
              <span>+</span> Add Playlist
            </button>
          </div>
        </div>
      </div>

      {/* Category filters */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white'
                : 'glass hover:bg-white/10'
            }`}
          >
            All
          </button>
          {(Object.keys(CATEGORY_ICONS) as ChannelCategory[]).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'glass hover:bg-white/10'
              }`}
            >
              <span>{CATEGORY_ICONS[cat]}</span>
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Channel grid */}
      <div className="max-w-7xl mx-auto">
        {selectedCategory === 'all' ? (
          // Show grouped by category
          Object.entries(channelsByCategory).map(([category, channels]) => (
            <section key={category} className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span>{CATEGORY_ICONS[category as ChannelCategory]}</span>
                {CATEGORY_LABELS[category as ChannelCategory]}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {channels.map(channel => (
                  <ChannelCard 
                    key={channel.id} 
                    channel={channel} 
                    onPlay={playChannel}
                    isPlaying={playingChannel?.id === channel.id}
                  />
                ))}
              </div>
            </section>
          ))
        ) : (
          // Show filtered
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredChannels.map(channel => (
              <ChannelCard 
                key={channel.id} 
                channel={channel} 
                onPlay={playChannel}
                isPlaying={playingChannel?.id === channel.id}
              />
            ))}
          </div>
        )}

        {filteredChannels.length === 0 && (
          <div className="text-center py-20 text-neutral-500">
            <IconTv size={56} className="mx-auto mb-4 opacity-50" />
            <p className="text-xl">No channels found</p>
            <p className="mt-2">Try a different category or add your own playlist</p>
          </div>
        )}
      </div>

      {/* Video Player Modal */}
      {playingChannel && (
        <VideoPlayer
          src={playingChannel.url}
          title={playingChannel.name}
          onClose={() => setPlayingChannel(null)}
        />
      )}

      {/* Add Playlist Modal */}
      {showAddPlaylist && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md glass rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4">Add IPTV Playlist</h2>
            <p className="text-sm text-neutral-500 mb-4">
              Enter an M3U/M3U8 playlist URL. You can find free playlists at{' '}
              <a 
                href="https://github.com/iptv-org/iptv" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-400 hover:underline"
              >
                iptv-org/iptv
              </a>
            </p>
            <input
              type="url"
              value={customPlaylistUrl}
              onChange={e => setCustomPlaylistUrl(e.target.value)}
              placeholder="https://example.com/playlist.m3u"
              className="w-full px-4 py-3 rounded-lg glass border border-white/10 focus:border-indigo-500 focus:outline-none mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAddPlaylist(false)}
                className="px-4 py-2 rounded-lg glass hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={loadCustomPlaylist}
                disabled={!customPlaylistUrl || loading}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                {loading ? 'Loading...' : 'Add Playlist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Channel card component
function ChannelCard({ 
  channel, 
  onPlay, 
  isPlaying 
}: { 
  channel: Channel
  onPlay: (channel: Channel) => void
  isPlaying: boolean
}) {
  return (
    <button
      onClick={() => onPlay(channel)}
      className={`group relative p-4 rounded-xl glass transition hover:bg-white/10 text-left ${
        isPlaying ? 'ring-2 ring-indigo-500 bg-indigo-500/10' : ''
      }`}
    >
      {/* Logo */}
      <div className="aspect-video rounded-lg glass mb-3 flex items-center justify-center overflow-hidden">
        {channel.logo ? (
          <img 
            src={channel.logo} 
            alt={channel.name} 
            className="w-full h-full object-contain p-2"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextElementSibling?.classList.remove('hidden')
            }}
          />
        ) : null}
        <span className={`${channel.logo ? 'hidden' : ''}`}><IconTv size={32} /></span>
      </div>
      
      {/* Info */}
      <p className="font-medium text-sm truncate">{channel.name}</p>
      <p className="text-xs text-neutral-500 truncate">
        {channel.country && <span className="mr-2">{channel.country}</span>}
        {CATEGORY_LABELS[channel.category]}
      </p>
      
      {/* Playing indicator */}
      {isPlaying && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      )}
      
      {/* Hover overlay */}
      <div className="absolute inset-0 rounded-xl bg-indigo-600/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
        <IconPlay size={32} />
      </div>
    </button>
  )
}
