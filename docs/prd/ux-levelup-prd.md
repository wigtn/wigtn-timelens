# TimeLens UX Level-Up PRD

## 1. Overview

### 1.1 Problem Statement
TimeLens의 핵심 기능(대화형 큐레이터, 유물 인식, 복원)은 잘 동작하지만, 첫 사용 경험과 UI 품질이 "박물관 전문 AI 가이드"로서의 기대에 미치지 못한다.

**구체적 문제:**
1. **전문성 부재**: 권한 요청 → 빈 채팅으로 시작. 큐레이터가 어떤 박물관에 있는지 모름.
2. **맥락 없는 시작**: AI가 매번 "어디 계세요?"로 시작 → 사용자가 직접 설명해야 함.
3. **기본적 UI**: 개발 프로토타입 수준. 프리미엄 박물관 앱과 비교 시 완성도 차이 큼.

### 1.2 Goal
- 첫 10초 안에 "이 앱은 박물관 전문이구나"를 느끼게 한다
- 사용자가 박물관을 선택하면, AI가 해당 박물관에 대해 이미 알고 있는 것처럼 대화 시작
- UI를 프리미엄 박물관 오디오 가이드 앱 수준으로 끌어올린다

### 1.3 Scope
- Phase 1: 박물관 선택 온보딩 (기능)
- Phase 2: UI 리디자인 (비주얼)
- Phase 3: 온보딩 스플래시 (비주얼)
- Phase 4: 마이크로 인터랙션 (폴리시)

### 1.4 Non-Goals
- 박물관 GPS 자동 감지로 자동 선택 (밀집 지역에서 부정확 — 리스트 제공 후 사용자 선택)
- 박물관 DB 자체 구축 (Google Places API 활용)
- 네이티브 앱 전환
- 전시 정보 자체 크롤링 (AI가 Search Grounding으로 대화 중 조회)

### 1.5 Phase 의존성
```
Phase 1 (박물관 선택) ──→ Phase 3 (스플래시, Phase 1 의존)
Phase 2 (UI 리디자인)     (독립, 병렬 가능)
Phase 4 (마이크로 인터랙션, Phase 2 이후)
```

---

## 2. User Flow

### 2.1 현재 플로우
```
앱 접속 → 랜딩 페이지 → "시작하기" → 권한 요청(카메라/마이크)
→ 연결 중... → 빈 채팅 → AI: "안녕하세요! 어디 계세요?"
```

### 2.2 개선 플로우
```
앱 접속 → 랜딩 페이지 → "시작하기"
→ 권한 요청 (카메라 → 마이크 → 위치, 순차)
→ 박물관 선택 화면
  ├─ GPS 기반 근처 박물관 리스트 (거리순)
  ├─ 검색 입력 (직접 검색, 엔터/버튼 제출)
  └─ "박물관 없이 자유 탐험" 옵션
→ 온보딩 스플래시 (선택된 박물관 이름 + 큐레이터 인트로, 2~5초)
→ 세션 시작 (AI가 박물관 맥락으로 첫 인사)
  예: "국립중앙박물관에 오셨군요! 어떤 전시를 보고 계세요?"
```

### 2.3 권한 거부 조합별 플로우

| 카메라 | 마이크 | 위치 | 결과 |
|--------|--------|------|------|
| ✅ | ✅ | ✅ | 풀 기능 + 근처 박물관 리스트 |
| ✅ | ✅ | ❌ | 풀 기능 + 검색/자유탐험만 (GPS 리스트 숨김) |
| ❌ | ✅ | ✅/❌ | 음성 대화 + 사진 업로드 폴백 + 박물관 선택 |
| ✅/❌ | ❌ | ✅/❌ | 텍스트 전용 모드 + 카메라/사진 + 박물관 선택 |
| ❌ | ❌ | ❌ | 텍스트 전용 + 사진 업로드 + 검색/자유탐험 |

**핵심**: 카메라/마이크 거부는 기능 저하이지 차단이 아님. 위치 거부는 GPS 리스트만 숨기고 검색은 가능.

---

## 3. Phase 1: 박물관 선택 온보딩

