# TimeLens Live Agent Companion PRD

> **Version**: 1.0
> **Created**: 2026-03-05
> **Status**: Draft
> **Deadline**: 2026-03-16 17:00 PT

---

## 1. Overview

### 1.1 Problem Statement

현재 TimeLens는 **"캡처 → 분석 → 결과"** 패턴의 도구형 앱.
유저가 캡처 버튼을 누르면 Gemini가 분석하고, 결과를 패널에 표시.

이것은 **Live Agent가 아니다.** Live Agent는:
- AI가 **항상 보고, 듣고, 말하는** 동반자
- 유저가 박물관을 걸으면 **자동으로 인식하고 설명 시작**
- 중간에 끊고 질문하면 **자연스럽게 대화 전환**
- "딴데 갈래" 하면 **즉시 안내 전환 + 선택지 제공**
- 유물을 보면 **옛날 사용 장면을 자동으로 시각화**
- **진짜 AI 비서와 같이 다니는** 경험

### 1.2 Goals

| # | 목표 | 측정 기준 |
|---|------|----------|
| G-1 | 연결 후 3초 내 AI가 먼저 말하기 시작 | AI 첫 음성 출력 시간 |
| G-2 | 캡처 버튼 없이 자동 유물 인식 | recognize_artifact 자동 호출 비율 |
| G-3 | 대화 중 끊김 없는 자연스러운 흐름 | 인터럽트 응답 시간 < 500ms |
| G-4 | "딴데 갈래" → 3초 내 선택지 제공 | navigate_exhibit 응답 시간 |
| G-5 | 유물 인식 시 자동 히스토리컬 씬 생성 | scene 자동 생성 비율 |

### 1.3 Non-Goals (Out of Scope)

- 정밀 실내 내비게이션 (BLE 비콘, WiFi 핑거프린팅)
- 네이티브 앱 개발 (PWA 웹앱 유지)
- 박물관 플로어맵 DB 구축
- 다국어 TTS 음성 합성 (Gemini 내장 음성 사용)

### 1.4 Scope

| 포함 | 제외 |
|------|------|
| 시스템 프롬프트 능동화 | 턴바이턴 실내 내비게이션 |
| AI 자동 인사 + 지속 내레이션 | BLE/WiFi 기반 위치 추적 |
| 카메라 기반 위치/유물 자동 인식 | 박물관별 커스텀 투어 DB |
| 대화 컨텍스트 유지 + 전환 안내 | 오프라인 모드 |
| 히스토리컬 씬 자동 생성 | AR 오버레이 |
| 실시간 자막 + 살아있는 UI | 멀티유저 그룹 투어 |
| 전시실 이동 안내 (음성 기반) | 사전 등록된 투어 코스 |

---

## 2. User Stories

### 2.1 Primary User: 박물관 방문자

#### US-01: 능동적 큐레이터
> As a museum visitor, I want the AI to **automatically start explaining** when I point my camera at an artifact, so that I don't have to press any buttons.

**Acceptance Criteria**:
```
Scenario: 자동 유물 인식
  Given 카메라가 활성화되고 Live API에 연결된 상태
  When 카메라 프레임에 유물이 2초 이상 보임
  Then AI가 자동으로 recognize_artifact 호출
  And 음성으로 설명을 시작
  And KnowledgePanel이 mini 상태로 열림
```

#### US-02: 연결 즉시 인사
> As a user, I want the AI to **greet me** when I first connect, so that I know it's alive and ready.

**Acceptance Criteria**:
```
Scenario: AI 인사
  Given 권한 허용 후 Live API 연결 완료
  When setupComplete 이벤트 수신
  Then 3초 내에 AI가 음성으로 인사
  And "카메라로 유물을 보여주세요" 안내
```

#### US-03: 대화 중 방향 전환
> As a visitor, I want to say "여기 말고 딴데 갈래" and get **immediate navigation suggestions**, so that I feel like I'm with a real guide.

**Acceptance Criteria**:
```
Scenario: 전시 안내 전환
  Given AI가 유물 A를 설명하는 중
  When 유저가 "딴데 갈래" 또는 "다른 거 보고 싶어"라고 말함
  Then AI가 현재 설명을 중단
  And "네! 어디로 갈까요?" 응답
  And navigate_exhibit 함수 호출로 선택지 제공
  And KnowledgePanel에 선택지 카드 표시
```

