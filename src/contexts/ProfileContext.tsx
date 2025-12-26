import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3456'

export interface Profile {
  id: string
  name: string
  avatar: string
  passcode: string
  isAdmin: boolean
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
  deleteOwnProfile: (passcode: string) => boolean
  selectProfile: (id: string, passcode: string) => boolean
  lockProfile: () => void
  updateSettings: (settings: Partial<Profile['settings']>) => void
}

const ProfileContext = createContext<ProfileContextType | null>(null)

const CURRENT_PROFILE_KEY = 'vaulted_current_profile'
const PROFILE_AUTH_KEY = 'vaulted_profile_auth'

const AVATAR_OPTIONS = [
  '🎬', '🎥', '📺', '🎭', '🎪', '🎨', '🎯', '🎮', '🎲', '🎰',
  '🌟', '⭐', '✨', '💫', '🌙', '☀️', '🌈', '🔥', '💎', '👑'
]

export { AVATAR_OPTIONS }

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Load profiles from API on mount
  useEffect(() => {
    async function loadProfiles() {
      console.log('ProfileContext loadProfiles')
      try {
        const res = await fetch(`${API_URL}/api/profiles`)

        if (res.ok) {
          const data = await res.json()
          console.log('Loaded profiles:', data.length)
          setProfiles(data)
          
          // Check if there's a current profile in localStorage (persists across sessions)
          const currentId = localStorage.getItem(CURRENT_PROFILE_KEY)
          const authToken = localStorage.getItem(PROFILE_AUTH_KEY)
          if (currentId && authToken) {
            // Compare as strings since localStorage stores strings but DB returns numbers
            const profile = data.find((p: Profile) => String(p.id) === String(currentId))
            if (profile) {
              console.log('Restored profile from localStorage:', profile.name)
              setCurrentProfile(profile)
            } else {
              // Profile no longer exists, clear storage
              localStorage.removeItem(CURRENT_PROFILE_KEY)
              localStorage.removeItem(PROFILE_AUTH_KEY)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load profiles:', err)
      } finally {
        console.log('Setting loading to false')
        setLoading(false)
      }
    }

    loadProfiles()
  }, [])

  const createProfile = async (name: string, avatar: string, passcode: string) => {
    // Validate passcode is numbers only
    if (!/^\d+$/.test(passcode)) {
      throw new Error('Passcode must contain only numbers')
    }
    
    const res = await fetch(`${API_URL}/api/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, avatar, passcode })
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to create profile')
    }

    const newProfile = await res.json()
    setProfiles([...profiles, newProfile])
    return newProfile
  }

  const editProfile = async (id: string, updates: Partial<Profile>) => {
    // Validate passcode if being updated
    if (updates.passcode && !/^\d+$/.test(updates.passcode)) {
      throw new Error('Passcode must contain only numbers')
    }
    
    const res = await fetch(`${API_URL}/api/profiles/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to update profile')
    }

    const updated = await res.json()
    setProfiles(profiles.map(p => p.id === id ? updated : p))
    
    // Update current profile if it's the one being edited
    if (currentProfile?.id === id) {
      setCurrentProfile(updated)
    }
  }

  const deleteProfile = async (id: string) => {
    const res = await fetch(`${API_URL}/api/profiles/${id}?currentProfileId=${currentProfile?.id}`, {
      method: 'DELETE'
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to delete profile')
    }

    setProfiles(profiles.filter(p => p.id !== id))
    if (currentProfile?.id === id) {
      setCurrentProfile(null)
      localStorage.removeItem(CURRENT_PROFILE_KEY)
      localStorage.removeItem(PROFILE_AUTH_KEY)
    }
  }

  const deleteOwnProfile = async (passcode: string): Promise<boolean> => {
    if (!currentProfile) return false
    if (currentProfile.passcode !== passcode) return false
    
    try {
      await deleteProfile(currentProfile.id)
      return true
    } catch (err: any) {
      throw err
    }
  }

  const selectProfile = async (id: string, passcode: string): Promise<boolean> => {
    const res = await fetch(`${API_URL}/api/profiles/${id}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ passcode })
    })

    if (res.ok) {
      const profile = await res.json()
      const fullProfile = profiles.find(p => p.id === id)
      if (fullProfile) {
        setCurrentProfile({ ...fullProfile, ...profile })
        localStorage.setItem(CURRENT_PROFILE_KEY, id)
        localStorage.setItem(PROFILE_AUTH_KEY, 'authenticated')
        return true
      }
    }
    return false
  }

  const lockProfile = () => {
    setCurrentProfile(null)
    localStorage.removeItem(CURRENT_PROFILE_KEY)
    localStorage.removeItem(PROFILE_AUTH_KEY)
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
      deleteOwnProfile, 
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
