import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

/**
 * Video Proxy Route
 * 
 * Proxies video streams from external sources (like Real-Debrid) to bypass CORS.
 * Supports range requests for seeking.
 */

export default async function proxyRoutes(server: FastifyInstance) {
  
  // Proxy video stream
  server.get<{
    Querystring: { url: string }
  }>('/video', async (request: FastifyRequest<{ Querystring: { url: string } }>, reply: FastifyReply) => {
    const { url } = request.query
    
    if (!url) {
      return reply.status(400).send({ error: 'URL parameter required' })
    }

    // Only allow proxying from trusted domains
    const allowedDomains = [
      'real-debrid.com',
      'download.real-debrid.com',
      'rdb.so'
    ]
    
    try {
      const urlObj = new URL(url)
      const isAllowed = allowedDomains.some(domain => urlObj.hostname.endsWith(domain))
      
      if (!isAllowed) {
        return reply.status(403).send({ error: 'Domain not allowed for proxying' })
      }
    } catch {
      return reply.status(400).send({ error: 'Invalid URL' })
    }

    try {
      // Forward range header for seeking support
      const headers: HeadersInit = {}
      const rangeHeader = request.headers.range
      if (rangeHeader) {
        headers['Range'] = rangeHeader
      }

      // Fetch from source
      const response = await fetch(url, { headers })
      
      if (!response.ok && response.status !== 206) {
        return reply.status(response.status).send({ error: 'Failed to fetch video' })
      }

      // Get content info
      const contentType = response.headers.get('content-type') || 'video/mp4'
      const contentLength = response.headers.get('content-length')
      const contentRange = response.headers.get('content-range')
      const acceptRanges = response.headers.get('accept-ranges')

      // Set response headers
      reply.header('Content-Type', contentType)
      reply.header('Accept-Ranges', acceptRanges || 'bytes')
      
      if (contentLength) {
        reply.header('Content-Length', contentLength)
      }
      
      if (contentRange) {
        reply.header('Content-Range', contentRange)
        reply.status(206)
      }

      // Stream the response
      if (response.body) {
        return reply.send(response.body)
      } else {
        // Fallback for environments without streaming
        const buffer = await response.arrayBuffer()
        return reply.send(Buffer.from(buffer))
      }
    } catch (err) {
      console.error('Proxy error:', err)
      return reply.status(500).send({ error: 'Proxy failed' })
    }
  })

  // Get video info (for checking if URL is valid/playable)
  server.head<{
    Querystring: { url: string }
  }>('/video', async (request: FastifyRequest<{ Querystring: { url: string } }>, reply: FastifyReply) => {
    const { url } = request.query
    
    if (!url) {
      return reply.status(400).send()
    }

    try {
      const response = await fetch(url, { method: 'HEAD' })
      
      if (!response.ok) {
        return reply.status(response.status).send()
      }

      const contentType = response.headers.get('content-type') || 'video/mp4'
      const contentLength = response.headers.get('content-length')
      const acceptRanges = response.headers.get('accept-ranges')

      reply.header('Content-Type', contentType)
      reply.header('Accept-Ranges', acceptRanges || 'bytes')
      
      if (contentLength) {
        reply.header('Content-Length', contentLength)
      }

      return reply.status(200).send()
    } catch (err) {
      console.error('Proxy HEAD error:', err)
      return reply.status(500).send()
    }
  })

  // Proxy subtitle files (SRT/VTT) from OpenSubtitles
  server.get<{
    Querystring: { url: string }
  }>('/subtitle', async (request: FastifyRequest<{ Querystring: { url: string } }>, reply: FastifyReply) => {
    const { url } = request.query
    
    if (!url) {
      return reply.status(400).send({ error: 'URL parameter required' })
    }

    // Allow subtitle domains
    const allowedDomains = [
      'opensubtitles.com',
      'dl.opensubtitles.org',
      'vtt.opensubtitles.org',
      'www.opensubtitles.org',
      'opensubtitles.org'
    ]
    
    try {
      const urlObj = new URL(url)
      const isAllowed = allowedDomains.some(domain => urlObj.hostname.includes(domain))
      
      if (!isAllowed) {
        return reply.status(403).send({ error: 'Domain not allowed for subtitle proxying' })
      }
    } catch {
      return reply.status(400).send({ error: 'Invalid URL' })
    }

    try {
      const response = await fetch(url)
      
      if (!response.ok) {
        return reply.status(response.status).send({ error: 'Failed to fetch subtitle' })
      }

      const text = await response.text()
      
      // Detect format and set appropriate content type
      const isVTT = text.trim().startsWith('WEBVTT') || url.endsWith('.vtt')
      const contentType = isVTT ? 'text/vtt' : 'text/plain'
      
      // Convert SRT to VTT if needed for HTML5 video
      let output = text
      if (!isVTT && text.includes('-->')) {
        output = 'WEBVTT\n\n' + text
          .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2') // Convert comma to dot in timestamps
          .replace(/\{\\an\d+\}/g, '') // Remove SSA alignment tags
      }

      reply.header('Content-Type', contentType)
      reply.header('Access-Control-Allow-Origin', '*')
      return reply.send(output)
    } catch (err) {
      console.error('Subtitle proxy error:', err)
      return reply.status(500).send({ error: 'Subtitle proxy failed' })
    }
  })
}
