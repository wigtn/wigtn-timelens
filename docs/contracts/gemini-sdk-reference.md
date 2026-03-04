# TimeLens Gemini SDK Reference

> **Purpose**: Claude Code가 구현 시 API를 정확하게 호출하도록 하기 위한 SDK 레퍼런스 문서
> **Version**: 1.0 (2026-03-04)
> **Package**: `@google/genai` v1.43.0+ (구 `@google/generative-ai`는 deprecated)

---

## Table of Contents

1. [공통 설정 (Common Setup)](#1-공통-설정)
2. [Gemini Live API (Pipeline 1)](#2-gemini-live-api)
3. [Gemini Image Generation (Pipeline 2)](#3-gemini-image-generation)
4. [Google ADK (Multi-Agent)](#4-google-adk)
5. [Google Places API (New)](#5-google-places-api-new)
6. [Google Search Grounding](#6-google-search-grounding)
7. [Environment Variables](#7-environment-variables)
8. [Model ID Quick Reference](#8-model-id-quick-reference)
9. [알려진 제약사항 & 주의사항](#9-알려진-제약사항--주의사항)

---

## 1. 공통 설정

### 1.1 패키지 설치

```bash
# Core SDK (필수)
npm install @google/genai

# ADK (Multi-Agent 사용 시)
npm install @google/adk
npm install -D @google/adk-devtools

# ADK 의존성
npm install zod

# Places API는 별도 패키지 불필요 (REST fetch 사용)
```

### 1.2 클라이언트 초기화

```typescript
import { GoogleGenAI, Modality } from '@google/genai';

// Google AI Studio (API Key)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Vertex AI (서비스 계정)
const ai = new GoogleGenAI({
  vertexai: true,
  project: 'your-project-id',
  location: 'us-central1',
});
```

> **주의**: `apiKey`와 `vertexai`/`project`/`location`은 동시에 사용 불가. 둘 중 하나만 선택.

### 1.3 Deprecated 패키지

```
❌ @google/generative-ai  → 2025-11-30 deprecated
✅ @google/genai          → 현재 유일한 공식 SDK
```

---

## 2. Gemini Live API

> **용도**: 실시간 양방향 음성/영상 스트리밍 (Pipeline 1 Core)
> **프로토콜**: WebSocket (`wss://generativelanguage.googleapis.com/ws/...`)

### 2.1 Model ID

```
gemini-2.5-flash-native-audio-preview-12-2025
```

| Model ID | 상태 | 비고 |
|---|---|---|
| `gemini-2.5-flash-native-audio-preview-12-2025` | **Preview (권장)** | Native audio, 30 HD voices |
| `gemini-2.0-flash-live-001` | Legacy | 2026-06-01 폐기 예정 |
| `gemini-live-2.5-flash-preview-native-audio-09-2025` | Deprecated | 2026-03-19 제거 예정 |

### 2.2 세션 연결

```typescript
import { GoogleGenAI, Modality } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const session = await ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  config: {
    responseModalities: [Modality.AUDIO],
    systemInstruction: 'You are a museum guide AI named TimeLens...',

    // 음성 설정
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: 'Kore',  // 아래 음성 목록 참조
        },
      },
    },

    // 오디오 트랜스크립션 활성화
    inputAudioTranscription: {},   // 빈 객체로 활성화
    outputAudioTranscription: {},  // 빈 객체로 활성화

    // 세션 길이 확장 (필수 - 없으면 15분 제한)
    contextWindowCompression: {
      slidingWindow: {},
    },

    // 세션 재접속 지원
    sessionResumption: {},
  },
  callbacks: {
    onopen: () => console.log('Session opened'),
    onmessage: (message) => handleMessage(message),
    onerror: (e) => console.error('Error:', e.message),
    onclose: (e) => console.log('Closed:', e.code, e.reason),
  },
});
```

### 2.3 Session Methods (3개)

#### `session.sendRealtimeInput()` — 실시간 오디오/비디오 전송

```typescript
// 오디오 전송 (16-bit PCM, 16kHz, mono, little-endian)
session.sendRealtimeInput({
  media: {
    data: base64AudioChunk,            // base64 string
    mimeType: 'audio/pcm;rate=16000',  // 반드시 이 형식
  },
});

// 비디오 프레임 전송 (모델은 ~1 FPS 처리)
session.sendRealtimeInput({
  media: {
    data: base64JpegFrame,    // base64 string
    mimeType: 'image/jpeg',   // 또는 'image/png'
  },
});

// 수동 VAD 시그널 (automaticActivityDetection.disabled: true 일 때)
session.sendRealtimeInput({ activityStart: {} });
session.sendRealtimeInput({ activityEnd: {} });
```

#### `session.sendClientContent()` — 텍스트 입력/컨텍스트 프리필

```typescript
// 텍스트 메시지 전송
session.sendClientContent({
  turns: [
    {
      role: 'user',
      parts: [{ text: 'Tell me about this artifact' }],
    },
  ],
  turnComplete: true,
});

// 대화 히스토리 프리필
session.sendClientContent({
  turns: [
    { role: 'user', parts: [{ text: 'What is this?' }] },
    { role: 'model', parts: [{ text: 'This is a Greek vase.' }] },
    { role: 'user', parts: [{ text: 'When was it made?' }] },
  ],
  turnComplete: true,
});
```

#### `session.sendToolResponse()` — 함수 호출 결과 반환

```typescript
session.sendToolResponse({
  functionResponses: [
    {
      id: functionCall.id,          // 반드시 서버에서 받은 id 매칭
      name: functionCall.name,
      response: { temperature: 22, condition: 'sunny' },
    },
  ],
});
```

### 2.4 서버 메시지 처리

```typescript
function handleMessage(message: any) {
  // 세션 초기화 완료
  if (message.setupComplete) {
    console.log('Session ready');
  }

  // 모델 응답 (오디오/텍스트)
  if (message.serverContent?.modelTurn?.parts) {
    for (const part of message.serverContent.modelTurn.parts) {
      if (part.inlineData) {
        // 오디오 데이터: PCM 24kHz (출력은 24kHz!)
        const audioBase64 = part.inlineData.data;
        const mimeType = part.inlineData.mimeType; // 'audio/pcm;rate=24000'
        playAudio(audioBase64);
      }
      if (part.text) {
        console.log('Text:', part.text);
      }
    }
  }

  // 턴 완료
  if (message.serverContent?.turnComplete) {
    console.log('Model finished speaking');
  }

  // 인터럽션 (사용자가 말을 끊음)
  if (message.serverContent?.interrupted) {
    console.log('Model was interrupted');
    stopAudioPlayback();
  }

  // 함수 호출 요청
  if (message.toolCall) {
    for (const fc of message.toolCall.functionCalls) {
      const result = executeFunction(fc.name, fc.args);
      session.sendToolResponse({
        functionResponses: [{ id: fc.id, name: fc.name, response: result }],
      });
    }
  }

  // 함수 호출 취소 (인터럽션으로 인해)
  if (message.toolCallCancellation) {
    cancelPendingToolCalls(message.toolCallCancellation);
  }

  // 입력 트랜스크립션
  if (message.inputTranscription?.text) {
    updateUserTranscript(message.inputTranscription.text);
  }

  // 출력 트랜스크립션
  if (message.outputTranscription?.text) {
    updateModelTranscript(message.outputTranscription.text);
  }

  // 세션 재접속 핸들
  if (message.sessionResumptionUpdate?.resumable) {
    saveResumeHandle(message.sessionResumptionUpdate.newHandle);
  }

  // GoAway 경고 (곧 세션 종료)
  if (message.goAway) {
    console.warn('Session ending in:', message.goAway.timeLeft);
  }
}
```

### 2.5 Function Calling 정의

```typescript
const tools = [
  {
    functionDeclarations: [
      {
        name: 'identify_artifact',
        description: 'Identify a museum artifact from the camera view',
        parameters: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'Visual description of the artifact',
            },
            location: {
              type: 'string',
              description: 'Museum and gallery location',
            },
          },
          required: ['description'],
        },
      },
      {
        name: 'get_nearby_sites',
        description: 'Find nearby historical sites and museums',
        parameters: {
          type: 'object',
          properties: {
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            radius: { type: 'number', description: 'Search radius in meters' },
          },
          required: ['latitude', 'longitude'],
        },
      },
    ],
  },
];

// config에 포함
const config = {
  responseModalities: [Modality.AUDIO],
  tools: tools,
  // ...
};
```

### 2.6 사용 가능한 음성 목록

**Native Audio 모델 HD 음성 (30개):**
`Achernar`, `Achird`, `Algenib`, `Algieba`, `Alnilam`, `Aoede`, `Autonoe`,
`Callirrhoe`, `Charon`, `Despina`, `Enceladus`, `Erinome`, `Fenrir`, `Gacrux`,
`Iapetus`, `Kore`, `Laomedeia`, `Leda`, `Orus`, `Puck`, `Pulcherrima`,
`Rasalgethi`, `Sadachbia`, `Sadaltager`, `Schedar`, `Sulafat`, `Umbriel`,
`Vindemiatrix`, `Zephyr`, `Zubenelgenubi`

**TimeLens 권장**: `Kore` (차분하고 전문적), `Aoede` (따뜻하고 친근)

### 2.7 VAD (Voice Activity Detection) 설정

```typescript
import { StartSensitivity, EndSensitivity } from '@google/genai';

const config = {
  responseModalities: [Modality.AUDIO],
  realtimeInputConfig: {
    automaticActivityDetection: {
      disabled: false,  // true면 수동 VAD
      startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_LOW,
      endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
      prefixPaddingMs: 20,
      silenceDurationMs: 100,
    },
  },
};
```

### 2.8 Ephemeral Tokens (브라우저 보안)

```typescript
// 서버 사이드 (API Route)
const serverAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const token = await serverAi.authTokens.create({
  config: {
    uses: 1,
    expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    httpOptions: { apiVersion: 'v1alpha' },
  },
});
// token.name → 클라이언트에 전달

// 클라이언트 사이드
const clientAi = new GoogleGenAI({ apiKey: token.name });
const session = await clientAi.live.connect({ /* ... */ });
```

### 2.9 세션 제한

| 항목 | 값 |
|---|---|
| 오디오 전용 세션 (압축 없음) | ~15분 |
| 오디오+비디오 세션 (압축 없음) | ~2분 |
| `contextWindowCompression` 사용 시 | **무제한** |
| 세션 재접속 토큰 유효기간 | 2시간 |
| 오디오 입력 형식 | 16-bit PCM, 16kHz, mono |
| 오디오 출력 형식 | 16-bit PCM, **24kHz**, mono |
| 비디오 처리 속도 | ~1 FPS |

### 2.10 브라우저 오디오 캡처 & 변환

```typescript
// Float32 (Web Audio API) → Int16 PCM → Base64
function float32ToInt16Base64(float32Array: Float32Array): string {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Canvas → Base64 JPEG (카메라 프레임 캡처)
function captureFrameAsBase64(videoElement: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(videoElement, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
}
```

---

## 3. Gemini Image Generation

> **용도**: AI 이미지 복원 (Pipeline 2 - Restoration)
> **방식**: REST API (`generateContent`)

### 3.1 Model ID

```
gemini-2.5-flash-image-preview
```

| Model ID | 용도 |
|---|---|
| `gemini-2.5-flash-image-preview` | **이미지 생성/편집 (권장)** |
| `gemini-2.5-flash-image` | 동일 모델 별칭 |
| `imagen-4.0-generate-001` | Imagen (별도 API, 포토리얼리스틱 특화) |

### 3.2 텍스트 → 이미지 생성

```typescript
import { GoogleGenAI, Modality } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash-image-preview',
  contents: 'A photorealistic restoration of an ancient Greek amphora, museum quality',
  config: {
    responseModalities: [Modality.TEXT, Modality.IMAGE],
  },
});

// 응답 파싱
for (const part of response.candidates![0].content.parts) {
  if (part.text) {
    console.log('Description:', part.text);
  }
  if (part.inlineData) {
    const buffer = Buffer.from(part.inlineData.data!, 'base64');
    // part.inlineData.mimeType === 'image/png'
  }
}
```

### 3.3 이미지 편집 (복원)

```typescript
import { GoogleGenAI, Modality, createPartFromBase64 } from '@google/genai';
import * as fs from 'fs';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function restoreImage(imagePath: string, prompt: string): Promise<Buffer> {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/png', data: base64Image } },
        ],
      },
    ],
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });

  const imagePart = response.candidates?.[0]?.content?.parts?.find(
    (part) => part.inlineData?.mimeType?.startsWith('image/')
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error('No image in response');
  }

  return Buffer.from(imagePart.inlineData.data, 'base64');
}
```

### 3.4 멀티턴 편집 (Chat)

```typescript
const chat = ai.chats.create({
  model: 'gemini-2.5-flash-image-preview',
  config: {
    responseModalities: [Modality.TEXT, Modality.IMAGE],
  },
});

// 1차: 이미지 + 편집 요청
const response1 = await chat.sendMessage([
  { inlineData: { mimeType: 'image/png', data: base64Image } },
  { text: 'Restore this damaged ancient fresco to its original colors' },
]);

// 2차: 추가 편집 (컨텍스트 유지)
const response2 = await chat.sendMessage([
  { text: 'Now add a subtle golden frame around it' },
]);
```

### 3.5 응답 구조

```typescript
// response.candidates[0].content.parts 배열 구조
type Part =
  | { text: string }                           // 텍스트 파트
  | { inlineData: {
      mimeType: string;  // 'image/png'
      data: string;      // base64 encoded
    }};

// 이미지 추출 패턴
const imagePart = response.candidates?.[0]?.content?.parts?.find(
  (p) => p.inlineData?.mimeType?.startsWith('image/')
);
const textPart = response.candidates?.[0]?.content?.parts?.find(
  (p) => p.text
);
```

### 3.6 제한사항

| 항목 | 값 |
|---|---|
| 기본 출력 해상도 | 1024 x 1024 px |
| 최대 출력 해상도 | 1024 x 1792 px (비정사각 비율) |
| 출력 형식 | PNG |
| 입력 이미지 형식 | PNG, JPEG, WebP, HEIC, HEIF |
| 입력 이미지 최대 크기 | 7 MB |
| 요청 최대 크기 | 20 MB (텍스트 + 이미지 합계) |
| 이미지당 토큰 소비 | 1,290 output tokens |
| 이미지당 비용 | ~$0.039 |
| Free tier RPM | 5 RPM |
| Paid tier RPM | 500 RPM |
| 워터마크 | SynthID 불가시 워터마크 (항상 포함) |

---

## 4. Google ADK

> **용도**: Multi-Agent 오케스트레이션 (Curator, Restoration, Discovery, Diary)
> **패키지**: `@google/adk` v0.3.0

### 4.1 설치 & 임포트

```bash
npm install @google/adk zod
npm install -D @google/adk-devtools
```

```typescript
import {
  LlmAgent,
  FunctionTool,
  SequentialAgent,
  ParallelAgent,
  LoopAgent,
  InMemoryRunner,
  isFinalResponse,
  GOOGLE_SEARCH,
} from '@google/adk';
import { z } from 'zod';
```

### 4.2 환경 변수

```env
# .env
GOOGLE_GENAI_API_KEY=YOUR_KEY_HERE
GOOGLE_GENAI_USE_VERTEXAI=FALSE
```

> **주의**: ADK TypeScript는 `GOOGLE_GENAI_API_KEY` 사용 (not `GOOGLE_API_KEY`)

### 4.3 Agent 정의 (LlmAgent)

```typescript
import 'dotenv/config';
import { LlmAgent, FunctionTool } from '@google/adk';
import { z } from 'zod';

export const curatorAgent = new LlmAgent({
  name: 'curator_agent',
  model: 'gemini-2.5-flash',
  description: 'Curates and explains museum artifacts with historical context.',
  instruction: `You are a museum curator AI. When given information about an artifact,
    provide detailed historical context, cultural significance, and interesting facts.
    Use the artifact_lookup tool to find detailed information.`,
  tools: [artifactLookupTool],
  outputKey: 'curation_result',  // 결과를 session.state에 저장
});
```

**LlmAgent 속성:**

| 속성 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `name` | `string` | Yes | 고유 식별자 |
| `model` | `string` | Yes | `'gemini-2.5-flash'`, `'gemini-2.5-pro'` 등 |
| `description` | `string` | 권장 | 다른 에이전트가 라우팅할 때 참조 |
| `instruction` | `string \| (ctx) => string` | No | 시스템 프롬프트. `{stateKey}` 템플릿 지원 |
| `tools` | `Tool[]` | No | 사용 가능한 도구 배열 |
| `subAgents` | `BaseAgent[]` | No | 위임 가능한 하위 에이전트 |
| `outputKey` | `string` | No | 응답을 `session.state[outputKey]`에 자동 저장 |

### 4.4 Tool 정의 (FunctionTool)

```typescript
const identifyArtifact = new FunctionTool({
  name: 'identify_artifact',
  description: 'Identifies a museum artifact based on visual description and location.',
  parameters: z.object({
    description: z.string().describe('Visual description of the artifact'),
    museum: z.string().optional().describe('Museum name if known'),
    gallery: z.string().optional().describe('Gallery or section name'),
  }),
  execute: async ({ description, museum, gallery }) => {
    // 실제 구현
    return {
      status: 'success',
      artifact: {
        name: 'Amphora',
        era: '5th century BCE',
        civilization: 'Ancient Greece',
      },
    };
  },
});
```

### 4.5 Multi-Agent 오케스트레이션

#### LLM 기반 위임 (subAgents)

```typescript
const orchestrator = new LlmAgent({
  name: 'timelens_orchestrator',
  model: 'gemini-2.5-flash',
  description: 'Main TimeLens coordinator that routes requests.',
  instruction: `You coordinate between specialist agents:
    - curator_agent: For artifact identification and curation
    - restoration_agent: For image restoration requests
    - discovery_agent: For nearby site discovery
    - diary_agent: For diary entry creation`,
  subAgents: [curatorAgent, restorationAgent, discoveryAgent, diaryAgent],
});
```

> **작동 방식**: LLM이 `transferToAgent(agent_name='curator_agent')`를 자동 생성하면 ADK가 라우팅 처리

#### Workflow Agents (결정적 실행)

```typescript
// Sequential: 순차 실행
const pipeline = new SequentialAgent({
  name: 'curation_pipeline',
  subAgents: [identifyAgent, enrichAgent, formatAgent],
});

// Parallel: 병렬 실행
const parallelSearch = new ParallelAgent({
  name: 'parallel_search',
  subAgents: [searchAgent, placesAgent, historyAgent],
});

// Loop: 반복 (품질 기준 충족까지)
const refinementLoop = new LoopAgent({
  name: 'refinement',
  subAgents: [drafterAgent, criticAgent],
  maxIterations: 3,
});
```

### 4.6 Runner & Session

```typescript
import { InMemoryRunner, isFinalResponse } from '@google/adk';

const runner = new InMemoryRunner({
  agent: orchestrator,
  appName: 'timelens',
});

// 세션 생성
const session = await runner.sessionService.createSession({
  appName: 'timelens',
  userId: 'user_123',
  state: {
    'user:preferred_language': 'ko',
    'app:museum_name': 'National Museum of Korea',
  },
});

// 에이전트 실행
const events = runner.runAsync({
  userId: 'user_123',
  sessionId: session.id,
  newMessage: {
    role: 'user',
    parts: [{ text: 'Tell me about this artifact' }],
  },
});

for await (const event of events) {
  if (isFinalResponse(event) && event.content?.parts?.length) {
    for (const part of event.content.parts) {
      if (part.text) console.log('Agent:', part.text);
    }
  }
}
```

### 4.7 State 관리 (에이전트 간 데이터 전달)

| Prefix | Scope | 수명 |
|---|---|---|
| _(없음)_ | Session | 현재 세션 |
| `user:` | User | 사용자의 모든 세션 |
| `app:` | Application | 모든 사용자 공유 |
| `temp:` | Invocation | 현재 호출만 |

```typescript
// Agent A: outputKey로 결과 저장
const agentA = new LlmAgent({
  name: 'agent_a',
  model: 'gemini-2.5-flash',
  instruction: 'Analyze the artifact.',
  outputKey: 'analysis_result',  // → session.state['analysis_result']
});

// Agent B: {key} 템플릿으로 읽기
const agentB = new LlmAgent({
  name: 'agent_b',
  model: 'gemini-2.5-flash',
  instruction: 'Based on this analysis: {analysis_result}, create a summary.',
});
```

---

## 5. Google Places API (New)

> **용도**: 주변 유적지/박물관 검색 (Discovery 기능)
> **방식**: REST API (fetch 직접 호출, 별도 패키지 불필요)

### 5.1 엔드포인트

| 기능 | Method | URL |
|---|---|---|
| Nearby Search | POST | `https://places.googleapis.com/v1/places:searchNearby` |
| Text Search | POST | `https://places.googleapis.com/v1/places:searchText` |
| Place Details | GET | `https://places.googleapis.com/v1/places/{PLACE_ID}` |
| Place Photo | GET | `https://places.googleapis.com/v1/{PHOTO_NAME}/media` |

> **주의**: `places.googleapis.com` 사용 (구 `maps.googleapis.com` 아님)

### 5.2 필수 헤더

```typescript
const headers = {
  'Content-Type': 'application/json',
  'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY!,
  'X-Goog-FieldMask': 'places.id,places.displayName,places.location,...',
};
```

> **중요**: `X-Goog-FieldMask`는 **필수**. 빠뜨리면 에러 발생.

### 5.3 Nearby Search 요청

```typescript
// app/api/places/nearby/route.ts

const NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.regularOpeningHours',
  'places.photos',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.editorialSummary',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.types',
].join(',');

const response = await fetch(NEARBY_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY!,
    'X-Goog-FieldMask': FIELD_MASK,
  },
  body: JSON.stringify({
    includedTypes: ['museum', 'tourist_attraction', 'historical_place', 'cultural_landmark'],
    maxResultCount: 20,              // 1-20
    rankPreference: 'DISTANCE',      // 'POPULARITY' | 'DISTANCE'
    languageCode: 'ko',
    locationRestriction: {
      circle: {
        center: { latitude: 37.5665, longitude: 126.9780 },
        radius: 1000.0,              // meters
      },
    },
  }),
});

const data = await response.json();
// data.places: Place[]
```

### 5.4 응답 구조

```typescript
interface PlacesResponse {
  places: Array<{
    id: string;
    displayName: { text: string; languageCode: string };
    formattedAddress: string;
    shortFormattedAddress: string;
    location: { latitude: number; longitude: number };
    rating: number;                    // 1.0-5.0
    userRatingCount: number;
    types: string[];
    primaryType: string;
    primaryTypeDisplayName: { text: string; languageCode: string };
    regularOpeningHours?: {
      openNow: boolean;
      weekdayDescriptions: string[];
    };
    photos?: Array<{
      name: string;                    // 'places/{id}/photos/{ref}'
      widthPx: number;
      heightPx: number;
    }>;
    editorialSummary?: { text: string; languageCode: string };
    websiteUri?: string;
    googleMapsUri: string;
  }>;
}
```

### 5.5 사진 URL 가져오기 (2단계)

```typescript
// Step 1: Nearby Search에서 photos[].name 획득
const photoName = place.photos[0].name;
// e.g., 'places/ChIJ.../photos/AUacSh...'

// Step 2: Photo Media API 호출
const photoUrl = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=400&maxHeightPx=400&key=${API_KEY}&skipHttpRedirect=true`;

const photoResponse = await fetch(photoUrl);
const photoData = await photoResponse.json();
// photoData.photoUri → 실제 이미지 URL
```

> **보안**: 클라이언트에서 직접 호출하면 API Key 노출. 반드시 서버 프록시 사용.

### 5.6 관광 관련 Place Types

**문화:**
`art_gallery`, `art_studio`, `auditorium`, `cultural_landmark`, `historical_place`, `monument`, `museum`, `performing_arts_theater`, `sculpture`

**관광/레저:**
`amusement_park`, `aquarium`, `botanical_garden`, `national_park`, `tourist_attraction`, `zoo`

**종교/랜드마크:**
`church`, `hindu_temple`, `mosque`, `synagogue`, `city_hall`, `library`

### 5.7 Field Mask & 과금 티어

| SKU | 비용/요청 | 포함 필드 |
|---|---|---|
| IDs Only | ~$0.00 | `places.id`, `places.name` |
| Location | ~$0.005 | `places.location`, `places.formattedAddress` |
| Basic | ~$0.017 | `places.displayName`, `places.types`, `places.websiteUri` |
| Advanced | ~$0.025 | `places.rating`, `places.regularOpeningHours`, `places.editorialSummary` |
| Preferred | ~$0.035-0.040 | `places.photos`, `places.reviews`, `places.accessibilityOptions` |

> **과금 규칙**: 요청한 필드 중 가장 비싼 SKU 기준으로 과금. `places.photos` 포함 시 Preferred 요금.

### 5.8 Rate Limits

- 기본: **600 QPM** (requests per minute) per project
- 각 API 메서드(searchNearby, searchText, getPlace, getMedia) 별도 쿼터

---

## 6. Google Search Grounding

> **용도**: 유적지에 대한 실시간 정보 검색 (ADK 에이전트 내)

### 6.1 사용법 (ADK)

```typescript
import { LlmAgent, GOOGLE_SEARCH } from '@google/adk';

const searchAgent = new LlmAgent({
  name: 'grounding_searcher',
  model: 'gemini-2.5-flash',
  description: 'Searches for current information about historical sites.',
  instruction: 'Search for accurate, current information about the requested topic.',
  tools: [GOOGLE_SEARCH],  // ⚠️ 반드시 단독 사용
});
```

### 6.2 핵심 제약

```
⚠️ GOOGLE_SEARCH는 에이전트의 유일한 tool이어야 함
❌ tools: [GOOGLE_SEARCH, myCustomTool]  // 불가
✅ tools: [GOOGLE_SEARCH]               // 단독 사용
```

**해결 방법**: 커스텀 도구와 검색을 분리된 에이전트로 구성

```typescript
const searchAgent = new LlmAgent({
  name: 'searcher',
  model: 'gemini-2.5-flash',
  tools: [GOOGLE_SEARCH],  // 검색 전용
});

const toolAgent = new LlmAgent({
  name: 'tool_user',
  model: 'gemini-2.5-flash',
  tools: [customTool1, customTool2],  // 커스텀 도구 전용
});

const coordinator = new LlmAgent({
  name: 'coordinator',
  model: 'gemini-2.5-flash',
  subAgents: [searchAgent, toolAgent],  // 위임으로 조합
});
```

---

## 7. Environment Variables

```env
# .env.local (Next.js)

# Gemini API Key (Live API, Image Generation)
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>

# ADK (Multi-Agent)
GOOGLE_GENAI_API_KEY=<YOUR_GEMINI_API_KEY>
GOOGLE_GENAI_USE_VERTEXAI=FALSE

# Google Places API (New)
GOOGLE_PLACES_API_KEY=<YOUR_PLACES_API_KEY>

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
FIREBASE_SERVICE_ACCOUNT_KEY=...

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 8. Model ID Quick Reference

| 용도 | Model ID | SDK Method |
|---|---|---|
| **Live API (음성/영상)** | `gemini-2.5-flash-native-audio-preview-12-2025` | `ai.live.connect()` |
| **이미지 생성/편집** | `gemini-2.5-flash-image-preview` | `ai.models.generateContent()` |
| **ADK Agent (기본)** | `gemini-2.5-flash` | `new LlmAgent({ model: ... })` |
| **ADK Agent (고급 추론)** | `gemini-2.5-pro` | `new LlmAgent({ model: ... })` |
| **텍스트/멀티모달 (비 Live)** | `gemini-2.5-flash` | `ai.models.generateContent()` |

---

## 9. 알려진 제약사항 & 주의사항

### 9.1 Live API

- `sendClientContent()`는 function call 응답에 사용 불가 → `sendToolResponse()` 사용
- `responseModalities`에 `[Modality.AUDIO, Modality.TEXT]` 동시 지정은 모델에 따라 미지원
- 오디오 입력은 반드시 `audio/pcm;rate=16000` (16kHz), 출력은 `audio/pcm;rate=24000` (24kHz)
- `contextWindowCompression` 없이는 세션이 15분(오디오) / 2분(비디오) 제한
- WebSocket close code `1008` = API Key 또는 config 오류

### 9.2 Image Generation

- `gemini-2.5-flash-image-preview`에서 `imageConfig` (aspectRatio, imageSize)는 제한적으로 지원
- 응답에 항상 텍스트+이미지가 함께 오므로 이미지만 필요해도 텍스트 파트 무시 처리 필요
- 인물 생성 제한: 특정 인물, 미성년자, 인종/성별 지정 불가
- SynthID 워터마크는 제거 불가능

### 9.3 ADK

- `GOOGLE_SEARCH`는 에이전트의 유일한 도구여야 함 (다른 도구와 혼합 불가)
- `InMemorySessionService`는 비영구적 (앱 재시작 시 데이터 소실)
- 환경 변수명: `GOOGLE_GENAI_API_KEY` (not `GOOGLE_API_KEY`)
- `outputKey` 값은 serializable 해야 함 (string, number, boolean, 단순 객체)
- Live API와의 통합은 Python SDK가 더 성숙함. TypeScript는 동일 아키텍처 지원하나 예제 부족

### 9.4 Places API

- `X-Goog-FieldMask` 헤더 **필수** — 빠뜨리면 에러
- `places.photos` 포함 시 Preferred SKU 요금 적용 (가장 비쌈)
- 사진은 2단계: Nearby Search → Photo Media API
- Place Details의 field path는 `places.` 접두사 없음 (Nearby/Text Search와 다름)
- 기본 600 QPM, 메서드별 별도 쿼터

---

## Appendix: TimeLens 아키텍처와 API 매핑

```
┌─────────────────────────────────────────────────────────────┐
│  Pipeline 1: Real-time (Live API)                           │
│                                                             │
│  Browser ──WebSocket──→ Gemini Live API                     │
│  (mic + camera)         ├── Function Call: identify_artifact│
│                         ├── Function Call: get_nearby_sites │
│                         └── Audio Response (24kHz PCM)      │
│                                                             │
│  SDK: @google/genai                                         │
│  Method: ai.live.connect()                                  │
│  Model: gemini-2.5-flash-native-audio-preview-12-2025       │
├─────────────────────────────────────────────────────────────┤
│  Pipeline 2: Async (REST API)                               │
│                                                             │
│  Server ──REST──→ Gemini 2.5 Flash Image                    │
│  (captured frame)  └── Image Restoration Response (PNG)     │
│                                                             │
│  SDK: @google/genai                                         │
│  Method: ai.models.generateContent()                        │
│  Model: gemini-2.5-flash-image-preview                      │
├─────────────────────────────────────────────────────────────┤
│  Multi-Agent: ADK                                           │
│                                                             │
│  Orchestrator ──→ Curator Agent                             │
│                ├──→ Restoration Agent                       │
│                ├──→ Discovery Agent (+ GOOGLE_SEARCH)       │
│                └──→ Diary Agent                             │
│                                                             │
│  SDK: @google/adk                                           │
│  Model: gemini-2.5-flash (각 에이전트)                       │
├─────────────────────────────────────────────────────────────┤
│  Places: REST API                                           │
│                                                             │
│  Server ──REST──→ Google Places API (New)                   │
│  (lat/lng)         └── Nearby Museums/Sites List            │
│                                                             │
│  Method: fetch() (직접 REST 호출)                            │
│  Base URL: places.googleapis.com/v1                         │
└─────────────────────────────────────────────────────────────┘
```
