import { FastifyInstance } from 'fastify'
import db from '../db.js'

interface ProgressUpdate {
  media_type: 'movie' | 'tv'
  media_id: number
  title: string
  poster_path?: string
  season?: number
  episode?: number
  progress_seconds: number
  duration_seconds: number
}

export default async function progressRoutes(server: FastifyInstance) {
  // Get profile's in-progress items (continue watching)
  server.get<{ Params: { profileId: string } }>('/profiles/:profileId/progress', async (request) => {
    const profileId = parseInt(request.params.profileId)
    const stmt = db.prepare(`
      SELECT media_type, media_id, title, poster_path, season, episode,
             current_time, duration, updated_at
      FROM profile_progress
      WHERE profile_id = ? AND current_time < duration * 0.95
      ORDER BY updated_at DESC
      LIMIT 50
    `)
    return stmt.all(profileId)
  })

  // Update progress
  server.post<{ 
    Params: { profileId: string }
    Body: ProgressUpdate 
  }>('/profiles/:profileId/progress', async (request, reply) => {
    try {
      const profileId = parseInt(request.params.profileId)
      const { media_type, media_id, title, poster_path, season, episode, progress_seconds, duration_seconds } = request.body

      // Validate required fields
      if (!media_type || !media_id || !title || progress_seconds === undefined || duration_seconds === undefined) {
        return reply.status(400).send({ error: 'Missing required fields' })
      }

      // Use null for season/episode if not provided
      const seasonVal = season ?? null
      const episodeVal = episode ?? null

      const stmt = db.prepare(`
        INSERT INTO profile_progress (profile_id, media_type, media_id, title, poster_path, season, episode, current_time, duration)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(profile_id, media_type, media_id, season, episode) DO UPDATE SET
          current_time = excluded.current_time,
          duration = excluded.duration,
          updated_at = datetime('now')
      `)
      stmt.run(profileId, media_type, media_id, title, poster_path || null, seasonVal, episodeVal, progress_seconds, duration_seconds)

      return { success: true }
    } catch (err) {
      console.error('Progress update error:', err)
      return reply.status(500).send({ error: 'Failed to update progress' })
    }
  })
}
