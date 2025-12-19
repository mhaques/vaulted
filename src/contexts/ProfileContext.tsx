import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface Profile {
  id: string
  name: string
  avatar: string
  passcode: string
  settings: {
    realDebridKey?: string
    openSubtitlesKey?: string
  }
}

interface ProfileContextType {
  profiles: Profile[]
  currentProfile: Profile | null
  loading: boolean
  createProfile: (name: string, avatar: string, passcode: string) => void
  editProfile: (id: string, updates: Partial<Profile>) => void
  deleteProfile: (id: string) => void
  selectProfile: (id: string, passcode: string) => boolean
  lockProfile: () => void
  updateSettings: (settings: Partial<Profile['settings']>) => void
}

const ProfileContext = createContext<ProfileContextType | null>(null)

const STORAGE_KEY = 'vaulted_profiles'
const CURRENT_PROFILE_KEY = 'vaulted_current_profile'

const AVATAR_OPTIONS = [
  '🎬', '🎥', '📺', '🎭', '🎪', '🎨', '🎯', '🎮', '🎲', '🎰',
  '🌟', '⭐', '✨', '💫', '🌙', '☀️', '🌈', '🔥', '💎', '👑'
]

export { AVATAR_OPTIONS }

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Load profiles from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const loadedProfiles = JSON.parse(stored)
      setProfiles(loadedProfiles)
    }
    
    // Check if there's a current profile session
    const currentId = sessionStorage.getItem(CURRENT_PROFILE_KEY)
    if (currentId && stored) {
      const loadedProfiles = JSON.parse(stored)
      const profile = loadedProfiles.find((p: Profile) => p.id === currentId)
      if (profile) {
        setCurrentProfile(profile)
      }
    }
    
    setLoading(false)
  }, [])

  // Save profiles to localStorage whenever they change
  useEffect(() => {
    if (profiles.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
    }
  }, [profiles])

  const createProfile = (name: string, avatar: string, passcode: string) => {
    const newProfile: Profile = {
      id: `profile_${Date.now()}`,
      name,
      avatar,
      passcode,
      settings: {}
    }
    setProfiles([...profiles, newProfile])
  }

  const editProfile = (id: string, updates: Partial<Profile>) => {
    setProfiles(profiles.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ))
    // Update current profile if it's the one being edited
    if (currentProfile?.id === id) {
      setCurrentProfile({ ...currentProfile, ...updates })
    }
  }

  const deleteProfile = (id: string) => {
    setProfiles(profiles.filter(p => p.id !== id))
    if (currentProfile?.id === id) {
      setCurrentProfile(null)
      sessionStorage.removeItem(CURRENT_PROFILE_KEY)
    }
    // Clear profile-specific data
    localStorage.removeItem(`vaulted_watchlist_${id}`)
    localStorage.removeItem(`vaulted_progress_${id}`)
  }

  const selectProfile = (id: string, passcode: string): boolean => {
    const profile = profiles.find(p => p.id === id)
    if (profile && profile.passcode === passcode) {
      setCurrentProfile(profile)
      sessionStorage.setItem(CURRENT_PROFILE_KEY, id)
      return true
    }
    return false
  }

  const lockProfile = () => {
    setCurrentProfile(null)
    sessionStorage.removeItem(CURRENT_PROFILE_KEY)
  }

  const updateSettings = (settings: Partial<Profile['settings']>) => {
    if (!currentProfile) return
    const updatedProfile = {
      ...currentProfile,
      settings: { ...currentProfile.settings, ...settings }
    }
    setCurrentProfile(updatedProfile)
    setProfiles(profiles.map(p => 
      p.id === currentProfile.id ? updatedProfile : p
    ))
  }

  return (
    <ProfileContext.Provider value={{ 
      profiles, 
      currentProfile, 
      loading,
      createProfile, 
      editProfile, 
      deleteProfile, 
      selectProfile, 
      lockProfile,
      updateSettings
    }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}