### 3.1 신규 API 엔드포인트

> **소유권**: 이 PRD에서 신규 생성. 기존 Part 소유 파일을 수정하지 않음.

#### `GET /api/museums/nearby`

근처 박물관 검색 (서버 프록시 — Places API 키 보호).

**Request:**
```
GET /api/museums/nearby?lat=37.5239&lng=126.9804&radius=2000
```

**Response:**
```typescript
interface NearbyMuseumsResponse {
  museums: MuseumInfo[];
}

interface MuseumInfo {
  placeId: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  distanceMeters: number;
  photoUrl?: string;        // 서버에서 Photo Media API까지 호출한 최종 URL
  rating?: number;
  openNow?: boolean;
  types: string[];          // museum, art_gallery, tourist_attraction 등
}
```

**구현 세부:**
- `src/back/lib/geo/places.ts`의 기존 `searchNearbyPlaces` 활용
- Places API `includedTypes`: `["museum", "art_gallery", "tourist_attraction", "cultural_landmark"]`
- 사진 URL: Places Photo Media API로 변환 후 반환 (클라이언트에 API 키 미노출)
- 최대 10개, 거리순 정렬

#### `GET /api/museums/search`

텍스트 검색 (서버 프록시).

**Request:**
```
GET /api/museums/search?q=루브르+박물관
```

**Response:** `NearbyMuseumsResponse`와 동일 형식 (distanceMeters는 0).

**구현 세부:**
- Places Text Search API 사용
- 결과에 `museum`, `art_gallery` 타입 필터링

### 3.2 박물관 선택 화면 (MuseumSelector)

**위치**: 권한 허용 후, 세션 연결 전에 표시

**UI 구성:**
```
┌─────────────────────────────────┐
│                                 │
│  [TimeLens 로고]                │
│                                 │
│  오늘 어디를 탐험하시나요?       │
│                                 │
│  ┌─ 📍 현재 위치 기반 ────────┐ │
│  │                            │ │
│  │ 🏛 국립중앙박물관     0.2km │ │
│  │                            │ │
│  │ 🏛 국립한글박물관     0.5km │ │
│  │                            │ │
│  │ 🏛 용산전쟁기념관     0.8km │ │
│  │                            │ │
│  └────────────────────────────┘ │
│                                 │
│  🔍 박물관 검색... [검색 버튼]   │
│                                 │
│  ─────────── 또는 ───────────── │
│                                 │
│  [🌍 박물관 없이 자유 탐험]     │
│                                 │
└─────────────────────────────────┘
```

**기능 요구사항:**

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| F1.1 | GPS 위치로 반경 2km 내 박물관 검색 (서버 프록시 `/api/museums/nearby`) | P0 |
| F1.2 | 거리순 정렬, 최대 10개 표시 | P0 |
| F1.3 | 각 항목에 이름, 거리, 사진(있으면), 평점, 영업 상태 표시 | P0 |
| F1.4 | 텍스트 검색 — 엔터 또는 검색 버튼으로 제출 (자동완성 아님, 비용 절감) | P0 |
| F1.5 | "박물관 없이 자유 탐험" — 맥락 없이 기존처럼 시작 | P0 |
| F1.6 | 위치 권한 거부 시 GPS 리스트 숨기고 검색 + 자유 탐험만 표시 | P0 |
| F1.7 | 선택된 박물관 정보를 localStorage에 저장 (재접속 시 유지) | P2 |
| F1.8 | GPS 리스트 로딩 중 스켈레톤 UI, 실패 시 에러 메시지 + 검색 유도 | P1 |

### 3.3 Shared Contract 변경

> **변경 대상**: `src/shared/types/live-session.ts`
> **변경 사유**: SessionConfig에 museum 컨텍스트를 전달하기 위한 확장

**추가 타입:**
```typescript
/** 박물관 선택 정보 (Phase 1 온보딩에서 수집) */
export interface MuseumContext {
  name: string;
  placeId: string;
  address: string;
  location: { lat: number; lng: number };
  photoUrl?: string;        // Photo Media API 최종 URL (서버에서 변환)
  rating?: number;
  openNow?: boolean;
}
```

