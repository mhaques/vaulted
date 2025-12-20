import { FastifyInstance } from 'fastify'
import db from '../db.js'

export default async function profileRoutes(fastify: FastifyInstance) {
  // Get all profiles
  fastify.get('/profiles', async (request, reply) => {
    const profiles = db.prepare(`
      SELECT id, name, avatar, passcode, is_admin as isAdmin, created_at as createdAt
      FROM profiles
      ORDER BY created_at ASC
    `).all()

    return profiles
  })

  // Create a new profile
  fastify.post<{
    Body: { name: string; avatar: string; passcode: string }
  }>('/profiles', async (request, reply) => {
    const { name, avatar, passcode } = request.body

    if (!name || !avatar || !passcode) {
      return reply.code(400).send({ error: 'Missing required fields' })
    }

    if (!/^\d+$/.test(passcode)) {
      return reply.code(400).send({ error: 'PIN must contain only numbers' })
    }

    if (passcode.length < 4) {
      return reply.code(400).send({ error: 'PIN must be at least 4 digits' })
    }

    // Check if this is the first profile globally
    const existingProfiles = db.prepare('SELECT COUNT(*) as count FROM profiles').get() as { count: number }
    const isFirstProfile = existingProfiles.count === 0

    // Check profile limit (max 8)
    if (existingProfiles.count >= 8) {
      return reply.code(400).send({ error: 'Maximum 8 profiles allowed' })
    }

    const result = db.prepare(`
      INSERT INTO profiles (name, avatar, passcode, is_admin)
      VALUES (?, ?, ?, ?)
    `).run(name, avatar, passcode, isFirstProfile ? 1 : 0)

    const profile = db.prepare(`
      SELECT id, name, avatar, passcode, is_admin as isAdmin, created_at as createdAt
      FROM profiles
      WHERE id = ?
    `).get(result.lastInsertRowid)

    return profile
  })

  // Update a profile
  fastify.patch<{
    Params: { id: string }
    Body: { name?: string; avatar?: string; passcode?: string }
  }>('/profiles/:id', async (request, reply) => {
    const profileId = parseInt(request.params.id)
    const { name, avatar, passcode } = request.body

    // Check if profile exists
    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(profileId)
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' })
    }

    if (passcode && !/^\d+$/.test(passcode)) {
      return reply.code(400).send({ error: 'PIN must contain only numbers' })
    }

    if (passcode && passcode.length < 4) {
      return reply.code(400).send({ error: 'PIN must be at least 4 digits' })
    }

    const updates: string[] = []
    const values: any[] = []

    if (name !== undefined) {
      updates.push('name = ?')
      values.push(name)
    }
    if (avatar !== undefined) {
      updates.push('avatar = ?')
      values.push(avatar)
    }
    if (passcode !== undefined) {
      updates.push('passcode = ?')
      values.push(passcode)
    }

    if (updates.length === 0) {
      return reply.code(400).send({ error: 'No fields to update' })
    }

    values.push(profileId)

    db.prepare(`
      UPDATE profiles
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values)

    const updated = db.prepare(`
      SELECT id, name, avatar, passcode, is_admin as isAdmin, created_at as createdAt
      FROM profiles
      WHERE id = ?
    `).get(profileId)

    return updated
  })

  // Delete a profile
  fastify.delete<{
    Params: { id: string }
    Querystring: { currentProfileId?: string }
  }>('/profiles/:id', async (request, reply) => {
    const profileId = parseInt(request.params.id)
    const currentProfileId = request.query.currentProfileId ? parseInt(request.query.currentProfileId) : null

    // Check if profile exists
    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(profileId) as any
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' })
    }

    // Get current profile to check if admin
    const currentProfile = currentProfileId 
      ? db.prepare('SELECT * FROM profiles WHERE id = ?').get(currentProfileId) as any
      : null

    if (!currentProfile) {
      return reply.code(401).send({ error: 'Must be logged in to delete profiles' })
    }
    
    // Only admin can delete other profiles, or users can delete their own
    const isDeletingOwn = profile.id === currentProfileId
    const isCurrentAdmin = currentProfile.is_admin === 1

    if (!isDeletingOwn && !isCurrentAdmin) {
      return reply.code(403).send({ error: 'Only admin can delete other profiles' })
    }

    // Prevent deleting admin if other profiles exist
    if (profile.is_admin) {
      const otherProfiles = db.prepare('SELECT COUNT(*) as count FROM profiles WHERE id != ?').get(profileId) as { count: number }
      if (otherProfiles.count > 0) {
        return reply.code(400).send({ error: 'Cannot delete admin profile while other profiles exist' })
      }
    }

    // Delete profile and cascade to watchlist/progress
    db.prepare('DELETE FROM profiles WHERE id = ?').run(profileId)

    return { success: true }
  })

  // Verify profile passcode
  fastify.post<{
    Params: { id: string }
    Body: { passcode: string }
  }>('/profiles/:id/verify', async (request, reply) => {
    const profileId = parseInt(request.params.id)
    const { passcode } = request.body

    const profile = db.prepare(`
      SELECT id, name, avatar, is_admin as isAdmin
      FROM profiles
      WHERE id = ? AND passcode = ?
    `).get(profileId, passcode)

    if (!profile) {
      return reply.code(401).send({ error: 'Invalid PIN' })
    }

    return profile
  })

  // Get watchlist for a profile
  fastify.get<{
    Params: { id: string }
  }>('/profiles/:id/watchlist', async (request, reply) => {
    const userId = (request.user as any)?.id
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const profileId = parseInt(request.params.id)

    // Verify profile belongs to user
    const profile = db.prepare('SELECT id FROM profiles WHERE id = ? AND user_id = ?').get(profileId, userId)
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' })
    }

    const watchlist = db.prepare(`
      SELECT id, media_type as mediaType, media_id as mediaId, title, poster_path as posterPath, added_at as addedAt
      FROM profile_watchlist
      WHERE profile_id = ?
      ORDER BY added_at DESC
    `).all(profileId)

    return watchlist
  })

  // Add to watchlist
  fastify.post<{
    Params: { id: string }
    Body: { media_type: string; media_id: number; title: string; poster_path?: string }
  }>('/profiles/:id/watchlist', async (request, reply) => {
    const userId = (request.user as any)?.id
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const profileId = parseInt(request.params.id)
    const { media_type, media_id, title, poster_path } = request.body

    // Verify profile belongs to user
    const profile = db.prepare('SELECT id FROM profiles WHERE id = ? AND user_id = ?').get(profileId, userId)
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' })
    }

    try {
      db.prepare(`
        INSERT INTO profile_watchlist (profile_id, media_type, media_id, title, poster_path)
        VALUES (?, ?, ?, ?, ?)
      `).run(profileId, media_type, media_id, title, poster_path || null)

      return { success: true }
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint')) {
        return reply.code(409).send({ error: 'Already in watchlist' })
      }
      throw err
    }
  })

  // Remove from watchlist
  fastify.delete<{
    Params: { id: string; mediaType: string; mediaId: string }
  }>('/profiles/:id/watchlist/:mediaType/:mediaId', async (request, reply) => {
    const userId = (request.user as any)?.id
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const profileId = parseInt(request.params.id)
    const { mediaType, mediaId } = request.params

    // Verify profile belongs to user
    const profile = db.prepare('SELECT id FROM profiles WHERE id = ? AND user_id = ?').get(profileId, userId)
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' })
    }

    db.prepare(`
      DELETE FROM profile_watchlist
      WHERE profile_id = ? AND media_type = ? AND media_id = ?
    `).run(profileId, mediaType, parseInt(mediaId))

    return { success: true }
  })

  // Get progress for a profile
  fastify.get<{
    Params: { id: string }
  }>('/profiles/:id/progress', async (request, reply) => {
    const userId = (request.user as any)?.id
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const profileId = parseInt(request.params.id)

    // Verify profile belongs to user
    const profile = db.prepare('SELECT id FROM profiles WHERE id = ? AND user_id = ?').get(profileId, userId)
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' })
    }

    const progress = db.prepare(`
      SELECT id, media_type as mediaType, media_id as mediaId, title, poster_path as posterPath,
             season, episode, current_time as currentTime, duration, updated_at as updatedAt
      FROM profile_progress
      WHERE profile_id = ?
      ORDER BY updated_at DESC
    `).all(profileId)

    return progress
  })

  // Save progress
  fastify.post<{
    Params: { id: string }
    Body: {
      media_type: string
      media_id: number
      title: string
      poster_path?: string
      current_time: number
      duration: number
      season?: number
      episode?: number
    }
  }>('/profiles/:id/progress', async (request, reply) => {
    const userId = (request.user as any)?.id
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' })
    }

    const profileId = parseInt(request.params.id)
    const { media_type, media_id, title, poster_path, current_time, duration, season, episode } = request.body

    // Verify profile belongs to user
    const profile = db.prepare('SELECT id FROM profiles WHERE id = ? AND user_id = ?').get(profileId, userId)
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' })
    }

    db.prepare(`
      INSERT INTO profile_progress (profile_id, media_type, media_id, title, poster_path, current_time, duration, season, episode, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(profile_id, media_type, media_id, season, episode)
      DO UPDATE SET
        current_time = excluded.current_time,
        duration = excluded.duration,
        updated_at = datetime('now')
    `).run(profileId, media_type, media_id, title, poster_path || null, current_time, duration, season || null, episode || null)

    return { success: true }
  })
}
