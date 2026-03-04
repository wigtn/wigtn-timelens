# TimeLens Part 1: Core Pipeline -- 상세 설계 문서

> **파트**: Part 1 (코어 파이프라인)
> **버전**: 1.0
> **최종 수정**: 2026-03-04
> **목적**: Claude Code가 이 문서만 읽고 Part 1의 모든 파일을 독립적으로 구현할 수 있는 수준의 상세 명세
> **참조 문서**: `docs/contracts/shared-contract.md`, `docs/contracts/gemini-sdk-reference.md`, `docs/prd/timelens-prd-ko.md`, `docs/prd/timelens-ui-flow.md`
>
> **Source of Truth**: env var / model ID → `docs/contracts/gemini-sdk-reference.md` · 타입 / 파일 소유권 → `docs/contracts/shared-contract.md` · 충돌 시 위 문서가 우선

---

## 0. 아키텍처 결정 요약 (확정)

| 결정 | 내용 |
|---|---|
| **Live API 연결** | Ephemeral Token 방식. 서버가 `ai.authTokens.create()` 호출 → 클라이언트가 토큰으로 직접 Gemini Live API에 WebSocket 연결 |
| **ADK 전략** | Live API의 자체 Function Calling으로 오케스트레이션. System prompt가 Orchestrator 역할. ADK는 서버 REST 에이전트 전용 (Part 3/4) |
| **듀얼 파이프라인** | Pipeline 1: Live API(스트리밍 오디오/비디오), Pipeline 2: REST(이미지 생성 등) |
| **모델** | `gemini-2.5-flash-native-audio-preview-12-2025` |
| **음성** | 입력: PCM 16-bit, 16kHz, mono. 출력: PCM 16-bit, 24kHz, mono |
| **비디오** | base64 JPEG, 1 FPS, max 768px |

```
┌──────────────────────────────────────────────────────────────┐
│ Ephemeral Token 연결 흐름                                     │
│                                                              │
│ Step 1: 토큰 발급                                            │
│ 클라이언트 ──HTTP POST──► 우리 서버 (API Key)                 │
│            ◄──────────── { token, sessionId, expiresAt }     │
│                                                              │
│ Step 2: 직접 연결                                            │
│ 클라이언트 ──WS (token)──────────────► Gemini Live API       │
│            ◄──────── 양방향 오디오/비디오 스트리밍 ──►        │
│                                                              │
│ Step 3: Function Call Bridge                                 │
│ Live API ──tool_call──► 클라이언트 ──REST──► 우리 서버       │
│                                              (복원/발견/일기) │
│          ◄──tool_response──  ◄──result──     │
└──────────────────────────────────────────────────────────────┘
```

---

## 1. 파일 소유권 맵

```
src/
├── app/api/
│   ├── session/route.ts           ← 세션 생성 + Ephemeral Token
│   ├── session/resume/route.ts    ← 세션 재연결
│   ├── restore/route.ts           ← 복원 프록시 (스캐폴드, Part 3 구현)
│   ├── discover/route.ts          ← Discovery 프록시 (스캐폴드, Part 4 구현)
│   ├── diary/generate/route.ts    ← Diary 생성 프록시 (스캐폴드, Part 4 구현)
│   ├── diary/[id]/route.ts        ← Diary 조회 (스캐폴드, Part 4 구현)
│   └── health/route.ts            ← Health check
├── lib/
│   ├── gemini/
│   │   ├── client.ts              ← 서버사이드 GoogleGenAI 싱글턴
│   │   ├── live-api.ts            ← 클라이언트 Live API 세션 관리 클래스
│   │   ├── tools.ts               ← Function Call 도구 선언 + 시스템 프롬프트
│   │   └── search-grounding.ts    ← 검색 그라운딩 소스 추출 유틸
│   ├── audio/
│   │   ├── capture.ts             ← 마이크 → PCM 16kHz → base64
│   │   └── playback.ts            ← base64 PCM 24kHz → AudioContext 재생
│   ├── camera/
│   │   └── capture.ts             ← 카메라 → JPEG 768px → 1fps 루프
│   └── ws/
│       └── manager.ts             ← WebSocket 라이프사이클 (재연결 포함)
└── hooks/
    ├── use-live-session.ts        ← 메인 통합 훅 (Part 2가 소비)
    ├── use-camera.ts              ← 카메라 스트림 접근
    └── use-microphone.ts          ← 마이크 접근 + 볼륨 레벨
```

---

## 2. 파일별 상세 설계

### 2.1 `src/lib/gemini/client.ts` — 서버사이드 GoogleGenAI 인스턴스

**역할**: 서버 전용 GoogleGenAI 인스턴스를 싱글턴으로 제공. API Route에서 Ephemeral Token 생성, 이미지 생성 등에 사용.

```typescript
import { GoogleGenAI } from '@google/genai';

let _instance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI;
```

**구현 상세**:
1. `_instance`가 null이면 `new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })` 로 생성
2. `process.env.GOOGLE_GENAI_API_KEY`가 없으면 즉시 `throw new Error('GOOGLE_GENAI_API_KEY is not set')`
3. 싱글턴 패턴으로 재사용
4. 이 파일은 서버 전용 코드 경로에서만 import

**에러 처리**: 환경변수 누락 → fail-fast

**의존성**: `@google/genai`, `process.env.GOOGLE_GENAI_API_KEY`

---

### 2.2 `src/lib/gemini/tools.ts` — Function Call 도구 정의 + 시스템 프롬프트

**역할**: Live API 세션 config에 전달할 Function Calling 도구 선언 배열과, Orchestrator 역할의 시스템 프롬프트 정의.

```typescript
export const LIVE_API_TOOLS: object[];
export function getSystemInstruction(language: string): string;
```

#### 도구 선언 (4개)

