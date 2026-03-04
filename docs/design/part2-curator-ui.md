# TimeLens Part 2: Curator + UI -- 상세 설계 문서

> **파트**: Part 2 (Curator + UI)
> **버전**: 1.0
> **최종 수정**: 2026-03-04
> **목적**: Claude Code가 이 문서만 읽고 Part 2의 모든 파일을 독립적으로 구현할 수 있는 수준의 상세 명세
> **참조 문서**: `docs/contracts/shared-contract.md`, `docs/contracts/gemini-sdk-reference.md`, `docs/prd/timelens-prd-ko.md`, `docs/prd/timelens-ui-flow.md`, `docs/design/part1-core-pipeline.md`
>
> **Source of Truth**: env var / model ID → `docs/contracts/gemini-sdk-reference.md` · 타입 / 파일 소유권 → `docs/contracts/shared-contract.md` · 충돌 시 위 문서가 우선

---

## 0. 아키텍처 결정 요약 (확정)

| 결정 | 내용 |
|---|---|
| **프레임워크** | Next.js 15 App Router, React 19, TypeScript 5 |
| **스타일링** | Tailwind CSS 4 + shadcn/ui 기본 컴포넌트 |
| **상태 관리** | React useState/useRef + useLiveSession 훅 (Part 1 제공). 별도 전역 상태 라이브러리 불필요 |
| **애니메이션** | CSS transitions + Tailwind animate 유틸리티. Framer Motion 불필요 (번들 크기 절약) |
| **레이아웃** | 모바일 퍼스트 (360px 기준), 카메라 전체 화면 배경, 오버레이 패널 |
| **제스처** | 터치 이벤트 기반 스와이프 (패널 높이 조절), Pointer Events (슬라이더) |
| **ADK 전략** | Part 1이 Live API System Prompt로 오케스트레이션 구현. Part 2의 `orchestrator.ts`/`curator.ts`는 ADK 서버사이드 에이전트로, 텍스트 폴백 모드에서만 사용 |

### Part 2가 소비하는 Part 1 인터페이스

```
useLiveSession() → UseLiveSessionReturn
├── sessionState: SessionState
├── isConnected: boolean
├── isFallbackMode: boolean
├── connect(config) / disconnect()
├── toggleMic(enabled) / toggleCamera(enabled)
├── interrupt()
├── requestTopicDetail(topicId, topicLabel)
├── sendTextMessage(text) / sendPhoto(imageBase64)
├── currentArtifact: ArtifactSummary | null
├── transcript: TranscriptChunk[]
├── audioState: AudioState
└── activeAgent: AgentType
```

---

## 1. 파일 소유권 맵

```
src/
├── app/
│   ├── layout.tsx                   ← 루트 레이아웃 (메타데이터, 폰트, 전역 providers)
│   ├── page.tsx                     ← 랜딩/온보딩 페이지
│   └── (main)/
│       ├── layout.tsx               ← 메인 레이아웃 (세션 provider)
│       └── page.tsx                 ← 메인 화면 (카메라 + 패널 조합)
├── components/
│   ├── CameraView.tsx               ← 카메라 뷰파인더 + 스캔 코너
│   ├── KnowledgePanel.tsx           ← 지식 패널 (closed/mini/expanded/fullscreen)
│   ├── TranscriptChat.tsx           ← 채팅형 트랜스크립트
│   ├── AudioVisualizer.tsx          ← 오디오 파형 시각화
│   ├── AgentIndicator.tsx           ← 현재 에이전트 표시
│   ├── TopicChip.tsx                ← 탭 가능한 토픽 칩
│   ├── PermissionGate.tsx           ← 카메라/마이크 권한 요청 UI
│   └── ErrorBoundary.tsx            ← 에러 처리 UI
└── agents/
    ├── orchestrator.ts              ← ADK Orchestrator (서버사이드, 폴백 모드)
    └── curator.ts                   ← Curator Agent 설정 (서버사이드, 폴백 모드)
```

---

## 2. 화면 구조 및 데이터 흐름

### 2.1 전체 화면 레이아웃 (모바일 기준)

```
┌─────────────────────────────── 360px ──────────────────────────────┐
│                                                                     │
│  [상태바 영역 - safe-area-inset-top]                                │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                                                               │  │
│  │                    CameraView (z-0)                           │  │
│  │                  (전체 화면 배경)                               │  │
│  │                                                               │  │
│  │                                                               │  │
│  │                                                               │  │
│  │                                                               │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────── z-10 ──────────────────────────────────┐  │
│  │  AgentIndicator                                               │  │
│  │  AudioVisualizer                                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────── z-20 ──────────────────────────────────┐  │
│  │                                                               │  │
│  │              KnowledgePanel (슬라이드업)                       │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────── z-30 ──────────────────────────────────┐  │
│  │  [🎤 Mic]     [📸 Capture]     [📖 Diary]                    │  │
│  │                ActionBar                                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [safe-area-inset-bottom]                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 데이터 흐름: useLiveSession → 컴포넌트

```
useLiveSession()
│
├── currentArtifact ─────────────► KnowledgePanel.artifact
│                                  ├── 이름, 시대, 문명, 한줄 설명
│                                  └── topics[] ──► TopicChip[]
│
├── transcript[] ────────────────► KnowledgePanel → TranscriptChat.chunks
│
├── audioState ──────────────────► AudioVisualizer.state
│                                  ├── 'idle'       → 평평한 선
│                                  ├── 'listening'  → 파란 파형
│                                  ├── 'speaking'   → 보라 파형
│                                  └── 'generating' → 스피너
│
├── activeAgent ─────────────────► AgentIndicator.activeAgent
│
├── sessionState ────────────────► 연결 상태 표시, 에러 핸들링
│
├── requestTopicDetail() ────────► TopicChip.onTap → 토픽 상세 요청
│
├── toggleMic() ─────────────────► ActionBar 마이크 버튼
│
├── sendTextMessage() ───────────► 폴백 모드 텍스트 입력
│
├── sendPhoto() ─────────────────► ActionBar 캡처 버튼
│
└── interrupt() ─────────────────► 사용자 인터럽트 시 호출
```

---

## 3. 파일별 상세 설계

### 3.1 `src/app/layout.tsx` -- 루트 레이아웃

**역할**: Next.js App Router 루트 레이아웃. HTML `<head>` 메타데이터, 폰트, viewport 설정, PWA manifest 링크.

**시그니처**:
```typescript
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = { ... };
export const viewport: Viewport = { ... };
export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element;
```

**구현 상세**:

1. `metadata` 객체 정의:
   ```typescript
   export const metadata: Metadata = {
     title: 'TimeLens - AI Cultural Heritage Companion',
     description: 'Point your camera at museum artifacts for instant AI-powered voice explanations and visual restorations',
     manifest: '/manifest.json',
     appleWebApp: {
       capable: true,
       statusBarStyle: 'black-translucent',
       title: 'TimeLens',
     },
   };
   ```

2. `viewport` 객체 정의 (모바일 최적화):
   ```typescript
   export const viewport: Viewport = {
     width: 'device-width',
     initialScale: 1,
     maximumScale: 1,           // 핀치 줌 방지 (카메라 뷰)
     userScalable: false,
     viewportFit: 'cover',      // safe-area 활용
     themeColor: '#000000',
   };
   ```

3. 폰트 로딩: `next/font/google`에서 `Inter` (본문) + `Space_Grotesk` (제목) 로드
   ```typescript
   import { Inter, Space_Grotesk } from 'next/font/google';

   const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
   const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-heading' });
   ```

4. 레이아웃 JSX:
   ```tsx
   return (
     <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
       <body className="font-sans bg-black text-white antialiased overflow-hidden">
         {children}
       </body>
     </html>
   );
   ```

**스타일링**:
- `bg-black`: 카메라 뷰 뒤 배경 (로딩 중 검정)
- `text-white`: 카메라 위 오버레이 텍스트 기본 색상
- `overflow-hidden`: 전체 페이지 스크롤 방지 (카메라 앱 느낌)
- `antialiased`: 텍스트 렌더링 품질

**의존성**: `next/font/google`, `@/app/globals.css` (Tailwind directives)

---

### 3.2 `src/app/page.tsx` -- 랜딩/온보딩 페이지

**역할**: 앱 첫 진입 시 표시되는 랜딩 페이지. 앱 소개 + "시작하기" CTA. 온보딩 생략하고 바로 메인 화면으로 이동 가능.

**시그니처**:
```typescript
'use client';

