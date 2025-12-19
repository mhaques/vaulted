import { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import db from '../db.js'

interface RegisterBody {
  username: string
  password: string
}

interface LoginBody {
  username: string
  password: string
}

export default async function authRoutes(server: FastifyInstance) {
  // Register new user
  server.post<{ Body: RegisterBody }>('/register', async (request, reply) => {
    const { username, password } = request.body

    if (!username || !password) {
      return reply.status(400).send({ error: 'Username and password required' })
    }

    if (password.length < 4) {
      return reply.status(400).send({ error: 'Password must be at least 4 characters' })
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10)
      const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      const result = stmt.run(username, passwordHash)

      const token = server.jwt.sign({ id: result.lastInsertRowid, username })
      return { token, user: { id: result.lastInsertRowid, username } }
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return reply.status(409).send({ error: 'Username already exists' })
      }
      throw err
    }
  })

  // Login
  server.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    const { username, password } = request.body

    if (!username || !password) {
      return reply.status(400).send({ error: 'Username and password required' })
    }

    const stmt = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
    const user = stmt.get(username) as { id: number; username: string; password_hash: string } | undefined

    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const token = server.jwt.sign({ id: user.id, username: user.username })
    return { token, user: { id: user.id, username: user.username } }
  })

  // Get current user (protected)
  server.get('/me', {
    preHandler: [(server as any).authenticate]
  }, async (request) => {
    const { id, username } = request.user as { id: number; username: string }
    return { id, username }
  })
}