```typescript
export const LIVE_API_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'recognize_artifact',
        description:
          'Called when the AI identifies a museum artifact, monument, or historical building from the camera view. Returns structured artifact summary data for the Knowledge Panel UI. Call this EVERY TIME you identify or re-identify an artifact/building.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the artifact/building (in user language)' },
            era: { type: 'string', description: 'Historical era or date (e.g., "460 BC", "125 AD")' },
            civilization: { type: 'string', description: 'Civilization or culture (e.g., "Ancient Greece")' },
            one_liner: { type: 'string', description: 'One sentence summary (in user language)' },
            topic_1_id: { type: 'string', description: 'First topic ID (e.g., "usage")' },
            topic_1_label: { type: 'string', description: 'First topic display label (in user language)' },
            topic_2_id: { type: 'string', description: 'Second topic ID (e.g., "technique")' },
            topic_2_label: { type: 'string', description: 'Second topic display label' },
            topic_3_id: { type: 'string', description: 'Third topic ID (e.g., "mythology")' },
            topic_3_label: { type: 'string', description: 'Third topic display label' },
            confidence: { type: 'number', description: 'Recognition confidence 0-1' },
            is_outdoor: { type: 'boolean', description: 'True if outdoor monument/building' },
            architecture_style: { type: 'string', description: 'Architecture style if applicable' },
          },
          required: ['name', 'era', 'civilization', 'one_liner',
            'topic_1_id', 'topic_1_label', 'topic_2_id', 'topic_2_label',
            'topic_3_id', 'topic_3_label', 'confidence', 'is_outdoor'],
        },
      },
      {
        name: 'generate_restoration',
        description:
          'Generate a historically accurate restoration image of a damaged artifact/building. Call when user asks to see original appearance ("show me what it looked like", "복원해줘").',
        parameters: {
          type: 'object',
          properties: {
            artifact_name: { type: 'string', description: 'Name of the artifact/building' },
            era: { type: 'string', description: 'Historical era to restore to' },
            artifact_type: { type: 'string', description: 'Type: pottery, sculpture, painting, weapon, jewelry, textile, coin, mosaic, inscription, fossil, mask, building, monument' },
            damage_description: { type: 'string', description: 'Current damage/deterioration description' },
            site_name: { type: 'string', description: 'Site name (for buildings/monuments)' },
            current_description: { type: 'string', description: 'Current state description (for buildings)' },
          },
          required: ['artifact_name', 'era'],
        },
      },
      {
        name: 'discover_nearby',
        description:
          'Search for nearby museums, historical sites, and cultural heritage. Call when user asks about nearby places.',
        parameters: {
          type: 'object',
          properties: {
            lat: { type: 'number', description: 'Latitude' },
            lng: { type: 'number', description: 'Longitude' },
            radius_km: { type: 'number', description: 'Search radius in km (default 2)' },
            interest_filter: { type: 'string', description: 'Interest filter (e.g., "ancient Egyptian")' },
          },
          required: ['lat', 'lng'],
        },
      },
      {
        name: 'create_diary',
        description:
          'Generate a museum visit diary/journal. Call when user asks for a diary ("다이어리 만들어줘").',
        parameters: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Current session ID' },
          },
          required: ['session_id'],
        },
      },
    ],
  },
];
```

#### 시스템 프롬프트

```typescript
export function getSystemInstruction(language: string): string {
  return `You are TimeLens Curator, a world-class museum docent and cultural heritage expert.
You speak like a passionate curator — knowledgeable yet approachable, story-driven.

## Core Behaviors
1. VISION ANALYSIS: Continuously analyze camera frames to identify museum artifacts
   (pottery, sculpture, painting, weapon, jewelry, textile, coin, mosaic, inscription,
   fossil, mask) and outdoor monuments/buildings.

2. ARTIFACT RECOGNITION: When you identify an artifact or building, IMMEDIATELY call
   the recognize_artifact function with structured data. This triggers the Knowledge
   Panel summary card in the UI. Do this EVERY TIME you see a new artifact.

3. VOICE NARRATION: Simultaneously provide rich audio narration about the artifact —
   origin, era, civilization, craftsmanship, cultural significance, daily life usage.
   Paint a vivid picture of the world it belonged to.

4. TOPIC DEPTH: When a user taps a topic chip or asks about a specific aspect,
   provide deep focused information on that topic. The three topics you provide in
   recognize_artifact should be the most interesting/relevant aspects.

5. SEARCH GROUNDING: Base all factual claims on verified information.

6. RESTORATION ROUTING: When user requests restoration ("show me the original",
   "복원해줘"), call generate_restoration with detailed damage description.

7. DISCOVERY ROUTING: When user asks about nearby places ("nearby museums?",
   "근처에 박물관 있어?"), call discover_nearby.

8. DIARY ROUTING: When user asks for a diary ("다이어리 만들어줘"),
   call create_diary with the session ID.

## Response Style
- Respond in ${language === 'ko' ? 'Korean' : language === 'ja' ? 'Japanese' : 'English'}
  by default, but match the user's language if they switch.
- Keep initial voice narration to 30-60 seconds. Don't over-talk.
- When interrupted, stop gracefully and address the new question.
- After calling generate_restoration, narrate what the restored version would have
  looked like while the image generates (fill the waiting time).`;
}
```

**의존성**: 없음 (순수 상수/함수 정의)

---

### 2.3 `src/lib/gemini/live-api.ts` — 클라이언트 Live API 세션 관리

**역할**: 브라우저에서 Gemini Live API에 직접 연결. Ephemeral Token 인증, 메시지 송수신, 상태 머신, Function Calling Bridge.

> **주의**: 클라이언트 전용 (`'use client'`). `@google/genai` SDK를 브라우저에서 직접 사용.

#### 클래스 시그니처

```typescript
import { GoogleGenAI, Modality, Session } from '@google/genai';
import type { LiveSessionEvents, ArtifactSummary, SessionState } from '@/types/live-session';
import type { AudioState, SessionStatus, AgentType, AppError } from '@/types/common';

export interface LiveSessionConfig {
  token: string;           // Ephemeral token (token.name)
  language: string;
  sessionId: string;
  resumeHandle?: string;   // 재연결용
}

export class LiveSession {
  private ai: GoogleGenAI | null;
  private session: Session | null;
  private events: LiveSessionEvents;
  private state: SessionState;
  private resumeHandle: string | null;
  private pendingToolCalls: Map<string, { name: string; startTime: number }>;
  private onAudioData: ((base64: string) => void) | null;

  constructor(events: LiveSessionEvents);
  async connect(config: LiveSessionConfig): Promise<void>;
  disconnect(): void;
  sendAudio(base64Pcm: string): void;
  sendVideoFrame(base64Jpeg: string): void;
  sendText(text: string): void;
  sendPhoto(base64Jpeg: string, prompt?: string): void;
  requestTopicDetail(topicId: string, topicLabel: string): void;
  interrupt(): void;
  getState(): SessionState;
  getResumeHandle(): string | null;
  setAudioDataHandler(handler: (base64: string) => void): void;
}
```

