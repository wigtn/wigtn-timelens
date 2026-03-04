# TimeLens Shared Contract

> **목적**: 5개 파트 간 모든 인터페이스를 사전에 확정하여, 각 파트가 독립적으로 설계/구현 가능하게 함
> **규칙**: 이 문서의 타입을 변경하려면 관련 파트 담당자 전원 합의 필요
> **최종 위치**: 구현 시 `src/types/` 디렉토리로 이동
>
> **Source of Truth**: env var / model ID → `docs/contracts/gemini-sdk-reference.md` · 타입 / 파일 소유권 → 이 문서 · 충돌 시 위 문서가 우선

---

## 파트 간 의존성 맵

```
Part 1 (코어 파이프라인)
  │
  ├──► Part 2 (Curator + UI)        [LiveSessionEvents, AudioState]
  ├──► Part 3 (Restoration + UI)    [RestorationToolCall → REST Bridge]
  ├──► Part 4 (Discovery + Diary)   [DiscoveryToolCall, DiaryToolCall → REST Bridge]
  │
  Part 5 (인프라)
  └──► 모든 파트                     [Firestore Models, Firebase Config, Env, 공유 타입]
```

**구현 순서**: Part 5 (스캐폴드) → Part 1 (코어) → Part 2/3/4 (병렬)

---

## A. 공유 기본 타입

```typescript
// ============================================================
// 파일: src/types/common.ts
// 담당: Part 5 (인프라) 가 생성, 모든 파트가 참조
// ============================================================

// --- 에이전트 ---
export type AgentType = 'curator' | 'restoration' | 'discovery' | 'diary';

// --- 세션 ---
export type SessionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'expired';

// --- 유물 카테고리 ---
export type ArtifactCategory =
  | 'pottery'
  | 'sculpture'
  | 'painting'
  | 'weapon'
  | 'jewelry'
  | 'textile'
  | 'coin'
  | 'mosaic'
  | 'inscription'
  | 'fossil'
  | 'mask';

export type HeritageCategory = 'artifact' | 'monument' | 'building' | 'painting' | 'sculpture';

export type Material = 'marble' | 'bronze' | 'ceramic' | 'gold' | 'stone' | 'wood' | 'iron' | 'glass';

export type Civilization =
  | 'Greek'
  | 'Roman'
  | 'Egyptian'
  | 'Mesopotamian'
  | 'Chinese'
  | 'Japanese'
  | 'Korean'
  | 'Indian'
  | 'Persian'
  | 'Mayan'
  | 'Other';

// --- Knowledge Panel ---
export type PanelState = 'closed' | 'mini' | 'expanded' | 'fullscreen';

// --- 오디오 ---
export type AudioState = 'idle' | 'listening' | 'speaking' | 'generating';

// --- 에러 ---
export interface AppError {
  code: string;
  message: string;
  recoverable: boolean;
  action?: 'retry' | 'fallback' | 'manual';
}
```

---

## B. Part 1 ↔ Part 2: Live Session Contract

Part 1 (코어 파이프라인)이 제공하는 인터페이스를 Part 2 (Curator + UI)가 소비합니다.

