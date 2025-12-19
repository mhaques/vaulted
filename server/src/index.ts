import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import authRoutes from './routes/auth.js'
import watchlistRoutes from './routes/watchlist.js'
import progressRoutes from './routes/progress.js'

const server = Fastify({
  logger: true
})

// Register plugins
await server.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
})

await server.register(jwt, {
  secret: process.env.JWT_SECRET || 'vaulted-dev-secret-change-in-production'
})

// Auth decorator
server.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized' })
  }
})

// Register routes
await server.register(authRoutes, { prefix: '/api/auth' })
await server.register(watchlistRoutes, { prefix: '/api/watchlist' })
await server.register(progressRoutes, { prefix: '/api/progress' })

// Health check
server.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3456')
    await server.listen({ port, host: '127.0.0.1' })
    console.log(`Server running on http://localhost:${port}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