#### 상태 머신

```
disconnected ──► connecting ──► connected ──► reconnecting ──► connected
                                           │                │
                                           └── disconnected ◄┘
                                           └── expired
```

#### connect() 구현 상세

1. 상태를 `connecting`으로 전환, `events.onSessionStatusChange('connecting')` 호출
2. `this.ai = new GoogleGenAI({ apiKey: config.token })` (Ephemeral Token)
3. `getSystemInstruction(config.language)`로 시스템 프롬프트 생성
4. 세션 설정 객체 구성:

```typescript
const sessionConfig = {
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  config: {
    responseModalities: [Modality.AUDIO],
    systemInstruction: systemInstruction,
    tools: LIVE_API_TOOLS,
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: 'Kore' },
      },
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    contextWindowCompression: { slidingWindow: {} },
    sessionResumption: config.resumeHandle
      ? { handle: config.resumeHandle }
      : {},
  },
  callbacks: {
    onopen: () => this.handleOpen(),
    onmessage: (msg: any) => this.handleMessage(msg),
    onerror: (e: any) => this.handleError(e),
    onclose: (e: any) => this.handleClose(e),
  },
};
```

5. `this.session = await this.ai.live.connect(sessionConfig)`
6. 상태를 `connected`로 전환, sessionId 저장

#### handleMessage(message) — 메시지 파싱 (10개 케이스)

```typescript
private handleMessage(message: any): void {
  // 1. 세션 초기화 완료
  if (message.setupComplete) {
    this.state.status = 'connected';
    this.events.onSessionStatusChange('connected');
    return;
  }

  // 2. 오디오/텍스트 응답
  if (message.serverContent?.modelTurn?.parts) {
    for (const part of message.serverContent.modelTurn.parts) {
      if (part.inlineData) {
        this.handleAudioOutput(part.inlineData.data);
        if (this.state.audioState !== 'speaking') {
          this.state.audioState = 'speaking';
          this.events.onAudioStateChange('speaking');
        }
      }
      if (part.text) {
        this.events.onTranscript({ text: part.text, delta: part.text, isFinal: false });
      }
    }
  }

  // 3. 턴 완료
  if (message.serverContent?.turnComplete) {
    this.state.audioState = 'idle';
    this.events.onAudioStateChange('idle');
  }

  // 4. 인터럽션 (서버가 AI 발화 중단)
  if (message.serverContent?.interrupted) {
    this.state.audioState = 'listening';
    this.events.onAudioStateChange('listening');
  }

  // 5. 함수 호출 요청 → handleToolCalls()
  if (message.toolCall) {
    this.handleToolCalls(message.toolCall.functionCalls);
  }

  // 6. 함수 호출 취소
  if (message.toolCallCancellation) {
    for (const id of message.toolCallCancellation.ids || []) {
      this.pendingToolCalls.delete(id);
    }
  }

  // 7. 입력 트랜스크립션 (사용자 STT)
  if (message.inputTranscription?.text) {
    this.events.onUserSpeech({ text: message.inputTranscription.text, isFinal: true });
    if (this.state.audioState !== 'listening') {
      this.state.audioState = 'listening';
      this.events.onAudioStateChange('listening');
    }
  }

  // 8. 출력 트랜스크립션 (AI 음성의 텍스트 버전)
  if (message.outputTranscription?.text) {
    this.events.onTranscript({
      text: message.outputTranscription.text,
      delta: message.outputTranscription.text,
      isFinal: false,
    });
  }

  // 9. 세션 재접속 핸들 갱신
  if (message.sessionResumptionUpdate?.newHandle) {
    this.resumeHandle = message.sessionResumptionUpdate.newHandle;
  }

  // 10. GoAway 경고 (세션 곧 종료)
  if (message.goAway) {
    console.warn('[LiveSession] GoAway received, session ending soon');
  }
}
```

#### handleToolCalls() — Function Calling Bridge

각 도구 호출에 대한 처리:

| 도구 | 처리 방식 |
|------|----------|
| `recognize_artifact` | REST 호출 불필요. 바로 `ArtifactSummary` 파싱 → `events.onArtifactRecognized()` → `sendToolResponse()` |
| `generate_restoration` | `events.onAgentSwitch('restoration')` → `fetch('/api/restore')` → `events.onToolResult()` → `sendToolResponse()` |
| `discover_nearby` | `events.onAgentSwitch('discovery')` → `fetch('/api/discover')` → `events.onToolResult()` → `sendToolResponse()` |
| `create_diary` | `events.onAgentSwitch('diary')` → `fetch('/api/diary/generate')` → `events.onToolResult()` → `sendToolResponse()` |

**recognize_artifact 상세**:

```typescript
case 'recognize_artifact': {
  const summary: ArtifactSummary = {
    name: fc.args.name,
    era: fc.args.era,
    civilization: fc.args.civilization,
    oneLiner: fc.args.one_liner,
    topics: [
      { id: fc.args.topic_1_id, label: fc.args.topic_1_label },
      { id: fc.args.topic_2_id, label: fc.args.topic_2_label },
      { id: fc.args.topic_3_id, label: fc.args.topic_3_label },
    ],
    confidence: fc.args.confidence,
    isOutdoor: fc.args.is_outdoor,
    architectureStyle: fc.args.architecture_style,
  };
  this.state.currentArtifact = summary;
  this.state.visitCount += 1;
  this.events.onArtifactRecognized(summary);

  this.session?.sendToolResponse({
    functionResponses: [{
      id: fc.id, name: fc.name,
      response: { status: 'recognized', artifact_name: summary.name },
    }],
  });
  break;
}
```

**generate_restoration 상세** (discover_nearby, create_diary도 동일 패턴):