```typescript
// ============================================================
// 파일: src/types/live-session.ts
// Part 1이 구현, Part 2가 소비
// ============================================================

import type { AgentType, AudioState, SessionStatus, AppError } from './common';

// --- 유물 인식 결과 (Live API Vision → UI) ---
export interface ArtifactSummary {
  name: string;                          // "아테네 적회식 크라테르"
  era: string;                           // "기원전 460년"
  civilization: string;                  // "고대 그리스"
  oneLiner: string;                      // "심포시엄에서 와인과 물을 섞는 혼합 그릇"
  topics: TopicChip[];                   // 핵심 토픽 3개
  confidence: number;                    // 0-1 인식 확신도
  isOutdoor: boolean;                    // 야외 건물/기념물 여부
  architectureStyle?: string;            // 건물일 경우 건축 양식
}

export interface TopicChip {
  id: string;                            // "usage", "technique", "mythology"
  label: string;                         // "용도", "기법", "신화"
}

// --- Live Session이 UI에 보내는 이벤트 ---
export interface LiveSessionEvents {
  // 유물/건물 인식됨 → Knowledge Panel 요약 카드 표시
  onArtifactRecognized: (summary: ArtifactSummary) => void;

  // AI 음성의 텍스트 트랜스크립트 (실시간 스트리밍)
  onTranscript: (data: TranscriptData) => void;

  // 사용자 음성 STT 결과
  onUserSpeech: (data: UserSpeechData) => void;

  // 에이전트 전환 알림
  onAgentSwitch: (data: AgentSwitchData) => void;

  // 오디오 상태 변경 (idle/listening/speaking/generating)
  onAudioStateChange: (state: AudioState) => void;

  // 세션 상태 변경
  onSessionStatusChange: (status: SessionStatus) => void;

  // 도구 호출 결과 (복원 이미지, 주변 장소 등)
  onToolResult: (data: ToolResultData) => void;

  // 토픽 상세 응답 (사용자가 토픽 칩 탭 시)
  onTopicDetail: (data: TopicDetailData) => void;

  // 에러
  onError: (error: AppError) => void;
}

export interface TranscriptData {
  text: string;                          // 현재까지 누적 텍스트
  delta: string;                         // 이번 청크에 추가된 텍스트
  isFinal: boolean;                      // 문장 완성 여부
  sources?: string[];                    // Search Grounding 출처 URL
}

export interface UserSpeechData {
  text: string;                          // STT 결과 텍스트
  isFinal: boolean;
}

export interface AgentSwitchData {
  from: AgentType;
  to: AgentType;
  reason: string;                        // "복원 이미지를 생성합니다"
}

export interface ToolResultData {
  tool: 'generate_restoration' | 'discover_nearby' | 'create_diary';
  result: RestorationResult | DiscoveryResult | DiaryResult;
}

export interface TopicDetailData {
  topicId: string;
  topicLabel: string;
  content: string;                       // 상세 텍스트
  sources?: string[];
}

// --- UI가 Live Session에 보내는 명령 ---
export interface LiveSessionControls {
  // 세션 시작
  connect: (config: SessionConfig) => Promise<void>;

  // 세션 종료
  disconnect: () => void;

  // 마이크 ON/OFF
  toggleMic: (enabled: boolean) => void;

  // 카메라 ON/OFF
  toggleCamera: (enabled: boolean) => void;

  // 사용자가 AI 음성을 인터럽트
  interrupt: () => void;

  // 토픽 칩 탭 시 해당 주제로 대화 전환 요청
  requestTopicDetail: (topicId: string, topicLabel: string) => void;

  // 텍스트 메시지 전송 (폴백 모드)
  sendTextMessage: (text: string) => void;

  // 사진 캡처 후 분석 요청 (폴백 모드)
  sendPhoto: (imageBase64: string) => void;

  // 현재 세션 상태 조회
  getSessionState: () => SessionState;
}

export interface SessionConfig {
  language: string;                      // 'en', 'ko', 'ja' 등
  sessionId?: string;                    // 재연결 시
}

export interface SessionState {
  sessionId: string | null;
  status: SessionStatus;
  activeAgent: AgentType;
  audioState: AudioState;
  currentArtifact: ArtifactSummary | null;
  visitCount: number;                    // 이번 세션에서 관람한 유물 수
  isFallbackMode: boolean;              // 텍스트 폴백 모드 여부
}
```

### useLiveSession Hook 반환 타입

```typescript
// ============================================================
// 파일: src/hooks/use-live-session.ts 의 반환 타입
// Part 1이 구현, Part 2가 사용
// ============================================================

export interface UseLiveSessionReturn {
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

  // 실시간 데이터 (상태로 노출)
  currentArtifact: ArtifactSummary | null;
  transcript: TranscriptChunk[];        // 채팅 히스토리
  audioState: AudioState;
  activeAgent: AgentType;
}

export interface TranscriptChunk {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  sources?: string[];                    // Search Grounding 출처
}
```

---

