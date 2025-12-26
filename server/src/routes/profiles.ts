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

  // ==================== WATCHLIST ROUTES ====================
  
  // Get watchlist for a profile (NO AUTH - profile-based system)
  fastify.get<{
    Params: { id: string }
  }>('/profiles/:id/watchlist', async (request, reply) => {
    const profileId = parseInt(request.params.id)

    // Verify profile exists
    const profile = db.prepare('SELECT id FROM profiles WHERE id = ?').get(profileId)
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' })
    }

    const watchlist = db.prepare(`
      SELECT id, media_type as mediaType, media_id as mediaId, title, poster_path as posterPath, added_at as addedAt
      FROM profile_watchlist
      WHERE profile_id = ?
      ORDER BY added_at DESC
    `).all(profileId)

    console.log(`[Watchlist] GET profile ${profileId}: ${watchlist.length} items`)
    return watchlist
  })

  // Add to watchlist (NO AUTH - profile-based system)
  fastify.post<{
    Params: { id: string }
    Body: { media_type: string; media_id: number; title: string; poster_path?: string }
  }>('/profiles/:id/watchlist', async (request, reply) => {
    const profileId = parseInt(request.params.id)
    const { media_type, media_id, title, poster_path } = request.body

    console.log(`[Watchlist] POST profile ${profileId}:`, { media_type, media_id, title })

    // Verify profile exists
    const profile = db.prepare('SELECT id FROM profiles WHERE id = ?').get(profileId)
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' })
    }

    if (!media_type || !media_id || !title) {
      return reply.code(400).send({ error: 'Missing required fields: media_type, media_id, title' })
    }

    try {
      db.prepare(`
        INSERT INTO profile_watchlist (profile_id, media_type, media_id, title, poster_path)
        VALUES (?, ?, ?, ?, ?)
      `).run(profileId, media_type, media_id, title, poster_path || null)

      console.log(`[Watchlist] Added to profile ${profileId}: ${title}`)
      return { success: true }
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint')) {
        console.log(`[Watchlist] Already exists in profile ${profileId}: ${title}`)
        return reply.code(409).send({ error: 'Already in watchlist' })
      }
      console.error('[Watchlist] Error:', err)
      throw err
    }
  })

  // Remove from watchlist (NO AUTH - profile-based system)
  fastify.delete<{
    Params: { id: string; mediaType: string; mediaId: string }
  }>('/profiles/:id/watchlist/:mediaType/:mediaId', async (request, reply) => {
    const profileId = parseInt(request.params.id)
    const { mediaType, mediaId } = request.params

    console.log(`[Watchlist] DELETE profile ${profileId}: ${mediaType}/${mediaId}`)

    // Verify profile exists
    const profile = db.prepare('SELECT id FROM profiles WHERE id = ?').get(profileId)
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' })
    }

    const result = db.prepare(`
      DELETE FROM profile_watchlist
      WHERE profile_id = ? AND media_type = ? AND media_id = ?
    `).run(profileId, mediaType, parseInt(mediaId))

    console.log(`[Watchlist] Deleted ${result.changes} items from profile ${profileId}`)
    return { success: true }
  })

  // Check if in watchlist (NO AUTH - profile-based system)
  fastify.get<{
    Params: { id: string; mediaType: string; mediaId: string }
  }>('/profiles/:id/watchlist/:mediaType/:mediaId', async (request, reply) => {
    const profileId = parseInt(request.params.id)
    const { mediaType, mediaId } = request.params

    const exists = db.prepare(`
      SELECT 1 FROM profile_watchlist
      WHERE profile_id = ? AND media_type = ? AND media_id = ?
    `).get(profileId, mediaType, parseInt(mediaId))

    return { inWatchlist: !!exists }
  })

  // ==================== PROGRESS ROUTES ====================

  // Get all progress for a profile (continue watching)
  fastify.get<{
    Params: { id: string }
  }>('/profiles/:id/progress', async (request, reply) => {
    const profileId = parseInt(request.params.id)

    // Verify profile exists
    const profile = db.prepare('SELECT id FROM profiles WHERE id = ?').get(profileId)
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' })
    }

    const progress = db.prepare(`
      SELECT id, media_type as mediaType, media_id as mediaId, title, poster_path as posterPath,
             season, episode, current_time as currentTime, duration, updated_at as updatedAt
      FROM profile_progress
      WHERE profile_id = ? AND current_time < duration * 0.95 AND current_time > 30
      ORDER BY updated_at DESC
      LIMIT 20
    `).all(profileId)

    console.log(`[Progress] GET profile ${profileId}: ${progress.length} items`)
    return progress
  })

  // Save progress (NO AUTH - profile-based system)
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
    const profileId = parseInt(request.params.id)
    const { media_type, media_id, title, poster_path, current_time, duration, season, episode } = request.body

    console.log(`[Progress] POST profile ${profileId}:`, { media_type, media_id, title, current_time, duration, season, episode })

    // Verify profile exists
    const profile = db.prepare('SELECT id FROM profiles WHERE id = ?').get(profileId)
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' })
    }

    if (!media_type || !media_id || !title || current_time === undefined || duration === undefined) {
      return reply.code(400).send({ error: 'Missing required fields' })
    }

    try {
      db.prepare(`
        INSERT INTO profile_progress (profile_id, media_type, media_id, title, poster_path, current_time, duration, season, episode, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(profile_id, media_type, media_id, season, episode)
        DO UPDATE SET
          title = excluded.title,
          poster_path = excluded.poster_path,
          current_time = excluded.current_time,
          duration = excluded.duration,
          updated_at = datetime('now')
      `).run(profileId, media_type, media_id, title, poster_path || null, current_time, duration, season || null, episode || null)

      console.log(`[Progress] Saved for profile ${profileId}: ${title} at ${current_time}s / ${duration}s`)
      return { success: true }
    } catch (err) {
      console.error('[Progress] Error:', err)
      return reply.code(500).send({ error: 'Failed to save progress' })
    }
  })

  // Get specific progress
  fastify.get<{
    Params: { id: string; mediaType: string; mediaId: string }
    Querystring: { season?: string; episode?: string }
  }>('/profiles/:id/progress/:mediaType/:mediaId', async (request, reply) => {
    const profileId = parseInt(request.params.id)
    const { mediaType, mediaId } = request.params
    const { season, episode } = request.query

    // Verify profile exists
    const profile = db.prepare('SELECT id FROM profiles WHERE id = ?').get(profileId)
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' })
    }

    let progress
    if (season && episode) {
      progress = db.prepare(`
        SELECT current_time as currentTime, duration
        FROM profile_progress
        WHERE profile_id = ? AND media_type = ? AND media_id = ? AND season = ? AND episode = ?
      `).get(profileId, mediaType, parseInt(mediaId), parseInt(season), parseInt(episode))
    } else {
      progress = db.prepare(`
        SELECT current_time as currentTime, duration
        FROM profile_progress
        WHERE profile_id = ? AND media_type = ? AND media_id = ? AND season IS NULL AND episode IS NULL
      `).get(profileId, mediaType, parseInt(mediaId))
    }

    return progress || { currentTime: 0, duration: 0 }
  })

  // Delete progress
  fastify.delete<{
    Params: { id: string; mediaType: string; mediaId: string }
    Querystring: { season?: string; episode?: string }
  }>('/profiles/:id/progress/:mediaType/:mediaId', async (request, reply) => {
    const profileId = parseInt(request.params.id)
    const { mediaType, mediaId } = request.params
    const { season, episode } = request.query

    // Verify profile exists
    const profile = db.prepare('SELECT id FROM profiles WHERE id = ?').get(profileId)
    if (!profile) {
      return reply.code(404).send({ error: 'Profile not found' })
    }

    if (season && episode) {
      db.prepare(`
        DELETE FROM profile_progress
        WHERE profile_id = ? AND media_type = ? AND media_id = ? AND season = ? AND episode = ?
      `).run(profileId, mediaType, parseInt(mediaId), parseInt(season), parseInt(episode))
    } else {
      db.prepare(`
        DELETE FROM profile_progress
        WHERE profile_id = ? AND media_type = ? AND media_id = ?
      `).run(profileId, mediaType, parseInt(mediaId))
    }

    return { success: true }
  })
}
