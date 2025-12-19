import { useEffect, useRef, useState, useCallback } from 'react'
import { searchSubtitles, getSubtitleDownloadUrl, getProxiedSubtitleUrl, getOpenSubtitlesApiKey, type Subtitle } from '../services/subtitles'
import { 
  IconPlay, IconPause, IconSettings, IconClock, IconSubtitles, IconSliders, 
  IconPip, IconPhone, IconMaximize, IconMinimize, IconX, IconCheck, 
  IconChevronLeft, IconLoader, IconVolume, IconVolumeLow, IconVolumeMute,
  IconSkipBack, IconSkipForward
} from './Icons'

interface SubtitleTrack {
  id: string
  label: string
  language: string
  src: string
}

interface VideoPlayerProps {
  src: string
  title?: string
  onProgress?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  onError?: () => void
  onClose?: () => void
  onChangeSource?: () => void
  startTime?: number
  poster?: string
  subtitles?: SubtitleTrack[]
  imdbId?: string
  season?: number
  episode?: number
}

export function VideoPlayer({
  src,
  title,
  onProgress,
  onEnded,
  onError,
  onClose,
  onChangeSource,
  startTime = 0,
  poster,
  subtitles: initialSubtitles = [],
  imdbId,
  season,
  episode
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('vaulted_volume')
    return saved ? parseFloat(saved) : 1
  })
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [buffered, setBuffered] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'main' | 'speed' | 'subtitles' | 'subtitle-settings' | 'audio'>('main')
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null)
  const [audioTracks, setAudioTracks] = useState<{ id: number; label: string; language: string }[]>([])
  const [activeAudioTrack, setActiveAudioTrack] = useState<number>(0)
  const [subtitleSize, setSubtitleSize] = useState(() => {
    const saved = localStorage.getItem('vaulted_subtitle_size')
    return saved ? parseInt(saved) : 100
  })
  const [subtitleBackground, setSubtitleBackground] = useState(() => {
    return localStorage.getItem('vaulted_subtitle_bg') !== 'false'
  })
  const [availableSubtitles, setAvailableSubtitles] = useState<(Subtitle & { fileId?: number })[]>([])
  const [subtitlesLoading, setSubtitlesLoading] = useState(false)
  const [loadedSubtitleUrl, setLoadedSubtitleUrl] = useState<string | null>(null)
  const controlsTimeoutRef = useRef<number>()
  const progressIntervalRef = useRef<number>()
  const lastTapRef = useRef<{ time: number; side: 'left' | 'right' | null }>({ time: 0, side: null })
  const [skipIndicator, setSkipIndicator] = useState<{ show: boolean; side: 'left' | 'right'; amount: number }>({ show: false, side: 'left', amount: 0 })

  // Fetch subtitles from OpenSubtitles
  useEffect(() => {
    console.log('Subtitle fetch check - imdbId:', imdbId)
    
    if (!imdbId) {
      console.log('No IMDB ID provided, skipping subtitle fetch')
      return
    }
    
    console.log('Fetching subtitles for IMDB:', imdbId, 'Season:', season, 'Episode:', episode)
    setSubtitlesLoading(true)
    searchSubtitles(imdbId, season, episode, ['en', 'es', 'fr', 'de', 'pt', 'it'])
      .then(subs => {
        console.log('Found subtitles:', subs.length, subs)
        setAvailableSubtitles(subs as (Subtitle & { fileId?: number })[])
      })
      .catch(err => console.error('Subtitle fetch error:', err))
      .finally(() => setSubtitlesLoading(false))
  }, [imdbId, season, episode])

  // Enable text track when subtitle is loaded
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    
    // Disable all tracks first
    for (let i = 0; i < video.textTracks.length; i++) {
      video.textTracks[i].mode = 'hidden'
    }
    
    // Enable the active track if we have a loaded subtitle
    if (loadedSubtitleUrl && activeSubtitle) {
      // Wait for track to load
      const enableTrack = () => {
        for (let i = 0; i < video.textTracks.length; i++) {
          const track = video.textTracks[i]
          if (track.label === 'Subtitles') {
            track.mode = 'showing'
            console.log('Enabled subtitle track')
            break
          }
        }
      }
      
      // Try immediately and after a delay (track may not be loaded yet)
      enableTrack()
      const timeout = setTimeout(enableTrack, 500)
      return () => clearTimeout(timeout)
    }
  }, [loadedSubtitleUrl, activeSubtitle])

  // Hide sidebar when player mounts
  useEffect(() => {
    document.body.classList.add('video-player-active')
    return () => {
      document.body.classList.remove('video-player-active')
    }
  }, [])

  // Save volume preference
  useEffect(() => {
    localStorage.setItem('vaulted_volume', String(volume))
  }, [volume])

  // Initialize video
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setIsLoading(false)
      if (startTime > 0 && startTime < video.duration) {
        video.currentTime = startTime
      }
      // Auto-play when ready
      video.play().catch(err => {
        console.log('Auto-play prevented:', err)
      })
    }

    const handleCanPlay = () => {
      setIsLoading(false)
    }

    const handleWaiting = () => {
      setIsLoading(true)
    }

    const handlePlaying = () => {
      setIsLoading(false)
      setIsPlaying(true)
    }

    const handlePause = () => {
      setIsPlaying(false)
    }

    const handlePlay = () => {
      setIsPlaying(true)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1))
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }

    const handleError = (e: Event) => {
      const videoEl = e.target as HTMLVideoElement
      console.error('Video error:', videoEl.error?.code, videoEl.error?.message)
      setError(`Failed to load video: ${videoEl.error?.message || 'Unknown error'}`)
      setIsLoading(false)
      onError?.()
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('pause', handlePause)
    video.addEventListener('play', handlePlay)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('progress', handleProgress)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('error', handleError)
    }
  }, [startTime, onEnded, onError])

  // Track progress periodically
  useEffect(() => {
    if (isPlaying && onProgress) {
      progressIntervalRef.current = window.setInterval(() => {
        if (videoRef.current) {
          onProgress(videoRef.current.currentTime, videoRef.current.duration)
        }
      }, 5000) // Save progress every 5 seconds
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [isPlaying, onProgress])

  // Auto-hide controls
  useEffect(() => {
    const hideControls = () => {
      if (isPlaying && !showSettings) setShowControls(false)
    }

    if (showControls && isPlaying && !showSettings) {
      controlsTimeoutRef.current = window.setTimeout(hideControls, 3000)
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [showControls, isPlaying, showSettings])

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Enable/disable subtitle track
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    
    // Wait for tracks to be available
    const enableTrack = () => {
      const tracks = video.textTracks
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i]
        track.mode = activeSubtitle && loadedSubtitleUrl ? 'showing' : 'hidden'
      }
    }
    
    enableTrack()
    video.textTracks.addEventListener('addtrack', enableTrack)
    return () => video.textTracks.removeEventListener('addtrack', enableTrack)
  }, [activeSubtitle, loadedSubtitleUrl])

  // Define callbacks before they're used in keyboard controls
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
  }, [isPlaying])

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await containerRef.current.requestFullscreen()
    }
  }, [])

  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else {
        await videoRef.current.requestPictureInPicture()
      }
    } catch (err) {
      console.error('PiP error:', err)
    }
  }, [])

  // Handle double-tap/key to skip (defined before keyboard controls that use it)
  const handleDoubleTap = useCallback((side: 'left' | 'right') => {
    if (!videoRef.current) return
    const skipAmount = 10
    if (side === 'left') {
      videoRef.current.currentTime -= skipAmount
    } else {
      videoRef.current.currentTime += skipAmount
    }
    // Show skip indicator
    setSkipIndicator(prev => ({
      show: true,
      side,
      amount: prev.side === side && prev.show ? prev.amount + skipAmount : skipAmount
    }))
    // Hide after animation
    setTimeout(() => setSkipIndicator(prev => ({ ...prev, show: false, amount: 0 })), 800)
  }, [])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return
      
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
        case 'j':
          e.preventDefault()
          handleDoubleTap('left')
          break
        case 'ArrowRight':
        case 'l':
          e.preventDefault()
          handleDoubleTap('right')
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume(v => Math.min(1, v + 0.1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume(v => Math.max(0, v - 0.1))
          break
        case 'f':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'm':
          e.preventDefault()
          setIsMuted(m => !m)
          break
        case 'c':
          e.preventDefault()
          // Toggle subtitles
          if (activeSubtitle) {
            setActiveSubtitle(null)
            setLoadedSubtitleUrl(null)
          } else if (availableSubtitles.length > 0) {
            // Auto-load first subtitle
            const firstSub = availableSubtitles[0] as any
            setActiveSubtitle(firstSub.id)
            if (firstSub.fileId) {
              getSubtitleDownloadUrl(firstSub.fileId).then(url => {
                if (url) setLoadedSubtitleUrl(getProxiedSubtitleUrl(url))
              })
            }
          }
          break
        case 'Escape':
          if (showSettings) {
            setShowSettings(false)
          } else if (!document.fullscreenElement) {
            onClose?.()
          }
          break
        case ',':
          e.preventDefault()
          setPlaybackSpeed(s => Math.max(0.25, s - 0.25))
          break
        case '.':
          e.preventDefault()
          setPlaybackSpeed(s => Math.min(2, s + 0.25))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, showSettings, activeSubtitle, availableSubtitles, handleDoubleTap, togglePlay, toggleFullscreen])

  // Apply playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed
    }
  }, [playbackSpeed])

  // Update video volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume
      videoRef.current.muted = isMuted
    }
  }, [volume, isMuted])

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    videoRef.current.currentTime = percent * duration
  }

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleVideoAreaClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.settings-menu') || 
        (e.target as HTMLElement).closest('button') ||
        (e.target as HTMLElement).closest('.controls-area')) {
      return
    }
    
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const isLeftSide = clickX < rect.width / 3
    const isRightSide = clickX > (rect.width * 2) / 3
    const side = isLeftSide ? 'left' : isRightSide ? 'right' : null
    
    const now = Date.now()
    const timeSinceLastTap = now - lastTapRef.current.time
    
    // Double tap detection (within 300ms, same side)
    if (timeSinceLastTap < 300 && side && (lastTapRef.current.side === side || lastTapRef.current.side === null)) {
      handleDoubleTap(side)
      lastTapRef.current = { time: 0, side: null }
    } else {
      // Single tap - toggle play/pause (with delay to check for double tap)
      lastTapRef.current = { time: now, side }
      if (!side) {
        // Center tap - immediate play/pause
        togglePlay()
      } else {
        // Side tap - wait to see if it's a double tap
        setTimeout(() => {
          if (Date.now() - lastTapRef.current.time >= 290) {
            togglePlay()
          }
        }, 300)
      }
    }
  }, [handleDoubleTap, togglePlay])

  const handleMouseMove = () => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
  }

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

  // Settings menu component
  const SettingsMenu = () => (
    <div className="w-72 bg-black/95 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden shadow-2xl">
      {settingsTab === 'main' && (
        <div className="divide-y divide-white/5">
          <button
            onClick={() => setSettingsTab('speed')}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition"
          >
            <div className="flex items-center gap-3">
              <IconClock size={18} />
              <span>Playback Speed</span>
            </div>
            <span className="text-neutral-400">{playbackSpeed}x →</span>
          </button>
          
          <button
            onClick={() => setSettingsTab('subtitles')}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition"
          >
            <div className="flex items-center gap-3">
              <IconSubtitles size={18} />
              <span>Subtitles</span>
            </div>
            <span className="text-neutral-400">{activeSubtitle ? 'On' : 'Off'} →</span>
          </button>
          
          <button
            onClick={() => setSettingsTab('subtitle-settings')}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition"
          >
            <div className="flex items-center gap-3">
              <IconSliders size={18} />
              <span>Subtitle Settings</span>
            </div>
            <span className="text-neutral-400">→</span>
          </button>
          
          {audioTracks.length > 1 && (
            <button
              onClick={() => setSettingsTab('audio')}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-3">
                <IconVolume size={18} />
                <span>Audio Track</span>
              </div>
              <span className="text-neutral-400">{audioTracks[activeAudioTrack]?.label || 'Default'} →</span>
            </button>
          )}
          
          <button
            onClick={togglePiP}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition"
          >
            <div className="flex items-center gap-3">
              <IconPip size={18} />
              <span>Picture-in-Picture</span>
            </div>
          </button>
          
          <button
            onClick={() => {
              // Open in native player (works on iOS/Android)
              window.open(src, '_blank')
            }}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition"
          >
            <div className="flex items-center gap-3">
              <IconPhone size={18} />
              <span>Open in Native Player</span>
            </div>
          </button>
        </div>
      )}
      
      {settingsTab === 'speed' && (
        <div>
          <button
            onClick={() => setSettingsTab('main')}
            className="w-full flex items-center gap-2 p-4 border-b border-white/5 hover:bg-white/5"
          >
            <IconChevronLeft size={18} />
            <span className="font-medium">Playback Speed</span>
          </button>
          <div className="max-h-64 overflow-auto">
            {speedOptions.map(speed => (
              <button
                key={speed}
                onClick={() => {
                  setPlaybackSpeed(speed)
                  setSettingsTab('main')
                }}
                className={`w-full flex items-center justify-between p-3 hover:bg-white/10 transition cursor-pointer ${
                  playbackSpeed === speed ? 'text-indigo-400 bg-white/5' : 'text-white'
                }`}
              >
                <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
                {playbackSpeed === speed && <IconCheck size={18} />}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {settingsTab === 'subtitles' && (
        <div>
          <button
            onClick={() => setSettingsTab('main')}
            className="w-full flex items-center gap-2 p-4 border-b border-white/5 hover:bg-white/5"
          >
            <IconChevronLeft size={18} />
            <span className="font-medium">Subtitles</span>
          </button>
          <div className="max-h-64 overflow-auto">
            <button
              onClick={() => {
                setActiveSubtitle(null)
                setLoadedSubtitleUrl(null)
                setSettingsTab('main')
              }}
              className={`w-full flex items-center justify-between p-3 hover:bg-white/10 transition cursor-pointer ${
                !activeSubtitle ? 'text-indigo-400 bg-white/5' : 'text-white'
              }`}
            >
              <span>Off</span>
              {!activeSubtitle && <IconCheck size={18} />}
            </button>
            
            {subtitlesLoading ? (
              <div className="p-4 text-center text-neutral-400 text-sm flex items-center justify-center gap-2">
                <IconLoader size={16} />
                Loading subtitles...
              </div>
            ) : availableSubtitles.length > 0 ? (
              availableSubtitles.map(sub => (
                <button
                  key={sub.id}
                  onClick={async () => {
                    setActiveSubtitle(sub.id)
                    // Fetch the download URL and load the subtitle
                    if ((sub as any).fileId) {
                      console.log('Fetching subtitle download URL for fileId:', (sub as any).fileId)
                      const downloadUrl = await getSubtitleDownloadUrl((sub as any).fileId)
                      console.log('Subtitle download URL:', downloadUrl)
                      if (downloadUrl) {
                        const proxiedUrl = getProxiedSubtitleUrl(downloadUrl)
                        console.log('Proxied subtitle URL:', proxiedUrl)
                        setLoadedSubtitleUrl(proxiedUrl)
                      }
                    }
                    setSettingsTab('main')
                  }}
                  className={`w-full flex items-center justify-between p-3 hover:bg-white/10 transition cursor-pointer ${
                    activeSubtitle === sub.id ? 'text-indigo-400 bg-white/5' : 'text-white'
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span>{sub.label}</span>
                    <span className="text-xs text-neutral-500">{sub.downloads?.toLocaleString()} downloads</span>
                  </div>
                  {activeSubtitle === sub.id && <IconCheck size={18} />}
                </button>
              ))
            ) : !getOpenSubtitlesApiKey() ? (
              <div className="p-4 text-center text-neutral-500 text-sm">
                <p className="mb-2">OpenSubtitles API key required</p>
                <p className="text-xs">Get a free API key at:</p>
                <a 
                  href="https://www.opensubtitles.com/consumers" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-400 text-xs hover:underline"
                >
                  opensubtitles.com/consumers
                </a>
                <p className="text-xs mt-2">Then add it in Settings → Subtitles</p>
              </div>
            ) : (
              <div className="p-4 text-center text-neutral-500 text-sm">
                No subtitles found for this video
              </div>
            )}
          </div>
        </div>
      )}
      
      {settingsTab === 'audio' && (
        <div>
          <button
            onClick={() => setSettingsTab('main')}
            className="w-full flex items-center gap-2 p-4 border-b border-white/5 hover:bg-white/5"
          >
            <IconChevronLeft size={18} />
            <span className="font-medium">Audio Track</span>
          </button>
          <div className="max-h-64 overflow-auto">
            {audioTracks.map((track) => (
              <button
                key={track.id}
                onClick={() => {
                  const video = videoRef.current
                  if (!video || !video.audioTracks) return
                  
                  // Disable all tracks
                  for (let i = 0; i < video.audioTracks.length; i++) {
                    video.audioTracks[i].enabled = false
                  }
                  // Enable selected track
                  video.audioTracks[track.id].enabled = true
                  setActiveAudioTrack(track.id)
                  console.log('[VideoPlayer] Switched to audio track:', track.label, track.language)
                  setSettingsTab('main')
                }}
                className={`w-full flex items-center justify-between p-3 hover:bg-white/10 transition cursor-pointer ${
                  activeAudioTrack === track.id ? 'text-indigo-400 bg-white/5' : 'text-white'
                }`}
              >
                <div className="flex flex-col items-start">
                  <span>{track.label}</span>
                  <span className="text-xs text-neutral-500">{track.language}</span>
                </div>
                {activeAudioTrack === track.id && <IconCheck size={18} />}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {settingsTab === 'subtitle-settings' && (
        <div>
          <button
            onClick={() => setSettingsTab('main')}
            className="w-full flex items-center gap-2 p-4 border-b border-white/5 hover:bg-white/5"
          >
            <IconChevronLeft size={18} />
            <span className="font-medium">Subtitle Settings</span>
          </button>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-2">Size</label>
              <div className="flex gap-2">
                {[75, 100, 125, 150].map(size => (
                  <button
                    key={size}
                    onClick={() => {
                      setSubtitleSize(size)
                      localStorage.setItem('vaulted_subtitle_size', String(size))
                    }}
                    className={`flex-1 py-2 rounded text-sm transition ${
                      subtitleSize === size
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {size}%
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-neutral-400 mb-2">Background</label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSubtitleBackground(true)
                    localStorage.setItem('vaulted_subtitle_bg', 'true')
                  }}
                  className={`flex-1 py-2 rounded text-sm transition ${
                    subtitleBackground
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  On
                </button>
                <button
                  onClick={() => {
                    setSubtitleBackground(false)
                    localStorage.setItem('vaulted_subtitle_bg', 'false')
                  }}
                  className={`flex-1 py-2 rounded text-sm transition ${
                    !subtitleBackground
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  Off
                </button>
              </div>
            </div>
            
            <div className="pt-2 border-t border-white/10">
              <p className="text-xs text-neutral-500 text-center">
                Preview: <span style={{ 
                  fontSize: `${subtitleSize}%`,
                  background: subtitleBackground ? 'rgba(0,0,0,0.8)' : 'transparent',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>Sample subtitle text</span>
              </p>
            </div>
            
            <div className="pt-3 mt-2 border-t border-white/10">
              <p className="text-xs text-neutral-500 text-center">
                💡 If subtitles are out of sync, try a different subtitle from the list - timing varies by video release.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  if (error) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-6xl mb-6">⚠️</p>
          <p className="text-red-400 text-lg mb-2">Playback Error</p>
          <p className="text-neutral-500 mb-6 max-w-md">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.open(src, '_blank')}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg transition"
            >
              Open in New Tab
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-white/10 rounded-lg hover:bg-white/20 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Dynamic subtitle styling */}
      <style>{`
        video::cue {
          font-size: ${subtitleSize}%;
          background: ${subtitleBackground ? 'rgba(0, 0, 0, 0.8)' : 'transparent'};
          color: white;
          text-shadow: ${subtitleBackground ? 'none' : '2px 2px 4px rgba(0,0,0,0.9), -1px -1px 2px rgba(0,0,0,0.9)'};
          padding: 4px 8px;
        }
      `}</style>
      <div
        ref={containerRef}
        className="relative w-full h-full group"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && !showSettings && setShowControls(false)}
        onClick={(e) => {
          if (showSettings && !(e.target as HTMLElement).closest('.settings-menu')) {
            setShowSettings(false)
          }
        }}
      >
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="w-full h-full object-contain"
          playsInline
          crossOrigin="anonymous"
        >
          {/* Loaded subtitle from OpenSubtitles */}
          {loadedSubtitleUrl && activeSubtitle && (
            <track
              key={activeSubtitle}
              kind="subtitles"
              src={loadedSubtitleUrl}
              srcLang="en"
              label="Subtitles"
              default
            />
          )}
          {/* Initial subtitles passed as props */}
          {initialSubtitles.map(sub => (
            <track
              key={sub.id}
              kind="subtitles"
              src={sub.src}
              srcLang={sub.language}
              label={sub.label}
            />
          ))}
        </video>

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" />
              <p className="text-neutral-400">Loading video...</p>
            </div>
          </div>
        )}

        {/* Close button - always visible at top left */}
        {onClose && (
          <button 
            onClick={onClose} 
            className={`absolute top-4 left-4 z-50 bg-black/60 hover:bg-black/80 text-white hover:text-red-400 transition p-3 rounded-full backdrop-blur-sm ${showControls ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
            title="Close (Esc)"
          >
            <IconX size={28} />
          </button>
        )}

        {/* Source selection button - top right */}
        {onChangeSource && (
          <button 
            onClick={onChangeSource} 
            className={`absolute top-4 right-4 z-50 bg-black/60 hover:bg-black/80 text-white hover:text-indigo-400 transition px-4 py-2 rounded-full backdrop-blur-sm text-sm font-medium flex items-center gap-2 ${showControls ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
            title="Change Source"
          >
            <IconSettings size={16} />
            Sources
          </button>
        )}

        {/* Double-tap skip indicators */}
        {skipIndicator.show && (
          <div 
            className={`absolute top-1/2 -translate-y-1/2 z-30 pointer-events-none animate-pulse ${
              skipIndicator.side === 'left' ? 'left-16' : 'right-16'
            }`}
          >
            <div className="flex flex-col items-center gap-1 text-white">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                {skipIndicator.side === 'left' ? <IconSkipBack size={28} /> : <IconSkipForward size={28} />}
              </div>
              <span className="text-sm font-medium">{skipIndicator.amount}s</span>
            </div>
          </div>
        )}

        {/* Click overlay for play/pause and double-tap skip */}
        <div 
          className="absolute inset-0 cursor-pointer z-10"
          onClick={handleVideoAreaClick}
        />

        {/* Play/Pause overlay icon */}
        {!isPlaying && !isLoading && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-20"
          >
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <IconPlay size={36} className="ml-1" />
            </div>
          </div>
        )}

        {/* Settings menu - higher z-index than click overlay */}
        {showSettings && (
          <div 
            className="settings-menu absolute bottom-20 right-4 z-[60]"
            onClick={(e) => e.stopPropagation()}
          >
            <SettingsMenu />
          </div>
        )}

        {/* Controls */}
        <div
          className={`controls-area absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-20 transition-opacity duration-300 z-30 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Title */}
          {title && (
            <div className="mb-4">
              <h2 className="text-lg font-medium truncate">{title}</h2>
            </div>
          )}

          {/* Progress bar */}
          <div
            className="h-1.5 bg-white/20 rounded-full mb-4 cursor-pointer group/progress relative"
            onClick={seek}
          >
            {/* Buffered */}
            <div
              className="h-full bg-white/30 rounded-full absolute top-0 left-0"
              style={{ width: `${(buffered / duration) * 100}%` }}
            />
            {/* Progress */}
            <div
              className="h-full bg-indigo-500 rounded-full relative"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition shadow-lg" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button onClick={togglePlay} className="hover:text-indigo-400 transition p-2">
                {isPlaying ? <IconPause size={24} /> : <IconPlay size={24} />}
              </button>

              {/* Skip buttons */}
              <button 
                onClick={() => videoRef.current && (videoRef.current.currentTime -= 10)}
                className="hover:text-indigo-400 transition p-2 text-sm flex items-center gap-1"
                title="Rewind 10s (J)"
              >
                <IconSkipBack size={16} />
                <span className="text-xs">10</span>
              </button>
              <button 
                onClick={() => videoRef.current && (videoRef.current.currentTime += 10)}
                className="hover:text-indigo-400 transition p-2 text-sm flex items-center gap-1"
                title="Forward 10s (L)"
              >
                <span className="text-xs">10</span>
                <IconSkipForward size={16} />
              </button>

              {/* Volume */}
              <div className="flex items-center group/vol">
                <button onClick={() => setIsMuted(m => !m)} className="hover:text-indigo-400 transition p-2">
                  {isMuted || volume === 0 ? <IconVolumeMute size={20} /> : volume < 0.5 ? <IconVolumeLow size={20} /> : <IconVolume size={20} />}
                </button>
                <div className="overflow-hidden w-0 group-hover/vol:w-20 transition-all duration-200">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value))
                      setIsMuted(false)
                    }}
                    className="w-20 accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Time */}
              <span className="text-sm text-neutral-300 tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Speed indicator */}
              {playbackSpeed !== 1 && (
                <span className="text-xs bg-indigo-500/30 text-indigo-300 px-2 py-1 rounded">
                  {playbackSpeed}x
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Subtitles toggle */}
              <button 
                onClick={() => {
                  // Open settings subtitles tab to show available options
                  setShowSettings(true)
                  setSettingsTab('subtitles')
                }}
                className={`hover:text-indigo-400 transition p-2 ${activeSubtitle ? 'text-indigo-400' : ''}`}
                title="Subtitles (C)"
              >
                <IconSubtitles size={20} />
              </button>

              {/* Settings */}
              <button 
                onClick={() => {
                  setShowSettings(!showSettings)
                  setSettingsTab('main')
                }}
                className={`hover:text-indigo-400 transition p-2 ${showSettings ? 'text-indigo-400' : ''}`}
                title="Settings"
              >
                <IconSettings size={20} />
              </button>

              {/* PiP */}
              <button 
                onClick={togglePiP}
                className="hover:text-indigo-400 transition p-2 hidden md:block"
                title="Picture-in-Picture"
              >
                <IconPip size={20} />
              </button>

              {/* Fullscreen */}
              <button 
                onClick={toggleFullscreen} 
                className="hover:text-indigo-400 transition p-2"
                title="Fullscreen (F)"
              >
                {isFullscreen ? <IconMinimize size={20} /> : <IconMaximize size={20} />}
              </button>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
