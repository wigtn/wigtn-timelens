# TimeLens Architecture

## Overview

TimeLens is an AI-powered museum companion built on a **dual-pipeline architecture**: a real-time streaming pipeline (Gemini Live API) for voice/video conversation, and a REST pipeline for on-demand operations like image restoration and diary generation.

## System Diagram

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

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript 5, Tailwind CSS 4 |
| AI | Gemini Live API (streaming), Gemini 2.5 Flash (image gen), Google ADK |
| Database | Firebase Firestore + Auth (anonymous) |
| Maps | Google Places API (New), Geolocation API |
| Deploy | Docker (multi-stage), Cloud Run (asia-northeast3), GitHub Actions |

## Directory Structure

```
src/
  app/                    # Next.js App Router
    api/                  # Server API routes
      museums/            # Museum search (nearby, text search)
      session/            # Session create, resume
      restore/            # Image restoration proxy
      discover/           # Nearby discovery proxy
      diary/              # Diary generation & retrieval
    session/              # Main session page
    diary/[id]/           # Diary SSR page
  shared/                 # Shared across client & server
    types/                # TypeScript type contracts
    gemini/               # Tool declarations, system prompts
  web/                    # Client-only code
    components/           # React components
    hooks/                # Custom hooks (live-session, camera, mic, geo)
    lib/                  # Client utilities (gemini, audio, camera, ws)
  back/                   # Server-only code
    agents/               # ADK agents (curator, restoration, discovery, diary)
    lib/                  # Server utilities (firebase, geo/places)
mobile/                   # React Native + Expo app
firebase/                 # Firestore & Storage security rules
assets/                   # Logo, reference images
docs/                     # Documentation
  design/                 # Architecture docs (this file)
  prd/                    # Product requirements
.github/                  # GitHub Actions CI/CD
```

## Pipeline 1: Live Streaming

Real-time voice/video conversation with museum artifacts.

```
User speaks → Mic capture → PCM16 audio
  → Gemini Live API session (WebSocket)
    → System Prompt (museum-aware)
    → Function Calling: recognize_artifact, generate_restoration,
                        discover_nearby, create_diary
    → Google Search Grounding (exhibitions, facts)
  → AI audio response → Playback queue → Speaker
  → Transcript events → TranscriptChat UI
```

**Key files:**
- `src/web/lib/gemini/live-api.ts` — Live API session manager
- `src/shared/gemini/tools.ts` — Function declarations + system prompt
- `src/web/hooks/use-live-session.ts` — Main integration hook
- `src/web/lib/audio/capture.ts` — Mic audio capture (PCM16)
- `src/web/lib/audio/playback.ts` — Audio playback queue

## Pipeline 2: REST API

On-demand operations triggered by Function Calling results.

| Route | Purpose | Backend |
|-------|---------|---------|
| `POST /api/session` | Create session + ephemeral token | Gemini API |
| `GET /api/museums/nearby` | GPS-based museum search | Places API |
| `GET /api/museums/search` | Text search for museums | Places API |
| `POST /api/restore` | Generate artifact restoration | Gemini Flash |
| `GET /api/discover` | Find nearby heritage sites | Places API |
| `POST /api/diary/generate` | Generate visit diary | Gemini + Firestore |
| `GET /api/diary/[id]` | Retrieve diary | Firestore |

All routes use **Zod validation** and return **ApiResponse<T>** format.

## User Flow

```
Landing (/) → "Start" button
  → PermissionGate (camera + mic)
  → MuseumSelector (GPS nearby list / text search / skip)
  → OnboardingSplash (museum welcome + connecting)
  → Session (/session)
    → Voice conversation with AI curator
    → On-demand camera (artifact recognition)
    → Restoration, Discovery, Diary via Function Calling
```

## Museum Context Injection

When a user selects a museum, the context flows through:

```
MuseumSelector → SessionConfig.museum
  → use-live-session.ts → LiveSessionConfig.museum
    → live-api.ts → getSystemInstruction(lang, museum)
      → System prompt includes museum name, address
      → AI greets with museum-specific context
      → Google Search Grounding finds current exhibitions
```

## Data Model (Firebase)

```
sessions/{sessionId}
  - userId, language, museum?, startedAt, endedAt

sessions/{sessionId}/visits/{visitId}
  - artifactName, era, civilization, topics[], confidence
  - beforeImage?, restorationUrl?

diaries/{diaryId}
  - userId, sessionId, title, content, imageUrls[]
  - museum?, createdAt
```

## Key Design Decisions

1. **Live API as orchestrator** — System prompt + Function Calling handles all routing. ADK agents are REST-only fallback.
2. **Server-side API proxies** — All external API keys (Places, Gemini) stay on server. Client never sees them.
3. **Museum context via prompt injection** — No pre-fetched exhibition data. AI uses Search Grounding for real-time info.
4. **Backward-compatible contracts** — All shared type extensions use optional fields only.
5. **Dual camera mode** — Camera is on-demand (not always-on). User opens it when they want to show an artifact.