## C. Part 1 ↔ Part 3: Restoration Contract

Live API의 Function Call → REST API `/api/restore` → Gemini 2.5 Flash Image

```typescript
// ============================================================
// 파일: src/types/restoration.ts
// Part 1이 Tool Call 이벤트 전달, Part 3이 REST API + UI 구현
// ============================================================

// --- Live API가 발생시키는 Tool Call ---
// Part 1이 이 형태로 파싱하여 REST API에 전달
export interface RestorationToolCall {
  tool: 'generate_restoration';
  params: {
    artifact_name: string;               // "Athenian red-figure krater"
    era: string;                         // "460 BC"
    artifact_type?: string;              // "pottery"
    damage_description?: string;         // "cracks, faded paint, missing handle"
    site_name?: string;                  // 건축물일 경우
    current_description?: string;        // 건축물 현재 상태
  };
}

// --- REST API: POST /api/restore ---
export interface RestorationRequest {
  artifactName: string;
  era: string;
  artifactType?: ArtifactCategory;
  damageDescription?: string;
  referenceImage?: string;               // base64 JPEG (카메라 캡처)
  isArchitecture: boolean;               // 건축물 복원 여부
  siteName?: string;
  currentDescription?: string;
}

export interface RestorationResponse {
  success: true;
  imageUrl: string;                      // 생성된 복원 이미지 URL
  description: string;                   // 복원 설명 텍스트
  era: string;
  generationTimeMs: number;
}

export interface RestorationErrorResponse {
  success: false;
  error: string;
  code: 'GENERATION_FAILED' | 'TIMEOUT' | 'CONTENT_FILTERED' | 'RATE_LIMITED';
  retryable: boolean;
}

// --- Tool Result → UI로 전달되는 결과 ---
export interface RestorationResult {
  type: 'restoration';
  imageUrl: string;
  description: string;
  artifactName: string;
  era: string;
  referenceImageUrl?: string;            // 원본 사진 (Before 용)
}

// --- Before/After 슬라이더 상태 ---
export type RestorationUIState =
  | { status: 'idle' }
  | { status: 'loading'; progress: number; artifactName: string; era: string }
  | { status: 'ready'; data: RestorationResult }
  | { status: 'error'; error: string; retryable: boolean };
```

---

## D. Part 1 ↔ Part 4: Discovery & Diary Contract

### Discovery

```typescript
// ============================================================
// 파일: src/types/discovery.ts
// Part 1이 Tool Call 이벤트 전달, Part 4가 REST API + UI 구현
// ============================================================

// --- Live API Tool Call ---
export interface DiscoveryToolCall {
  tool: 'discover_nearby';
  params: {
    lat: number;
    lng: number;
    radius_km: number;                   // 기본 2
    interest_filter?: string;            // "ancient Egyptian", "modern art"
  };
}

// --- REST API: GET /api/discover ---
export interface DiscoveryQueryParams {
  lat: number;
  lng: number;
  radius: number;                        // km
  type?: string;                         // interest filter
}

export interface DiscoveryResponse {
  success: true;
  sites: NearbyPlace[];
  searchRadius: number;
}

export interface NearbyPlace {
  id: string;                            // Google Place ID
  name: string;                          // "콜로세움"
  type: string;                          // "원형 경기장"
  era?: string;                          // "서기 80년"
  description: string;                   // Search Grounding 보강 설명
  distance: number;                      // meters
  walkingTime: number;                   // minutes
  rating?: number;                       // Google rating
  isOpen?: boolean;
  openingHours?: string;
  photoUrl?: string;                     // Google Places photo
  location: { lat: number; lng: number };
}

// --- Tool Result ---
export interface DiscoveryResult {
  type: 'discovery';
  sites: NearbyPlace[];
  userLocation: { lat: number; lng: number };
}
```

### Diary

