import { FastifyInstance } from 'fastify'
import db from '../db.js'

interface WatchlistItem {
  media_type: 'movie' | 'tv'
  media_id: number
  title: string
  poster_path?: string
}

export default async function watchlistRoutes(server: FastifyInstance) {
  // All routes require authentication
  server.addHook('preHandler', (server as any).authenticate)

  // Get user's watchlist
  server.get('/', async (request) => {
    const { id: userId } = request.user as { id: number }
    const stmt = db.prepare(`
      SELECT media_type, media_id, title, poster_path, added_at
      FROM watchlist
      WHERE user_id = ?
      ORDER BY added_at DESC
    `)
    return stmt.all(userId)
  })

  // Add to watchlist
  server.post<{ Body: WatchlistItem }>('/', async (request, reply) => {
    const { id: userId } = request.user as { id: number }
    const { media_type, media_id, title, poster_path } = request.body

    if (!media_type || !media_id || !title) {
      return reply.status(400).send({ error: 'media_type, media_id, and title required' })
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO watchlist (user_id, media_type, media_id, title, poster_path)
        VALUES (?, ?, ?, ?, ?)
      `)
      stmt.run(userId, media_type, media_id, title, poster_path || null)
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
