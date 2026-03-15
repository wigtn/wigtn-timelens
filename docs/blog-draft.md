# Building TimeLens: An AI Museum Curator Powered by Gemini Live API

> *This project was built for the Gemini Live Agent Challenge hackathon. #GeminiLiveAgentChallenge*

## What is TimeLens?

TimeLens is an AI-powered museum companion that turns your phone into a personal curator. Point your camera at an artifact, and TimeLens identifies it, tells you its story, and even shows you what it looked like centuries ago — all through natural voice conversation.

<!-- TODO: 앱 스크린샷 삽입 (세션 화면 + 카메라 뷰) -->

## The Problem

Museums are full of incredible stories, but most visitors walk past 90% of the artifacts. Audio guides are boring. Reading every placard is exhausting. What if you could just *talk* to someone who knows everything about the museum you're in?

## Architecture: Dual Pipeline Design

TimeLens runs on two parallel pipelines:

```
┌──────────────────────┐
│   User Device        │
│   (Camera + Mic)     │
└──────────┬───────────┘
           │
     ┌─────┴──────┐
     ▼            ▼
┌──────────┐  ┌──────────┐
│Pipeline 1│  │Pipeline 2│
│  LIVE    │  │  REST    │
│(Streaming│  │(On-demand│
│  Voice)  │  │  APIs)   │
└────┬─────┘  └────┬─────┘
     │              │
     └──────┬───────┘
            ▼
┌────────────────────┐
│  Google Cloud      │
│  + Gemini APIs     │
│  + Cloud Run       │
│  + Firebase        │
└────────────────────┘
```

**Pipeline 1 (Live Streaming)** handles real-time voice conversation via Gemini Live API. The user speaks, Gemini responds with audio, and everything streams over WebSocket. This is the core experience — talking to your AI curator friend.

**Pipeline 2 (REST)** handles on-demand operations: artifact restoration images (Gemini Flash), nearby site discovery (Google Places API), and visit diary generation. These are triggered by Function Calling from the Live API session.

## Google AI Models & APIs Used

| Feature | Google Service | How We Use It |
|---------|---------------|---------------|
| Voice conversation | **Gemini Live API** | Real-time bidirectional audio streaming |
| Artifact recognition | **Gemini Live API** + Function Calling | Camera frame → `recognize_artifact()` tool |
| Exhibition search | **Google Search Grounding** | Real-time museum exhibition info |
| Image restoration | **Gemini 2.5 Flash** | Generate historically accurate restoration images |
| Video restoration | **Veo 3.1** | Time-lapse restoration animation |
| Nearby discovery | **Google Places API** | Find museums and heritage sites |
| User data | **Firebase** (Auth + Firestore) | Anonymous auth, session/visit/diary storage |

## How the Live API Powers the Curator

The heart of TimeLens is a single Gemini Live API session with a carefully crafted system prompt. Instead of building complex routing logic, we let the AI handle conversation flow naturally:

```typescript
// System prompt injects museum context
const systemPrompt = `You are TimeLens, the user's personal AI curator friend.
The user is at ${museum.name} (${museum.address}).

## Conversation Flow
1. GREETING: Use Google Search to find current exhibitions,
   then greet with specific options
2. CONTEXTUAL CHAT: Natural conversation about artifacts
3. CAMERA (ON DEMAND): When user shows something → recognize_artifact()
4. RESTORATION (ON DEMAND): When user asks → generate_restoration()
`;
```

The key insight: **the Live API's native Function Calling IS the orchestrator**. We defined 4 tools (`recognize_artifact`, `generate_restoration`, `discover_nearby`, `create_diary`) and Google Search Grounding. The AI decides when to call them based on the conversation context.

### Function Calling Flow

```
User: "이거 봐봐" (Look at this)
  → Live API receives audio + camera frame
  → AI calls recognize_artifact({name: "Amphora", era: "500 BC", ...})
  → Client receives tool result → renders artifact card
  → AI narrates: "This is a Greek amphora from 500 BC..."

User: "원래 어떻게 생겼어?" (What did it look like originally?)
  → AI calls generate_restoration({artifact_name: "Amphora", era: "500 BC"})
  → REST API generates restoration image via Gemini Flash
  → Client renders before/after slider
  → AI narrates the restoration while image generates
```

## Technical Challenges & Solutions

### 1. Korean Speech Transcription Quality

Gemini's `outputTranscription` for Korean often lacks proper word spacing:

