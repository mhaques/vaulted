import { useState, useEffect } from 'react'
import { sourceAggregator } from '../services/sources'
import { getOpenSubtitlesApiKey, setOpenSubtitlesApiKey } from '../services/subtitles'
import { IconPlay, IconZap, IconSubtitles, IconDisc, IconSettings, IconCheck, IconInfo } from '../components/Icons'

interface RDUserInfo {
  username: string
  email: string
  premium: number
  expiration: string
}

export function Settings() {
  const [debridKey, setDebridKey] = useState('')
  const [debridStatus, setDebridStatus] = useState<'none' | 'checking' | 'valid' | 'invalid'>('none')
  const [debridUser, setDebridUser] = useState<RDUserInfo | null>(null)
  const [saved, setSaved] = useState(false)
  
  // OpenSubtitles
  const [openSubtitlesKey, setOpenSubtitlesKey] = useState('')
  const [openSubtitlesStatus, setOpenSubtitlesStatus] = useState<'none' | 'checking' | 'valid' | 'invalid'>('none')

  // Source preferences
  const [autoPlay, setAutoPlay] = useState(() => 
    localStorage.getItem('vaulted_autoplay') !== 'false'
  )
  const [preferredQuality, setPreferredQuality] = useState(() =>
    localStorage.getItem('vaulted_quality') || '1080p'
  )

  useEffect(() => {
    const key = sourceAggregator.getDebridKey()
    if (key) {
      setDebridKey(key)
      validateDebridKey(key)
    }
    
    // Load OpenSubtitles key
    const osKey = getOpenSubtitlesApiKey()
    if (osKey) {
      setOpenSubtitlesKey(osKey)
      setOpenSubtitlesStatus('valid')
    }
  }, [])

  const validateDebridKey = async (key: string) => {
    if (!key || key.length < 10) {
      setDebridStatus('none')
      setDebridUser(null)
      return
    }

    setDebridStatus('checking')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/proxy/realdebrid/user`, {
        headers: { 'Authorization': `Bearer ${key}` }
      })
      
      if (res.ok) {
        const userData = await res.json()
        setDebridStatus('valid')
        setDebridUser(userData)
        sourceAggregator.setDebridKey(key)
      } else {
        const errData = await res.json().catch(() => ({}))
        console.error('RD validation failed:', res.status, errData)
        setDebridStatus('invalid')
        setDebridUser(null)
      }
    } catch (err) {
      console.error('RD validation error:', err)
      setDebridStatus('invalid')
      setDebridUser(null)
    }
  }

  const clearDebridKey = () => {
    setDebridKey('')
    setDebridStatus('none')
    setDebridUser(null)
    localStorage.removeItem('vaulted_debrid_key')
  }

  const saveSettings = () => {
    localStorage.setItem('vaulted_autoplay', String(autoPlay))
    localStorage.setItem('vaulted_quality', preferredQuality)
    
    if (debridKey) {
      sourceAggregator.setDebridKey(debridKey)
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-neutral-400 mb-8">Configure playback and source preferences.</p>

      {/* Playback Settings */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <IconPlay className="text-indigo-400" size={18} />
          Playback
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <p className="font-medium">Auto-play Best Source</p>
              <p className="text-sm text-neutral-500">Automatically start playing the highest quality available source</p>
            </div>
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className={`w-12 h-6 rounded-full transition ${autoPlay ? 'bg-indigo-600' : 'bg-neutral-700'}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition transform ${autoPlay ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className="p-4 bg-white/5 rounded-lg">
            <p className="font-medium mb-3">Preferred Quality</p>
            <div className="flex gap-2">
              {['4K', '1080p', '720p', '480p'].map(q => (
                <button
                  key={q}
                  onClick={() => setPreferredQuality(q)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    preferredQuality === q
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/5 text-neutral-400 hover:bg-white/10'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Auto-picker will prioritize this quality when available
            </p>
          </div>
        </div>
      </section>

      {/* Debrid Settings */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <IconZap className="text-indigo-400" size={18} />
          Real-Debrid
        </h2>
        
        <div className="p-4 bg-white/5 rounded-lg space-y-4">
          <p className="text-sm text-neutral-400">
            Connect your Real-Debrid account for cached torrents and faster streaming.
          </p>
          
          {/* Show connected user info */}
          {debridStatus === 'valid' && debridUser && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-400 font-medium flex items-center gap-1.5">
                    <IconCheck size={16} /> Connected as {debridUser.username}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {debridUser.premium > 0 
                      ? `Premium until ${new Date(debridUser.expiration).toLocaleDateString()}`
                      : 'Free account (limited features)'}
                  </p>
                </div>
                <button
                  onClick={clearDebridKey}
                  className="px-3 py-1 text-sm bg-white/10 hover:bg-white/20 rounded transition"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
          
          {/* API Key input - show if not connected */}
          {debridStatus !== 'valid' && (
            <>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={debridKey}
                  onChange={(e) => setDebridKey(e.target.value)}
                  placeholder="API Key from real-debrid.com/apitoken"
                  className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-white/20"
                />
                <button
                  onClick={() => validateDebridKey(debridKey)}
                  disabled={debridStatus === 'checking' || !debridKey}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition text-sm"
                >
                  {debridStatus === 'checking' ? 'Checking...' : 'Connect'}
                </button>
              </div>

              {debridStatus === 'invalid' && (
                <p className="text-sm text-red-400">Invalid API key - make sure you copied the full key</p>
              )}

              <a
                href="https://real-debrid.com/apitoken"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-400 hover:text-indigo-300 transition inline-block"
              >
                Get your API key →
              </a>
            </>
          )}
          
          {/* Help text */}
          <div className="text-xs text-neutral-600 space-y-1">
            <p className="flex items-center gap-1.5"><IconInfo size={12} /> Real-Debrid converts torrent links to direct download links</p>
            <p className="flex items-center gap-1.5"><IconInfo size={12} /> Cached torrents stream instantly, uncached may take time</p>
            <p className="flex items-center gap-1.5"><IconInfo size={12} /> Premium account required for best experience</p>
          </div>
        </div>
      </section>

      {/* OpenSubtitles Settings */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <IconSubtitles className="text-indigo-400" size={18} />
          OpenSubtitles
        </h2>
        
        <div className="p-4 bg-white/5 rounded-lg space-y-4">
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 font-medium flex items-center gap-1.5">
                  <IconCheck size={16} /> Subtitles Enabled
                </p>
                <p className="text-xs text-neutral-500 mt-1">Using built-in API key (20 downloads/day)</p>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-neutral-400">
            Optionally use your own API key for higher limits:
          </p>
          
          <div className="flex gap-2">
            <input
              type="password"
              value={openSubtitlesKey}
              onChange={(e) => setOpenSubtitlesKey(e.target.value)}
              placeholder="Your own API key (optional)"
              className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-white/20"
            />
            <button
              onClick={() => {
                if (openSubtitlesKey) {
                  setOpenSubtitlesApiKey(openSubtitlesKey)
                  setOpenSubtitlesStatus('valid')
                }
              }}
              disabled={!openSubtitlesKey}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition text-sm"
            >
              Save
            </button>
          </div>

          <a
            href="https://www.opensubtitles.com/en/consumers"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-400 hover:text-indigo-300 transition inline-block"
          >
            Get your own API key for higher limits →
          </a>
          
          <div className="text-xs text-neutral-600 space-y-1">
            <p className="flex items-center gap-1.5"><IconInfo size={12} /> Subtitles automatically appear in the player settings</p>
            <p className="flex items-center gap-1.5"><IconInfo size={12} /> Press C while watching to toggle subtitles</p>
          </div>
        </div>
      </section>

      {/* Source Providers */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <IconDisc className="text-indigo-400" size={18} />
          Source Providers
        </h2>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <p className="font-medium">Torrentio</p>
              <p className="text-sm text-neutral-500">Torrent sources (requires Real-Debrid)</p>
            </div>
            <span className="text-green-400 text-sm">Enabled</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <p className="font-medium">VidSrc</p>
              <p className="text-sm text-neutral-500">Free streaming embeds (VidSrc.to, VidSrc.me)</p>
            </div>
            <span className="text-green-400 text-sm">Enabled</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div>
              <p className="font-medium">2Embed / MultiEmbed</p>
              <p className="text-sm text-neutral-500">Additional free streaming sources</p>
            </div>
            <span className="text-green-400 text-sm">Enabled</span>
          </div>
        </div>
      </section>

      {/* Data Management */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <IconSettings className="text-indigo-400" size={18} />
          Data
        </h2>
        
        <div className="space-y-2">
          <button
            onClick={() => {
              if (confirm('Clear all local data? This will reset your local watchlist and settings.')) {
                localStorage.clear()
                window.location.reload()
              }
            }}
            className="w-full text-left p-4 bg-white/5 rounded-lg hover:bg-white/10 transition"
          >
            <p className="font-medium text-red-400">Clear Local Data</p>
            <p className="text-sm text-neutral-500">Reset watchlist, progress, and settings</p>
          </button>
        </div>
      </section>

      {/* Save Button */}
      <button
        onClick={saveSettings}
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-medium transition flex items-center justify-center gap-2"
      >
        {saved ? <><IconCheck size={18} /> Saved</> : 'Save Settings'}
      </button>
    </div>
  )
}
