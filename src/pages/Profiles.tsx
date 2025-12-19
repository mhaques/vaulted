import { useState } from 'react'
import { useProfile, AVATAR_OPTIONS, Profile } from '../contexts/ProfileContext'
import { IconCheck, IconX, IconLoader, IconLock, IconTrash, IconEdit } from '../components/Icons'

export function Profiles() {
  const { profiles, createProfile, editProfile, deleteProfile, selectProfile } = useProfile()
  const [mode, setMode] = useState<'select' | 'create' | 'edit'>('select')
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0])
  const [passcode, setPasscode] = useState('')
  const [passcodeInput, setPasscodeInput] = useState('')
  const [error, setError] = useState('')
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)

  const handleCreateProfile = () => {
    if (!name.trim()) {
      setError('Please enter a name')
      return
    }
    if (passcode.length < 4) {
      setError('Passcode must be at least 4 characters')
      return
    }
    createProfile(name.trim(), avatar, passcode)
    setMode('select')
    setName('')
    setPasscode('')
    setError('')
  }

  const handleSelectProfile = (id: string) => {
    setSelectedProfileId(id)
    setPasscodeInput('')
    setError('')
  }

  const handleUnlockProfile = () => {
    if (!selectedProfileId) return
    const success = selectProfile(selectedProfileId, passcodeInput)
    if (!success) {
      setError('Incorrect passcode')
      setPasscodeInput('')
    }
  }

  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile)
    setName(profile.name)
    setAvatar(profile.avatar)
    setPasscode('')
    setMode('edit')
  }

  const handleSaveEdit = () => {
    if (!editingProfile) return
    if (!name.trim()) {
      setError('Please enter a name')
      return
    }
    const updates: Partial<Profile> = {
      name: name.trim(),
      avatar
    }
    if (passcode) {
      if (passcode.length < 4) {
        setError('Passcode must be at least 4 characters')
        return
      }
      updates.passcode = passcode
    }
    editProfile(editingProfile.id, updates)
    setMode('select')
    setEditingProfile(null)
    setName('')
    setPasscode('')
    setError('')
  }

  const handleDeleteProfile = (id: string) => {
    if (confirm('Are you sure you want to delete this profile? All saved data will be lost.')) {
      deleteProfile(id)
    }
  }

  if (selectedProfileId && mode === 'select') {
    const profile = profiles.find(p => p.id === selectedProfileId)
    if (!profile) return null

    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <button
            onClick={() => {
              setSelectedProfileId(null)
              setPasscodeInput('')
              setError('')
            }}
            className="mb-8 text-neutral-400 hover:text-white transition flex items-center gap-2"
          >
            ← Back
          </button>
          
          <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-2xl p-8 shadow-2xl">
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-5xl mb-4 shadow-xl">
                {profile.avatar}
              </div>
              <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  <IconLock size={14} className="inline mr-1" /> Enter Passcode
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUnlockProfile()}
                  placeholder="••••"
                  className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-2xl tracking-widest"
                  autoFocus
                  maxLength={10}
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleUnlockProfile}
                disabled={!passcodeInput}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-neutral-700 disabled:to-neutral-700 text-white font-medium py-3 rounded-xl transition shadow-lg disabled:cursor-not-allowed"
              >
                Unlock Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <button
            onClick={() => {
              setMode('select')
              setName('')
              setPasscode('')
              setError('')
              setEditingProfile(null)
            }}
            className="mb-8 text-neutral-400 hover:text-white transition flex items-center gap-2"
          >
            ← Cancel
          </button>

          <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">
              {mode === 'create' ? 'Create Profile' : 'Edit Profile'}
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-3">Choose Avatar</label>
                <div className="grid grid-cols-5 gap-3">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setAvatar(emoji)}
                      className={`aspect-square rounded-xl flex items-center justify-center text-3xl transition ${
                        avatar === emoji
                          ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg scale-110'
                          : 'bg-neutral-800/50 hover:bg-neutral-700/50'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">Profile Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name"
                  className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  maxLength={20}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  {mode === 'edit' ? 'New Passcode (leave empty to keep current)' : 'Passcode'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder={mode === 'edit' ? 'Leave empty to keep current' : 'Min 4 characters'}
                  className="w-full px-4 py-3 bg-neutral-800/50 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  maxLength={10}
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={mode === 'create' ? handleCreateProfile : handleSaveEdit}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-3 rounded-xl transition shadow-lg"
              >
                {mode === 'create' ? 'Create Profile' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <h1 className="text-5xl font-bold text-white text-center mb-4">
          Vaulted
        </h1>
        <p className="text-neutral-400 text-center mb-12">Who's watching?</p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          {profiles.map((profile) => (
            <div key={profile.id} className="group relative">
              <button
                onClick={() => handleSelectProfile(profile.id)}
                className="w-full aspect-square rounded-2xl bg-neutral-900/50 hover:bg-neutral-800/50 border-2 border-neutral-800 hover:border-indigo-500 transition flex flex-col items-center justify-center p-6 shadow-xl hover:shadow-2xl hover:scale-105"
              >
                <div className="text-6xl mb-3">{profile.avatar}</div>
                <span className="text-white font-medium text-lg">{profile.name}</span>
              </button>
              
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditProfile(profile)
                  }}
                  className="p-2 bg-neutral-800/90 hover:bg-indigo-600 rounded-lg transition"
                  title="Edit profile"
                >
                  <IconEdit size={16} className="text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteProfile(profile.id)
                  }}
                  className="p-2 bg-neutral-800/90 hover:bg-red-600 rounded-lg transition"
                  title="Delete profile"
                >
                  <IconTrash size={16} className="text-white" />
                </button>
              </div>
            </div>
          ))}

          {profiles.length < 8 && (
            <button
              onClick={() => setMode('create')}
              className="aspect-square rounded-2xl bg-neutral-900/30 hover:bg-neutral-800/50 border-2 border-dashed border-neutral-700 hover:border-indigo-500 transition flex flex-col items-center justify-center p-6 shadow-xl hover:shadow-2xl hover:scale-105"
            >
              <div className="text-5xl mb-3 text-neutral-600">+</div>
              <span className="text-neutral-400 font-medium">Add Profile</span>
            </button>
          )}
        </div>

        <div className="text-center text-neutral-500 text-sm">
          <IconLock size={14} className="inline mr-1" /> Each profile is protected with a passcode
        </div>
      </div>
    </div>
  )
}