**SessionConfig 확장:**
```typescript
// 기존
export interface SessionConfig {
  language: string;
  sessionId?: string;
}

// 변경
export interface SessionConfig {
  language: string;
  sessionId?: string;
  museum?: MuseumContext;             // 신규: 선택된 박물관
  userLocation?: { lat: number; lng: number };  // 신규: GPS 좌표
}
```

**ConnectOptions는 별도 생성하지 않음** — 기존 `SessionConfig`를 확장하여 호환성 유지.

### 3.4 시스템 프롬프트 맥락 주입

**변경 파일**: `src/shared/gemini/tools.ts` → `getSystemInstruction(language, museum?)`

**변경 내용**: 함수 시그니처에 `museum?: MuseumContext` 추가. museum이 있으면 프롬프트에 맥락 섹션 추가:

```
## Current Context
- Museum: {museum.name} ({museum.address})
- User is physically at this museum right now

Start the conversation by warmly welcoming them to this specific museum.
Use Google Search to find current exhibitions, special events, and notable collections at this museum.
Reference specific exhibits or areas of the museum naturally in conversation.
```

**전시 정보 전략**: 시스템 프롬프트에서 직접 주입하지 않음. AI가 Google Search Grounding으로 대화 첫 턴에서 자체 조회. 이유:
1. 온보딩 시점에 검색 API 호출 불필요 (비용/시간 절약)
2. Live API의 Search Grounding이 더 최신 정보 제공
3. AI가 자연스럽게 "여기 지금 OO전 하고 있네요!" 식으로 발화

### 3.5 호출 체인

```
MuseumSelector (사용자 선택)
  → session/page.tsx: connect({ language, museum, userLocation })
    → use-live-session.ts: connect(config)
      → live-api.ts: connect(config)
        → getSystemInstruction(config.language, config.museum)
          → ai.live.connect({ systemInstruction: "..." })
```

### 3.6 변경 파일 목록

| 파일 | 소유권 | 변경 내용 |
|------|--------|----------|
| `src/app/api/museums/nearby/route.ts` | **신규 (이 PRD)** | 근처 박물관 검색 API |
| `src/app/api/museums/search/route.ts` | **신규 (이 PRD)** | 텍스트 검색 API |
| `src/web/components/MuseumSelector.tsx` | **신규 (이 PRD)** | 박물관 선택 UI |
| `src/shared/types/live-session.ts` | Part 1 → **계약 변경** | MuseumContext + SessionConfig 확장 |
| `src/shared/gemini/tools.ts` | Part 1 → **계약 변경** | getSystemInstruction 시그니처 확장 |
| `src/app/session/page.tsx` | Part 2 | 박물관 선택 스텝 추가 |
| `src/web/hooks/use-live-session.ts` | Part 1/2 | connect()에서 museum 전달 |
| `src/web/lib/gemini/live-api.ts` | Part 1 | 시스템 프롬프트에 museum 주입 |

---

## 4. Phase 2: UI 리디자인

### 4.1 디자인 방향

**목표 톤**: 프리미엄 박물관 오디오 가이드 앱
- 어두운 배경 + 골드 악센트 (현재 유지)
- 글래스모피즘 카드/헤더 (고급스러움 강화)
- 서체 위계 강화 (헤딩은 세리프 계열 검토)
- 여백과 간격 넉넉하게

**디자인 결정 방법:**
1. Claude Code의 `design-discovery` 에이전트를 사용하여 3가지 스타일 후보(Editorial / Glassmorphism / Dark Luxury) ASCII 목업 생성
2. 사용자가 스타일 선택
3. Claude Code의 `frontend-developer` 에이전트로 선택된 스타일을 React/Tailwind 컴포넌트로 구현

> `design-discovery`와 `frontend-developer`는 Claude Code 내장 서브에이전트로, 프로젝트 코드베이스 컨텍스트를 가지고 디자인/구현을 수행한다.

### 4.2 세션 화면 리디자인

