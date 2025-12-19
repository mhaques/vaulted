# Vaulted

A personal, self-hosted media discovery and playback portal.

## Quick Start

### Prerequisites
- Node.js 18+ (with npm)
- TMDB API key ([get one free](https://www.themoviedb.org/settings/api))

### Installation & Development

```bash
# 1. Install frontend dependencies
npm install

# 2. Install backend dependencies
cd server && npm install && cd ..

# 3. Set up environment variables
cp .env.example .env
# Edit .env and add your TMDB API key

# 4. Start backend server (in one terminal)
cd server && npm run dev

# 5. Start frontend dev server (in another terminal)
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3456`

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_TMDB_API_KEY` | Your TMDB API key (required for metadata) |
| `VITE_API_URL` | Backend API URL (default: `http://localhost:3456`) |

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
vaulted/
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Main app with routing
│   ├── Layout.tsx            # App shell with nav & auth modal
│   ├── index.css             # Tailwind CSS entry
│   ├── components/
│   │   └── MediaCard.tsx     # Reusable media card component
│   ├── contexts/
│   │   └── AuthContext.tsx   # Auth state management
│   ├── services/
│   │   ├── api.ts            # Backend API client
│   │   └── tmdb.ts           # TMDB API client
│   └── pages/
│       ├── Home.tsx          # Discover page
│       ├── Search.tsx        # Search page
│       ├── Title.tsx         # Title detail page
│       ├── Watchlist.tsx     # Watchlist page
│       └── Continue.tsx      # Continue watching page
├── server/
│   ├── src/
│   │   ├── index.ts          # Fastify server entry
│   │   ├── db.ts             # SQLite database setup
│   │   └── routes/
│   │       ├── auth.ts       # Auth endpoints (register/login)
│   │       ├── watchlist.ts  # Watchlist CRUD
│   │       └── progress.ts   # Watch progress tracking
│   └── package.json
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.cjs
├── tsconfig.json
└── .env.example
```

## Tech Stack

- **Frontend**: React 18 + Vite 5 + TypeScript
- **Styling**: Tailwind CSS (dark theme with glass effects)
- **Routing**: React Router 6
- **Metadata**: TMDB API
- **Backend**: Fastify + SQLite (better-sqlite3)
- **Auth**: JWT tokens with bcrypt password hashing

## Features

- ✅ Discover page with Trending, Popular, Top Rated
- ✅ Search with debounced input and type filters
- ✅ Title details with poster, backdrop, cast, similar titles
- ✅ Responsive layout (mobile + TV/desktop)
- ✅ Modern dark theme with glass/translucent effects
- ✅ User authentication (register/login)
- ✅ Watchlist persistence
- ✅ Watch progress tracking

## Phases

1. ~~**UI First**~~ — App shell, routing, Discover layout, dark theme ✅
2. ~~**Metadata**~~ — TMDB integration, search, title details ✅
3. **Backend** — Fastify + SQLite, auth, watchlist & progress
4. **Playback** — Video player, subtitles, resume logic
5. **Sources** — Torrentio & Real-Debrid integration
- Integrate TMDB API for metadata