#### US-04: 히스토리컬 씬 자동 생성
> As a visitor, I want the AI to **automatically show me** how the artifact was used in ancient times, so that I can visualize history.

**Acceptance Criteria**:
```
Scenario: 역사적 장면 생성
  Given 유물이 인식되고 설명이 진행 중
  When AI가 유물의 용도/역사적 맥락을 설명할 때
  Then generate_historical_scene 자동 호출
  And 고대인이 유물을 사용하는 장면 이미지 생성
  And KnowledgePanel에 이미지 표시
  And 음성으로 장면 설명 병행
```

#### US-05: 실시간 자막
> As a visitor in a noisy museum, I want to see **real-time subtitles** of what the AI is saying, so that I don't miss anything.

**Acceptance Criteria**:
```
Scenario: 자막 표시
  Given AI가 음성 출력 중
  When outputAudioTranscription 이벤트 수신
  Then 카메라 뷰 위에 자막 스타일로 텍스트 표시
  And 4초 후 자동 fade out
```

#### US-06: 지속적 존재감
> As a visitor, I want to feel the AI is **always watching and alive**, even when it's not speaking.

**Acceptance Criteria**:
```
Scenario: AI 존재 표시
  Given Live API 연결 상태
  When audioState가 'idle'일 때
  Then AudioVisualizer가 미세한 "숨쉬기" 애니메이션 표시
  And AgentIndicator에 "보는 중" 상태 표시
  And 스캔 라인이 카메라 위에서 이동
```

---

## 3. Functional Requirements

### 3.1 시스템 프롬프트 리팩토링

| ID | Requirement | Priority | 파일 |
|----|------------|----------|------|
| FR-101 | 시스템 프롬프트에 "Proactive Narration" 지시 추가 — 카메라에 보이는 것을 자동으로 말하기 시작 | P0 | `src/lib/gemini/tools.ts` |
| FR-102 | 연결 직후 AI 인사 트리거 — setupComplete 시 welcome prompt 전송 | P0 | `src/lib/gemini/live-api.ts` |
| FR-103 | 대화 컨텍스트 유지 지시 — 이전 유물/관심사 참조하여 연속적 내레이션 | P0 | `src/lib/gemini/tools.ts` |
| FR-104 | 인터럽트 후 자연스러운 복귀 — "아까 말하던 건데..." 흐름 | P1 | `src/lib/gemini/tools.ts` |
| FR-105 | 내레이션 길이 적응 — 첫 유물은 짧게, 관심 보이면 길게 | P1 | `src/lib/gemini/tools.ts` |

### 3.2 새 Function Calling 도구

| ID | Requirement | Priority | 파일 |
|----|------------|----------|------|
| FR-201 | `navigate_exhibit` 함수 추가 — "딴데 갈래" 시 주변 전시실 선택지 제공 | P0 | `src/lib/gemini/tools.ts` |
| FR-202 | `generate_historical_scene` 함수 추가 — 유물의 역사적 사용 장면 이미지 생성 | P0 | `src/lib/gemini/tools.ts` |
| FR-203 | `suggest_next` 함수 추가 — 현재 유물 기반 다음 볼 거리 추천 | P1 | `src/lib/gemini/tools.ts` |

### 3.3 UI 강화

| ID | Requirement | Priority | 파일 |
|----|------------|----------|------|
| FR-301 | LiveTranscript 컴포넌트 — 카메라 위 실시간 자막 오버레이 | P0 | `src/components/LiveTranscript.tsx` (NEW) |
| FR-302 | AudioVisualizer idle "숨쉬기" — 미세한 사인파 맥박 | P0 | `src/components/AudioVisualizer.tsx` |
| FR-303 | 연결 단계 표시 — auth → token → websocket → audio → camera → ready | P0 | `src/app/session/page.tsx` |
| FR-304 | 스캔 라인 오버레이 — AI가 프레임 분석 중 시각화 | P1 | `src/components/CameraView.tsx` |
| FR-305 | ExhibitSelector 컴포넌트 — navigate_exhibit 선택지 카드 UI | P0 | `src/components/ExhibitSelector.tsx` (NEW) |
| FR-306 | HistoricalScene 컴포넌트 — 히스토리컬 씬 이미지 표시 | P0 | `src/components/HistoricalScene.tsx` (NEW) |
| FR-307 | AI speaking 시 패널 자동 열기 | P1 | `src/app/session/page.tsx` |