```typescript
case 'generate_restoration': {
  // 1. 에이전트 전환 알림
  this.events.onAgentSwitch({
    from: this.state.activeAgent, to: 'restoration',
    reason: '복원 이미지를 생성합니다',
  });
  this.state.activeAgent = 'restoration';
  this.state.audioState = 'generating';
  this.events.onAudioStateChange('generating');

  try {
    // 2. REST 호출 (Part 3 엔드포인트)
    const response = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artifactName: fc.args.artifact_name,
        era: fc.args.era,
        artifactType: fc.args.artifact_type,
        damageDescription: fc.args.damage_description,
        siteName: fc.args.site_name,
        currentDescription: fc.args.current_description,
      }),
    });
    const result = await response.json();

    if (result.success) {
      // 3. UI에 결과 전달
      this.events.onToolResult({
        tool: 'generate_restoration',
        result: {
          type: 'restoration',
          imageUrl: result.imageUrl,
          description: result.description,
          artifactName: fc.args.artifact_name,
          era: fc.args.era,
        },
      });

      // 4. Live API에 도구 응답 반환
      this.session?.sendToolResponse({
        functionResponses: [{
          id: fc.id, name: fc.name,
          response: { status: 'success', image_url: result.imageUrl, description: result.description },
        }],
      });
    } else {
      this.session?.sendToolResponse({
        functionResponses: [{
          id: fc.id, name: fc.name,
          response: { status: 'error', error: result.error },
        }],
      });
      this.events.onError({
        code: 'RESTORATION_FAILED', message: result.error || 'Failed',
        recoverable: true, action: 'retry',
      });
    }
  } catch (err) {
    this.session?.sendToolResponse({
      functionResponses: [{
        id: fc.id, name: fc.name,
        response: { status: 'error', error: 'Network error' },
      }],
    });
    this.events.onError({
      code: 'NETWORK_ERROR', message: 'Failed to reach restoration service',
      recoverable: true, action: 'retry',
    });
  } finally {
    this.pendingToolCalls.delete(fc.id);
    // 5초 후 curator로 자동 복귀
    setTimeout(() => {
      if (this.state.activeAgent !== 'curator') {
        this.state.activeAgent = 'curator';
        this.events.onAgentSwitch({ from: 'restoration', to: 'curator', reason: '' });
      }
    }, 5000);
  }
  break;
}
```

#### 데이터 전송 메서드

```typescript
sendAudio(base64Pcm: string): void {
  if (!this.session || this.state.status !== 'connected') return;
  this.session.sendRealtimeInput({
    media: { data: base64Pcm, mimeType: 'audio/pcm;rate=16000' },
  });
}

sendVideoFrame(base64Jpeg: string): void {
  if (!this.session || this.state.status !== 'connected') return;
  this.session.sendRealtimeInput({
    media: { data: base64Jpeg, mimeType: 'image/jpeg' },
  });
}

sendText(text: string): void {
  if (!this.session || this.state.status !== 'connected') return;
  this.session.sendClientContent({
    turns: [{ role: 'user', parts: [{ text }] }],
    turnComplete: true,
  });
}

sendPhoto(base64Jpeg: string, prompt?: string): void {
  if (!this.session || this.state.status !== 'connected') return;
  this.session.sendClientContent({
    turns: [{
      role: 'user',
      parts: [
        { text: prompt || 'What is this artifact? Please identify it.' },
        { inlineData: { mimeType: 'image/jpeg', data: base64Jpeg } },
      ],
    }],
    turnComplete: true,
  });
}

requestTopicDetail(topicId: string, topicLabel: string): void {
  if (!this.session || this.state.status !== 'connected') return;
  const artifactName = this.state.currentArtifact?.name || 'the current artifact';
  this.session.sendClientContent({
    turns: [{
      role: 'user',
      parts: [{ text: `Tell me more about the "${topicLabel}" aspect of ${artifactName}. Provide detailed, focused information.` }],
    }],
    turnComplete: true,
  });
}

interrupt(): void {
  // Live API는 자동 VAD — 사용자가 말하면 자동 인터럽트
  // 버튼 인터럽트: 재생 중인 오디오만 멈추면 됨 (playback.flush())
  if (this.state.audioState === 'speaking') {
    this.state.audioState = 'idle';
    this.events.onAudioStateChange('idle');
  }
}
```

#### handleClose — 종료 처리

```typescript
private handleClose(e: any): void {
  if (e?.code === 1008) {
    // API Key or config error — fatal
    this.state.status = 'expired';
    this.events.onSessionStatusChange('expired');
    this.events.onError({
      code: 'SESSION_EXPIRED', message: 'Session token expired or invalid',
      recoverable: true, action: 'retry',
    });
  } else {
    this.state.status = 'disconnected';
    this.events.onSessionStatusChange('disconnected');
  }
  this.session = null;
  this.ai = null;
}
```

**의존성**: `@google/genai`, `./tools`, `@/types/live-session`, `@/types/common`

---

### 2.3.1 `src/lib/gemini/search-grounding.ts` — 검색 그라운딩 소스 추출

**역할**: AI 응답에서 검색 그라운딩 소스 정보를 추출하여 UI에 표시할 수 있는 형태로 변환.

```typescript
export interface GroundingSource {
  title: string;
  url: string;
  snippet?: string;
}

/**
 * AI 응답 메시지에서 grounding metadata를 추출.
 * Live API의 serverContent에 groundingMetadata가 포함될 수 있음.
 */
export function extractGroundingSources(message: any): GroundingSource[];

/**
 * 소스 목록을 마크다운 형식으로 변환 (다이어리/트랜스크립트용).
 */
export function formatSourcesAsMarkdown(sources: GroundingSource[]): string;
```

**구현 상세**:
1. `message.serverContent?.groundingMetadata?.groundingChunks` 확인
2. 각 chunk에서 `web.uri`, `web.title` 추출
3. `searchEntryPoint?.renderedContent`가 있으면 snippet으로 활용
4. 중복 URL 제거 후 `GroundingSource[]` 반환

**의존성**: 없음

---

### 2.4 `src/lib/audio/capture.ts` — 마이크 오디오 캡처

**역할**: 마이크에서 오디오를 캡처 → PCM 16-bit 16kHz mono → 100ms 청크 → base64 콜백.

```typescript
export interface AudioCaptureCallbacks {
  onChunk: (base64Pcm: string) => void;
  onLevelChange: (level: number) => void;  // 0-1
}

export interface AudioCapture {
  start(): Promise<void>;
  stop(): void;
  isActive(): boolean;
  getLevel(): number;
  mute(): void;
  unmute(): void;
}

export function createAudioCapture(callbacks: AudioCaptureCallbacks): AudioCapture;
```