```
Before: "안녕하세요뮤지엄209에오신걸환영해요"
After:  "안녕하세요.\n뮤지엄209에오신걸 환영해요."
```

**Solution**: Post-processing with regex to insert line breaks after sentence-ending punctuation, plus prompt-level rules for short sentences (max 15 words).

```typescript
export function cleanOutputTranscript(text: string): string {
  return sanitizeTranscript(text)
    .replace(/([.?!])(?=[^\s.?!,\d'"])/g, '$1\n')
    .replace(/(,)(?=[^\s.?!,\d'"])/g, '$1 ')
    .replace(/[^\S\n]{2,}/g, ' ');
}
```

### 2. Camera Capture Timing

Users need to know exactly *when* the AI is analyzing their camera. We added:
- **iOS-style shutter button** for manual capture
- **White flash overlay** (0.2s fade) on capture — both manual and voice-triggered
- **Voice auto-capture**: saying "이거 뭐야?" (What is this?) triggers automatic photo capture with the same visual feedback

### 3. Firebase Connection Hanging

Firebase's `createSession()` would occasionally hang indefinitely on slow networks. We wrapped it with `Promise.race`:

```typescript
await Promise.race([
  createSession(sessionId, { userId, language }),
  new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Firestore timeout')), 5000)
  ),
]);
```

### 4. Multilingual System Prompt

The system prompt adapts to the user's language — not just the response language, but also the speech style rules and greeting examples:

```typescript
// Korean users get Korean-specific speech rules
${language === 'ko'
  ? `- 띄어쓰기를 정확히 지키며 말하세요. 한 문장은 15단어 이내로.`
  : `- Avoid run-on sentences — prefer short, clear statements.`}
```

## Deployment: Fully Automated CI/CD

Every push to `main` triggers automatic deployment:

```
git push → GitHub Actions → Docker Build
  → Artifact Registry (asia-northeast3)
  → Cloud Run (Seoul region)
  → Health check verification
```

<!-- TODO: Cloud Run 콘솔 스크린샷 또는 GitHub Actions 로그 스크린샷 -->

The entire infrastructure is defined as code:
- [`Dockerfile`](https://github.com/wigtn/wigtn-timelens/blob/main/Dockerfile) — Multi-stage build (deps → build → runtime)
- [`.github/workflows/deploy.yml`](https://github.com/wigtn/wigtn-timelens/blob/main/.github/workflows/deploy.yml) — GitHub Actions pipeline
- [`cloudbuild.yaml`](https://github.com/wigtn/wigtn-timelens/blob/main/cloudbuild.yaml) — Alternative Cloud Build config

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript 5, Tailwind CSS 4 |
| AI | Gemini Live API, Gemini 2.5 Flash, Veo 3.1, Google Search Grounding |
| Backend | Next.js API Routes, Zod validation |
| Database | Firebase Firestore + Anonymous Auth |
| Maps | Google Places API (New) |
| Deploy | Docker, Cloud Run (asia-northeast3), GitHub Actions |
| Mobile | React Native + Expo (shared types with web) |

## What I Learned

1. **Gemini Live API is powerful but opinionated** — The native audio model handles conversation flow better than any custom orchestrator we could build. Let it do its thing.

2. **Function Calling as routing** — Instead of building a complex agent framework, 4 well-defined function declarations + a good system prompt handles all the routing naturally.

3. **Google Search Grounding is magic** — Real-time exhibition info, opening hours, historical facts — all without any pre-built database. The AI just *knows*.

4. **Post-processing matters for CJK languages** — The model's transcription quality for Korean/Japanese/Chinese needs client-side cleanup. Don't assume the raw output is display-ready.

5. **Prompt engineering is product design** — 80% of the UX comes from the system prompt. The greeting scenario, conversation flow, and speech style rules are more important than any UI component.

## Try It

- **Live Demo**: [timelens-52yupsvklq-du.a.run.app](https://timelens-52yupsvklq-du.a.run.app)
- **Source Code**: [github.com/wigtn/wigtn-timelens](https://github.com/wigtn/wigtn-timelens)

<!-- TODO: 데모 영상 링크 또는 GIF -->

---

*Built by Team WIGTN for the [Gemini Live Agent Challenge](https://googleai.devpost.com/). This project was built for the #GeminiLiveAgentChallenge hackathon.*

*#GeminiLiveAgentChallenge #GeminiAPI #GoogleCloud #CloudRun #Museum #AI*
