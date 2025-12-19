# Vaulted - Current Status

**Last Updated:** December 19, 2025

## ✅ Working Features

### Core Functionality
- User authentication (register/login with JWT)
- Personal watchlist (add/remove titles)
- Watch progress tracking
- TMDB metadata integration (movies, TV shows, search)
- Responsive UI with dark theme

### Streaming
- **Real-Debrid Integration** - Fully working via backend proxy
- **Torrentio Provider** - Fetches and streams cached torrents
- **OpenSubtitles** - Automatic subtitle fetching (built-in API key)
- Video player with subtitle support, quality selection
- Keyboard shortcuts (Space, C, F)

### Technical Architecture
- Frontend: React 18 + Vite 5 + TypeScript
- Backend: Fastify v4 + SQLite
- Real-Debrid proxy at `/api/proxy/realdebrid/*` (bypasses CORS)
- OpenSubtitles proxy at `/api/proxy/opensubtitles/*`
- Video proxy at `/api/proxy/video` for Real-Debrid streams

## 🔧 Recent Fixes

1. **Multi-line comment syntax error** - Fixed unclosed comment in sources.ts
2. **CORS errors with Real-Debrid** - Created backend proxy for all RD API calls
3. **Form parser compatibility** - Using @fastify/formbody v7 (v8 requires Fastify v5)
4. **Rate limiting** - Removed batch operations, simplified to single torrent add
5. **InstantAvailability disabled** - Implemented try-add-delete strategy for cache checking
6. **Module export errors** - Cleaned up sources.ts exports
7. **Free embed sources** - Disabled VidSrc/SuperEmbed (return HTML pages, not video URLs)

## 📝 Configuration

### Environment Variables
```bash
# Frontend (.env)
VITE_TMDB_API_KEY=your_tmdb_key
VITE_API_URL=http://localhost:3456
```

### User Settings (localStorage)
- Real-Debrid API key
- Provider toggles (only Torrentio enabled by default)
- Auto-play preference
- Preferred quality (4K/1080p/720p/480p)

## 🎯 Active Provider

**Torrentio** (only enabled source):
- Fetches torrent streams from Torrentio API
- Adds magnets to Real-Debrid
- Polls torrent status until ready or fails
- Auto-deletes uncached torrents (400 errors)
- Returns direct download URL for playback

**Disabled Providers:**
- VidSrc - Returns embed page URLs (causes CORS errors)
- SuperEmbed - Returns embed page URLs (causes CORS errors)

Users can re-enable these in Settings if needed, but they won't work as direct video sources.

## 🚀 Deployment Status

### Development
- ✅ Frontend dev server: http://localhost:5173
- ✅ Backend API: http://localhost:3456
- ✅ Both servers running and tested

### Production (VPS)
- Server: Oracle Cloud Ubuntu
- IP: 152.67.154.15
- Domain: vaulted.root.sx
- Backend: Running on PM2 as `vaulted-api` ✅
- Frontend: Needs deployment to nginx directory
- Issue: Correct nginx root directory unknown

## 📦 Dependencies

### Frontend
- react@18.3.1, react-router-dom@7.1.1
- vite@5.4.21, tailwindcss@3.4.17
- video.js@8.21.1 (video player)

### Backend
- fastify@4.28.1
- @fastify/formbody@7.4.0
- @fastify/cors@10.0.1
- better-sqlite3@11.8.1
- bcryptjs@2.4.3, jsonwebtoken@9.0.2

## 🔄 Real-Debrid Flow

1. User clicks Play on a title
2. Frontend fetches Torrentio streams
3. Frontend calls `/api/proxy/realdebrid/torrents/addMagnet`
4. Backend proxies to Real-Debrid API
5. Frontend polls `/api/proxy/realdebrid/torrents/info/:id`
6. If ready: Select files, unrestrict link, play
7. If 400 error: Delete torrent, try next source

## 📊 File Structure

```
vaulted/
├── src/
│   ├── services/
│   │   ├── sources.ts       # Source aggregator + Torrentio + RD integration
│   │   ├── tmdb.ts          # TMDB API client
│   │   ├── subtitles.ts     # OpenSubtitles integration
│   │   └── api.ts           # Backend API client
│   ├── pages/
│   │   ├── Home.tsx         # Discover page
│   │   ├── Search.tsx       # Search page
│   │   ├── Title.tsx        # Title detail + player
│   │   ├── Settings.tsx     # User settings (RD key, providers)
│   │   ├── Watchlist.tsx    # User watchlist
│   │   └── Continue.tsx     # Continue watching
│   └── components/
│       └── VideoPlayer.tsx  # video.js player with subtitles
├── server/
│   ├── src/
│   │   ├── index.ts         # Fastify server
│   │   ├── db.ts            # SQLite setup
│   │   └── routes/
│   │       ├── auth.ts      # Login/register
│   │       ├── watchlist.ts # Watchlist CRUD
│   │       ├── progress.ts  # Watch progress
│   │       └── proxy.ts     # RD/OpenSubtitles/Video proxy
│   └── data/
│       └── vaulted.db       # SQLite database
└── README.md                # Main documentation
```

## 🔐 Security Notes

- Real-Debrid API keys stored in localStorage (client-side only)
- JWT tokens for auth (bcrypt password hashing)
- OpenSubtitles uses built-in API key (users can override)
- CORS configured for development (localhost:5173)

## 📝 Next Steps for VCS

Ready to commit:
- ✅ All source code cleaned and working
- ✅ README.md updated with features
- ✅ .gitignore configured
- ✅ Settings page cleaned (removed broken providers)
- ✅ Sources properly configured (Torrentio only)

Commit message suggestion:
```
feat: Real-Debrid integration with Torrentio streaming

- Add backend proxy for Real-Debrid API (bypasses CORS)
- Implement try-add-delete strategy for uncached torrents
- Add OpenSubtitles integration with automatic fetching
- Remove broken free embed sources (VidSrc, SuperEmbed)
- Update Settings UI to only show working providers
- Add comprehensive documentation (README, STATUS)
```