```typescript
// ============================================================
// 파일: src/types/diary.ts
// Part 1이 Tool Call 이벤트 전달, Part 4가 REST API + UI 구현
// ============================================================

// --- Live API Tool Call ---
export interface DiaryToolCall {
  tool: 'create_diary';
  params: {
    session_id: string;
  };
}

// --- REST API: POST /api/diary/generate ---
export interface DiaryGenerateRequest {
  sessionId: string;
}

export interface DiaryGenerateResponse {
  success: true;
  diaryId: string;
  diary: DiaryData;
}

export interface DiaryData {
  id: string;
  title: string;                         // "대영박물관에서의 아침"
  entries: DiaryEntry[];
  createdAt: number;                     // Unix timestamp
  shareToken?: string;
}

export interface DiaryEntry {
  type: 'text' | 'image';
  content: string;                       // 마크다운 텍스트 또는 이미지 URL
  siteName?: string;                     // 관련 유물/현장명
  order: number;
}

// --- Tool Result ---
export interface DiaryResult {
  type: 'diary';
  diaryId: string;
  title: string;
  entryCount: number;
}

// --- Diary UI 상태 ---
export type DiaryUIState =
  | { status: 'idle' }
  | { status: 'generating'; progress: number }
  | { status: 'ready'; diary: DiaryData }
  | { status: 'error'; error: string };
```

---

## E. WebSocket 프로토콜 (Part 1 내부, Part 2 참조용)

```typescript
// ============================================================
// 파일: src/types/ws-messages.ts
// Part 1이 구현. Part 2는 직접 사용하지 않음 (Hook을 통해 추상화)
// 참조용으로만 기재
// ============================================================

// === Client → Server ===

export type ClientMessage =
  | ClientSessionConfig
  | ClientAudioInput
  | ClientVideoFrame
  | ClientInterrupt
  | ClientTextMessage;

export interface ClientSessionConfig {
  type: 'session.config';
  payload: {
    language: string;
    sessionId?: string;
  };
}

export interface ClientAudioInput {
  type: 'audio.input';
  payload: {
    data: string;                        // base64 PCM 16-bit 16kHz mono
    timestamp: number;
  };
}

export interface ClientVideoFrame {
  type: 'video.frame';
  payload: {
    data: string;                        // base64 JPEG (max 768px)
    timestamp: number;
  };
}

export interface ClientInterrupt {
  type: 'audio.interrupt';
}

export interface ClientTextMessage {
  type: 'text.input';
  payload: {
    text: string;
    image?: string;                      // base64 (폴백 모드에서 사진 첨부)
  };
}

// === Server → Client ===

export type ServerMessage =
  | ServerAudioOutput
  | ServerTranscript
  | ServerArtifactRecognized
  | ServerToolCall
  | ServerToolResult
  | ServerAgentSwitch
  | ServerSessionStatus
  | ServerTopicDetail
  | ServerError;

export interface ServerAudioOutput {
  type: 'audio.output';
  payload: {
    data: string;                        // base64 PCM 24kHz
  };
}

export interface ServerTranscript {
  type: 'transcript';
  payload: {
    text: string;
    delta: string;
    isFinal: boolean;
    sources?: string[];
  };
}

export interface ServerArtifactRecognized {
  type: 'artifact.recognized';
  payload: ArtifactSummary;
}

export interface ServerToolCall {
  type: 'tool.call';
  payload: {
    callId: string;
    tool: 'generate_restoration' | 'discover_nearby' | 'create_diary';
    params: Record<string, unknown>;
  };
}

export interface ServerToolResult {
  type: 'tool.result';
  payload: {
    callId: string;
    tool: 'generate_restoration' | 'discover_nearby' | 'create_diary';
    result: RestorationResult | DiscoveryResult | DiaryResult;
  };
}

export interface ServerAgentSwitch {
  type: 'agent.switch';
  payload: AgentSwitchData;
}

export interface ServerSessionStatus {
  type: 'session.status';
  payload: {
    status: SessionStatus;
    sessionId: string;
    expiresAt?: number;
  };
}

export interface ServerTopicDetail {
  type: 'topic.detail';
  payload: TopicDetailData;
}

export interface ServerError {
  type: 'error';
  payload: AppError;
}
```

---

## F. REST API 엔드포인트 Contract

