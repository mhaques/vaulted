# Vaulted

A personal, self-hosted media discovery and playback portal.

## Quick Start

### Prerequisites
- Node.js 16+ (with npm)

### Installation & Development

```bash
npm install
npm run dev
```

The dev server will start at `http://localhost:5173`.

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
D:\GitHub\vaulted/
├── src/
│   ├── main.tsx        # React entry point
│   ├── App.tsx         # Main app component
│   └── index.css       # Tailwind CSS entry
├── index.html          # HTML entry (dark mode by default)
├── package.json        # Dependencies & scripts
├── vite.config.ts      # Vite configuration
├── tailwind.config.cjs # Tailwind configuration
├── tsconfig.json       # TypeScript configuration
└── postcss.config.cjs  # PostCSS configuration
```

## Tech Stack

- **Frontend**: React 18 + Vite 5 + TypeScript
- **Styling**: Tailwind CSS (dark theme by default)
- **Routing**: React Router (to be implemented)

## Phases

1. **UI First** — App shell, routing, Discover layout, dark theme, responsive/TV layout
2. **Metadata** — TMDB integration, search, title details
3. **Backend** — Fastify + SQLite, auth, watchlist & progress
4. **Playback** — Video player, subtitles, resume logic
5. **Sources** — Torrentio & Real-Debrid integration

## Next Steps

- Run `npm install` and `npm run dev` to start
- Implement routing with React Router
- Build Discover page with preset rows
- Integrate TMDB API for metadata
