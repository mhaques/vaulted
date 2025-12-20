import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from './AuthContext'

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

const AVATAR_OPTIONS = [
  '🎬', '🎥', '📺', '🎭', '🎪', '🎨', '🎯', '🎮', '🎲', '🎰',
  '🌟', '⭐', '✨', '💫', '🌙', '☀️', '🌈', '🔥', '💎', '👑'
]

export { AVATAR_OPTIONS }

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Helper to get auth token
  const getToken = () => localStorage.getItem('vaulted_token')

  // Load profiles from API when user logs in
  useEffect(() => {
    async function loadProfiles() {
      if (!user) {
        setProfiles([])
        setCurrentProfile(null)
        setLoading(false)
        return
      }

      try {
        const token = getToken()
        const res = await fetch(`${API_URL}/api/profiles`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (res.ok) {
          const data = await res.json()
          setProfiles(data)
          
          // Check if there's a current profile in session
          const currentId = sessionStorage.getItem(CURRENT_PROFILE_KEY)
          if (currentId) {
            const profile = data.find((p: Profile) => p.id === currentId)
            if (profile) {
              setCurrentProfile(profile)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load profiles:', err)
      } finally {
        setLoading(false)
      }
    }

    loadProfiles()
  }, [user])

  const createProfile = async (name: string, avatar: string, passcode: string) => {
    // Validate passcode is numbers only
    if (!/^\d+$/.test(passcode)) {
      throw new Error('Passcode must contain only numbers')
    }
    
    const token = getToken()
    const res = await fetch(`${API_URL}/api/profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
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
    
    const token = getToken()
    const res = await fetch(`${API_URL}/api/profiles/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
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
    const token = getToken()
    const res = await fetch(`${API_URL}/api/profiles/${id}?currentProfileId=${currentProfile?.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to delete profile')
    }

    setProfiles(profiles.filter(p => p.id !== id))
    if (currentProfile?.id === id) {
      setCurrentProfile(null)
      sessionStorage.removeItem(CURRENT_PROFILE_KEY)
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
    const token = getToken()
    const res = await fetch(`${API_URL}/api/profiles/${id}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ passcode })
    })

    if (res.ok) {
      const profile = await res.json()
      const fullProfile = profiles.find(p => p.id === id)
      if (fullProfile) {
        setCurrentProfile({ ...fullProfile, ...profile })
        sessionStorage.setItem(CURRENT_PROFILE_KEY, id)
        return true
      }
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
