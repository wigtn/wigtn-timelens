# TimeLens

AI-powered cultural heritage companion that brings museum artifacts to life through real-time conversation, image restoration, and interactive discovery.

Built for the **Gemini Live Agent Challenge**.

## Features

- **Live AI Curator** — Real-time voice/video conversation powered by Gemini Live API. Point your camera at an artifact and ask questions naturally.
- **Artifact Recognition** — Identifies artifacts through the camera and provides historical context, era, civilization, and fun facts.
- **Image Restoration** — Generates historically accurate restorations of damaged artifacts using Gemini Flash.
- **Nearby Discovery** — Find museums and cultural heritage sites near your location via Google Places API.
- **Visit Diary** — Auto-generates illustrated diary entries summarizing your museum visit.
- **Museum-Aware Onboarding** — Select your museum before starting; the AI greets you with context about current exhibitions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript 5, Tailwind CSS 4 |
| AI | Gemini Live API, Google ADK, `@google/genai` |
| Database | Firebase Firestore, Firebase Auth |
| Maps | Google Places API (New), Geolocation API |
| Deploy | Docker, Cloud Run (Seoul), GitHub Actions CI/CD |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Google AI Studio API key
- Firebase project
- Google Places API key

### Setup

```bash
git clone https://github.com/wigtn/wigtn-timelens.git
cd wigtn-timelens
npm install
cp .env.example .env.local
# Fill in your API keys in .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_GENAI_API_KEY` | Google AI Studio API key |
| `GOOGLE_PLACES_API_KEY` | Places API key (server-side) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase client API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key |
| `NEXT_PUBLIC_APP_URL` | App URL (default: `http://localhost:3000`) |

See `.env.example` for the full list.

## Scripts

```bash
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm start            # Production server
npm run lint         # ESLint
npm run type-check   # TypeScript validation
```

## Architecture

```
User Device (Camera + Mic)
    │
    ▼
┌─────────────────────────────┐
│  Next.js Frontend (React)   │
│  - MuseumSelector           │
│  - Live Session UI          │
│  - Restoration Viewer       │
└──────────┬──────────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌────────┐  ┌──────────┐
│ Live   │  │ REST API │
│ API    │  │ Routes   │
│(stream)│  │(on-demand│
└───┬────┘  └────┬─────┘
    │            │
    ▼            ▼
┌─────────────────────────────┐
│  Gemini (Live + Flash)      │
│  + Google Search Grounding  │
│  + Places API               │
│  + Firebase                 │
└─────────────────────────────┘
```

**Dual Pipeline:**
- **Pipeline 1 (Live):** Streaming audio/video via Gemini Live API with function calling
- **Pipeline 2 (REST):** Image restoration, discovery, diary generation via server API routes

## Project Structure

```
src/
  app/            # Next.js pages & API routes
  shared/         # Shared types, Gemini tools, configs
  web/            # Client components & hooks
  back/           # Server-side logic (agents, geo, Firebase)
mobile/           # React Native + Expo app
docs/             # PRDs, design docs, contracts
```

## Deployment

Deployed to **Google Cloud Run** (asia-northeast3, Seoul) via GitHub Actions.

```bash
# Manual build (optional)
docker build -t timelens .
docker run -p 8080:8080 timelens
```

## License

This project was created for the Gemini Live Agent Challenge hackathon.