#### 상수

```typescript
const SAMPLE_RATE = 16000;
const CHUNK_DURATION_MS = 100;
const CHUNK_SIZE = SAMPLE_RATE * CHUNK_DURATION_MS / 1000; // 1600 samples
const BUFFER_SIZE = 4096; // ScriptProcessorNode buffer size
```

#### start() 구현

1. `navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true } })`
2. `AudioContext` 생성 — `sampleRate: 16000` 시도, 실패 시 브라우저 기본값 + 리샘플링
3. `MediaStreamSource` → `AnalyserNode` (fftSize: 256) → `ScriptProcessorNode` (bufferSize: 4096)

#### onaudioprocess 콜백

```typescript
processor.onaudioprocess = (event: AudioProcessingEvent) => {
  if (muted) return;
  const inputData = event.inputBuffer.getChannelData(0); // Float32Array

  // 리샘플링 (AudioContext.sampleRate !== 16000인 경우)
  const resampled = resampleIfNeeded(inputData, audioContext.sampleRate, 16000);

  // Float32 → Int16
  const int16 = float32ToInt16(resampled);

  // 버퍼에 누적, 1600 샘플 단위로 base64 전송
  accumulateBuffer(int16);
  while (buffer.length >= CHUNK_SIZE) {
    const chunk = buffer.slice(0, CHUNK_SIZE);
    buffer = buffer.slice(CHUNK_SIZE);
    callbacks.onChunk(int16ArrayToBase64(chunk));
  }
};
```

#### 핵심 유틸 함수

```typescript
// 선형 보간 리샘플링
function resampleIfNeeded(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const floor = Math.floor(srcIndex);
    const ceil = Math.min(floor + 1, input.length - 1);
    const t = srcIndex - floor;
    output[i] = input[floor] * (1 - t) + input[ceil] * t;
  }
  return output;
}

// Float32 [-1, 1] → Int16 [-32768, 32767]
function float32ToInt16(float32: Float32Array): Int16Array {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

// Int16Array → base64
function int16ArrayToBase64(int16: Int16Array): string {
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
```

#### 볼륨 레벨 계산

```typescript
function updateLevel(): void {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);
  const sum = dataArray.reduce((a, b) => a + b, 0);
  currentLevel = sum / dataArray.length / 255; // 0-1
  callbacks.onLevelChange(currentLevel);
}
```

#### stop()

- `processor.disconnect()` → `source.disconnect()` → `analyser.disconnect()`
- `stream.getTracks().forEach(t => t.stop())`
- `audioContext.close()`

**에러 처리**:
- `NotAllowedError` (권한 거부): `start()` Promise reject
- `NotFoundError` (마이크 없음): reject
- AudioContext 생성 실패: catch → reject

**의존성**: 없음 (Web API만 사용)

---

### 2.5 `src/lib/audio/playback.ts` — 오디오 재생 큐

**역할**: Live API에서 수신한 PCM 24kHz base64 청크를 디코딩 → AudioContext로 순차 재생. 갭 없는 스케줄링 + 인터럽트 지원.

```typescript
export interface AudioPlayback {
  enqueue(base64Pcm: string): void;
  flush(): void;       // 큐 비우기 (인터럽트)
  stop(): void;        // 완전 정지 + 리소스 해제
  isPlaying(): boolean;
  setVolume(volume: number): void;  // 0-1
}

export function createAudioPlayback(): AudioPlayback;
```

#### 핵심 설계: 갭 없는 연속 재생

```typescript
let audioContext: AudioContext | null = null;
let gainNode: GainNode | null = null;
const queue: AudioBuffer[] = [];
let nextStartTime = 0;
let isCurrentlyPlaying = false;

function enqueue(base64Pcm: string): void {
  if (!audioContext) {
    audioContext = new AudioContext({ sampleRate: 24000 });
    gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
  }
  if (audioContext.state === 'suspended') audioContext.resume();

  const int16 = base64ToInt16Array(base64Pcm);
  const float32 = int16ToFloat32(int16);
  const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
  audioBuffer.getChannelData(0).set(float32);

  queue.push(audioBuffer);
  scheduleNext();
}

function scheduleNext(): void {
  if (queue.length === 0) { isCurrentlyPlaying = false; return; }

  const buffer = queue.shift()!;
  const source = audioContext!.createBufferSource();
  source.buffer = buffer;
  source.connect(gainNode!);

  // nextStartTime으로 이전 버퍼 종료 직후 시작 → 갭 없음
  const startTime = Math.max(audioContext!.currentTime, nextStartTime);
  source.start(startTime);
  nextStartTime = startTime + buffer.duration;
  isCurrentlyPlaying = true;

  source.onended = () => {
    if (queue.length > 0) scheduleNext();
    else isCurrentlyPlaying = false;
  };
}
```

#### flush() — 인터럽트

```typescript
function flush(): void {
  queue.length = 0;
  // 현재 재생 중인 소스 중단은 AudioContext 특성상 어려움
  // nextStartTime 리셋으로 다음 enqueue 시 즉시 재생
  nextStartTime = 0;
  isCurrentlyPlaying = false;
}
```

#### 변환 함수

```typescript
function base64ToInt16Array(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

function int16ToFloat32(int16: Int16Array): Float32Array {
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
  }
  return float32;
}
```

**에러 처리**: AudioContext 생성 실패 → try-catch, 텍스트 전용 폴백

**의존성**: 없음 (Web Audio API만 사용)

---

### 2.6 `src/lib/camera/capture.ts` — 비디오 프레임 캡처

**역할**: 카메라 MediaStream에서 1fps로 JPEG 프레임 추출, 최대 768px 리사이즈, base64 변환.

```typescript
export interface CameraCapture {
  start(): Promise<MediaStream>;
  stop(): void;
  isActive(): boolean;
  captureFrame(): string | null;   // base64 JPEG (768px, 품질 0.7)
  capturePhoto(): string | null;   // base64 JPEG (원본 해상도, 품질 0.9)
  getStream(): MediaStream | null;
  startFrameLoop(onFrame: (base64Jpeg: string) => void): void;
  stopFrameLoop(): void;
}

export function createCameraCapture(): CameraCapture;
```

#### start()

