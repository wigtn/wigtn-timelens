# TimeLens Mobile

> AI Cultural Heritage Companion — Real-time museum curator powered by Gemini Live API

TimeLens is a React Native app that turns your phone into an AI-powered museum companion. Point your camera at any artifact, and the AI curator identifies it, narrates its history, and converses with you naturally — all in real-time through continuous audio/video streaming.

## Why Native?

Unlike the web version, the native app provides:

- **Background audio** — AI keeps talking even when the screen is off
- **Persistent WebSocket** — Gemini Live API connection stays alive in background
- **Earphone support** — Walk through a museum hands-free while the AI narrates
- **2fps camera streaming** — Smoother real-time artifact recognition

## Architecture

```
┌─────────────────────────────────────┐
│  React Native + Expo (Client)       │
│  ─ expo-camera (2fps frame stream)  │
│  ─ expo-av (PCM 16kHz → 24kHz)     │
│  ─ WebSocket → Gemini Live API      │
│  ─ Background audio mode            │
└──────────────┬──────────────────────┘
               │ Ephemeral token
               ▼
┌─────────────────────────────────────┐
│  Next.js Backend (API)              │
│  ─ POST /api/session (token)        │
│  ─ POST /api/restore (restoration)  │
│  ─ GET  /api/discover (places)      │
│  ─ POST /api/diary/generate         │
└─────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo 55, React Native 0.83, React 19 |
| Navigation | Expo Router 55 |
| AI | Gemini Live API via `@google/genai` |
| Camera | `expo-camera` |
| Audio | `expo-av` (capture + playback) |
| Animations | `react-native-reanimated` |
| Gestures | `react-native-gesture-handler` |
| Backend | Next.js 15 (existing web app) |

## Project Structure

```
mobile/
├── app/                        # Expo Router screens
│   ├── _layout.tsx             # Root layout
│   ├── index.tsx               # Landing + permission gate
│   └── session.tsx             # Main session (camera + AI)
├── components/
│   ├── AudioVisualizer.tsx     # Breathing idle + waveform
│   ├── ConnectionOverlay.tsx   # 5-stage connection UX
│   ├── KnowledgePanel.tsx      # Swipeable bottom sheet
│   └── LiveTranscript.tsx      # Real-time subtitle overlay
├── hooks/
│   └── use-live-session.ts     # Unified session hook
├── lib/
│   ├── gemini/
│   │   ├── live-api.ts         # Gemini WebSocket + Function Calling
│   │   └── tools.ts            # System prompt + 4 tool declarations
│   ├── audio/
│   │   ├── capture.ts          # Mic → PCM 16kHz base64 chunks
│   │   └── playback.ts         # PCM 24kHz base64 → WAV → speaker
│   └── camera/
│       └── capture.ts          # 2fps JPEG frame loop
├── types/
│   ├── common.ts               # Shared types
│   └── live-session.ts         # Session, events, results
├── constants/
│   └── config.ts               # API URL, frame rate config
├── app.json                    # Expo config (permissions, plugins)
├── tsconfig.json
└── package.json
```

## Key Features

### Proactive AI Curator
The AI doesn't wait for you to ask — it actively narrates what it sees through the camera, identifies artifacts, and tells stories. System prompt enforces "no silence >5 seconds" when camera shows something.

### Connection Stage UX
Five-step progress overlay during connection:
1. Creating session (token)
2. Connecting to AI (WebSocket)
3. Setting up microphone
4. Activating camera
5. Ready

### Live Transcript
Subtitle-style overlay showing AI speech in real-time. Auto-fades after 4 seconds. Visible when the knowledge panel is closed or minimized.

### Audio Visualizer
- **Idle**: Breathing sine-wave animation (alive presence)
- **Speaking**: Dynamic waveform bars
- **Listening**: Blue-tinted waveform
- **Generating**: Purple pulsing animation

### Knowledge Panel
Four-state bottom sheet (closed → mini → expanded → fullscreen) with swipe gestures. Shows artifact summary, topic chips, and conversation transcript.

### Function Calling
Four AI-triggered tools:
- `recognize_artifact` — Structured artifact metadata for UI
- `generate_restoration` — Historical restoration image
- `discover_nearby` — Nearby cultural heritage sites
- `create_diary` — Museum visit journal

## Quick Start

```bash
# 1. Install dependencies
cd mobile
npm install

# 2. Update API URL to your local IP
# Edit constants/config.ts → API_BASE_URL

# 3. Start the backend (from project root)
cd ..
npm run dev

# 4. Start Expo (from mobile/)
cd mobile
npx expo start

# 5. Scan QR code with Expo Go on your phone
```

## Environment

The mobile app requires the Next.js backend to be running. The backend needs:

```env
GOOGLE_GENAI_API_KEY=your_gemini_api_key
```

Set in the project root's `.env.local` file.

## Platform Config

### iOS
- Background audio mode enabled (`UIBackgroundModes: ["audio"]`)
- Camera + Microphone permission descriptions
- Portrait orientation locked

### Android
- Camera, Microphone, Location permissions declared
- Adaptive icons configured
- Portrait orientation

## Scripts

```bash
npm start          # Start Expo dev server
npm run ios        # Start on iOS simulator
npm run android    # Start on Android emulator
npm run type-check # TypeScript validation
```

## License

Part of the TimeLens project for the Gemini Live Agent Challenge.