```typescript
// ============================================================
// 파일: src/types/api.ts
// Part 5가 공통 에러 형식 정의
// Part 1/3/4가 각 엔드포인트 구현
// ============================================================

// --- 공통 API 응답 ---
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// --- 엔드포인트 목록 ---
// 각 엔드포인트의 요청/응답은 해당 파트의 타입 파일 참조

/**
 * POST /api/session          → Part 1
 * POST /api/session/resume   → Part 1
 * WS   /api/ws               → Part 1 (WebSocket 업그레이드)
 * POST /api/restore          → Part 3
 * GET  /api/discover          → Part 4
 * POST /api/diary/generate   → Part 4
 * GET  /api/diary/:id        → Part 4
 * GET  /api/health           → Part 5
 */

// --- POST /api/session ---
export interface CreateSessionRequest {
  language: string;
  userId?: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  wsUrl: string;
  expiresAt: number;
}

// --- POST /api/session/resume ---
export interface ResumeSessionRequest {
  sessionId: string;
}

export interface ResumeSessionResponse {
  wsUrl: string;
  context: string;                       // 복원된 컨텍스트
  expiresAt: number;
}

// --- GET /api/health ---
export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  uptime: number;
  services: {
    liveApi: boolean;
    imageGen: boolean;
    firestore: boolean;
    placesApi: boolean;
  };
}
```

---

## G. Firestore 데이터 모델 (Part 5 정의, 전 파트 참조)

```typescript
// ============================================================
// 파일: src/types/models.ts
// Part 5가 정의, Part 1/3/4가 읽기/쓰기
// ============================================================

import { Timestamp, GeoPoint } from 'firebase/firestore';

// --- Collection: sessions ---
export interface SessionDoc {
  id: string;
  userId: string;                        // Firebase Anonymous Auth UID
  language: string;
  status: 'active' | 'paused' | 'completed';
  liveApiSessionId?: string;
  contextSnapshot?: string;              // 재연결용 압축 컨텍스트
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;                  // TTL: 24h
}

// --- Collection: sessions/{sessionId}/visits ---
export interface VisitDoc {
  id: string;
  itemName: string;
  location: GeoPoint;
  venueName?: string;
  recognizedAt: Timestamp;
  conversationSummary: string;
  restorationImageUrl?: string;        // Cloud Storage URL (https://storage.googleapis.com/...)
  userPhotoUrl?: string;
  metadata: {
    era?: string;
    category: HeritageCategory;
    artifactType?: ArtifactCategory;
    material?: Material;
    civilization?: Civilization;
    damageDescription?: string;
    searchGroundingSources?: string[];
  };
}

// --- Collection: diaries ---
export interface DiaryDoc {
  id: string;
  sessionId: string;
  userId: string;
  title: string;
  entries: DiaryEntry[];
  createdAt: Timestamp;
  shareToken?: string;
}

// --- Firestore 경로 규칙 ---
/**
 * sessions/{sessionId}                  → SessionDoc
 * sessions/{sessionId}/visits/{visitId} → VisitDoc
 * diaries/{diaryId}                     → DiaryDoc
 *
 * 보안 규칙:
 * - sessions: userId == request.auth.uid
 * - visits: 부모 session의 userId == request.auth.uid
 * - diaries: userId == request.auth.uid || shareToken 매칭 시 읽기 허용
 */
```

---

## H. 컴포넌트 Props Contract (Part 2/3/4 UI)

