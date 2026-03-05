# TimeLens Build Progress

## Current State
- **Active Part**: Part 4 (Discovery & Diary) ✅ COMPLETE
- **Last Session**: 2026-03-05
- **Build Status**: Part 5 + Part 1 + Part 2 + Part 3 + Part 4 완료, tsc + lint 클린

---

## Part 5: Infra & DevOps (scaffold)
> Design: `docs/design/part5-infra-devops.md`

### Config
- [x] `package.json` — 의존성 + 스크립트
- [x] `tsconfig.json` — TypeScript 설정
- [x] `next.config.ts` — Next.js 설정
- [x] `tailwind.config.ts` — Tailwind CSS 설정
- [x] `.env.example` — 환경 변수 템플릿
- [x] `eslint.config.mjs` — ESLint 설정

### Styles & Utils
- [x] `src/app/globals.css` — Tailwind v4 디렉티브, CSS 변수
- [x] `src/lib/utils.ts` — cn() 함수

### Shared Types (shared-contract.md 기준)
- [x] `src/types/common.ts` — §A 공유 기본 타입
- [x] `src/types/live-session.ts` — §B Live Session 타입
- [x] `src/types/restoration.ts` — §C Restoration 타입
- [x] `src/types/discovery.ts` — §D Discovery 타입
- [x] `src/types/diary.ts` — §D Diary 타입
- [x] `src/types/ws-messages.ts` — §E WebSocket 메시지 타입
- [x] `src/types/api.ts` — §F REST API 타입
- [x] `src/types/models.ts` — §G Firestore 모델 타입
- [x] `src/types/env.d.ts` — §J 환경 변수 타입

### Firebase
- [x] `src/lib/firebase/config.ts` — 싱글턴, HMR 안전
- [x] `src/lib/firebase/auth.ts` — 익명 인증, waitForAuth
- [x] `src/lib/firebase/firestore.ts` — sessions/visits/diaries CRUD
- [x] `firestore.rules` — Firestore 보안 규칙
- [x] `storage.rules` — Cloud Storage 보안 규칙

### Infra
- [x] `src/app/api/health/route.ts` — Health check
- [x] `src/app/layout.tsx` — 루트 레이아웃 (Part 5 스캐폴드)
- [x] `Dockerfile` — 멀티 스테이지 빌드
- [x] `cloudbuild.yaml` — CI/CD 파이프라인
- [x] `public/manifest.json` — PWA 매니페스트
- [ ] shadcn/ui 컴포넌트 설치 (`src/components/ui/`) — Part 2 구현 시 설치

---

## Part 1: Core Pipeline ✅
> Design: `docs/design/part1-core-pipeline.md`

### Gemini
- [x] `src/lib/gemini/client.ts` — 서버사이드 GoogleGenAI 인스턴스
- [x] `src/lib/gemini/tools.ts` — Function Call 도구 정의 + 시스템 프롬프트
- [x] `src/lib/gemini/live-api.ts` — 클라이언트 Live API 세션 관리
- [x] `src/lib/gemini/search-grounding.ts` — 검색 그라운딩 소스 추출

### Media
- [x] `src/lib/audio/capture.ts` — 마이크 오디오 캡처
- [x] `src/lib/audio/playback.ts` — 오디오 재생 큐
- [x] `src/lib/camera/capture.ts` — 비디오 프레임 캡처
- [x] `src/lib/ws/manager.ts` — WebSocket 라이프사이클 (재연결)

### API Routes
- [x] `src/app/api/session/route.ts` — 세션 생성 + Ephemeral Token
- [x] `src/app/api/session/resume/route.ts` — 세션 재연결
- [x] `src/app/api/restore/route.ts` — 복원 프록시 (스캐폴드)
- [x] `src/app/api/discover/route.ts` — Discovery 프록시 (스캐폴드)
- [x] `src/app/api/diary/generate/route.ts` — Diary 생성 프록시 (스캐폴드)
- [x] `src/app/api/diary/[id]/route.ts` — Diary 조회 (스캐폴드)

### Hooks
- [x] `src/hooks/use-live-session.ts` — 메인 통합 훅
- [x] `src/hooks/use-camera.ts` — 카메라 스트림 접근
- [x] `src/hooks/use-microphone.ts` — 마이크 접근

---

