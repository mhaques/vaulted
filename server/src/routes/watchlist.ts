import { FastifyInstance } from 'fastify'
import db from '../db.js'

interface WatchlistItem {
  media_type: 'movie' | 'tv'
  media_id: number
  title: string
  poster_path?: string
}

export default async function watchlistRoutes(server: FastifyInstance) {
  // Get profile's watchlist
  server.get<{ Params: { profileId: string } }>('/profiles/:profileId/watchlist', async (request) => {
    const profileId = parseInt(request.params.profileId)
    const stmt = db.prepare(`
      SELECT media_type, media_id, title, poster_path, added_at
      FROM profile_watchlist
      WHERE profile_id = ?
      ORDER BY added_at DESC
    `)
    return stmt.all(profileId)
  })

  // Add to watchlist
  server.post<{ 
    Params: { profileId: string }
    Body: WatchlistItem 
  }>('/profiles/:profileId/watchlist', async (request, reply) => {
    const profileId = parseInt(request.params.profileId)
    const { media_type, media_id, title, poster_path } = request.body

    if (!media_type || !media_id || !title) {
      return reply.status(400).send({ error: 'media_type, media_id, and title required' })
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO profile_watchlist (profile_id, media_type, media_id, title, poster_path)
        VALUES (?, ?, ?, ?, ?)
      `)
      stmt.run(profileId, media_type, media_id, title, poster_path || null)
      return { success: true }
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return reply.status(409).send({ error: 'Already in watchlist' })
      }
      throw err
    }
  })

  // Remove from watchlist
  server.delete<{ Params: { mediaType: string; mediaId: string } }>(
    '/:mediaType/:mediaId',
    async (request, reply) => {
      const { id: userId } = request.user as { id: number }
      const { mediaType, mediaId } = request.params

      const stmt = db.prepare(`
        DELETE FROM watchlist
        WHERE user_id = ? AND media_type = ? AND media_id = ?
      `)
      const result = stmt.run(userId, mediaType, parseInt(mediaId))

      if (result.changes === 0) {
        return reply.status(404).send({ error: 'Not found in watchlist' })
      }

      return { success: true }
    }
  )

  // Check if item is in watchlist
  server.get<{ Params: { mediaType: string; mediaId: string } }>(
    '/:mediaType/:mediaId',
    async (request) => {
      const { id: userId } = request.user as { id: number }
      const { mediaType, mediaId } = request.params

      const stmt = db.prepare(`
        SELECT 1 FROM watchlist
        WHERE user_id = ? AND media_type = ? AND media_id = ?
      `)
      const exists = stmt.get(userId, mediaType, parseInt(mediaId))

      return { inWatchlist: !!exists }
    }
  )
}