```typescript
// ============================================================
// 파일: src/types/components.ts
// 각 파트가 자기 컴포넌트의 Props를 구현
// 다른 파트에서 참조할 수 있도록 여기에 계약 정의
// ============================================================

// --- Part 2: camera-view.tsx ---
export interface CameraViewProps {
  isScanning: boolean;                   // 스캔 코너 애니메이션 표시
  isRecognized: boolean;                 // ✓ 인식 완료 표시
  isBlurred: boolean;                    // 패널 포커스 시 배경 흐림
  onCapturePhoto: () => string;          // base64 JPEG 반환
}

// --- Part 2: knowledge-panel.tsx ---
export interface KnowledgePanelProps {
  state: PanelState;                     // closed | mini | expanded | fullscreen
  artifact: ArtifactSummary | null;
  transcript: TranscriptChunk[];
  onStateChange: (state: PanelState) => void;
  onTopicTap: (topicId: string, topicLabel: string) => void;
  // 슬롯: 패널 내부에 Before/After 슬라이더나 Discovery 카드 렌더링
  children?: React.ReactNode;
}

// --- Part 2: audio-visualizer.tsx ---
export interface AudioVisualizerProps {
  state: AudioState;                     // idle | listening | speaking | generating
  // 오디오 레벨 데이터 (0-1, Part 1이 제공)
  audioLevel?: number;
}

// --- Part 2: agent-indicator.tsx ---
export interface AgentIndicatorProps {
  activeAgent: AgentType;
  switchData?: AgentSwitchData;          // 전환 중일 때만
  isTransitioning: boolean;
}

// --- Part 2: transcript.tsx ---
export interface TranscriptProps {
  chunks: TranscriptChunk[];
  isStreaming: boolean;                  // 현재 AI가 말하는 중
}

// --- Part 3: before-after-slider.tsx ---
export interface BeforeAfterSliderProps {
  beforeImage: string;                   // 현재 상태 이미지 URL 또는 base64
  afterImage: string;                    // 복원된 이미지 URL
  artifactName: string;
  era: string;
  description?: string;
  onSave: () => void;                    // 다이어리에 저장
  onShare: () => void;                   // 공유 링크 생성
}

// --- Part 4: nearby-sites.tsx ---
export interface NearbySitesProps {
  sites: NearbyPlace[];
  userLocation: { lat: number; lng: number };
  isLoading: boolean;
  onSiteSelect: (site: NearbyPlace) => void;
  onOpenMaps: (site: NearbyPlace) => void;  // 외부 지도 앱
}

// --- Part 4: diary-viewer.tsx ---
export interface DiaryViewerProps {
  diary: DiaryData;
  onShare: () => Promise<string>;        // 공유 링크 반환
  onClose: () => void;
}
```

---

## I. Hook 반환 타입 Contract

```typescript
// ============================================================
// 파일: src/types/hooks.ts
// 각 파트가 자기 훅을 구현, 타입은 여기서 계약
// ============================================================

// --- Part 1: use-camera.ts ---
export interface UseCameraReturn {
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => string | null;     // base64 JPEG
  capturePhoto: () => string | null;     // 고해상도 base64 JPEG
}

// --- Part 1: use-microphone.ts ---
export interface UseMicrophoneReturn {
  isActive: boolean;
  isPermissionGranted: boolean;
  error: string | null;
  startMic: () => Promise<void>;
  stopMic: () => void;
  audioLevel: number;                    // 0-1 실시간 볼륨
}

// --- Part 4: use-geolocation.ts ---
export interface UseGeolocationReturn {
  location: { lat: number; lng: number } | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}
```

---

## J. 환경 변수 Contract (Part 5 정의)

```typescript
// ============================================================
// 파일: src/types/env.d.ts
// Part 5가 .env.example과 함께 정의
// ============================================================

declare namespace NodeJS {
  interface ProcessEnv {
    // Gemini API (서버 전용) — ADK + GenAI SDK 공용
    GOOGLE_GENAI_API_KEY: string;
    GOOGLE_CLOUD_PROJECT: string;

    // Firebase (클라이언트)
    NEXT_PUBLIC_FIREBASE_API_KEY: string;
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;

    // Firebase (서버 전용)
    FIREBASE_SERVICE_ACCOUNT_KEY: string;  // base64 encoded

    // Google Maps / Places
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: string;
    GOOGLE_PLACES_API_KEY: string;         // 서버 전용

    // App
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_WS_URL: string;

    // Node
    NODE_ENV: 'development' | 'production' | 'test';
  }
}
```

---

## K. 파트 간 통합 시나리오

각 파트가 독립 구현 후 어떻게 연결되는지 확인용.