**현재 레이아웃:**
```
┌─ Camera PIP (optional, 35dvh) ─┐
├─ Agent Indicator + Visualizer ──┤
├─ Artifact Card (optional) ──────┤
├─ Chat Transcript (scroll) ──────┤
├─ Text Input ────────────────────┤
└─ Action Buttons (mic/cam/diary) ┘
```

**개선 레이아웃:**
```
┌─ Glass Header ──────────────────┐
│  🏛 국립중앙박물관  │ 🔴 LIVE   │
├─────────────────────────────────┤
│                                 │
│  Chat Transcript (full scroll)  │
│  - AI 메시지: 아바타 + 이름     │
│  - 유물 카드: 인라인 리치 카드   │
│  - 복원 결과: 인라인 비교 슬라이더│
│                                 │
├─ Camera PIP (optional, 콤팩트) ─┤
│                                 │
├─ Text Input (글래스 바) ────────┤
│                                 │
│  ┌────┐  ┌──────┐  ┌────┐      │
│  │ 📷 │  │  🎤  │  │ 📖 │      │
│  └────┘  └──────┘  └────┘      │
│           (중앙 강조)            │
└─────────────────────────────────┘
```

### 4.3 컴포넌트별 개선 사항

| 컴포넌트 | 현재 | 개선 |
|---------|------|------|
| **Header** | AgentIndicator (텍스트) | 글래스 헤더 + 박물관 이름 + LIVE 배지 |
| **Chat Bubble** | 단색 배경 (blue/gray) | AI 아바타 + 이름, 그라데이션 배경, 타이핑 애니메이션 |
| **Artifact Card** | 텍스트만 (이름/시대/문명) | 이미지 + 그라데이션 오버레이 + 시대 배지 + 토픽 칩 |
| **Action Bar** | 동일 크기 3버튼 | 마이크 중앙 강조 (크게), 카메라/다이어리 양옆 (작게) |
| **Audio Viz** | 20-bar 기본 | 원형 파동 or 파형 웨이브 (골드 그라데이션) |
| **Camera PIP** | 35dvh 고정 | 콤팩트 고정 위치 (우상단/좌하단 프리셋, 드래그 없음) |
| **Permission** | Shield 아이콘 | 풀스크린 브랜딩 + 단계별 권한 요청 |

### 4.4 변경 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/app/globals.css` | 디자인 토큰 업데이트, 새 애니메이션 |
| `src/app/session/page.tsx` | 레이아웃 구조 변경 |
| `src/web/components/TranscriptChat.tsx` | 메시지 버블 리디자인 |
| `src/web/components/AgentIndicator.tsx` | 글래스 헤더로 변경 |
| `src/web/components/AudioVisualizer.tsx` | 비주얼 개선 |
| `src/web/components/CameraView.tsx` | 콤팩트 PIP 모드 (고정 위치 프리셋) |
| `src/web/components/PermissionGate.tsx` | 풀스크린 브랜딩 |
| `src/web/components/TopicChip.tsx` | 스타일 업그레이드 |

---

## 5. Phase 3: 온보딩 스플래시

### 5.1 요구사항

박물관 선택 직후, 세션 연결 중에 표시되는 스플래시.

```
┌─────────────────────────────────┐
│                                 │
│         (배경: 박물관 이미지     │
│          블러 + 다크 오버레이)   │
│                                 │
│      ✦ TimeLens ✦              │
│                                 │
│   국립중앙박물관에 오신 것을     │
│        환영합니다               │
│                                 │
│   당신만의 AI 큐레이터가        │
│   준비되었습니다                 │
│                                 │
│      ● ● ● (로딩 인디케이터)   │
│                                 │
└─────────────────────────────────┘
```

| ID | 요구사항 | 우선순위 |
|----|---------|---------|
| F3.1 | 박물관 이름 표시 (선택한 경우) | P0 |
| F3.2 | 배경 이미지 (Places API photo, 없으면 그라데이션) | P1 |
| F3.3 | 세션 연결 완료 시 자동 전환 (최소 2초) | P0 |
| F3.4 | "박물관 없이" 선택 시 → 일반 스플래시 ("탐험을 시작합니다") | P0 |
| F3.5 | 5초 후에도 연결 안되면 "연결 중..." 텍스트로 전환, 계속 대기 | P0 |
| F3.6 | 15초 초과 시 "다시 시도" 버튼 표시 + 에러 안내 | P1 |

