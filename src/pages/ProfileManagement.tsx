import { useState } from 'react'
import { useProfile, AVATAR_OPTIONS, Profile } from '../contexts/ProfileContext'
import { IconCheck, IconX, IconLoader, IconLock, IconTrash, IconEdit, IconPlus } from '../components/Icons'

export function ProfileManagement() {
  const { profiles, currentProfile, createProfile, editProfile, deleteProfile } = useProfile()
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATAR_OPTIONS[0])
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')

  const handleCreateProfile = async () => {
    if (!name.trim()) {
      setError('Please enter a name')
      return
    }
    if (passcode.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }
    if (!/^\d+$/.test(passcode)) {
      setError('PIN must contain only numbers')
      return
    }
    try {
      await createProfile(name.trim(), avatar, passcode)
      setMode('list')
      setName('')
      setPasscode('')
      setAvatar(AVATAR_OPTIONS[0])
      setError('')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleEditProfile = (profile: Profile) => {
    setEditingProfile(profile)
    setName(profile.name)
    setAvatar(profile.avatar)
    setPasscode('')
    setMode('edit')
  }

  const handleSaveEdit = async () => {
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
        setError('PIN must be at least 4 digits')
        return
      }
      if (!/^\d+$/.test(passcode)) {
        setError('PIN must contain only numbers')
        return
      }
      updates.passcode = passcode
    }
    try {
      await editProfile(editingProfile.id, updates)
      setMode('list')
      setEditingProfile(null)
      setName('')
      setPasscode('')
      setAvatar(AVATAR_OPTIONS[0])
      setError('')
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDeleteProfile = async (id: string) => {
    const profileToDelete = profiles.find(p => p.id === id)
    if (!profileToDelete) return
    
    // Only admin can delete other profiles
    if (!currentProfile?.isAdmin && id !== currentProfile?.id) {
      setError('Only admin can delete other profiles')
      setTimeout(() => setError(''), 3000)
      return
    }
    
    if (confirm(`Are you sure you want to delete ${profileToDelete.name}'s profile? All saved data will be lost.`)) {
      try {
        await deleteProfile(id)
      } catch (err: any) {
        setError(err.message)
        setTimeout(() => setError(''), 3000)
      }
    }
  }

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => {
              setMode('list')
              setName('')
              setPasscode('')
              setAvatar(AVATAR_OPTIONS[0])
              setError('')
              setEditingProfile(null)
            }}
            className="mb-8 text-neutral-400 hover:text-white transition flex items-center gap-2"
          >
            ← Back to Management
          </button>

          <div className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-3xl font-bold text-white mb-6">
              {mode === 'create' ? 'Create New Profile' : `Edit ${editingProfile?.name}'s Profile`}
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
                  {mode === 'edit' ? 'New PIN (leave empty to keep current)' : 'PIN (numbers only)'}
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
                  placeholder={mode === 'edit' ? 'Leave empty to keep current' : 'Min 4 digits'}
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
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Profile Management</h1>
          <p className="text-neutral-400">Manage profiles for your family</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {currentProfile?.isAdmin && profiles.length < 8 && (
          <button
            onClick={() => setMode('create')}
            className="mb-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl transition shadow-lg flex items-center gap-2"
          >
            <IconPlus size={20} />
            Create New Profile
          </button>
        )}

        <div className="grid gap-4">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="bg-neutral-900/50 backdrop-blur-xl border border-neutral-800 rounded-2xl p-6 shadow-xl flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="text-5xl">{profile.avatar}</div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white">{profile.name}</h3>
                    {profile.isAdmin && (
                      <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full border border-yellow-500/30">
                        Admin
                      </span>
                    )}
                    {profile.id === currentProfile?.id && (
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30">
                        Current Profile
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-400 mt-1">
                    <IconLock size={12} className="inline mr-1" />
                    Protected with PIN
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEditProfile(profile)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-indigo-600 text-white rounded-lg transition flex items-center gap-2"
                  title="Edit profile"
                >
                  <IconEdit size={16} />
                  <span className="hidden sm:inline">Edit</span>
                </button>

                {(currentProfile?.isAdmin || profile.id === currentProfile?.id) && (
                  <button
                    onClick={() => handleDeleteProfile(profile.id)}
                    className="px-4 py-2 bg-neutral-800 hover:bg-red-600 text-white rounded-lg transition flex items-center gap-2"
                    title="Delete profile"
                  >
                    <IconTrash size={16} />
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {profiles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-neutral-500">No profiles found</p>
          </div>
        )}
      </div>
    </div>
  )
}