### 시나리오 1: 유물 인식 → 요약 카드

```
[Part 1] 카메라 프레임 전송 → Live API Vision
[Part 1] Live API가 유물 인식 → ServerArtifactRecognized 메시지 수신
[Part 1] useLiveSession 훅이 onArtifactRecognized 콜백 호출
[Part 2] KnowledgePanel이 ArtifactSummary 받아 요약 카드 렌더링 (mini 상태)
[Part 1] 동시에 Live API가 음성 해설 시작 → ServerAudioOutput 스트리밍
[Part 2] AudioVisualizer가 'speaking' 상태로 전환
[Part 2] Transcript 컴포넌트가 실시간 텍스트 표시
```

### 시나리오 2: "복원해줘" → Before/After

```
[Part 1] 사용자 음성 "복원해줘" → Live API 인식
[Part 1] Live API가 ServerToolCall 발생: generate_restoration
[Part 1] AgentSwitch 이벤트: curator → restoration
[Part 2] AgentIndicator가 전환 애니메이션 표시
[Part 1] REST API POST /api/restore 호출 (Function Calling Bridge)
[Part 3] /api/restore가 Gemini 2.5 Flash에 이미지 생성 요청
[Part 3] 생성 완료 → RestorationResponse 반환
[Part 1] ServerToolResult로 UI에 결과 전달
[Part 3] BeforeAfterSlider가 결과 이미지로 렌더링
[Part 2] KnowledgePanel이 fullscreen으로 전환, 슬라이더를 children으로 렌더링
```

### 시나리오 3: "근처에 박물관?" → Discovery 카드

```
[Part 1] 사용자 음성 → Live API가 ServerToolCall: discover_nearby
[Part 1] AgentSwitch: curator → discovery
[Part 4] useGeolocation에서 현재 좌표 확보
[Part 1] REST API GET /api/discover 호출
[Part 4] /api/discover가 Places API + Search Grounding 호출
[Part 4] DiscoveryResponse 반환
[Part 1] ServerToolResult로 UI에 결과 전달
[Part 4] NearbySites 컴포넌트가 카드 목록 렌더링
[Part 2] KnowledgePanel이 fullscreen으로 전환
```

---

## L. 파일 소유권 매트릭스

각 파일의 소유 파트를 명확히 하여 충돌 방지.

```
src/
├── app/
│   ├── layout.tsx                    → Part 2
│   ├── page.tsx                      → Part 2
│   ├── diary/[id]/page.tsx           → Part 4
│   └── api/
│       ├── session/route.ts          → Part 1
│       ├── session/resume/route.ts   → Part 1
│       ├── ws/route.ts               → Part 1
│       ├── restore/route.ts          → Part 3
│       ├── discover/route.ts         → Part 4
│       ├── diary/generate/route.ts   → Part 4
│       ├── diary/[id]/route.ts       → Part 4
│       └── health/route.ts           → Part 5
├── agents/
│   ├── orchestrator.ts               → Part 2 (라우팅 로직)
│   ├── curator.ts                    → Part 2 (시스템 프롬프트)
│   ├── restoration.ts                → Part 3
│   ├── discovery.ts                  → Part 4
│   └── diary.ts                      → Part 4
├── lib/
│   ├── gemini/
│   │   ├── live-api.ts               → Part 1
│   │   ├── flash-image.ts            → Part 3
│   │   └── search-grounding.ts       → Part 1
│   ├── firebase/
│   │   ├── config.ts                 → Part 5
│   │   ├── auth.ts                   → Part 5
│   │   └── firestore.ts              → Part 5
│   ├── audio/
│   │   ├── capture.ts                → Part 1
│   │   └── playback.ts               → Part 1
│   ├── camera/
│   │   └── capture.ts                → Part 1
│   ├── geo/
│   │   └── places.ts                 → Part 4
│   └── ws/
│       └── manager.ts                → Part 1
├── components/
│   ├── camera-view.tsx               → Part 2
│   ├── audio-visualizer.tsx          → Part 2
│   ├── knowledge-panel.tsx           → Part 2
│   ├── agent-indicator.tsx           → Part 2
│   ├── transcript.tsx                → Part 2
│   ├── before-after-slider.tsx       → Part 3
│   ├── nearby-sites.tsx              → Part 4
│   ├── diary-viewer.tsx              → Part 4
│   └── ui/                           → Part 5 (shadcn/ui)
├── hooks/
│   ├── use-live-session.ts           → Part 1
│   ├── use-camera.ts                 → Part 1
│   ├── use-microphone.ts             → Part 1
│   └── use-geolocation.ts            → Part 4
├── types/
│   ├── common.ts                     → Part 5
│   ├── live-session.ts               → Part 1
│   ├── ws-messages.ts                → Part 1
│   ├── restoration.ts                → Part 3
│   ├── discovery.ts                  → Part 4
│   ├── diary.ts                      → Part 4
│   ├── api.ts                        → Part 5
│   ├── models.ts                     → Part 5
│   ├── components.ts                 → 각 파트
│   ├── hooks.ts                      → 각 파트
│   └── env.d.ts                      → Part 5
├── public/
│   ├── manifest.json                 → Part 5
│   ├── icons/                        → Part 5
│   └── sw.js                         → Part 5
├── Dockerfile                        → Part 5
├── cloudbuild.yaml                   → Part 5
├── .env.example                      → Part 5
├── next.config.ts                    → Part 5
├── tailwind.config.ts                → Part 5
└── tsconfig.json                     → Part 5
```

