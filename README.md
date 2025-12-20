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
| `VITE_REALDEBRID_API_KEY` | Your Real-Debrid API key (hardcoded in .env) |

### Real-Debrid Setup (Required for Streaming)

1. Sign up for [Real-Debrid](https://real-debrid.com) (premium required)
2. Get your API key from [https://real-debrid.com/apitoken](https://real-debrid.com/apitoken)
3. Add it to your `.env` file: `VITE_REALDEBRID_API_KEY=your_key_here`
4. Rebuild the app to embed the key
5. Torrentio sources will stream cached torrents instantly

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
│   ├── Layout.tsx            # App shell with navigation
│   ├── index.css             # Tailwind CSS entry
│   ├── components/
│   │   ├── MediaCard.tsx     # Reusable media card component
│   │   ├── VideoPlayer.tsx   # Video playback component
│   │   └── Icons.tsx         # Icon components
│   ├── contexts/
│   │   └── ProfileContext.tsx # Profile management (localStorage)
│   ├── hooks/
│   │   └── useProfileStorage.ts # Profile-specific watchlist/progress
│   ├── services/
│   │   ├── tmdb.ts           # TMDB API client
│   │   ├── sources.ts        # Torrentio integration
│   │   └── subtitles.ts      # OpenSubtitles integration
│   └── pages/
│       ├── Home.tsx          # Discover page
│       ├── Search.tsx        # Search page
│       ├── Title.tsx         # Title detail page
│       ├── Profiles.tsx      # Profile selection/management
│       ├── Watchlist.tsx     # Watchlist page
│       └── Continue.tsx      # Continue watching page
├── server/
│   ├── src/
│   │   ├── index.ts          # Fastify server (proxy only)
│   │   └── routes/
│   │       └── proxy.ts      # CORS proxy for streaming
│   └── package.json
├── public/
│   └── robots.txt            # Search engine blocking
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.cjs
├── tsconfig.json
└── .env
```

## Tech Stack

- **Frontend**: React 18 + Vite 5 + TypeScript
- **Styling**: Tailwind CSS (dark theme with glass effects)
- **Routing**: React Router 6
- **Metadata**: TMDB API
- **Backend**: Fastify (CORS proxy for streaming)
- **Storage**: localStorage (profiles, watchlist, progress)
- **Auth**: Netflix-style profiles with PIN security
- **Streaming**: Real-Debrid + Torrentio
- **Subtitles**: OpenSubtitles API

## Features

### Core Features
- ✅ Discover page with Trending, Popular, Top Rated
- ✅ Search with debounced input and type filters
- ✅ Title details with poster, backdrop, cast, similar titles
- ✅ **Real-Debrid Integration** - Stream torrents via cached links
- ✅ **OpenSubtitles** - Automatic subtitle fetching with built-in API key
- ✅ Keyboard shortcuts (Space: play/pause, C: subtitles, F: fullscreen)
- ✅ Responsive layout (mobile + TV/desktop)
- ✅ Modern dark theme with glass/translucent effects
- ✅ Search engine blocking (robots.txt + noindex meta)

### Profile System
- ✅ Netflix-style profile management
- ✅ PIN-based security (4-10 digits, numbers only)
- ✅ First profile becomes admin automatically
- ✅ Admin can delete any profile
- ✅ Users can delete their own profile
- ✅ Profile-specific watchlist and watch progress
- ✅ Up to 8 profiles per device
- ✅ 20 avatar options
- ✅ Active profile indicator

### Data & Privacy
- ✅ All data stored locally (localStorage)
- ✅ No cloud sync or backend database
- ✅ Profile-isolated watchlist
- ✅ Profile-isolated watch progress
- ✅ Per-device storage (not synced across devices)

## Development Phases

1. ~~**UI First**~~ — App shell, routing, Discover layout, dark theme ✅
2. ~~**Metadata**~~ — TMDB integration, search, title details ✅
3. ~~**Backend**~~ — Fastify CORS proxy for streaming ✅
4. ~~**Playback**~~ — Video player, subtitles, resume logic ✅
5. ~~**Sources**~~ — Torrentio & Real-Debrid integration ✅
6. ~~**Profiles**~~ — Netflix-style profiles with PIN security ✅
7. ~~**Storage**~~ — localStorage-based watchlist & progress ✅