## Part 2: Curator UI ✅
> Design: `docs/design/part2-curator-ui.md`

### Types
- [x] `src/types/components.ts` — 컴포넌트 Props 타입

### Pages
- [x] `src/app/layout.tsx` — 루트 레이아웃 (Part 5 스캐폴드 확장)
- [x] `src/app/page.tsx` — 랜딩/온보딩
- [x] `src/app/session/layout.tsx` — 메인 레이아웃
- [x] `src/app/session/page.tsx` — 메인 화면 (카메라 + 패널)

### Components
- [x] `src/components/CameraView.tsx` — 카메라 뷰파인더
- [x] `src/components/KnowledgePanel.tsx` — 지식 패널
- [x] `src/components/TranscriptChat.tsx` — 채팅형 트랜스크립트
- [x] `src/components/AudioVisualizer.tsx` — 오디오 파형 시각화
- [x] `src/components/AgentIndicator.tsx` — 에이전트 전환 표시
- [x] `src/components/TopicChip.tsx` — 탭 가능한 토픽 칩
- [x] `src/components/PermissionGate.tsx` — 권한 요청 UI
- [x] `src/components/ErrorBoundary.tsx` — 에러 처리 UI

### Agents (ADK — 텍스트 폴백 전용, Live 모드에서는 미사용)
- [x] `src/agents/orchestrator.ts` — 텍스트 폴백 Orchestrator (Live 모드는 Part 1 tools.ts가 라우팅)
- [x] `src/agents/curator.ts` — 텍스트 폴백 Curator Agent

---

## Part 3: Restoration ✅
> Design: `docs/design/part3-restoration.md`

- [x] `src/lib/gemini/flash-image.ts` — Gemini 2.5 Flash 이미지 생성 (7종 카테고리 프롬프트 + Promise.race 타임아웃)
- [x] `src/app/api/restore/route.ts` — 복원 REST API (Part 1 스캐폴드 교체, 에러 코드 4종)
- [x] `src/components/RestorationResult.tsx` — 복원 결과 컨테이너 (4-state 머신 + 프로그레스 시뮬레이션)
- [x] `src/components/BeforeAfterSlider.tsx` — Before/After 슬라이더 (clip-path, 60fps rAF, 키보드 접근성)
- [x] `src/types/components.ts` — BeforeAfterSliderProps 추가 (§H)

---

## Part 4: Discovery & Diary
> Design: `docs/design/part4-discovery-diary.md`

### Lib & Hooks
- [x] `src/lib/geo/places.ts` — Google Places API 호출
- [x] `src/hooks/use-geolocation.ts` — GPS 좌표 접근

### API Routes
- [x] `src/app/api/discover/route.ts` — Discovery REST API
- [x] `src/app/api/diary/generate/route.ts` — Diary 생성 (Gemini interleaved)
- [x] `src/app/api/diary/[id]/route.ts` — Diary 조회

### Pages & Components
- [x] `src/app/diary/[id]/page.tsx` — 다이어리 공유 페이지 (SSR)
- [x] `src/app/diary/[id]/diary-share-client.tsx` — 공유 페이지 클라이언트 래퍼
- [x] `src/components/NearbyCard.tsx` — 유적지 카드
- [x] `src/components/NearbySites.tsx` — 주변 유적지 리스트
- [x] `src/components/DiaryViewer.tsx` — 다이어리 뷰어

### Agents (ADK)
- [x] `src/agents/discovery.ts` — Discovery Agent
- [x] `src/agents/diary.ts` — Diary Agent

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
| 2026-03-05 | Part 5 | 27 files | tsc ✅ lint ✅ | 전체 scaffold 완료 (shadcn/ui 제외) |
| 2026-03-05 | Part 1 | 16 files | tsc ✅ lint ✅ | Core Pipeline 완료 (Gemini Live API + Audio + Camera + Hooks) |
| 2026-03-05 | Part 2 | 17 files | tsc ✅ lint ✅ | 전체 UI 구현 완료 (pages + components + agents + stubs) |
| 2026-03-05 | Part 3 | 5 files | tsc ✅ lint ✅ | Restoration 완료 (Flash Image + REST API + Before/After Slider) |
| 2026-03-05 | Part 4 | 13 files | tsc ✅ lint ✅ | Discovery + Diary 완료 (Places API + Gemini interleaved + SSR diary page) |