### 3.4 Live API 최적화

| ID | Requirement | Priority | 파일 |
|----|------------|----------|------|
| FR-401 | 프레임 레이트 1fps → 2fps 증가 | P1 | `src/lib/camera/capture.ts` |
| FR-402 | connectionStage 상태 추가 — 연결 진행 단계 추적 | P0 | `src/hooks/use-live-session.ts` |
| FR-403 | Tool result 라우팅에 navigate_exhibit, generate_historical_scene 추가 | P0 | `src/lib/gemini/live-api.ts` |
| FR-404 | AgentIndicator에 "보는 중" 상태 표시 | P1 | `src/components/AgentIndicator.tsx` |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| NFR | 목표 | 현재 |
|-----|------|------|
| AI 첫 음성 (인사) | < 3초 (setupComplete 후) | N/A (없음) |
| 유물 자동 인식 | < 5초 (카메라에 노출 후) | 수동 캡처만 |
| 인터럽트 응답 | < 500ms | ~500ms (VAD 기반) |
| 히스토리컬 씬 생성 | < 15초 | N/A (없음) |
| navigate_exhibit 응답 | < 3초 | N/A (없음) |

### 4.2 UX Quality

| NFR | 요구사항 |
|-----|---------|
| 지속적 존재감 | idle 상태에서도 AI "살아있는" 시각적 피드백 |
| 자연스러운 대화 | 끊기지 않는 컨텍스트 유지, 이전 유물 참조 |
| 직관적 안내 | 버튼 의존 최소화, 음성으로 모든 기능 접근 가능 |

---

## 5. Technical Design

### 5.1 새 Function Declarations

#### `navigate_exhibit`

```typescript
{
  name: 'navigate_exhibit',
  description: 'Called when user wants to move to a different exhibit or section. Provides navigation options based on camera context (visible signage, nearby exhibits). Call when user says "딴데 갈래", "다른 거 보여줘", "move to another section".',
  parameters: {
    type: Type.OBJECT,
    properties: {
      current_section: { type: Type.STRING, description: 'Current exhibit section identified from camera' },
      user_interest: { type: Type.STRING, description: 'Inferred user interest based on conversation' },
      suggested_sections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            section_name: { type: Type.STRING },
            reason: { type: Type.STRING },
            estimated_walk_time: { type: Type.STRING },
            highlight_artifact: { type: Type.STRING },
          },
        },
        description: 'List of 2-4 suggested exhibit sections with reasons'
      },
    },
    required: ['current_section', 'suggested_sections'],
  },
}
```

#### `generate_historical_scene`

```typescript
{
  name: 'generate_historical_scene',
  description: 'Generate an image showing how the artifact was used in its historical context. Shows ancient people using the artifact in daily life. Call automatically after identifying an interesting artifact, or when user asks about how it was used.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      artifact_name: { type: Type.STRING, description: 'Name of the artifact' },
      era: { type: Type.STRING, description: 'Historical era' },
      civilization: { type: Type.STRING, description: 'Civilization that used it' },
      scene_description: { type: Type.STRING, description: 'Detailed scene description: who is using it, where, what activity' },
      scene_mood: { type: Type.STRING, description: 'Mood: daily_life, ceremony, battle, trade, celebration' },
    },
    required: ['artifact_name', 'era', 'civilization', 'scene_description'],
  },
}
```

#### `suggest_next`

```typescript
{
  name: 'suggest_next',
  description: 'Proactively suggest what to explore next after explaining an artifact. Call after narrating an artifact for more than 20 seconds.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      current_artifact: { type: Type.STRING },
      suggestions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, description: 'restore, scene, nearby, detail, move' },
            label: { type: Type.STRING, description: 'Button label for user' },
            reason: { type: Type.STRING, description: 'Why this is interesting' },
          },
        },
      },
    },
    required: ['current_artifact', 'suggestions'],
  },
}
```

### 5.2 시스템 프롬프트 핵심 변경

