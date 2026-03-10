<p align="center">
  <img src="assets/logo.png" alt="TimeLens Logo" width="200" />
</p>

<h1 align="center">TimeLens</h1>

<p align="center">AI-powered cultural heritage companion that brings museum artifacts to life through real-time conversation, image restoration, and interactive discovery.</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/Gemini-Live_API-4285F4?logo=google&logoColor=white" alt="Gemini Live API" />
  <img src="https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black" alt="Firebase" />
  <img src="https://img.shields.io/badge/Cloud_Run-Seoul-4285F4?logo=googlecloud&logoColor=white" alt="Cloud Run" />
</p>

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
                    ┌──────────────────────┐
                    │   User Device        │
                    │   (Camera + Mic)     │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Next.js Frontend   │
                    │   (React 19 + TS 5)  │
                    ├──────────────────────┤
                    │  MuseumSelector      │
                    │  OnboardingSplash    │
                    │  Session Page        │
                    │  TranscriptChat      │
                    │  CameraView (PIP)    │
                    │  RestorationOverlay  │
                    └───────┬──────┬───────┘
                            │      │
              ┌─────────────┘      └─────────────┐
              ▼                                   ▼
    ┌──────────────────┐              ┌──────────────────┐
    │  Pipeline 1      │              │  Pipeline 2      │
    │  LIVE (Stream)   │              │  REST (On-demand) │
    │                  │              │                   │
    │  Gemini Live API │              │  /api/restore     │
    │  + Audio I/O     │              │  /api/discover    │
    │  + Video frames  │              │  /api/diary/*     │
    │  + Function Call │              │  /api/museums/*   │
    │  + Search Ground │              │  /api/session     │
    └────────┬─────────┘              └────────┬──────────┘
             │                                 │
             └──────────┬──────────────────────┘
                        ▼
              ┌──────────────────┐
              │  External APIs   │
              ├──────────────────┤
              │  Gemini Live API │
              │  Gemini Flash    │
              │  Google Search   │
              │  Places API      │
              │  Firebase        │
              └──────────────────┘
```

**Dual Pipeline:**
- **Pipeline 1 (Live):** Streaming audio/video via Gemini Live API with function calling
- **Pipeline 2 (REST):** Image restoration, discovery, diary generation via server API routes

### REST API Routes

| Route | Purpose | Backend |
|-------|---------|---------|
| `POST /api/session` | Create session + ephemeral token | Gemini API |
| `GET /api/museums/nearby` | GPS-based museum search | Places API |
| `GET /api/museums/search` | Text search for museums | Places API |
| `POST /api/restore` | Generate artifact restoration | Gemini Flash |
| `GET /api/discover` | Find nearby heritage sites | Places API |
| `POST /api/diary/generate` | Generate visit diary | Gemini + Firestore |
| `GET /api/diary/[id]` | Retrieve diary | Firestore |

## Project Structure

```
src/
  app/            # Next.js pages & API routes
  shared/         # Shared types, Gemini tools, configs
  web/            # Client components & hooks
  back/           # Server-side logic (agents, geo, Firebase)
mobile/           # React Native + Expo app
firebase/         # Firestore & Storage security rules
docs/             # PRDs, design docs
assets/           # Logo, reference images
.github/          # GitHub Actions CI/CD
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
