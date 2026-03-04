# TimeLens Build Progress

## Current State
- **Active Part**: Part 5 (Infra/Scaffold)
- **Last Session**: -
- **Build Status**: Not started

---

## Part 5: Infra & DevOps (scaffold)
> Design: `docs/design/part5-infra-devops.md`

### Config
- [ ] `package.json` — 의존성 + 스크립트
- [ ] `tsconfig.json` — TypeScript 설정
- [ ] `next.config.ts` — Next.js 설정
- [ ] `tailwind.config.ts` — Tailwind CSS 설정
- [ ] `.env.example` — 환경 변수 템플릿

### Styles & Utils
- [ ] `src/app/globals.css` — Tailwind v4 디렉티브, CSS 변수
- [ ] `src/lib/utils.ts` — cn() 함수

### Shared Types (shared-contract.md 기준)
- [ ] `src/types/common.ts` — §A 공유 기본 타입
- [ ] `src/types/live-session.ts` — §B Live Session 타입
- [ ] `src/types/restoration.ts` — §C Restoration 타입
- [ ] `src/types/discovery.ts` — §D Discovery 타입
- [ ] `src/types/diary.ts` — §D Diary 타입
- [ ] `src/types/ws-messages.ts` — §E WebSocket 메시지 타입
- [ ] `src/types/api.ts` — §F REST API 타입
- [ ] `src/types/models.ts` — §G Firestore 모델 타입
- [ ] `src/types/env.d.ts` — §J 환경 변수 타입

### Firebase
- [ ] `src/lib/firebase/config.ts` — 싱글턴, HMR 안전
- [ ] `src/lib/firebase/auth.ts` — 익명 인증, waitForAuth
- [ ] `src/lib/firebase/firestore.ts` — sessions/visits/diaries CRUD

### Infra
- [ ] `src/app/api/health/route.ts` — Health check
- [ ] `src/app/layout.tsx` — 루트 레이아웃 (Part 5 스캐폴드)
- [ ] `Dockerfile` — 멀티 스테이지 빌드
- [ ] shadcn/ui 컴포넌트 설치 (`src/components/ui/`)

---

## Part 1: Core Pipeline
> Design: `docs/design/part1-core-pipeline.md`

### Gemini
- [ ] `src/lib/gemini/client.ts` — 서버사이드 GoogleGenAI 인스턴스
- [ ] `src/lib/gemini/tools.ts` — Function Call 도구 정의 + 시스템 프롬프트
- [ ] `src/lib/gemini/live-api.ts` — 클라이언트 Live API 세션 관리
- [ ] `src/lib/gemini/search-grounding.ts` — 검색 그라운딩 소스 추출

### Media
- [ ] `src/lib/audio/capture.ts` — 마이크 오디오 캡처
- [ ] `src/lib/audio/playback.ts` — 오디오 재생 큐
- [ ] `src/lib/camera/capture.ts` — 비디오 프레임 캡처
- [ ] `src/lib/ws/manager.ts` — WebSocket 라이프사이클 (재연결)

### API Routes
- [ ] `src/app/api/session/route.ts` — 세션 생성 + Ephemeral Token
- [ ] `src/app/api/session/resume/route.ts` — 세션 재연결
- [ ] `src/app/api/restore/route.ts` — 복원 프록시 (스캐폴드)
- [ ] `src/app/api/discover/route.ts` — Discovery 프록시 (스캐폴드)
- [ ] `src/app/api/diary/generate/route.ts` — Diary 생성 프록시 (스캐폴드)
- [ ] `src/app/api/diary/[id]/route.ts` — Diary 조회 (스캐폴드)

### Hooks
- [ ] `src/hooks/use-live-session.ts` — 메인 통합 훅
- [ ] `src/hooks/use-camera.ts` — 카메라 스트림 접근
- [ ] `src/hooks/use-microphone.ts` — 마이크 접근

---

## Part 2: Curator UI
> Design: `docs/design/part2-curator-ui.md`

### Pages
- [ ] `src/app/layout.tsx` — 루트 레이아웃 (Part 5 스캐폴드 확장)
- [ ] `src/app/page.tsx` — 랜딩/온보딩
- [ ] `src/app/(main)/layout.tsx` — 메인 레이아웃
- [ ] `src/app/(main)/page.tsx` — 메인 화면 (카메라 + 패널)

### Components
- [ ] `src/components/CameraView.tsx` — 카메라 뷰파인더
- [ ] `src/components/KnowledgePanel.tsx` — 지식 패널
- [ ] `src/components/TranscriptChat.tsx` — 채팅형 트랜스크립트
- [ ] `src/components/AudioVisualizer.tsx` — 오디오 파형 시각화
- [ ] `src/components/AgentIndicator.tsx` — 에이전트 전환 표시
- [ ] `src/components/TopicChip.tsx` — 탭 가능한 토픽 칩
- [ ] `src/components/PermissionGate.tsx` — 권한 요청 UI
- [ ] `src/components/ErrorBoundary.tsx` — 에러 처리 UI

### Agents (ADK — 텍스트 폴백 전용, Live 모드에서는 미사용)
- [ ] `src/agents/orchestrator.ts` — 텍스트 폴백 Orchestrator (Live 모드는 Part 1 tools.ts가 라우팅)
- [ ] `src/agents/curator.ts` — 텍스트 폴백 Curator Agent

---

## Part 3: Restoration
> Design: `docs/design/part3-restoration.md`

- [ ] `src/lib/gemini/flash-image.ts` — Gemini 2.5 Flash 이미지 생성
- [ ] `src/app/api/restore/route.ts` — 복원 REST API (Part 1 스캐폴드 교체)
- [ ] `src/components/RestorationResult.tsx` — 복원 결과 컨테이너
- [ ] `src/components/BeforeAfterSlider.tsx` — Before/After 슬라이더

---

## Part 4: Discovery & Diary
> Design: `docs/design/part4-discovery-diary.md`

### Lib & Hooks
- [ ] `src/lib/geo/places.ts` — Google Places API 호출
- [ ] `src/hooks/use-geolocation.ts` — GPS 좌표 접근

### API Routes
- [ ] `src/app/api/discover/route.ts` — Discovery REST API (Part 1 스캐폴드 교체)
- [ ] `src/app/api/diary/generate/route.ts` — Diary 생성 (Part 1 스캐폴드 교체)
- [ ] `src/app/api/diary/[id]/route.ts` — Diary 조회 (Part 1 스캐폴드 교체)

### Pages & Components
- [ ] `src/app/diary/[id]/page.tsx` — 다이어리 공유 페이지
- [ ] `src/components/NearbyCard.tsx` — 유적지 카드
- [ ] `src/components/NearbySites.tsx` — 주변 유적지 리스트
- [ ] `src/components/DiaryViewer.tsx` — 다이어리 뷰어

### Agents (ADK)
- [ ] `src/agents/discovery.ts` — Discovery Agent
- [ ] `src/agents/diary.ts` — Diary Agent

---

## Integration & Polish
- [ ] 전체 `npx tsc --noEmit` 통과
- [ ] 전체 `npm run lint` 통과
- [ ] 모바일 반응형 확인
- [ ] Lighthouse 성능 체크
- [ ] Cloud Run 배포 테스트

---

## Blockers
(none)

---

## Session Log

| Date | Part | Files Changed | Quality Score | Notes |
|------|------|---------------|---------------|-------|
| - | - | - | - | Not started |
