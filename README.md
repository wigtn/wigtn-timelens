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
  <img src="https://img.shields.io/badge/Google_ADK-0.3-4285F4?logo=google&logoColor=white" alt="Google ADK" />
  <img src="https://img.shields.io/badge/GenAI_SDK-1.43-4285F4?logo=google&logoColor=white" alt="GenAI SDK" />
  <img src="https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black" alt="Firebase" />
  <img src="https://img.shields.io/badge/Cloud_Run-Seoul-4285F4?logo=googlecloud&logoColor=white" alt="Cloud Run" />
</p>

Built for the **Gemini Live Agent Challenge**.

## UX Flow

### Onboarding

<p align="center">
  <img src="assets/design/01-landing.jpeg" alt="Landing Page" height="420" />
  &nbsp;&nbsp;
  <img src="assets/design/02-permissions.jpeg" alt="Permission Setup" height="420" />
  &nbsp;&nbsp;
  <img src="assets/design/03-overview.jpeg" alt="Overview" height="420" />
</p>

<p align="center">
  <em>Select your language and start → Grant camera & microphone access → "Point your camera at an artifact, and a thousand-year story begins."</em>
</p>

### Session Start

<p align="center">
  <img src="assets/design/06-session-init.png" alt="Session Init" height="500" />
  &nbsp;&nbsp;
  <img src="assets/design/07-curator-greeting.png" alt="AI Curator Greeting" height="500" />
</p>

<p align="center">
  <em>Gemini Live session initializes with your museum context → AI curator greets with today's live exhibitions via Google Search Grounding</em>
</p>

### Live Experience

<p align="center">
  <img src="assets/design/05-recognition.png" alt="Artifact Recognition" height="500" />
  &nbsp;&nbsp;
  <img src="assets/design/08-live-conversation.png" alt="Live Conversation" height="500" />
  &nbsp;&nbsp;
  <img src="assets/design/04-restoration.png" alt="Restoration" height="500" />
</p>

<p align="center">
  <em>recognize_artifact identifies the Winged Victory in real-time → Voice conversation with historical narration → AI-generated restoration showing the original Hellenistic appearance</em>
</p>

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

<p align="center">
  <img src="assets/time-lens-architecture.jpeg" alt="TimeLens Architecture" width="800" />
</p>

TimeLens runs on a **dual-pipeline architecture**:

- **Pipeline 1 — Live Streaming:** A persistent WebSocket session with Gemini Live API (`gemini-2.5-flash-native-audio`). Microphone audio (PCM16, 16kHz) and camera frames (JPEG, 1fps) stream into the model simultaneously. The model responds with real-time voice output and triggers function calls when needed.
- **Pipeline 2 — REST On-Demand:** Server-side API routes handle heavier tasks like image generation and external API calls. These are invoked by function calls from Pipeline 1.

### Function Calling Workflow

<p align="center">
  <img src="assets/time-lens-function-calling-workflow.png" alt="Function Calling Workflow" width="720" />
</p>

The Gemini Live Agent uses **4 function declarations** to route user intent — no intent classifier needed. The model decides which tool to call based on conversation context:

| Tool | Trigger | Backend | Pipeline |
|------|---------|---------|----------|
| `recognize_artifact` | Camera frame detected | Gemini Live API + Google Search Grounding | In-session (no REST call) |
| `generate_restoration` | "Show me the original" | `POST /api/restore` → Gemini 2.5 Flash Image | REST |
| `discover_nearby` | "What's nearby?" + GPS | `GET /api/discover` → Google Places API | REST |
| `create_diary` | "Make my diary" | `POST /api/diary/generate` → Gemini 3 Pro Image | REST |

> `recognize_artifact` is the only tool that stays entirely within the Live session — camera frames are already streaming, so the model analyzes them directly with Google Search Grounding. The other three tools call REST endpoints.

### Google GenAI SDK + ADK

TimeLens is built with **both** `@google/genai` and `@google/adk`:

<table>
<tr>
<th>@google/genai (SDK)</th>
<th>@google/adk (Agent Development Kit)</th>
</tr>
<tr>
<td>

**Primary path** — powers the real-time Live experience

- `GoogleGenAI` client for Live API sessions
- `Modality` for audio/image streaming
- `Type` + `Schema` for function declarations
- Image generation (Gemini Flash, Gemini 3 Pro)

**10 source files** across `src/web/`, `src/back/`, `src/shared/`

</td>
<td>

**Fallback path** — text-based agent orchestration

- `LlmAgent` for 5 specialist agents
- `FunctionTool` for 3 tool integrations
- `InMemoryRunner` for agent execution

**Agent hierarchy:**
```
timelens_orchestrator
├── curator_agent
├── restoration_agent  → generate_restoration_image
├── discovery_agent    → search_nearby_places
└── diary_agent        → generate_diary
```

</td>
</tr>
<tr>
<td><em>Always active — voice + camera streaming</em></td>
<td><em>Activates when WebSocket is unavailable</em></td>
</tr>
</table>

Both paths share the **same backend APIs** — whether a user speaks or types, they get the same restoration, discovery, and diary capabilities. Run `npx tsx scripts/adk-demo.ts` to see the ADK agents in action.

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
    agents/       # ADK agents (orchestrator + 4 specialists)
    agents/tools/ # FunctionTool implementations
mobile/           # React Native + Expo app
scripts/          # ADK demo script
firebase/         # Firestore & Storage security rules
docs/             # PRDs, design docs
assets/           # Logo, architecture diagrams
.github/          # GitHub Actions CI/CD
```

## Deployment

Deployed to **Google Cloud Run** (asia-northeast3, Seoul) via GitHub Actions.

```bash
# Manual build (optional)
docker build -t timelens .
docker run -p 8080:8080 timelens
```

## Google Cloud Services

| Service | Purpose |
|---------|---------|
| **Cloud Run** | Production deployment (Seoul region) |
| **Firebase Auth** | Anonymous authentication |
| **Cloud Firestore** | Session, visit, and diary storage |
| **Google Places API** | Museum and heritage site search |

## License

This project is licensed under the [Apache License 2.0](LICENSE).

Built for the Gemini Live Agent Challenge hackathon.

---

## 🏢 About WIGTN Crew

This project is built and maintained by **[WIGTN Crew](https://wigtn.com)** —  
an AI-native open-source research crew based in Korea.  
We build practical, domain-specialized AI tools. Fast prototyping, strong engineering, shipping real things.

| | |
|---|---|
| 🌐 Website | [wigtn.com](https://wigtn.com) |
| 🐙 GitHub | [github.com/wigtn](https://github.com/wigtn) |
| 🤗 HuggingFace | [huggingface.co/Wigtn](https://huggingface.co/Wigtn) |
| 📦 NPM | [npmjs.com/org/wigtn](https://www.npmjs.com/org/wigtn) |

### 🔬 Our Projects

| Project | Description | Status |
|---------|-------------|--------|
| [WigtnOCR](https://huggingface.co/Wigtn/Qwen3-VL-2B-WigtnOCR) | VLM-based Korean government document parser | Research |
| [WIGVO](https://wigtn.com) | Real-time PSTN voice translation (Korean↔English) | Research |
| [Claude Code Plugin](https://github.com/wigtn/wigtn-plugins-with-claude-code) | Multi-agent parallel execution ecosystem | Open Source |

> Results speak louder than résumés.