### 5.2 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/web/components/OnboardingSplash.tsx` | **신규** — 스플래시 화면 |
| `src/app/session/page.tsx` | 연결 오버레이를 스플래시로 교체 |

---

## 6. Phase 4: 마이크로 인터랙션

### 6.1 개선 항목

| 인터랙션 | 현재 | 개선 |
|---------|------|------|
| 마이크 ON | 빨간/흰 토글 | 골드 파동 이펙트 (ripple) + 주변 글로우 |
| 유물 인식 | 카드 표시만 | "발견!" 토스트 + 카드 슬라이드업 |
| 복원 시작 | 스캔라인 | 화면 전체 시간여행 워프 (컬러 시프트) |
| 복원 완료 | 이미지 페이드인 | 파티클 이펙트 + "과거의 모습입니다" 나레이션 |
| 에이전트 전환 | 텍스트 변경 | 슬라이드 전환 + 아이콘 모프 |
| 메시지 도착 | 즉시 표시 | 타이핑 인디케이터 (···) → 메시지 페이드인 |

**접근성**: 모든 애니메이션은 `prefers-reduced-motion` 미디어 쿼리를 존중하여, 설정 시 축소 또는 비활성화.

**햅틱**: `navigator.vibrate` 가용 시에만 progressive enhancement. iOS Safari 미지원 시 무시.

### 6.2 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/app/globals.css` | 새 keyframe 애니메이션 (ripple, warp) + `prefers-reduced-motion` 대응 |
| `src/app/session/page.tsx` | 인터랙션 핸들러 연결 |
| `src/web/components/AudioVisualizer.tsx` | 마이크 파동 이펙트 |
| `src/web/components/TranscriptChat.tsx` | 타이핑 인디케이터 |
| `src/web/components/RestorationOverlay.tsx` | 시간여행 이펙트 |
| `src/web/components/AgentIndicator.tsx` | 전환 애니메이션 |

---

## 7. 기술 의존성

### API

| API | 용도 | 호출 위치 | 키 보호 |
|-----|------|----------|--------|
| Google Places Nearby Search | 근처 박물관 검색 | `/api/museums/nearby` (서버) | 서버 전용, 클라이언트 미노출 |
| Google Places Text Search | 텍스트 검색 | `/api/museums/search` (서버) | 서버 전용, 클라이언트 미노출 |
| Google Places Photo Media | 박물관 사진 URL 변환 | 서버 프록시 내부 | 서버 전용 |
| Geolocation API | GPS 좌표 | 브라우저 내장 | N/A |
| Google Search Grounding | 전시 정보 | Live API 세션 내 (AI 자체 조회) | 세션 내부 |

### 신규 타입 (Shared Contract 변경)

```typescript
// src/shared/types/live-session.ts 에 추가

/** 박물관 선택 정보 */
export interface MuseumContext {
  name: string;
  placeId: string;
  address: string;
  location: { lat: number; lng: number };
  photoUrl?: string;
  rating?: number;
  openNow?: boolean;
}

// SessionConfig 확장 (기존 language, sessionId 유지)
export interface SessionConfig {
  language: string;
  sessionId?: string;
  museum?: MuseumContext;                        // 신규
  userLocation?: { lat: number; lng: number };   // 신규
}
```

### 디자인 에이전트 (Claude Code 내장)

| 에이전트 | 용도 | Phase |
|---------|------|-------|
| `design-discovery` | 3가지 스타일 후보 생성, 사용자 비교/선택 | Phase 2 |
| `frontend-developer` | 선택된 스타일을 React/Tailwind로 구현 | Phase 2 |

---

## 8. 실행 계획