```typescript
async function start(): Promise<MediaStream> {
  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'environment',  // 후면 카메라 우선
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  });

  videoElement = document.createElement('video');
  videoElement.srcObject = stream;
  videoElement.playsInline = true;
  videoElement.muted = true;
  await videoElement.play();

  canvas = document.createElement('canvas');
  ctx = canvas.getContext('2d')!;
  return stream;
}
```

#### captureFrame() — 768px 리사이즈

```typescript
function captureFrame(): string | null {
  if (!videoElement || videoElement.readyState < 2) return null;
  const { videoWidth, videoHeight } = videoElement;
  if (videoWidth === 0) return null;

  const MAX_DIM = 768;
  let w = videoWidth, h = videoHeight;
  if (w > MAX_DIM || h > MAX_DIM) {
    const scale = MAX_DIM / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(videoElement, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
}
```

#### startFrameLoop() — 1fps 자동 캡처

```typescript
let frameIntervalId: ReturnType<typeof setInterval> | null = null;

function startFrameLoop(onFrame: (base64: string) => void): void {
  stopFrameLoop();
  frameIntervalId = setInterval(() => {
    const frame = captureFrame();
    if (frame) onFrame(frame);
  }, 1000); // 1fps
}
```

**에러 처리**:
- `NotAllowedError` → reject
- `NotFoundError` → reject
- `OverconstrainedError` (후면 카메라 없음) → `facingMode` 제약 제거 후 전면 카메라로 재시도

**의존성**: 없음 (Web API만 사용)

---

### 2.7 `src/lib/ws/manager.ts` — WebSocket 라이프사이클 관리 (재연결 포함)

**역할**: 세션 끊김 시 지수 백오프로 자동 재연결 (1s → 2s → 4s, 최대 3회).

```typescript
export interface ReconnectConfig {
  maxAttempts: number;       // 기본 3
  baseDelayMs: number;       // 기본 1000
  maxDelayMs: number;        // 기본 8000
  onAttempt: (attempt: number, maxAttempts: number) => void;
  onSuccess: () => void;
  onFailure: () => void;
}

export interface ReconnectManager {
  scheduleReconnect(connectFn: () => Promise<void>): void;
  cancel(): void;
  isReconnecting(): boolean;
  getAttemptCount(): number;
}

export function createReconnectManager(config: ReconnectConfig): ReconnectManager;
```

#### 구현

```typescript
function scheduleReconnect(connectFn: () => Promise<void>): void {
  if (attempts >= config.maxAttempts) {
    _isReconnecting = false;
    config.onFailure();
    return;
  }

  _isReconnecting = true;
  const delay = Math.min(
    config.baseDelayMs * Math.pow(2, attempts) + Math.random() * 500,
    config.maxDelayMs
  );
  attempts += 1;
  config.onAttempt(attempts, config.maxAttempts);

  timeoutId = setTimeout(async () => {
    try {
      await connectFn();
      attempts = 0;
      _isReconnecting = false;
      config.onSuccess();
    } catch {
      scheduleReconnect(connectFn); // 다음 시도
    }
  }, delay);
}
```

**의존성**: 없음

---

### 2.8 `src/app/api/session/route.ts` — 세션 생성 + Ephemeral Token

**역할**: Gemini Ephemeral Token 발급. 클라이언트는 이 토큰으로 Live API에 직접 연결.

```typescript
export async function POST(request: Request): Promise<Response>;
```

**요청/응답**:
```typescript
// Request
{ language: string; userId?: string }

// Response
{ success: true, data: { sessionId: string, token: string, expiresAt: number } }
```

**구현 상세**:
1. 요청 바디에서 `language` 추출 (필수)
2. `getGeminiClient()`로 AI 클라이언트 획득
3. Ephemeral Token 생성:
   ```typescript
   const token = await ai.authTokens.create({
     config: {
       uses: 1,
       expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
       httpOptions: { apiVersion: 'v1alpha' },
     },
   });
   ```
4. 세션 ID 생성 (nanoid 또는 crypto.randomUUID)
5. (선택) Firestore에 SessionDoc 저장 — Part 5 인프라 의존
6. `{ sessionId, token: token.name, expiresAt }` 반환

**에러 처리**: 400 (language 누락), 500 (Token 생성 실패)

**의존성**: `@/lib/gemini/client`, `@google/genai`

---

### 2.9 `src/app/api/session/resume/route.ts` — 세션 재연결

```typescript
export async function POST(request: Request): Promise<Response>;
```

**구현**: 2.8과 동일하게 새 Ephemeral Token 발급. `sessionId`를 받아서 유효성 확인 후 반환.

---

### 2.10 `src/app/api/restore/route.ts` — 복원 프록시 (스캐폴드)

> **Part 1이 스캐폴드 생성, Part 3이 실제 구현**

```typescript
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    // TODO: Part 3이 구현
    return Response.json({ success: false, error: 'Not yet implemented' }, { status: 501 });
  } catch {
    return Response.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
```

---

### 2.11 `src/app/api/discover/route.ts` — Discovery 프록시 (스캐폴드)

> **Part 1이 스캐폴드 생성, Part 4가 실제 구현**

```typescript
export async function GET(request: Request): Promise<Response> {
  return Response.json({ success: false, error: 'Not yet implemented' }, { status: 501 });
}
```

---

### 2.12 `src/app/api/diary/generate/route.ts` — Diary 생성 프록시 (스캐폴드)

> **Part 1이 스캐폴드, Part 4가 구현**. 501 임시 응답.

---

### 2.13 `src/app/api/diary/[id]/route.ts` — Diary 조회 (스캐폴드)

> 501 임시 응답.

---

### 2.14 `src/app/api/health/route.ts` — Health Check

```typescript
export async function GET(): Promise<Response> {
  return Response.json({
    status: 'ok',
    version: '0.1.0',
    uptime: process.uptime(),
    services: {
      liveApi: true,   // TODO: 실제 연결 테스트
      imageGen: true,
      firestore: true,
      placesApi: true,
    },
  });
}
```

---

### 2.15 `src/hooks/use-live-session.ts` — 메인 통합 훅

**역할**: Part 2 UI가 소비하는 **유일한 인터페이스**. LiveSession + AudioCapture + AudioPlayback + CameraCapture + ReconnectManager를 하나의 React 훅으로 통합.