export default function LandingPage(): JSX.Element;
```

**구현 상세**:

1. 상태 관리:
   ```typescript
   const [isStarting, setIsStarting] = useState(false);
   const router = useRouter();
   ```

2. "시작하기" 버튼 클릭 시:
   ```typescript
   const handleStart = async () => {
     setIsStarting(true);
     router.push('/main');
   };
   ```

3. 렌더링 구조:
   ```
   ┌──────────────────────────────┐
   │                              │
   │       ⏳ TimeLens            │ ← 로고 + 앱 이름
   │                              │
   │   AI Cultural Heritage       │ ← 한줄 설명
   │   Companion                  │
   │                              │
   │   ┌────────────────────┐     │
   │   │    🏛️ 실시간 인식   │     │ ← 기능 아이콘 3개
   │   │    🎨 유물 복원     │     │
   │   │    🧭 주변 발견     │     │
   │   └────────────────────┘     │
   │                              │
   │   ┌────────────────────────┐ │
   │   │    시작하기 →           │ │ ← CTA 버튼
   │   └────────────────────────┘ │
   │                              │
   │   카메라와 마이크가           │ ← 권한 사전 안내
   │   필요합니다                  │
   │                              │
   └──────────────────────────────┘
   ```

**스타일링**:
```
컨테이너: min-h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black px-6
로고: text-4xl font-heading font-bold text-white
서브텍스트: text-lg text-gray-400 mt-2
CTA 버튼: w-full max-w-sm py-4 bg-white text-black rounded-2xl font-semibold text-lg
         hover:bg-gray-100 transition-colors duration-200
         disabled:opacity-50 disabled:cursor-not-allowed
권한 안내: text-sm text-gray-500 mt-4
```

**에러 처리**: 없음 (정적 페이지)

**의존성**: `next/navigation` (`useRouter`)

---

### 3.3 `src/app/(main)/layout.tsx` -- 메인 레이아웃

**역할**: 메인 화면 전용 레이아웃. ErrorBoundary 래핑. 전체 높이 고정.

**시그니처**:
```typescript
import ErrorBoundary from '@/components/ErrorBoundary';

export default function MainLayout({ children }: { children: React.ReactNode }): JSX.Element;
```

**구현 상세**:

1. 전체 화면 고정 레이아웃:
   ```tsx
   return (
     <ErrorBoundary>
       <div className="fixed inset-0 flex flex-col bg-black">
         {children}
       </div>
     </ErrorBoundary>
   );
   ```

**스타일링**:
- `fixed inset-0`: 뷰포트 전체를 차지 (주소 바 숨김 시에도 대응)
- `flex flex-col`: 세로 방향 레이아웃
- `bg-black`: 카메라 로딩 전 검정 배경

**의존성**: `@/components/ErrorBoundary`

---

### 3.4 `src/app/(main)/page.tsx` -- 메인 화면 (카메라 + 패널 조합)

**역할**: TimeLens의 핵심 화면. 카메라 배경 위에 모든 UI 오버레이를 조합. `useLiveSession` 훅을 통해 Part 1과 연결.

**시그니처**:
```typescript
'use client';

export default function MainPage(): JSX.Element;
```

**구현 상세**:

#### 단계 1: 상태 및 훅 초기화

```typescript
// Part 1 훅
const {
  sessionState, isConnected, isFallbackMode,
  connect, disconnect, toggleMic, toggleCamera,
  interrupt, requestTopicDetail, sendTextMessage, sendPhoto,
  currentArtifact, transcript, audioState, activeAgent,
} = useLiveSession();

// 로컬 UI 상태
const [panelState, setPanelState] = useState<PanelState>('closed');
const [isMicOn, setIsMicOn] = useState(true);
const [permissionsGranted, setPermissionsGranted] = useState(false);
const [textInput, setTextInput] = useState('');
const [agentTransition, setAgentTransition] = useState<AgentSwitchData | null>(null);
const [isAgentTransitioning, setIsAgentTransitioning] = useState(false);

const cameraViewRef = useRef<{ capturePhoto: () => string }>(null);
```

#### 단계 2: 권한 확인 후 세션 연결

```typescript
const handlePermissionsGranted = useCallback(async () => {
  setPermissionsGranted(true);
  try {
    await connect({ language: navigator.language.split('-')[0] || 'en' });
  } catch (error) {
    console.error('Failed to connect:', error);
  }
}, [connect]);
```

#### 단계 3: 유물 인식 시 패널 자동 전환

```typescript
useEffect(() => {
  if (currentArtifact && panelState === 'closed') {
    setPanelState('mini');
  }
}, [currentArtifact, panelState]);
```

#### 단계 4: 에이전트 전환 감지

```typescript
const prevAgentRef = useRef(activeAgent);
useEffect(() => {
  if (prevAgentRef.current !== activeAgent) {
    setIsAgentTransitioning(true);
    setAgentTransition({
      from: prevAgentRef.current,
      to: activeAgent,
      reason: getAgentSwitchReason(activeAgent),
    });
    prevAgentRef.current = activeAgent;
    const timer = setTimeout(() => setIsAgentTransitioning(false), 2000);
    return () => clearTimeout(timer);
  }
}, [activeAgent]);

function getAgentSwitchReason(agent: AgentType): string {
  switch (agent) {
    case 'restoration': return '복원 이미지를 생성합니다';
    case 'discovery': return '주변 문화유산을 검색합니다';
    case 'diary': return '다이어리를 생성합니다';
    default: return '';
  }
}
```

#### 단계 5: 액션 핸들러 정의

```typescript
const handleMicToggle = useCallback(() => {
  const newState = !isMicOn;
  setIsMicOn(newState);
  toggleMic(newState);
}, [isMicOn, toggleMic]);

const handleCapture = useCallback(() => {
  const photo = cameraViewRef.current?.capturePhoto();
  if (photo) sendPhoto(photo);
}, [sendPhoto]);

const handleTopicTap = useCallback((topicId: string, topicLabel: string) => {
  requestTopicDetail(topicId, topicLabel);
  if (panelState === 'mini') setPanelState('expanded');
}, [requestTopicDetail, panelState]);

const handleTextSubmit = useCallback(() => {
  if (textInput.trim()) {
    sendTextMessage(textInput.trim());
    setTextInput('');
  }
}, [textInput, sendTextMessage]);
```

#### 단계 6: 렌더링 조합

```tsx
// 권한 미획득 시 PermissionGate 표시
if (!permissionsGranted) {
  return <PermissionGate onGranted={handlePermissionsGranted} />;
}

