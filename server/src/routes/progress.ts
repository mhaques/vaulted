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
  // All routes require authentication
  server.addHook('preHandler', (server as any).authenticate)

  // Get all in-progress items (continue watching)
  server.get('/', async (request) => {
    const { id: userId } = request.user as { id: number }
    const stmt = db.prepare(`
      SELECT media_type, media_id, title, poster_path, season, episode,
             progress_seconds, duration_seconds, updated_at,
             ROUND(progress_seconds * 100.0 / duration_seconds) as progress_percent
      FROM watch_progress
      WHERE user_id = ? AND progress_seconds < duration_seconds * 0.95
      ORDER BY updated_at DESC
      LIMIT 20
    `)
    return stmt.all(userId)
  })

  // Update progress
  server.post<{ Body: ProgressUpdate }>('/', async (request, reply) => {
    try {
      const { id: userId } = request.user as { id: number }
      const { media_type, media_id, title, poster_path, season, episode, progress_seconds, duration_seconds } = request.body

      // Validate required fields
      if (!media_type || !media_id || !title || progress_seconds === undefined || duration_seconds === undefined) {
        return reply.status(400).send({ error: 'Missing required fields' })
      }

      // Use 0 for null season/episode to handle UNIQUE constraint properly
      const seasonVal = season ?? 0
      const episodeVal = episode ?? 0

      const stmt = db.prepare(`
        INSERT INTO watch_progress (user_id, media_type, media_id, title, poster_path, season, episode, progress_seconds, duration_seconds)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, media_type, media_id, season, episode) DO UPDATE SET
          progress_seconds = excluded.progress_seconds,
          duration_seconds = excluded.duration_seconds,
          updated_at = datetime('now')
      `)
      stmt.run(userId, media_type, media_id, title, poster_path || null, seasonVal, episodeVal, progress_seconds, duration_seconds)

      // If watched > 95%, add to history
      if (progress_seconds >= duration_seconds * 0.95) {
        const historyStmt = db.prepare(`
          INSERT INTO watch_history (user_id, media_type, media_id, title, poster_path, season, episode)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        historyStmt.run(userId, media_type, media_id, title, poster_path || null, seasonVal, episodeVal)
      }

      return { success: true }
    } catch (err) {
      console.error('Progress update error:', err)
      return reply.status(500).send({ error: 'Failed to update progress' })
    }
  })

  // Get progress for specific item
  server.get<{ Params: { mediaType: string; mediaId: string }; Querystring: { season?: string; episode?: string } }>(
    '/:mediaType/:mediaId',
    async (request) => {
      const { id: userId } = request.user as { id: number }
      const { mediaType, mediaId } = request.params
      const { season, episode } = request.query

      let stmt
      if (season && episode) {
        stmt = db.prepare(`
          SELECT progress_seconds, duration_seconds
          FROM watch_progress
          WHERE user_id = ? AND media_type = ? AND media_id = ? AND season = ? AND episode = ?
        `)
        return stmt.get(userId, mediaType, parseInt(mediaId), parseInt(season), parseInt(episode)) || { progress_seconds: 0, duration_seconds: 0 }
      } else {
        stmt = db.prepare(`
          SELECT progress_seconds, duration_seconds
          FROM watch_progress
          WHERE user_id = ? AND media_type = ? AND media_id = ?
        `)
        return stmt.get(userId, mediaType, parseInt(mediaId)) || { progress_seconds: 0, duration_seconds: 0 }
      }
    }
  )

  // Get watch history
  server.get('/history', async (request) => {
    const { id: userId } = request.user as { id: number }
    const stmt = db.prepare(`
      SELECT media_type, media_id, title, poster_path, season, episode, watched_at
      FROM watch_history
      WHERE user_id = ?
      ORDER BY watched_at DESC
      LIMIT 50
    `)
    return stmt.all(userId)
  })

  // Clear progress for item
  server.delete<{ Params: { mediaType: string; mediaId: string } }>(
    '/:mediaType/:mediaId',
    async (request, reply) => {
      const { id: userId } = request.user as { id: number }
      const { mediaType, mediaId } = request.params

      const stmt = db.prepare(`
        DELETE FROM watch_progress
        WHERE user_id = ? AND media_type = ? AND media_id = ?
      `)
      const result = stmt.run(userId, mediaType, parseInt(mediaId))

      if (result.changes === 0) {
        return reply.status(404).send({ error: 'No progress found' })
      }

      return { success: true }
    }
  )
}
