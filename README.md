<p align="center">
  <img src="assets/logo.png" alt="TimeLens" width="360" />
</p>

<p align="center">
  <strong>AI-powered cultural heritage companion</strong><br/>
  Brings museum artifacts to life through real-time conversation, image restoration, and interactive discovery.
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a>
</p>

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

- **Node.js 20+** and **npm 10+** — [Download](https://nodejs.org/)
- **Google Chrome** (recommended) — Microphone & camera permissions work best on Chrome
- API keys (see Step 2 below)

### Step 1: Clone & Install

```bash
git clone https://github.com/wigtn/wigtn-timelens.git
cd wigtn-timelens
npm install
```

### Step 2: Prepare API Keys

Copy the template first:

```bash
cp .env.example .env.local
```

#### 2-1. Gemini API Key (Required)

**This is the only key you need** to use the core features: voice conversation, artifact recognition, image restoration, and diary generation.

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **"Create API Key"**
3. Copy the key into `.env.local`:

```env
GOOGLE_GENAI_API_KEY=your_gemini_api_key_here
```

> With just this key, you can start the app and use Live AI Curator, Artifact Recognition, Image Restoration, and Visit Diary.

#### 2-2. Firebase Project (Optional — for session persistence)

Without Firebase, the app works fully but session history and diary sharing won't persist across page reloads.

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Create a project** (or use existing)
2. Enable **Authentication** → Sign-in method → **Anonymous** → Enable
3. Enable **Cloud Firestore** → Create database → Start in **test mode**
4. Go to **Project Settings** → **General** → scroll to **"Your apps"** → click **Web** (`</>`) → Register app
5. Copy the config values into `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

#### 2-3. Google Maps & Places API Keys (Optional — for museum search & nearby discovery)

Without these keys, the "What's nearby?" discovery feature won't work, but all other features remain fully functional.

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an API key (or use existing)
3. Enable these APIs in [APIs & Services → Library](https://console.cloud.google.com/apis/library):
   - **Maps JavaScript API** (for museum map display)
   - **Places API (New)** (for nearby museum/heritage site search)
4. Copy the keys into `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key
GOOGLE_PLACES_API_KEY=your_places_api_key
```

> **Tip**: You can use the same API key for both if both APIs are enabled on it.

#### Final `.env.local` checklist

```env
# Gemini (Required — powers all AI features)
GOOGLE_GENAI_API_KEY=✅

# Firebase (Optional — session persistence & diary sharing)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# Maps & Places (Optional — museum search & nearby discovery)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_PLACES_API_KEY=

# App URL (keep default for local dev)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in **Chrome**.

### Step 4: Use TimeLens

1. **Allow permissions** — Grant microphone and camera access when prompted
2. **Select a museum** — Pick one from the nearby list, search by name, or skip to start directly
3. **Start a session** — The AI curator will greet you with context about current exhibitions
4. **Try these voice commands**:
   - *"이거 뭐야?"* / *"What is this?"* — Point camera at an artifact
   - *"원래 어떻게 생겼어?"* / *"Show me the original"* — Restoration
   - *"근처에 박물관 있어?"* / *"What's nearby?"* — Discovery
   - *"다이어리 만들어줘"* / *"Create my diary"* — Visit diary

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Microphone not working | Check Chrome permissions (lock icon in address bar) |
| Camera black screen | Ensure no other app is using the camera |
| "API key not configured" | Verify `GOOGLE_GENAI_API_KEY` is set in `.env.local`, then restart `npm run dev` |
| Museum search returns empty | Places API keys are optional; check that Places API (New) is enabled if you added them |
| Firebase warnings in console | Firebase keys are optional; session data won't persist without them but the app works |

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