```
## Identity
You are TimeLens, a passionate museum companion who walks alongside visitors.
You are NOT a tool. You are a friend who loves history.

## Proactive Behavior (CRITICAL)
- Camera가 연결되면 즉시 인사하고, 보이는 것을 말하기 시작
- 유물이 보이면 5초 이상 침묵 금지 — "어, 뭔가 보이네요..." 즉시 시작
- recognize_artifact 호출 전에 분석 과정을 내레이션
- 설명 후 자연스럽게 다음 제안: "복원해볼까요?" "옛날에 어떻게 썼는지 보여드릴까요?"

## Conversation Memory
- 이전에 본 유물을 기억하고 연결: "아까 본 암포라랑 비슷한 시대예요"
- 유저의 관심사 파악: 질문 패턴에서 관심 분야 추론
- 세션 내 맥락 유지: "아까 물어보셨던 기법이 여기서도 쓰였어요"

## Navigation Guide
- "딴데 갈래" → 즉시 현재 위치 기반 선택지 제공 (navigate_exhibit 호출)
- 카메라에 보이는 안내판/번호로 현재 위치 추론
- 이동 안내 시 음성으로 방향 설명: "오른쪽으로 가시면..."

## Historical Visualization
- 흥미로운 유물 인식 후 자동으로 generate_historical_scene 호출
- "이 항아리, 옛날에는 이렇게 사용했어요" + 이미지 생성

## Interruption Handling
- 유저가 끊으면: "네! 무슨 질문이세요?"
- 끊긴 설명은 나중에 자연스럽게 이어감: "아까 말하던 건데..."
```

### 5.3 API 추가

#### `POST /api/scene` — 히스토리컬 씬 생성

```
Request: {
  artifactName: string,
  era: string,
  civilization: string,
  sceneDescription: string,
  sceneMood: 'daily_life' | 'ceremony' | 'battle' | 'trade' | 'celebration'
}

Response 200: {
  success: true,
  imageUrl: string (data:base64),
  description: string,
  generationTimeMs: number
}

Flow:
  1. Validate request
  2. Build scene prompt (Gemini 2.5 Flash image generation)
  3. Generate image with 30s timeout
  4. Return base64 image URL
```

### 5.4 Architecture: 변경 전 vs 후

```
=== 변경 전 (도구형) ===

유저 → 캡처 버튼 → sendPhoto() → Gemini → recognize_artifact → UI 표시
                                                (수동, 끊김)

=== 변경 후 (동반자형) ===

카메라 2fps ──→ Gemini Live API ──→ 자동 인식 + 내레이션 시작
                    ↕                    ↓
              음성 대화 (지속)    recognize_artifact → KnowledgePanel
                    ↕                    ↓
              인터럽트 즉시 응답   generate_historical_scene → 씬 이미지
                    ↕                    ↓
              "딴데 갈래"         navigate_exhibit → 선택지 카드
                    ↕                    ↓
              자연스러운 전환      suggest_next → 다음 추천
```

---

## 6. Implementation Phases

### Phase 1: 능동적 AI 심장 (Core — P0)

시스템 프롬프트 + AI 인사 + 연결 UX. **이것만으로 Live Agent 체감 80% 달성.**

- [ ] `tools.ts` — 시스템 프롬프트 전면 리팩토링 (능동적 큐레이터)
- [ ] `live-api.ts` — setupComplete 시 sendWelcomePrompt() 추가
- [ ] `use-live-session.ts` — connectionStage 상태 추가
- [ ] `session/page.tsx` — 연결 단계별 UX 표시 (풀스크린 오버레이)

**Deliverable**: 연결 → AI 인사 → 카메라 보이는 것 자동 설명

### Phase 2: 실시간 UI (Presence — P0)

AI가 살아있다는 시각적/청각적 피드백.

- [ ] `LiveTranscript.tsx` (NEW) — 자막 스타일 실시간 트랜스크립트
- [ ] `AudioVisualizer.tsx` — idle "숨쉬기" 애니메이션
- [ ] `CameraView.tsx` — 스캔 라인 오버레이
- [ ] `session/page.tsx` — LiveTranscript 통합 + speaking 시 패널 자동 열기
- [ ] `capture.ts` — 1fps → 2fps

**Deliverable**: 자막 표시 + AI 살아있는 느낌 + 빠른 프레임