```typescript
'use client';

export function useLiveSession(): UseLiveSessionReturn;
```

#### 반환 타입 (Contract 준수)

```typescript
interface UseLiveSessionReturn {
  // 상태
  sessionState: SessionState;
  isConnected: boolean;
  isFallbackMode: boolean;

  // 컨트롤
  connect: (config: SessionConfig) => Promise<void>;
  disconnect: () => void;
  toggleMic: (enabled: boolean) => void;
  toggleCamera: (enabled: boolean) => void;
  interrupt: () => void;
  requestTopicDetail: (topicId: string, topicLabel: string) => void;
  sendTextMessage: (text: string) => void;
  sendPhoto: (imageBase64: string) => void;

  // 실시간 데이터
  currentArtifact: ArtifactSummary | null;
  transcript: TranscriptChunk[];
  audioState: AudioState;
  activeAgent: AgentType;
}
```

#### connect() 흐름 (9단계)

```
1. POST /api/session → { token, sessionId }
2. LiveSessionEvents 콜백 정의 (7개 이벤트)
3. new LiveSession(events) + connect({ token, language, sessionId })
4. createAudioPlayback() → liveSession.setAudioDataHandler(playback.enqueue)
5. createReconnectManager({ maxAttempts: 3, ... })
6. createAudioCapture({ onChunk → liveSession.sendAudio }) → start()
7. createCameraCapture() → start() → startFrameLoop(liveSession.sendVideoFrame)
8. 상태 → connected
9. 에러 시 → isFallbackMode: true
```

#### LiveSessionEvents 콜백 매핑

| 이벤트 | React State 업데이트 |
|--------|---------------------|
| `onArtifactRecognized(summary)` | `setCurrentArtifact(summary)` + `sessionState.visitCount++` |
| `onTranscript(data)` | `setTranscript(prev => [...])` — assistant 청크 병합 |
| `onUserSpeech(data)` | `setTranscript(prev => [..., { role: 'user', text }])` |
| `onAgentSwitch(data)` | `setActiveAgent(data.to)` |
| `onAudioStateChange(state)` | `setAudioState(state)` |
| `onSessionStatusChange('disconnected')` | `reconnectManager.scheduleReconnect()` |
| `onError(error)` | `console.error` + 에러 상태 관리 |

#### disconnect()

```typescript
const disconnect = useCallback(() => {
  reconnectRef.current?.cancel();
  cameraCaptureRef.current?.stop();
  audioCaptureRef.current?.stop();
  audioPlaybackRef.current?.stop();
  liveSessionRef.current?.disconnect();
  setSessionState(prev => ({ ...prev, status: 'disconnected', audioState: 'idle' }));
}, []);
```

#### 재연결 흐름 (onSessionStatusChange → 'disconnected' 시)

```typescript
reconnectRef.current?.scheduleReconnect(async () => {
  // 1. 새 Ephemeral Token 획득
  const res = await fetch('/api/session/resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  const { data } = await res.json();

  // 2. resume handle로 세션 복원
  const resumeHandle = liveSessionRef.current?.getResumeHandle();
  await liveSessionRef.current?.connect({
    token: data.token,
    language, sessionId,
    resumeHandle: resumeHandle || undefined,
  });
});
```

**의존성**: `LiveSession` (`@/lib/gemini/live-api`), `createAudioCapture`, `createAudioPlayback`, `createCameraCapture`, `createReconnectManager` (`@/lib/ws/manager`)

---

### 2.16 `src/hooks/use-camera.ts` — 카메라 스트림 접근 훅

```typescript
export function useCamera(): UseCameraReturn;

interface UseCameraReturn {
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => string | null;
  capturePhoto: () => string | null;
}
```

**구현**: `createCameraCapture()`를 React 상태로 래핑. `useEffect` cleanup에서 `stopCamera()`.

---

### 2.17 `src/hooks/use-microphone.ts` — 마이크 접근 훅

```typescript
export function useMicrophone(): UseMicrophoneReturn;

interface UseMicrophoneReturn {
  isActive: boolean;
  isPermissionGranted: boolean;
  error: string | null;
  audioLevel: number;         // 0-1
  startMic: () => Promise<void>;
  stopMic: () => void;
}
```

**구현**: `createAudioCapture()`를 React 상태로 래핑. `onLevelChange` → `setAudioLevel`. `useEffect` cleanup에서 `stopMic()`.

---

## 3. 데이터 흐름 다이어그램

### 3.1 오디오 파이프라인

```
입력 (마이크 → Live API):
┌──────────┐    ┌────────────────┐    ┌──────────────┐    ┌──────────────┐
│  마이크   │───►│  AudioContext   │───►│ Float32→Int16│───►│ base64 chunk │
│ (MediaStream)│ │ ScriptProcessor│    │  리샘플링     │    │  (100ms)     │
└──────────┘    └────────────────┘    └──────────────┘    └──────┬───────┘
                                                                │
                                                    sendRealtimeInput()
                                                                │
                                                    ┌───────────▼───────────┐
                                                    │    Gemini Live API    │
                                                    └───────────┬───────────┘
                                                                │
출력 (Live API → 스피커):                              onmessage (inlineData)
┌──────────┐    ┌────────────────┐    ┌──────────────┐    ┌─────┴──────────┐
│  스피커   │◄───│ AudioContext    │◄───│ Int16→Float32│◄───│ base64 PCM     │
│          │    │ BufferSource   │    │  AudioBuffer │    │ 24kHz          │
└──────────┘    │ (갭 없는 스케줄)│    └──────────────┘    └────────────────┘
                └────────────────┘
```

### 3.2 비디오 파이프라인

```
┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────────┐
│  카메라   │───►│ <video>  │───►│ Canvas       │───►│ JPEG base64  │
│(MediaStream)│ │ element  │    │ (768px max)  │    │ (1fps)       │
└──────────┘    └──────────┘    └──────────────┘    └──────┬───────┘
                                                           │
                                               sendRealtimeInput()
                                                           │
                                               ┌───────────▼───────────┐
                                               │    Gemini Live API    │
                                               └───────────────────────┘
```

### 3.3 Function Calling Bridge