---

## M. 설계 문서 체크리스트

각 파트 담당자가 설계 문서를 작성할 때 **반드시 포함해야 할 항목**:

### 공통 체크리스트

- [ ] 이 Contract 문서의 관련 타입을 모두 참조했는가
- [ ] 담당 파일 목록이 소유권 매트릭스와 일치하는가
- [ ] 다른 파트에서 호출하는 함수/이벤트의 시그니처가 명확한가
- [ ] 에러 핸들링 시나리오가 정의되어 있는가
- [ ] Claude Code가 혼자 구현할 수 있을 만큼 상세한가

### Part별 추가 체크리스트

**Part 1 (코어)**:
- [ ] Live API WebSocket 핸드셰이크 시퀀스
- [ ] 오디오 PCM 인코딩/디코딩 상세 (샘플레이트, 비트뎁스, 청크 크기)
- [ ] 카메라 프레임 추출 방법 (canvas, interval, 해상도)
- [ ] 재연결 로직 (타이밍, 컨텍스트 복원)
- [ ] Function Calling Bridge: Tool Call → REST API 매핑

**Part 2 (Curator + UI)**:
- [ ] Orchestrator 라우팅 if/else 조건 전체 목록
- [ ] Curator Agent 시스템 프롬프트 전문
- [ ] Knowledge Panel 3단계 전환 조건 + 애니메이션 스펙
- [ ] 각 컴포넌트의 상태 머신 다이어그램
- [ ] 반응형 브레이크포인트 (360px ~ 1440px)

**Part 3 (Restoration)**:
- [ ] Gemini 2.5 Flash Image Gen API 호출 코드 예시
- [ ] 복원 프롬프트 5종 이상 테스트 결과
- [ ] Before/After 슬라이더 터치 이벤트 핸들링 상세
- [ ] 이미지 저장/캐싱 전략 (Cloud Storage)

**Part 4 (Discovery + Diary)**:
- [ ] Google Places API 호출 파라미터 전체
- [ ] Geolocation API 권한 핸들링 플로우
- [ ] Diary 인터리브 출력 파싱 로직
- [ ] 다이어리 공유 링크 생성 로직

**Part 5 (인프라)**:
- [ ] GCP 프로젝트 셋업 순서 (API 활성화 목록)
- [ ] Dockerfile 멀티스테이지 빌드 상세
- [ ] Cloud Build 트리거 설정
- [ ] Firestore 보안 규칙 전체
- [ ] shadcn/ui 컴포넌트 목록 (Button, Card, Sheet, Slider, Toast 등)
- [ ] 블로그 초안 (보너스 +0.6)