return (
  <div className="relative w-full h-full">
    {/* 레이어 0: 카메라 배경 */}
    <CameraView
      ref={cameraViewRef}
      isScanning={isConnected && !currentArtifact}
      isRecognized={!!currentArtifact}
      isBlurred={panelState === 'expanded' || panelState === 'fullscreen'}
      onCapturePhoto={() => cameraViewRef.current?.capturePhoto() ?? ''}
    />

    {/* 레이어 1: 에이전트 + 오디오 */}
    <div className="absolute left-0 right-0 z-10"
         style={{ bottom: getPanelTopOffset(panelState) + ACTION_BAR_HEIGHT }}>
      <AgentIndicator
        activeAgent={activeAgent}
        switchData={agentTransition ?? undefined}
        isTransitioning={isAgentTransitioning}
      />
      <AudioVisualizer state={audioState} />
    </div>

    {/* 레이어 2: 지식 패널 */}
    <KnowledgePanel
      state={panelState}
      artifact={currentArtifact}
      transcript={transcript}
      onStateChange={setPanelState}
      onTopicTap={handleTopicTap}
    />

    {/* 레이어 3: 하단 액션 바 */}
    <div className="absolute bottom-0 left-0 right-0 z-30 safe-area-bottom">
      <div className="flex items-center justify-around px-6 py-3 bg-black/60 backdrop-blur-md">
        {/* 마이크 버튼 */}
        <button
          onClick={handleMicToggle}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors
            ${isMicOn ? 'bg-white text-black' : 'bg-red-500 text-white'}`}
          aria-label={isMicOn ? '마이크 끄기' : '마이크 켜기'}
        >
          {isMicOn ? <MicIcon /> : <MicOffIcon />}
        </button>

        {/* 캡처 버튼 */}
        <button
          onClick={handleCapture}
          className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center
                     active:scale-95 transition-transform"
          aria-label="사진 캡처"
        >
          <div className="w-12 h-12 rounded-full bg-white" />
        </button>

        {/* 다이어리 버튼 */}
        <button
          onClick={() => sendTextMessage('다이어리 만들어줘')}
          className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center"
          aria-label="다이어리"
        >
          <BookIcon />
        </button>
      </div>

      {/* 폴백 모드: 텍스트 입력 */}
      {isFallbackMode && (
        <div className="flex items-center gap-2 px-4 pb-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-4 py-3 bg-white/10 rounded-full text-white
                       placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-white/30"
          />
          <button
            onClick={handleTextSubmit}
            className="px-4 py-3 bg-white text-black rounded-full font-medium"
          >
            전송
          </button>
        </div>
      )}
    </div>
  </div>
);
```

#### 유틸 함수: 패널 오프셋 계산

```typescript
const ACTION_BAR_HEIGHT = 80; // px

function getPanelTopOffset(state: PanelState): number {
  switch (state) {
    case 'closed': return 0;
    case 'mini': return 120;
    case 'expanded': return window.innerHeight * 0.6;
    case 'fullscreen': return window.innerHeight * 0.9;
  }
}
```

**스타일링**: `relative w-full h-full` (부모 fixed 컨테이너 꽉 채움)

**에러 처리**:
- 세션 연결 실패: `sessionState.status === 'disconnected'` 감지 → ErrorBoundary에 위임
- 폴백 모드 자동 전환: `isFallbackMode === true` 시 텍스트 입력 UI 표시

**의존성**: `useLiveSession` (Part 1), 모든 Part 2 컴포넌트, `@/types/common` (`PanelState`, `AgentType`, `AudioState`)

---

### 3.5 `src/components/CameraView.tsx` -- 카메라 뷰파인더

**역할**: 전체 화면 카메라 라이브 뷰. 유물 스캔 시 코너 프레임 애니메이션. 인식 완료 시 체크마크. 패널 포커스 시 배경 흐림.

**Props/시그니처**:
```typescript
'use client';

import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import type { CameraViewProps } from '@/types/components';
import { useCamera } from '@/hooks/use-camera';

export interface CameraViewRef {
  capturePhoto: () => string;
}

const CameraView = forwardRef<CameraViewRef, CameraViewProps>(function CameraView(
  { isScanning, isRecognized, isBlurred, onCapturePhoto },
  ref
) {
  // ...
});

export default CameraView;
```

**구현 상세**:

#### 단계 1: 카메라 스트림 연결

```typescript
const { stream, isActive, error, startCamera, capturePhoto: capPhoto } = useCamera();
const videoRef = useRef<HTMLVideoElement>(null);

useEffect(() => {
  startCamera();
}, [startCamera]);

useEffect(() => {
  if (videoRef.current && stream) {
    videoRef.current.srcObject = stream;
  }
}, [stream]);

useImperativeHandle(ref, () => ({
  capturePhoto: () => capPhoto() ?? '',
}), [capPhoto]);
```

#### 단계 2: 스캔 코너 애니메이션

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
╔═══╗             ╔═══╗
║   ║             ║   ║    ← 4개의 코너 L자 프레임
╚═══╝             ╚═══╝       펄스 애니메이션 (opacity 0.4 → 1 → 0.4)
                               1초 주기 loop
╔═══╗             ╔═══╗
║   ║             ║   ║
╚═══╝             ╚═══╝
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

스캔 코너 컴포넌트:
```tsx
function ScanCorners({ visible }: { visible: boolean }) {
  if (!visible) return null;

  const cornerClass = 'absolute w-8 h-8 border-white/80 animate-pulse';

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="relative w-64 h-64">
        {/* 좌상 */}
        <div className={`${cornerClass} top-0 left-0 border-t-2 border-l-2 rounded-tl-lg`} />
        {/* 우상 */}
        <div className={`${cornerClass} top-0 right-0 border-t-2 border-r-2 rounded-tr-lg`} />
        {/* 좌하 */}
        <div className={`${cornerClass} bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg`} />
        {/* 우하 */}
        <div className={`${cornerClass} bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg`} />
      </div>
    </div>
  );
}
```

#### 단계 3: 인식 완료 체크마크

```tsx
function RecognizedBadge({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                    w-16 h-16 rounded-full bg-green-500/90 flex items-center justify-center
                    animate-in fade-in zoom-in duration-300">
      <CheckIcon className="w-8 h-8 text-white" />
    </div>
  );
}
```

#### 단계 4: 렌더링

```tsx
return (
  <div className="absolute inset-0 z-0">
    {/* 비디오 스트림 */}
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={`w-full h-full object-cover transition-all duration-300
        ${isBlurred ? 'blur-md brightness-50' : ''}`}
    />

    {/* 카메라 에러 시 */}
    {error && (
      <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
        <p className="text-gray-400 text-center px-8">
          카메라를 사용할 수 없습니다<br />
          <span className="text-sm">{error}</span>
        </p>
      </div>
    )}

    {/* 스캔 코너 */}
    <ScanCorners visible={isScanning && !isRecognized} />

    {/* 인식 완료 배지 */}
    <RecognizedBadge visible={isRecognized} />
  </div>
);
```

**상태 관리**:
| 상태 | 시각적 표현 |
|------|-----------|
| `isScanning=false, isRecognized=false` | 카메라만 표시 (대기) |
| `isScanning=true, isRecognized=false` | 스캔 코너 펄스 애니메이션 |
| `isRecognized=true` | 체크마크 배지 (300ms fade+zoom) |
| `isBlurred=true` | 블러 + 어두워짐 (패널 확장 시) |

**스타일링**:
- 비디오: `w-full h-full object-cover` (비율 유지, 공간 채움)
- 블러: `blur-md brightness-50` + `transition-all duration-300`
- 스캔 코너: `animate-pulse` (Tailwind 기본, 2s 주기)

**에러 처리**:
- 카메라 에러 → 에러 메시지 + 검정 배경
- 스트림 null → 빈 검정 배경 유지 (로딩 중)

**의존성**: `useCamera` (Part 1), `@/types/components` (`CameraViewProps`)

---

### 3.6 `src/components/KnowledgePanel.tsx` -- 지식 패널

**역할**: TimeLens의 핵심 UI. 유물 요약 카드 + 토픽 칩 + 채팅 트랜스크립트를 하나의 슬라이드업 패널로 통합. 4단계 상태 머신으로 높이 전환.

**Props/시그니처**:
```typescript
'use client';

import type { KnowledgePanelProps } from '@/types/components';
import type { PanelState } from '@/types/common';

export default function KnowledgePanel({
  state,
  artifact,
  transcript,
  onStateChange,
  onTopicTap,
  children,
}: KnowledgePanelProps): JSX.Element;
```

#### Knowledge Panel 상태 머신

```
                    ┌───────────────────────────────────────────────┐
                    │                                               │
                    ▼                                               │
              ┌──────────┐                                         │
              │          │   유물 인식 (자동)                       │
    ┌────────►│  CLOSED  │──────────────────────────►┐             │
    │         │  (0px)   │                           │             │
    │         │          │◄──────────┐               │             │
    │         └──────────┘  아래 스와이프  │               │             │
    │                     (from mini)│               │             │
    │                                │               │             │
    │                                │               ▼             │
    │                          ┌──────────┐                        │
    │                          │          │   토픽 탭 / 위로 스와이프│
    │                          │   MINI   │────────────►┐          │
    │                          │  (120px) │             │          │
    │                          │          │◄────┐       │          │
    │                          └──────────┘     │       │          │
    │                                           │       ▼          │
    │                                   아래 스와이프 ┌──────────┐   │
    │                                   (from exp)  │          │   │
    │                                           │   │ EXPANDED │   │
    │                                           └───│  (60vh)  │   │
    │                                               │          │───┘
    │                                               └──────────┘ 아래 스와이프
    │                                                    │       (from full)
    │                                                    │
    │                                     B/A 슬라이더 / │
    │                                     다이어리 결과   │
    │                                                    ▼
    │                                               ┌──────────┐
    │                                               │          │
    └───────────────────────────────────────────────│FULLSCREEN│
                    아래 스와이프 (from fullscreen)   │  (90vh)  │
                                                    │          │
                                                    └──────────┘
```

**전환 규칙 상세**:

| 현재 상태 | 트리거 | 다음 상태 | 애니메이션 |
|-----------|--------|-----------|-----------|
| `closed` | `onArtifactRecognized` | `mini` | 슬라이드업 300ms ease-out |
| `mini` | 패널 탭 / 위로 스와이프 | `expanded` | 높이 확장 250ms spring |
| `mini` | 아래 스와이프 (>50px) | `closed` | 슬라이드 다운 200ms ease-in |
| `expanded` | 아래 스와이프 (>50px) | `mini` | 높이 축소 200ms ease-in |
| `expanded` | `onToolResult(restoration)` | `fullscreen` | 높이 확장 300ms spring |
| `fullscreen` | 아래 스와이프 (>80px) | `expanded` | 높이 축소 300ms ease-in |
| any | 새 유물 인식 | `mini` | 리셋 + 슬라이드업 300ms |

**구현 상세**:

#### 단계 1: 높이 계산

```typescript
function getPanelHeight(state: PanelState): string {
  switch (state) {
    case 'closed': return '0px';
    case 'mini': return '140px';
    case 'expanded': return '60dvh';
    case 'fullscreen': return '90dvh';
  }
}
```

#### 단계 2: 스와이프 제스처

```typescript
const [touchStart, setTouchStart] = useState<number | null>(null);
const [touchDelta, setTouchDelta] = useState(0);
const [isDragging, setIsDragging] = useState(false);

const handleTouchStart = (e: React.TouchEvent) => {
  setTouchStart(e.touches[0].clientY);
  setIsDragging(true);
};

const handleTouchMove = (e: React.TouchEvent) => {
  if (touchStart === null) return;
  const delta = touchStart - e.touches[0].clientY;
  setTouchDelta(delta);
};

const handleTouchEnd = () => {
  setIsDragging(false);
  if (touchStart === null) return;

  const SWIPE_THRESHOLD_UP = 50;
  const SWIPE_THRESHOLD_DOWN = 50;
  const SWIPE_THRESHOLD_DOWN_FULL = 80;

  if (touchDelta > SWIPE_THRESHOLD_UP) {
    // 위로 스와이프 → 확장
    if (state === 'mini') onStateChange('expanded');
    else if (state === 'expanded') onStateChange('fullscreen');
  } else if (touchDelta < -SWIPE_THRESHOLD_DOWN) {
    // 아래로 스와이프 → 축소
    if (state === 'mini') onStateChange('closed');
    else if (state === 'expanded') onStateChange('mini');
    else if (state === 'fullscreen' && touchDelta < -SWIPE_THRESHOLD_DOWN_FULL) {
      onStateChange('expanded');
    }
  }

  setTouchStart(null);
  setTouchDelta(0);
};
```

#### 단계 3: 패널 렌더링

```tsx
return (
  <div
    className="absolute left-0 right-0 bottom-0 z-20 safe-area-bottom"
    style={{ paddingBottom: '80px' /* ActionBar 높이 */ }}
  >
    <div
      className={`bg-gray-900/95 backdrop-blur-xl rounded-t-3xl overflow-hidden
        transition-all ${isDragging ? 'duration-0' : 'duration-300 ease-out'}`}
      style={{
        height: isDragging
          ? `calc(${getPanelHeight(state)} + ${touchDelta}px)`
          : getPanelHeight(state),
        maxHeight: '90dvh',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 드래그 핸들 */}
      <div className="flex justify-center py-2">
        <div className="w-10 h-1 rounded-full bg-gray-600" />
      </div>

      {/* 닫힌 상태면 렌더링 생략 */}
      {state !== 'closed' && (
        <div className="px-4 overflow-y-auto" style={{ maxHeight: 'calc(100% - 16px)' }}>
          {/* 요약 카드 (항상 표시) */}
          {artifact && <ArtifactSummaryCard artifact={artifact} />}

          {/* 토픽 칩 */}
          {artifact && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
              {artifact.topics.map((topic) => (
                <TopicChip
                  key={topic.id}
                  topic={topic}
                  onTap={() => onTopicTap(topic.id, topic.label)}
                />
              ))}
            </div>
          )}

          {/* 확장/풀스크린 시 트랜스크립트 */}
          {(state === 'expanded' || state === 'fullscreen') && (
            <div className="mt-3 border-t border-gray-700/50 pt-3">
              <TranscriptChat
                chunks={transcript}
                isStreaming={audioState === 'speaking'}
              />
            </div>
          )}

          {/* children 슬롯 (Part 3 BeforeAfterSlider 등) */}
          {state === 'fullscreen' && children}
        </div>
      )}
    </div>
  </div>
);
```

#### 내부 컴포넌트: ArtifactSummaryCard

```tsx
function ArtifactSummaryCard({ artifact }: { artifact: ArtifactSummary }) {
  return (
    <div>
      <h2 className="text-xl font-heading font-bold text-white">
        {artifact.name}
      </h2>
      <p className="text-sm text-gray-400 mt-1">
        {artifact.era} · {artifact.civilization}
        {artifact.architectureStyle && ` · ${artifact.architectureStyle}`}
      </p>
      <div className="mt-2 h-px bg-gray-700/50" />
      <p className="text-base text-gray-200 mt-2 leading-relaxed">
        "{artifact.oneLiner}"
      </p>
    </div>
  );
}
```

**상태 관리**:
- `state` (외부 prop): 패널 높이 결정
- `touchStart`, `touchDelta`, `isDragging` (로컬): 스와이프 제스처 추적

**스타일링**:
- 패널 배경: `bg-gray-900/95 backdrop-blur-xl rounded-t-3xl`
- 전환: `transition-all duration-300 ease-out` (드래그 중엔 `duration-0`)
- 드래그 핸들: `w-10 h-1 rounded-full bg-gray-600`
- safe-area 대응: `safe-area-bottom` padding

**에러 처리**:
- `artifact === null`: 패널 closed 유지
- 터치 이벤트 누락 (데스크톱): 패널 탭으로 전환 가능하도록 onClick도 지원

**의존성**: `TranscriptChat`, `TopicChip`, `@/types/components` (`KnowledgePanelProps`), `@/types/live-session` (`ArtifactSummary`, `TranscriptChunk`)

---

### 3.7 `src/components/TranscriptChat.tsx` -- 채팅형 트랜스크립트

**역할**: AI 음성 해설의 텍스트 트랜스크립트를 채팅 버블 형태로 실시간 표시. 자동 스크롤. 사용자 음성(STT)과 AI 응답을 구분.

**Props/시그니처**:
```typescript
'use client';

import type { TranscriptProps } from '@/types/components';
import type { TranscriptChunk } from '@/types/live-session';

export default function TranscriptChat({ chunks, isStreaming }: TranscriptProps): JSX.Element;
```

**구현 상세**:

#### 단계 1: 자동 스크롤

```typescript
const scrollRef = useRef<HTMLDivElement>(null);
const [isAutoScroll, setIsAutoScroll] = useState(true);

// 새 메시지 추가 시 자동 스크롤
useEffect(() => {
  if (isAutoScroll && scrollRef.current) {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }
}, [chunks, isAutoScroll]);

// 사용자가 위로 스크롤 시 자동 스크롤 비활성화
const handleScroll = () => {
  if (!scrollRef.current) return;
  const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
  setIsAutoScroll(isAtBottom);
};
```

#### 단계 2: 채팅 버블 렌더링

```tsx
return (
  <div
    ref={scrollRef}
    onScroll={handleScroll}
    className="space-y-3 max-h-[40dvh] overflow-y-auto overscroll-contain
               scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
  >
    {chunks.map((chunk) => (
      <ChatBubble key={chunk.id} chunk={chunk} />
    ))}

    {/* 스트리밍 인디케이터 */}
    {isStreaming && (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.1s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
        </div>
      </div>
    )}
  </div>
);
```

#### 단계 3: ChatBubble 내부 컴포넌트

```tsx
function ChatBubble({ chunk }: { chunk: TranscriptChunk }) {
  const isUser = chunk.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
          ${isUser
            ? 'bg-blue-500/20 text-blue-100 rounded-br-md'
            : 'bg-gray-800/80 text-gray-100 rounded-bl-md'}`}
      >
        {/* 역할 라벨 */}
        <span className={`text-xs font-medium block mb-1
          ${isUser ? 'text-blue-300' : 'text-purple-300'}`}>
          {isUser ? '나' : 'TimeLens'}
        </span>

        {/* 텍스트 */}
        <p className="whitespace-pre-wrap">{chunk.text}</p>

        {/* 출처 표시 */}
        {chunk.sources && chunk.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-700/30">
            <span className="text-xs text-gray-500">출처: Google Search</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

**상태 관리**:
- `isAutoScroll` (boolean): 사용자가 위로 스크롤하면 자동 스크롤 비활성화, 바닥 도달 시 재활성화

**스타일링**:
- 사용자 버블: `bg-blue-500/20 text-blue-100 rounded-br-md` (오른쪽)
- AI 버블: `bg-gray-800/80 text-gray-100 rounded-bl-md` (왼쪽)
- 스트리밍 점: `animate-bounce` + 시차 `animation-delay`
- 스크롤: `overscroll-contain` (패널 스크롤과 분리)

**에러 처리**:
- `chunks` 빈 배열: 빈 공간 렌더링 (상태 메시지 없음)

**의존성**: `@/types/components` (`TranscriptProps`), `@/types/live-session` (`TranscriptChunk`)

---

### 3.8 `src/components/AudioVisualizer.tsx` -- 오디오 파형 시각화

**역할**: 현재 오디오 상태를 시각적으로 표현. idle/listening/speaking/generating 4가지 상태에 따라 다른 애니메이션.

**Props/시그니처**:
```typescript
'use client';

import type { AudioVisualizerProps } from '@/types/components';

export default function AudioVisualizer({ state, audioLevel = 0 }: AudioVisualizerProps): JSX.Element;
```

**구현 상세**:

#### 단계 1: 상태별 바 생성

```typescript
const BAR_COUNT = 20;

// 상태별 바 높이 계산
function getBarHeights(state: AudioState, audioLevel: number, index: number): number {
  switch (state) {
    case 'idle':
      return 2; // 최소 높이 (평평한 선)

    case 'listening':
      // 사용자 음성 레벨에 따른 파형
      const wave = Math.sin((index / BAR_COUNT) * Math.PI * 2 + Date.now() / 200);
      return 2 + audioLevel * 20 * (0.5 + 0.5 * Math.abs(wave));

    case 'speaking':
      // AI 음성 — 부드러운 사인파
      const aiWave = Math.sin((index / BAR_COUNT) * Math.PI * 3 + Date.now() / 150);
      return 4 + 16 * (0.5 + 0.5 * Math.abs(aiWave));

    case 'generating':
      return 2; // generating은 스피너 표시
  }
}
```

#### 단계 2: 렌더링

```tsx
// generating 상태: 스피너
if (state === 'generating') {
  return (
    <div className="flex items-center justify-center h-8 gap-2">
      <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent
                      rounded-full animate-spin" />
      <span className="text-xs text-gray-400">생성 중...</span>
    </div>
  );
}

// 나머지: 파형 바
return (
  <div className="flex items-center justify-center h-8 gap-[2px] px-6">
    {Array.from({ length: BAR_COUNT }).map((_, i) => {
      const height = barsRef.current[i] ?? 2;
      return (
        <div
          key={i}
          className={`w-1 rounded-full transition-all duration-75
            ${state === 'listening' ? 'bg-blue-400' : ''}
            ${state === 'speaking' ? 'bg-purple-400' : ''}
            ${state === 'idle' ? 'bg-gray-600' : ''}`}
          style={{ height: `${height}px` }}
        />
      );
    })}
  </div>
);
```

#### 단계 3: 애니메이션 프레임 루프

```typescript
const barsRef = useRef<number[]>(Array(BAR_COUNT).fill(2));
const animFrameRef = useRef<number>(0);

useEffect(() => {
  if (state === 'generating') return;

  function animate() {
    barsRef.current = Array.from({ length: BAR_COUNT }, (_, i) =>
      getBarHeights(state, audioLevel, i)
    );
    // 강제 리렌더
    setTick((t) => t + 1);
    animFrameRef.current = requestAnimationFrame(animate);
  }

  animFrameRef.current = requestAnimationFrame(animate);
  return () => cancelAnimationFrame(animFrameRef.current);
}, [state, audioLevel]);

const [tick, setTick] = useState(0); // 리렌더 트리거
```

**상태별 시각화**:

| 상태 | 색상 | 애니메이션 | 설명 |
|------|------|-----------|------|
| `idle` | `bg-gray-600` | 높이 2px 고정 | 평평한 선 |
| `listening` | `bg-blue-400` | audioLevel에 연동, 사인파 | 사용자 음성 파형 |
| `speaking` | `bg-purple-400` | 독립 사인파 (AI 리듬) | AI 음성 파형 |
| `generating` | `border-purple-400` | spin | 로딩 스피너 |

**스타일링**:
- 바 컨테이너: `flex items-center justify-center h-8 gap-[2px] px-6`
- 각 바: `w-1 rounded-full transition-all duration-75`
- 색상 전환: Tailwind 조건부 클래스
- 스피너: `animate-spin` (Tailwind 기본)

**에러 처리**: 없음 (순수 시각 컴포넌트)

**의존성**: `@/types/components` (`AudioVisualizerProps`), `@/types/common` (`AudioState`)

---

### 3.9 `src/components/AgentIndicator.tsx` -- 에이전트 전환 표시

**역할**: 현재 활성 에이전트를 이름과 아이콘으로 표시. 에이전트 전환 시 크로스페이드 애니메이션과 전환 사유 표시.

**Props/시그니처**:
```typescript
'use client';

import type { AgentIndicatorProps } from '@/types/components';

export default function AgentIndicator({
  activeAgent,
  switchData,
  isTransitioning,
}: AgentIndicatorProps): JSX.Element;
```

**구현 상세**:

#### 에이전트 메타데이터 맵

```typescript
const AGENT_META: Record<AgentType, { icon: string; label: string; color: string }> = {
  curator:     { icon: '🤖', label: 'Curator Agent',     color: 'text-green-400' },
  restoration: { icon: '🎨', label: 'Restoration Agent', color: 'text-orange-400' },
  discovery:   { icon: '🧭', label: 'Discovery Agent',   color: 'text-blue-400' },
  diary:       { icon: '📖', label: 'Diary Agent',       color: 'text-yellow-400' },
};
```

#### 렌더링

```tsx
const meta = AGENT_META[activeAgent];

return (
  <div className="px-4 py-2">
    <div className={`flex items-center gap-2 transition-all duration-500 ease-in-out
      ${isTransitioning ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'}`}>
      <span className="text-lg">{meta.icon}</span>
      <span className={`text-sm font-medium ${meta.color}`}>
        {meta.label}
      </span>
    </div>

    {/* 전환 메시지 */}
    {isTransitioning && switchData && (
      <div className="flex items-center gap-2 mt-1 animate-in fade-in slide-in-from-left duration-300">
        <span className="text-lg">{AGENT_META[switchData.from].icon}</span>
        <span className="text-gray-500">→</span>
        <span className="text-lg">{AGENT_META[switchData.to].icon}</span>
        <span className="text-xs text-gray-400 ml-1">{switchData.reason}</span>
      </div>
    )}
  </div>
);
```

**상태 관리**:
- `isTransitioning`: 외부에서 제어. true 시 기존 라벨 페이드아웃 + 전환 메시지 표시

**스타일링**:
- 전환: `transition-all duration-500 ease-in-out`
- 에이전트별 색상: green(Curator), orange(Restoration), blue(Discovery), yellow(Diary)
- 전환 메시지: `animate-in fade-in slide-in-from-left duration-300`

**애니메이션 시퀀스**:
1. `isTransitioning=true`: 현재 라벨 페이드아웃 (500ms)
2. 전환 메시지 ("🤖 → 🎨 복원 이미지를 생성합니다") 슬라이드인 (300ms)
3. 2초 후 `isTransitioning=false`: 새 에이전트 라벨 페이드인 (500ms)

**의존성**: `@/types/components` (`AgentIndicatorProps`), `@/types/common` (`AgentType`)

---

### 3.10 `src/components/TopicChip.tsx` -- 탭 가능한 토픽 칩

**역할**: Knowledge Panel 요약 카드 하단에 표시되는 핵심 토픽 칩 (최대 3개). 탭 시 해당 토픽 상세 정보 요청.

**Props/시그니처**:
```typescript
'use client';

import type { TopicChip as TopicChipType } from '@/types/live-session';

interface TopicChipProps {
  topic: TopicChipType;
  isSelected?: boolean;
  onTap: () => void;
}

export default function TopicChip({ topic, isSelected = false, onTap }: TopicChipProps): JSX.Element;
```

**구현 상세**:

```tsx
return (
  <button
    onClick={onTap}
    className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium
      whitespace-nowrap transition-all duration-200
      ${isSelected
        ? 'bg-white text-black shadow-lg shadow-white/20'
        : 'bg-white/10 text-gray-200 hover:bg-white/20 active:bg-white/30'}`}
    aria-pressed={isSelected}
  >
    {topic.label}
  </button>
);
```

**스타일링**:
- 비선택: `bg-white/10 text-gray-200` (반투명 밝은 배경)
- 선택됨: `bg-white text-black shadow-lg shadow-white/20` (강조)
- 전환: `transition-all duration-200`
- 레이아웃: `inline-flex` + `whitespace-nowrap` (가로 스크롤 시 줄바꿈 방지)

**에러 처리**: 없음

**의존성**: `@/types/live-session` (`TopicChip`)

---

### 3.11 `src/components/PermissionGate.tsx` -- 권한 요청 UI

**역할**: 카메라 + 마이크 권한이 없을 때 표시되는 전체 화면 UI. 권한 요청 + 폴백 옵션.

**Props/시그니처**:
```typescript
'use client';

interface PermissionGateProps {
  onGranted: () => void;
}

export default function PermissionGate({ onGranted }: PermissionGateProps): JSX.Element;
```

**구현 상세**:

#### 단계 1: 권한 상태 관리

```typescript
type PermissionStatus = 'prompt' | 'requesting' | 'granted' | 'denied';

const [cameraStatus, setCameraStatus] = useState<PermissionStatus>('prompt');
const [micStatus, setMicStatus] = useState<PermissionStatus>('prompt');
```

#### 단계 2: 권한 요청 함수

```typescript
const requestPermissions = async () => {
  setCameraStatus('requesting');
  setMicStatus('requesting');

  try {
    // 카메라 + 마이크 동시 요청
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: true,
    });

    // 권한 획득 성공 → 스트림 즉시 해제 (실제 사용은 CameraView에서)
    stream.getTracks().forEach((track) => track.stop());

    setCameraStatus('granted');
    setMicStatus('granted');
    onGranted();
  } catch (error) {
    const err = error as DOMException;
    if (err.name === 'NotAllowedError') {
      setCameraStatus('denied');
      setMicStatus('denied');
    } else if (err.name === 'NotFoundError') {
      // 장치 없음 → 카메라만 재시도
      try {
        const videoOnly = await navigator.mediaDevices.getUserMedia({ video: true });
        videoOnly.getTracks().forEach((t) => t.stop());
        setCameraStatus('granted');
        setMicStatus('denied');
      } catch {
        setCameraStatus('denied');
        setMicStatus('denied');
      }
    }
  }
};
```

#### 단계 3: 기존 권한 확인 (마운트 시)

```typescript
useEffect(() => {
  // Permissions API로 기존 권한 확인
  async function checkExisting() {
    try {
      const cam = await navigator.permissions.query({ name: 'camera' as PermissionName });
      const mic = await navigator.permissions.query({ name: 'microphone' as PermissionName });

      if (cam.state === 'granted' && mic.state === 'granted') {
        setCameraStatus('granted');
        setMicStatus('granted');
        onGranted();
        return;
      }

      if (cam.state === 'granted') setCameraStatus('granted');
      if (mic.state === 'granted') setMicStatus('granted');
    } catch {
      // Permissions API 미지원 → prompt 상태 유지
    }
  }
  checkExisting();
}, [onGranted]);
```

#### 단계 4: 렌더링

```tsx
return (
  <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-8">
    {/* 아이콘 */}
    <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center mb-8">
      <CameraIcon className="w-12 h-12 text-gray-400" />
    </div>

    {/* 제목 */}
    <h1 className="text-2xl font-heading font-bold text-white text-center">
      카메라와 마이크 권한이 필요합니다
    </h1>

    {/* 설명 */}
    <p className="text-gray-400 text-center mt-4 leading-relaxed">
      TimeLens는 유물과 건물을 인식하고{'\n'}
      음성으로 대화하기 위해{'\n'}
      카메라와 마이크가 필요합니다.
    </p>

    {/* 권한 상태 표시 */}
    <div className="mt-8 space-y-3 w-full max-w-sm">
      <PermissionRow label="카메라" status={cameraStatus} />
      <PermissionRow label="마이크" status={micStatus} />
    </div>

    {/* CTA */}
    {(cameraStatus === 'prompt' || cameraStatus === 'requesting') && (
      <button
        onClick={requestPermissions}
        disabled={cameraStatus === 'requesting'}
        className="mt-8 w-full max-w-sm py-4 bg-white text-black rounded-2xl
                   font-semibold text-lg transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {cameraStatus === 'requesting' ? '권한 요청 중...' : '권한 허용하기'}
      </button>
    )}

    {/* 거부 시 대안 */}
    {cameraStatus === 'denied' && (
      <div className="mt-8 space-y-3 w-full max-w-sm">
        <button
          onClick={() => onGranted()} // 폴백 모드로 진입
          className="w-full py-4 bg-gray-800 text-white rounded-2xl font-medium"
        >
          사진 업로드로 시작하기
        </button>
        <p className="text-xs text-gray-500 text-center">
          브라우저 설정에서 카메라 권한을 허용하면{'\n'}
          실시간 인식 기능을 사용할 수 있습니다.
        </p>
      </div>
    )}
  </div>
);
```

#### 내부 컴포넌트: PermissionRow

```tsx
function PermissionRow({ label, status }: { label: string; status: PermissionStatus }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 bg-gray-800/50 rounded-xl">
      <span className="text-gray-300">{label}</span>
      <span className={`text-sm font-medium
        ${status === 'granted' ? 'text-green-400' : ''}
        ${status === 'denied' ? 'text-red-400' : ''}
        ${status === 'prompt' ? 'text-gray-500' : ''}
        ${status === 'requesting' ? 'text-yellow-400' : ''}`}>
        {status === 'granted' && '허용됨'}
        {status === 'denied' && '거부됨'}
        {status === 'prompt' && '대기 중'}
        {status === 'requesting' && '요청 중...'}
      </span>
    </div>
  );
}
```

**상태 관리**:
- `cameraStatus`, `micStatus`: 각 권한의 4가지 상태

**에러 처리**:
- 권한 거부: 폴백 옵션 표시 (사진 업로드 모드)
- Permissions API 미지원 (Firefox 등): getUserMedia 직접 호출

**의존성**: 없음 (Web API만 사용)

---

### 3.12 `src/components/ErrorBoundary.tsx` -- 에러 처리 UI

**역할**: React Error Boundary. 렌더링 에러 포착 + 네트워크/세션 에러 표시.

**Props/시그니처**:
```typescript
'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // ...
}
```

**구현 상세**:

```typescript
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-8">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-6">
            <span className="text-3xl">⚠️</span>
          </div>

          <h2 className="text-xl font-heading font-bold text-white text-center">
            문제가 발생했습니다
          </h2>

          <p className="text-gray-400 text-center mt-3 text-sm">
            {this.state.error?.message || '알 수 없는 오류가 발생했습니다'}
          </p>

          <button
            onClick={this.handleRetry}
            className="mt-8 px-8 py-3 bg-white text-black rounded-full font-medium"
          >
            다시 시도
          </button>

          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-8 py-3 text-gray-400 text-sm"
          >
            페이지 새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**에러 처리**:
- 렌더링 에러 → 에러 UI 표시 + 재시도 버튼
- "다시 시도": state 리셋으로 children 리렌더
- "새로고침": `window.location.reload()`

**의존성**: 없음

---

### 3.13 `src/agents/orchestrator.ts` -- ADK Orchestrator (서버사이드)

**역할**: ADK 기반 오케스트레이터 에이전트. **폴백 모드(텍스트 전용)에서만 사용**. Live API가 정상 작동할 때는 Live API 시스템 프롬프트가 오케스트레이션 수행 (Part 1 `tools.ts` 참조).

**시그니처**:
```typescript
// 서버사이드 전용 (API Route에서 import)
import { LlmAgent } from '@google/adk';
import { curatorAgent } from './curator';

export const orchestrator: LlmAgent;
```

**구현 상세**:

```typescript
import 'dotenv/config';
import { LlmAgent } from '@google/adk';
import { curatorAgent } from './curator';

export const orchestrator = new LlmAgent({
  name: 'timelens_orchestrator',
  model: 'gemini-2.5-flash',
  description: 'TimeLens main coordinator. Routes user requests to specialist agents.',
  instruction: `You are the TimeLens Orchestrator. Your job is to analyze user intent
and delegate to the appropriate specialist agent.

## Routing Rules (if/else 완전 목록)

1. **유물/건물 인식 요청** → curator_agent
   - "이게 뭐야?", "이 유물 설명해줘", "What is this?"
   - 이미지가 첨부된 일반 질문
   - 역사/문화 관련 질문

2. **복원 요청** → (현재 미구현, curator_agent가 텍스트로 설명)
   - "복원해줘", "원래 모습 보여줘", "Show me the original"
   - "새것이었을 때 어떻게 생겼어?"

3. **주변 탐색 요청** → (현재 미구현, curator_agent가 텍스트로 안내)
   - "근처에 박물관 있어?", "주변 유적지 추천"
   - "Nearby museums?"

4. **다이어리 요청** → (현재 미구현, curator_agent가 텍스트로 안내)
   - "다이어리 만들어줘", "방문 요약해줘"

5. **기타 모든 입력** → curator_agent

## Important
- In fallback text mode, only curator_agent is available.
- Respond in the user's language.`,

  subAgents: [curatorAgent],
});
```

#### 라우팅 조건 전체 목록

| 우선순위 | 키워드/의도 | 타겟 에이전트 | 비고 |
|---------|-----------|-------------|------|
| 1 | 복원/restoration 관련 | curator (폴백) / restoration (Live) | 폴백에선 텍스트 설명 |
| 2 | 주변/근처/nearby 관련 | curator (폴백) / discovery (Live) | 폴백에선 안내만 |
| 3 | 다이어리/일기/diary | curator (폴백) / diary (Live) | 폴백에선 안내만 |
| 4 | 유물/건물 인식 | curator | 이미지 첨부 시 |
| 5 | 역사/문화 질문 | curator | 기본 라우팅 |
| 6 | 기타 | curator | catch-all |

**의존성**: `@google/adk` (`LlmAgent`), `./curator`

---

### 3.14 `src/agents/curator.ts` -- Curator Agent 설정

**역할**: 폴백 모드용 Curator 에이전트. 이미지와 텍스트 입력을 받아 유물/건물 해설 텍스트를 생성.

**시그니처**:
```typescript
import { LlmAgent, GOOGLE_SEARCH } from '@google/adk';

export const curatorAgent: LlmAgent;
```

**구현 상세**:

```typescript
import 'dotenv/config';
import { LlmAgent } from '@google/adk';

export const curatorAgent = new LlmAgent({
  name: 'curator_agent',
  model: 'gemini-2.5-flash',
  description: 'Museum curator AI that identifies and explains artifacts with rich historical context.',
  instruction: `You are TimeLens Curator, a world-class museum docent and cultural heritage expert.

## Core Behaviors (Text Fallback Mode)
1. When given an image of an artifact/building, identify it and provide:
   - Name (in user's language)
   - Era/date
   - Civilization/culture
   - One-line summary
   - 3 key topics for deeper exploration

2. Provide rich historical context:
   - Origin and craftsmanship
   - Cultural significance
   - Daily life usage
   - Connected stories and mythology

3. When asked about restoration:
   - Describe what the artifact would have looked like when new
   - Explain the damage and deterioration over time
   - Note: Image restoration is only available in voice mode

4. When asked about nearby places:
   - Suggest searching for nearby cultural sites
   - Note: GPS-based discovery is only available in voice mode

## Response Style
- Match the user's language
- Be passionate and approachable, like a great museum docent
- Use vivid storytelling ("Imagine this amphora 2,500 years ago...")
- Keep responses focused: 2-3 paragraphs per topic
- Always cite sources when making factual claims

## Response Format (structured)
When identifying an artifact, start with a structured block:

**[이름]** | [시대] | [문명]
> [한줄 핵심 설명]
>
> 핵심 토픽: [토픽1], [토픽2], [토픽3]

Then provide the detailed narration.`,
  // 주의: GOOGLE_SEARCH는 반드시 단독 사용
  // 폴백 모드에서는 커스텀 도구 없이 텍스트만 생성
  // 검색 그라운딩이 필요하면 별도 searchAgent를 subAgent로 구성
});
```

#### Curator 시스템 프롬프트 전문 (Live API 모드 -- Part 1 `tools.ts`에 정의됨, 참조용)

> Live API 모드에서의 전체 시스템 프롬프트는 Part 1의 `src/lib/gemini/tools.ts` 파일에 `getSystemInstruction(language)` 함수로 정의되어 있다. Part 2는 이를 직접 수정하지 않으며, Part 1 문서를 참조한다.

**의존성**: `@google/adk` (`LlmAgent`)

---

## 4. 반응형 레이아웃 규칙

### 4.1 브레이크포인트

| 브레이크포인트 | 너비 | 용도 |
|-------------|------|------|
| `xs` (기본) | 320px - 374px | 소형 스마트폰 |
| `sm` | 375px - 427px | 일반 스마트폰 |
| `md` | 428px - 767px | 대형 스마트폰 / 소형 태블릿 |
| `lg` | 768px - 1023px | 태블릿 |
| `xl` | 1024px+ | 데스크톱 (심사용) |

### 4.2 반응형 규칙 상세

```
■ 카메라 뷰
  xs-md: 전체 화면 (object-cover)
  lg+:   최대 720px 높이, 중앙 정렬, 좌우 검정 패딩

■ Knowledge Panel
  xs-sm: 하단 슬라이드업, 전체 너비
  md:    하단 슬라이드업, 좌우 margin-x-4
  lg+:   우측 사이드 패널 (width: 400px), 항상 expanded 상태

■ 액션 바
  xs-md: 하단 고정, 전체 너비
  lg+:   우측 사이드 패널 하단에 통합

■ 토픽 칩
  xs-sm: 가로 스크롤 (overflow-x-auto)
  md+:   flex-wrap (줄바꿈 허용)

■ 채팅 버블
  xs:    max-width 90%
  sm+:   max-width 85%
  lg+:   max-width 75%

■ 폰트 크기
  xs:    유물명 text-lg, 본문 text-sm
  sm+:   유물명 text-xl, 본문 text-base
  lg+:   유물명 text-2xl, 본문 text-base
```

### 4.3 safe-area 처리

```css
/* globals.css에 추가 */
.safe-area-top {
  padding-top: env(safe-area-inset-top, 0);
}
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
```

---

## 5. 애니메이션 스펙 총정리

| ID | 전환 | CSS Property | Duration | Easing | 설명 |
|----|------|-------------|----------|--------|------|
| A1 | 대기 → 스캐닝 | opacity | 200ms | ease-out | 스캔 코너 페이드인 |
| A2 | 스캔 코너 펄스 | opacity (0.4→1→0.4) | 2000ms | ease-in-out | Tailwind `animate-pulse` |
| A3 | 인식 완료 배지 | opacity, transform | 300ms | ease-out | fade-in + zoom-in |
| A4 | 패널 슬라이드업 (closed→mini) | height | 300ms | ease-out | 0px → 140px |
| A5 | 패널 확장 (mini→expanded) | height | 250ms | cubic-bezier(0.175,0.885,0.32,1.275) | spring 느낌 |
| A6 | 패널 풀스크린 (expanded→fullscreen) | height | 300ms | cubic-bezier(0.175,0.885,0.32,1.275) | spring 느낌 |
| A7 | 패널 축소 | height | 200ms | ease-in | 역방향은 빠르게 |
| A8 | 에이전트 전환 (페이드아웃) | opacity, transform | 500ms | ease-in-out | 기존 라벨 사라짐 |
| A9 | 에이전트 전환 (전환 메시지 진입) | opacity, transform | 300ms | ease-out | slide-in-from-left |
| A10 | 카메라 블러 | filter(blur), brightness | 300ms | ease-out | 패널 확장 시 |
| A11 | 토스트 진입 | transform(translateY) | 200ms | ease-out | 위에서 아래로 |
| A12 | 토스트 퇴장 | opacity, transform | 200ms | ease-in | 위로 페이드아웃 |
| A13 | 스트리밍 점 | transform(translateY) | 600ms | ease-in-out | 3개 점 시차 bounce |
| A14 | 오디오 바 높이 변화 | height | 75ms | linear | requestAnimationFrame |

### CSS Custom Easing (tailwind.config.ts에 추가)

```typescript
// tailwind.config.ts 확장
theme: {
  extend: {
    transitionTimingFunction: {
      'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
    keyframes: {
      'slide-up': {
        '0%': { transform: 'translateY(100%)' },
        '100%': { transform: 'translateY(0)' },
      },
      'slide-down': {
        '0%': { transform: 'translateY(0)' },
        '100%': { transform: 'translateY(100%)' },
      },
    },
    animation: {
      'slide-up': 'slide-up 300ms ease-out',
      'slide-down': 'slide-down 200ms ease-in',
    },
  },
},
```

---

## 6. 통합 시나리오 상세 (Part 2 관점)

### 시나리오 1: 유물 인식 → 요약 카드 → 토픽 탐색

```
시간   Part 1                         Part 2 (UI)
─────────────────────────────────────────────────────────────
0s     카메라 프레임 전송 시작          CameraView: isScanning=true
                                       스캔 코너 애니메이션 표시

~2s    Live API: recognize_artifact    useLiveSession.currentArtifact 업데이트
       tool call 수신 → 파싱            │
       → onArtifactRecognized()        ├→ CameraView: isRecognized=true (체크마크)
                                       ├→ KnowledgePanel: panelState → 'mini'
                                       │  (요약 카드 슬라이드업 300ms)
                                       └→ ArtifactSummaryCard 렌더링
                                          - 이름, 시대, 문명, 한줄 설명
                                          - TopicChip x3

~2.5s  Live API: 음성 해설 시작         AudioVisualizer: state → 'speaking'
       outputTranscription 수신         TranscriptChat: AI 버블 실시간 추가

~5s    사용자가 TopicChip "용도" 탭     requestTopicDetail("usage", "용도")
                                       panelState → 'expanded' (250ms spring)
                                       CameraView: isBlurred=true

~6s    Live API: 토픽 상세 텍스트       TranscriptChat: 새 AI 버블 추가
       outputTranscription             (용도 관련 상세 설명)
```

### 시나리오 2: "복원해줘" → Before/After

```
시간   Part 1                         Part 2 (UI)
─────────────────────────────────────────────────────────────
0s     사용자 음성 "복원해줘"           AudioVisualizer: state → 'listening'
       inputTranscription              TranscriptChat: 사용자 버블 추가

~1s    Live API: generate_restoration  AgentIndicator: curator → restoration
       tool call                       (전환 애니메이션 500ms)
       → onAgentSwitch('restoration')  AudioVisualizer: state → 'generating'
                                       (스피너 표시)

1-10s  REST: POST /api/restore         KnowledgePanel: panelState → 'fullscreen'
       (Part 3 처리 중)                로딩 상태 표시 (프로그레스 바)
       동시에 Live API 음성 해설        TranscriptChat: 복원 배경 설명 텍스트

~10s   onToolResult(restoration)       KnowledgePanel.children에
       { imageUrl, description }       BeforeAfterSlider (Part 3) 렌더링

~15s   자동 복귀                       AgentIndicator: restoration → curator
       → onAgentSwitch('curator')      (전환 애니메이션 500ms)
```

### 시나리오 3: 폴백 모드 (Live API 실패)

```
시간   Part 1                         Part 2 (UI)
─────────────────────────────────────────────────────────────
0s     connect() 시도                  sessionState: 'connecting'

~3s    3회 재연결 실패                 sessionState: 'disconnected'
       isFallbackMode → true          │
                                      ├→ 텍스트 입력 필드 표시
                                      ├→ 마이크 버튼 비활성화
                                      └→ "텍스트 모드로 전환" 안내

~5s    사용자: 텍스트 입력             sendTextMessage() →
       "이 도자기는 뭐야?"              orchestrator (ADK) →
       + 사진 첨부 (sendPhoto)          curator_agent 처리

~7s    텍스트 응답 수신               TranscriptChat: AI 버블 추가
       (음성 없음, 텍스트만)           KnowledgePanel: mini → expanded
```

---

## 7. 에러 처리 전략 종합

### 7.1 에러 유형별 처리

| 에러 유형 | 감지 방법 | UI 반응 | 복구 방법 |
|----------|----------|--------|----------|
| 카메라 권한 거부 | `NotAllowedError` | PermissionGate: 사진 업로드 대안 | 브라우저 설정에서 재허용 |
| 마이크 권한 거부 | `NotAllowedError` | 텍스트 입력 모드 전환 | 브라우저 설정에서 재허용 |
| WebSocket 연결 실패 | `sessionState === 'disconnected'` | 재연결 시도 표시 (1/3, 2/3, 3/3) | 자동 재시도 3회, 이후 수동 버튼 |
| 재연결 3회 실패 | `isFallbackMode === true` | 텍스트 폴백 모드 전환 안내 | 페이지 새로고침 |
| 유물 인식 실패 | 5초 타임아웃 | "더 가까이 비춰주세요" 안내 | 사진 캡처 → 정적 분석 |
| 이미지 생성 실패 | `onError(RESTORATION_FAILED)` | 재시도 버튼 + 텍스트 설명 대안 | 재시도 또는 텍스트 폴백 |
| 렌더링 에러 | ErrorBoundary catch | 에러 화면 + 재시도/새로고침 | 재시도 또는 새로고침 |

### 7.2 네트워크 에러 UI

```
┌──────────────────────────────┐
│  ⚠️ 연결이 끊어졌습니다        │
│                              │
│  재연결 시도 중... (2/3)      │
│  ████████░░░░░░              │
│                              │
│  [수동 재연결]                │
└──────────────────────────────┘
```

위 UI는 메인 화면 중앙에 오버레이로 표시. 카메라 뷰는 유지. `z-50`.

---

## 8. 접근성 (A11y)

| 항목 | 구현 |
|------|------|
| 버튼 aria-label | 모든 아이콘 버튼에 한글 aria-label 필수 |
| 색상 대비 | 텍스트 최소 4.5:1 비율 (WCAG AA) |
| 터치 타겟 | 최소 44x44px (모든 인터랙티브 요소) |
| 키보드 탐색 | 패널 내 Tab 순서: 토픽칩 → 트랜스크립트 → 액션 버튼 |
| 스크린 리더 | 에이전트 전환 시 `aria-live="polite"` 알림 |
| 동적 콘텐츠 | 새 트랜스크립트 → `aria-live="polite"` 영역 |
| 감소된 모션 | `prefers-reduced-motion` → 애니메이션 비활성화 |

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. 성능 최적화

| 항목 | 전략 |
|------|------|
| 번들 크기 | Framer Motion 미사용 (CSS transitions으로 충분), lucide-react tree-shaking |
| 리렌더링 | `useMemo`/`useCallback` for 핸들러, `React.memo` for TopicChip/ChatBubble |
| 오디오 비주얼라이저 | `requestAnimationFrame` 루프, 컴포넌트 언마운트 시 취소 |
| 이미지 | Next.js `<Image>` 사용하지 않음 (카메라 스트림은 `<video>`) |
| 스크롤 | `overscroll-contain` (패널과 페이지 스크롤 분리) |
| 웹폰트 | `next/font` 최적화 (font-display: swap, 서브셋) |
| CSS | Tailwind JIT — 사용된 클래스만 번들 |

---

## 10. 파일별 의존성 요약

```
src/app/layout.tsx
├── next/font/google
└── globals.css

src/app/page.tsx
└── next/navigation

src/app/(main)/layout.tsx
└── @/components/ErrorBoundary

src/app/(main)/page.tsx
├── @/hooks/use-live-session (Part 1)
├── @/components/CameraView
├── @/components/KnowledgePanel
├── @/components/AudioVisualizer
├── @/components/AgentIndicator
├── @/components/PermissionGate
└── @/types/common

src/components/CameraView.tsx
├── @/hooks/use-camera (Part 1)
└── @/types/components

src/components/KnowledgePanel.tsx
├── @/components/TranscriptChat
├── @/components/TopicChip
├── @/types/components
└── @/types/live-session

src/components/TranscriptChat.tsx
├── @/types/components
└── @/types/live-session

src/components/AudioVisualizer.tsx
├── @/types/components
└── @/types/common

src/components/AgentIndicator.tsx
├── @/types/components
└── @/types/common

src/components/TopicChip.tsx
└── @/types/live-session

src/components/PermissionGate.tsx
└── (Web API only)

src/components/ErrorBoundary.tsx
└── (React only)

src/agents/orchestrator.ts
├── @google/adk
└── ./curator

src/agents/curator.ts
└── @google/adk
```

---

## 11. 체크리스트

### 공통 체크리스트
- [x] Contract 문서의 관련 타입 모두 참조 (§B LiveSessionEvents, §H Props, §I Hooks, §K 시나리오)
- [x] 담당 파일 목록이 소유권 매트릭스(§L)와 일치
- [x] 다른 파트에서 호출하는 함수/이벤트 시그니처 명확 (useLiveSession → UI)
- [x] 에러 핸들링 시나리오 정의 (§7)
- [x] Claude Code가 혼자 구현할 수 있을 만큼 상세

### Part 2 추가 체크리스트
- [x] Orchestrator 라우팅 if/else 조건 전체 목록 (§3.13)
- [x] Curator Agent 시스템 프롬프트 전문 (§3.14)
- [x] Knowledge Panel 3단계 전환 조건 + 애니메이션 스펙 (§3.6, §5)
- [x] 각 컴포넌트의 상태 머신 다이어그램 (§3.6 KnowledgePanel)
- [x] 반응형 브레이크포인트 360px ~ 1440px (§4)