```
┌──────────────────────────────────────────────────────────────────┐
│ Live API 세션                                                     │
│                                                                  │
│ "이거 새것이었을 때 어떤 모습이었는지 보여줘"                    │
│      │                                                           │
│      ▼                                                           │
│ toolCall: generate_restoration                                   │
│ { artifact_name, era, damage_description }                       │
│      │                                                           │
└──────┼───────────────────────────────────────────────────────────┘
       │
       ▼  (클라이언트가 파싱)
┌──────────────────────┐
│ handleToolCalls()     │
│                      │
│ 1. onAgentSwitch     │
│ 2. audioState →      │
│    'generating'      │
│ 3. fetch('/api/      │
│    restore')         │
└──────┬───────────────┘
       │ REST
       ▼
┌──────────────────────┐         ┌─────────────────────┐
│ /api/restore         │────────►│ Gemini 2.5 Flash     │
│ (Part 3 구현)        │◄────────│ Image Gen            │
└──────┬───────────────┘         └─────────────────────┘
       │
       ▼  (결과)
┌──────────────────────┐
│ handleToolCalls()     │
│                      │
│ 4. onToolResult      │──────► Part 2 UI: Before/After 슬라이더
│ 5. sendToolResponse  │──────► Live API: 대화 이어감
│ 6. onAgentSwitch     │
│    → 'curator'       │
└──────────────────────┘
```

### 3.4 재연결 흐름

```
Connected ──(WebSocket close)──► Disconnected
                                      │
                                      ▼
                              ┌─────────────┐
                              │ Reconnect    │
                              │ Manager      │
                              └──────┬──────┘
                                     │
                   ┌─────────────────┼─────────────────┐
                   │                 │                  │
            Attempt 1 (1s)   Attempt 2 (2s)   Attempt 3 (4s)
                   │                 │                  │
              ┌────┴────┐      ┌────┴────┐       ┌────┴────┐
              │ 성공?   │      │ 성공?   │       │ 성공?   │
              └─┬───┬───┘      └─┬───┬───┘       └─┬───┬───┘
                │   │            │   │              │   │
              Yes  No          Yes  No            Yes  No
                │   └──►next     │   └──►next       │   │
                │                │                   │   ▼
                ▼                ▼                   ▼  Fallback Mode
            Connected        Connected          Connected  (텍스트 전용)
            (resume           (resume
             handle)           handle)
```

---

## 4. 구현 순서

의존성 기반 빌드 순서:

```
Phase 1: 기반 (의존성 없음)
├── 2.1   lib/gemini/client.ts            ← 서버 클라이언트
├── 2.2   lib/gemini/tools.ts             ← 도구 + 시스템 프롬프트
├── 2.3.1 lib/gemini/search-grounding.ts  ← 검색 소스 추출
├── 2.4   lib/audio/capture.ts            ← 오디오 캡처
├── 2.5   lib/audio/playback.ts           ← 오디오 재생
├── 2.6   lib/camera/capture.ts           ← 카메라 캡처
└── 2.7   lib/ws/manager.ts              ← WebSocket 라이프사이클

Phase 2: API Routes (Phase 1 의존)
├── 2.8  api/session/route.ts          ← client.ts 사용
├── 2.9  api/session/resume/route.ts   ← client.ts 사용
├── 2.10-2.13 api/restore|discover|diary  ← 스캐폴드
└── 2.14 api/health/route.ts          ← 독립

Phase 3: Live API 세션 (Phase 1 의존)
└── 2.3 lib/gemini/live-api.ts        ← tools.ts + 타입 사용

Phase 4: React Hooks (Phase 1-3 의존)
├── 2.16 hooks/use-camera.ts          ← camera/capture.ts 래핑
├── 2.17 hooks/use-microphone.ts      ← audio/capture.ts 래핑
└── 2.15 hooks/use-live-session.ts    ← 모든 것 통합
```

---

## 5. 검증 기준

### 파일 단위 테스트

| 파일 | 검증 방법 |
|------|----------|
| `audio/capture.ts` | `start()` 후 `onChunk` 100ms 간격 호출, base64 디코딩 시 Int16Array |
| `audio/playback.ts` | `enqueue()` 3회 연속 → 갭 없이 재생, `flush()` → 즉시 멈춤 |
| `camera/capture.ts` | `captureFrame()` 반환값이 768px 이하 JPEG base64 |
| `ws/reconnect.ts` | 3회 실패 → `onFailure` 호출, 지연 증가 확인 |
| `api/session` | POST → 200 + `{ token, sessionId }` 반환 |
| `live-session.ts` | `connect()` → `setupComplete` 수신 → status: `connected` |

### E2E 시나리오

1. 앱 로드 → 카메라/마이크 권한 → `useLiveSession().connect()` → 세션 연결
2. 카메라에 유물 비추기 → `onArtifactRecognized` 이벤트 → Knowledge Panel 표시
3. 음성 질문 → `onUserSpeech` → AI 응답 → `onTranscript` + 오디오 재생
4. "복원해줘" → `generate_restoration` tool call → `/api/restore` 호출 → (501 OK)
5. 네트워크 끊김 → 재연결 3회 시도 → 성공 시 복원 / 실패 시 폴백 모드

---

## 6. 알려진 제약 사항

| 제약 | 영향 | 대응 |
|------|------|------|
| `contextWindowCompression` 없이 Audio+Video 세션 ~2분 제한 | 짧은 세션 | `slidingWindow: {}` 필수 적용 (구현됨) |
| `sendClientContent()` 는 function call response handler 안에서 사용 불가 | 도구 응답 중 텍스트 삽입 불가 | `sendToolResponse()`만 사용 |
| `GOOGLE_SEARCH` 도구는 단독 사용 (다른 도구와 혼합 불가) | Search Grounding을 커스텀 도구와 같이 못 씀 | 시스템 프롬프트에서 사실 검증 지시, 별도 search agent는 Part 3/4 |
| `responseModalities: [AUDIO, TEXT]` 동시 미지원 가능성 | 텍스트 직접 수신 불가 | `outputAudioTranscription` 활용 (AI 음성의 텍스트 변환) |
| WebSocket close code 1008 = API Key 또는 config 에러 | 복구 불가능한 에러 | fatal 처리, 새 세션 필요 |
| Ephemeral Token 30분 만료 | 장시간 세션 불가 | 만료 전 새 토큰 요청 + 세션 재연결 |