| 순서 | Phase | 예상 공수 | 신규 파일 | 변경 파일 | 데드라인 내 |
|------|-------|----------|----------|----------|-----------|
| 1 | Phase 1: 박물관 선택 온보딩 | 中 | 3 | 5 | ✅ |
| 2 | Phase 2: UI 리디자인 | 中 | 0 | 8 | ✅ |
| 3 | Phase 3: 온보딩 스플래시 | 小 | 1 | 1 | ✅ |
| 4 | Phase 4: 마이크로 인터랙션 | 小 | 0 | 6 | ⚠️ 시간 허락 시 |

**Phase 2 진행 방법:**
1. `design-discovery` 에이전트로 3가지 스타일 후보 ASCII 목업 생성
2. 사용자가 스타일 선택
3. `frontend-developer` 에이전트로 선택된 스타일 구현

---

## 9. 성공 지표

| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|----------|
| 첫 인사까지 시간 | ~8초 | ~12초 (but 맥락 있는 인사) | 타임스탬프 로깅 |
| AI 첫 메시지 관련성 | "어디 계세요?" | 박물관명 언급 | 수동 검증 |
| LCP (Largest Contentful Paint) | 미측정 | < 2.5초 | Lighthouse |
| CLS (Cumulative Layout Shift) | 미측정 | < 0.1 | Lighthouse |
| 세션 시작 완료율 | 미측정 | > 80% | 로깅 (권한→선택→연결) |

---

## 10. 리스크

| 리스크 | 확률 | 영향 | 완화 |
|--------|------|------|------|
| Places API 호출 비용 | 낮음 | 낮음 | 서버 캐싱 (5분 TTL), 검색은 제출 방식 (자동완성 아님) |
| 위치 권한 거부율 | 중간 | 낮음 | 검색 + 자유탐험 폴백 |
| UI 리디자인 공수 초과 | 중간 | 높음 | Phase 4 포기, Phase 2 범위 축소 가능 |
| 전시 정보 부정확 | 중간 | 낮음 | AI가 Search Grounding으로 자체 검증 |
| Shared contract 변경 충돌 | 낮음 | 중간 | 하위 호환 (optional 필드만 추가) |

---

## 11. 전체 변경 파일 매트릭스

### 신규 파일 (이 PRD 소유)
| 파일 | Phase |
|------|-------|
| `src/app/api/museums/nearby/route.ts` | 1 |
| `src/app/api/museums/search/route.ts` | 1 |
| `src/web/components/MuseumSelector.tsx` | 1 |
| `src/web/components/OnboardingSplash.tsx` | 3 |

### Shared Contract 변경 (하위 호환)
| 파일 | 변경 | 영향 |
|------|------|------|
| `src/shared/types/live-session.ts` | MuseumContext 추가, SessionConfig에 optional 필드 추가 | 기존 코드 영향 없음 (optional) |
| `src/shared/gemini/tools.ts` | getSystemInstruction(lang, museum?) 시그니처 확장 | 기존 호출부 영향 없음 (optional param) |

### 기존 파일 수정
| 파일 | Phase | 변경 내용 |
|------|-------|----------|
| `src/app/session/page.tsx` | 1,2,3 | 박물관 선택 스텝 + 레이아웃 리디자인 + 스플래시 |
| `src/web/hooks/use-live-session.ts` | 1 | connect()에서 museum/location 전달 |
| `src/web/lib/gemini/live-api.ts` | 1 | 시스템 프롬프트에 museum context 주입 |
| `src/web/components/PermissionGate.tsx` | 1,2 | GPS 권한 추가 + 브랜딩 개선 |
| `src/web/components/TranscriptChat.tsx` | 2,4 | 버블 리디자인 + 타이핑 인디케이터 |
| `src/web/components/AgentIndicator.tsx` | 2,4 | 글래스 헤더 + 전환 애니메이션 |
| `src/web/components/AudioVisualizer.tsx` | 2,4 | 비주얼 개선 + 파동 이펙트 |
| `src/web/components/CameraView.tsx` | 2 | 콤팩트 PIP |
| `src/web/components/TopicChip.tsx` | 2 | 스타일 업그레이드 |
| `src/web/components/RestorationOverlay.tsx` | 4 | 시간여행 이펙트 |
| `src/app/globals.css` | 2,4 | 디자인 토큰 + 애니메이션 + reduced-motion |
