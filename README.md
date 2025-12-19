# Vaulted

A personal, self-hosted media discovery and playback portal.

## Quick Start

### Prerequisites
- Node.js 16+ (with npm)
- TMDB API key ([get one free](https://www.themoviedb.org/settings/api))

### Installation & Development

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env and add your TMDB API key

# 3. Start development server
npm run dev
```

The dev server will start at `http://localhost:5173`.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_TMDB_API_KEY` | Your TMDB API key (required for metadata) |

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
│   ├── Layout.tsx            # App shell with nav
│   ├── index.css             # Tailwind CSS entry
│   ├── components/
│   │   └── MediaCard.tsx     # Reusable media card component
│   ├── services/
│   │   └── tmdb.ts           # TMDB API client
│   └── pages/
│       ├── Home.tsx          # Discover page
│       ├── Search.tsx        # Search page
│       ├── Title.tsx         # Title detail page
│       ├── Watchlist.tsx     # Watchlist page
│       └── Continue.tsx      # Continue watching page
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.cjs
├── tsconfig.json
└── .env.example
```

## Tech Stack

- **Frontend**: React 18 + Vite 5 + TypeScript
- **Styling**: Tailwind CSS (dark theme)
- **Routing**: React Router 6
- **Metadata**: TMDB API

## Features

- ✅ Discover page with Trending, Popular, Top Rated
- ✅ Search with debounced input and type filters
- ✅ Title details with poster, backdrop, cast, similar titles
- ✅ Responsive layout (mobile + TV/desktop)
- ✅ Modern dark theme

## Phases

1. ~~**UI First**~~ — App shell, routing, Discover layout, dark theme ✅
2. ~~**Metadata**~~ — TMDB integration, search, title details ✅
3. **Backend** — Fastify + SQLite, auth, watchlist & progress
4. **Playback** — Video player, subtitles, resume logic
5. **Sources** — Torrentio & Real-Debrid integration
- Integrate TMDB API for metadata
