# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Frontend
npm run dev          # Start Vite dev server (HMR)
npm run build        # Production build
npm run lint         # ESLint (flat config, v9)
npm run preview      # Preview production build

# Backend
npm run server       # Start Express server (from root)
cd server && npm start  # Alternative: start server from server dir
```

No test framework is configured. There are no automated tests.

## Architecture

Full-stack monorepo: React frontend + Express/MongoDB backend.

### Frontend (`src/`)

- **React 19 + Vite + React Router v7** — SPA with protected routes
- **Auth**: Firebase Google OAuth via `AuthContext.jsx`; token passed as Bearer header
- **API client** (`src/api/client.js`): fetch-based wrapper that auto-attaches auth tokens to all requests
- **State**: React hooks only (no Redux/Zustand); debounced auto-save (1s) syncs to backend
- **Styling**: CSS custom properties with 5 theme variants defined in `src/constants/themes.js`; glassmorphism patterns throughout

Key pages:
- `TimelinePage.jsx` (~900 lines) — main editor; orchestrates events, filtering, comparison, playback, and export
- `DashboardPage.jsx` — timeline list/grid with create/edit/delete

Custom hooks in `src/components/timeline/`:
- `useTimelineLayout.js` — positions events on the visual timeline
- `useTimelineInteractions.js` — drag, scroll, zoom behavior
- `useTimelineExport.js` — PDF export via html-to-image + jspdf

### Backend (`server/src/`)

Clean/hexagonal architecture with four layers:

1. **Domain** (`domain/`) — Entity classes (`Timeline`, `Event`, `User`) and abstract repository/provider interfaces
2. **Application** (`application/`) — Use cases (`TimelineUseCase`, `AuthUseCase`) containing business logic
3. **Controllers** (`controllers/`) — HTTP handlers that call use cases
4. **Infrastructure** (`infrastructure/`) — Express server, Mongoose repositories, Firebase Admin auth

API routes (all under `/api`):
- `POST /auth/login` — Firebase token login
- `GET|POST /timelines` — list/create
- `GET|PUT|DELETE /timelines/:id` — read/save/delete (PUT saves events + metadata)
- `PATCH /timelines/:id` — metadata-only update
- `GET /health` — health check

### Data Model

Events have a hierarchical structure via `parentId`:
- **Epochs** → **Stages** → **Events/Milestones**

Each event supports: dates, colors, descriptions, tags, geo-location (lat/lng/name), media URLs, type, and ordering.

Timelines are stored as MongoDB documents with events embedded as subdocuments (`server/src/infrastructure/database/schemas/TimelineSchema.js`).

## Environment

- Frontend env: `VITE_API_URL` (default `http://localhost:3000/api`)
- Backend env: `MONGO_URI`, `PORT` (default 3000), `FIREBASE_SERVICE_ACCOUNT` (JSON)
- See `.env.example` for frontend config

## Deployment

- Frontend: Vercel (see `vercel.json` for SPA rewrite)
- CORS origins: `https://chronos-timeline.vercel.app` and `http://localhost:3000`
- Firebase project: `timeline-2ccde`