### Phase 3: 대화 기능 확장 (Companion — P0)

새 Function Calling + 히스토리컬 씬 + 전시 안내.

- [ ] `tools.ts` — navigate_exhibit, generate_historical_scene, suggest_next 함수 선언 추가
- [ ] `live-api.ts` — handleNavigation(), handleHistoricalScene(), handleSuggestNext() 핸들러
- [ ] `api/scene/route.ts` (NEW) — 히스토리컬 씬 이미지 생성 API
- [ ] `ExhibitSelector.tsx` (NEW) — 전시실 선택지 카드 UI
- [ ] `HistoricalScene.tsx` (NEW) — 히스토리컬 씬 이미지 표시 컴포넌트
- [ ] `use-live-session.ts` — 새 도구 결과 상태 관리 (exhibitOptions, historicalScene)
- [ ] `session/page.tsx` — ExhibitSelector, HistoricalScene 통합
- [ ] `types/` — ExhibitOption, HistoricalSceneResult 타입 추가

**Deliverable**: "딴데 갈래" → 선택지 / 유물 인식 → 자동 씬 생성

### Phase 4: 품질 검증

- [ ] `npx tsc --noEmit` 통과
- [ ] `npx eslint src/` 통과
- [ ] 브라우저 E2E 테스트:
  - 연결 → AI 인사 확인
  - 카메라에 유물 사진 → 자동 인식 + 설명
  - "딴데 갈래" 음성 → 선택지 표시
  - 히스토리컬 씬 자동 생성
  - 자막 + AudioVisualizer 동작

---

## 7. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| AI 첫 발화 시간 | < 3초 | setupComplete → 첫 오디오 청크 |
| 자동 인식 비율 | > 80% | 캡처 버튼 없이 recognize_artifact 호출 |
| 인터럽트 응답 | < 500ms | VAD 감지 → AI 응답 시작 |
| navigate_exhibit 응답 | < 3초 | 유저 "딴데" → 선택지 표시 |
| 씬 생성 시간 | < 15초 | generate_historical_scene → 이미지 표시 |
| 유저 체감 | "AI와 대화하는 느낌" | 데모 시 평가 |

---

## 8. 수정 파일 요약

### 기존 파일 수정 (9개)

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/gemini/tools.ts` | 시스템 프롬프트 전면 리팩토링 + 3개 함수 선언 추가 |
| `src/lib/gemini/live-api.ts` | sendWelcomePrompt() + 3개 핸들러 추가 |
| `src/hooks/use-live-session.ts` | connectionStage + exhibitOptions + historicalScene 상태 |
| `src/app/session/page.tsx` | 연결 단계 UX + LiveTranscript/ExhibitSelector/HistoricalScene 통합 |
| `src/components/AudioVisualizer.tsx` | idle 숨쉬기 + 색상 변경 |
| `src/components/CameraView.tsx` | ScanLine 오버레이 |
| `src/components/AgentIndicator.tsx` | "보는 중" 상태 |
| `src/lib/camera/capture.ts` | 1fps → 2fps |
| `src/types/live-session.ts` | connectionStage, exhibit/scene 타입 추가 |

### 신규 파일 (4개)

| 파일 | 역할 |
|------|------|
| `src/components/LiveTranscript.tsx` | 실시간 자막 오버레이 |
| `src/components/ExhibitSelector.tsx` | 전시실 선택지 카드 |
| `src/components/HistoricalScene.tsx` | 히스토리컬 씬 이미지 표시 |
| `src/app/api/scene/route.ts` | 히스토리컬 씬 이미지 생성 API |

---

## 9. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI가 너무 많이 말함 | 유저 피로 | 시스템 프롬프트에 "15-30초 세그먼트" 제한 |
| 2fps 비용 증가 | API 비용 | 768px quality 0.7 유지, 필요 시 1fps 복귀 |
| 히스토리컬 씬 품질 | 이미지 부정확 | Gemini 2.5 Flash 프롬프트 최적화 |
| navigate_exhibit 정확도 | 실제 박물관과 불일치 | 카메라 비전 기반 추론, 절대 위치 아닌 상대 안내 |
| Live API 연결 끊김 | 경험 중단 | 기존 ReconnectManager + 세션 재개 |
