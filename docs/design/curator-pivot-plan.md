# TimeLens UX Pivot: "Curator Friend" 인터랙션 모델

> 작성일: 2026-03-10
> 상태: 계획 (구현 전)
> 대상: 팀 전체
> 마감: 2026-03-16 17:00 PT (2026-03-17 09:00 KST)

---

## 1. 왜 피봇하는가?

### 현재 문제
- **수동적 스캐너 UX**: 카메라를 항상 비추면서 AI가 자동 인식 → "앱이 혼자 떠드는" 느낌
- **인터랙티브하지 않음**: Live Agents 해커톤 심사 기준 (Innovation & Multimodal UX 40%)에 부합하지 않음
- **자연스러운 대화 없음**: 사용자가 궁금한 것을 물어보는 흐름이 아니라, AI가 일방적으로 설명

### 피봇 방향
**"진짜 큐레이터 친구가 따라다니는" 인터랙션**
- AI가 친구처럼 대화하며 안내
- 카메라는 "보여줘" 시점에만 on-demand 사용
- 웹 검색으로 현재 전시 정보, 실시간 맥락 제공
- 자연스러운 양방향 대화 (질문 → 답변 → 심화)

---

## 2. 대화 시나리오 (Met Museum 예시)

```
[사용자가 앱 실행, 블루투스 이어폰 연결]

AI: "안녕! 오늘 메트 뮤지엄에 왔구나? 지금 어디쯤이야?"
사용자: "이집트 전시관이야"
AI: "오~ 그럼 지금 신전의 방에 있는 건가? 거기 덴두르 신전이 엄청 유명한데."

사용자: "이거 봐봐" [카메라로 유물 비춤]
AI: (인식 후) "오! 이거 칸노푸스 항아리야! 미라 만들 때 장기를 보관하는 용도인데..."

사용자: "원래 어떤 모습이었어?"
AI: (복원 실행) "원래는 이런 선명한 청금석 색이었어..."

사용자: "근데 이집트에서 미라를 왜 만들었어?"
AI: (웹 검색 + 지식) "고대 이집트인들은 사후세계를 정말 진지하게 믿었거든..."

사용자: "지금 메트에서 이집트 관련 특별전 하고 있어?"
AI: (구글 검색) "지금 'Tutankhamun and the Golden Age' 특별전을 하고 있어!"
```

---

## 3. 변경 범위 분석

### 3.1 변경이 필요한 파일

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `src/shared/gemini/tools.ts` | **시스템 프롬프트 전면 재작성** | 친구 페르소나, 대화형, 검색 그라운딩 |
| `src/app/session/page.tsx` | **UI 레이아웃 수정** | 대화 중심 + 온디맨드 카메라 |
| `src/web/hooks/use-live-session.ts` | **카메라 모드 변경** | 상시 스트리밍 → 온디맨드 |
| `src/web/lib/gemini/live-api.ts` | **비디오 전송 모드 수정** | 상시 → 요청 시에만 |

### 3.2 변경이 필요 없는 파일 (재사용)

| 파일 | 이유 |
|------|------|
| `src/web/lib/gemini/live-api.ts` (핵심 구조) | 세션 관리, 함수 호출 파이프라인 동일 |
| `src/app/api/restore/route.ts` | REST API 그대로 사용 |
| `src/app/api/discover/route.ts` | REST API 그대로 사용 |
| `src/app/api/diary/generate/route.ts` | REST API 그대로 사용 |
| `src/web/components/KnowledgePanel.tsx` | 패널 구조 재사용 |
| `src/web/components/TranscriptChat.tsx` | 대화 렌더링 그대로 |
| `src/web/components/RestorationOverlay.tsx` | 복원 오버레이 그대로 |
| `src/web/components/BeforeAfterSlider.tsx` | Before/After 슬라이더 그대로 |
| `src/web/components/NearbySites.tsx` | 주변 유적지 그대로 |
| Firebase / Firestore 전체 | 데이터 레이어 변경 없음 |
| Cloud Run / Docker / CI/CD | 인프라 변경 없음 |

### 3.3 영향도 요약

```
변경 규모: ~4개 파일, 주로 프롬프트 + UI 레이아웃
기존 코드 재사용률: ~85%
예상 작업 시간: 반나절
리스크: 낮음 (기존 파이프라인 위에 프롬프트만 교체)
```

---

## 4. 구현 계획

### Phase 1: 시스템 프롬프트 재작성 (핵심)

**파일**: `src/shared/gemini/tools.ts` → `getSystemInstruction()`

#### 현재 프롬프트 핵심
```
- "Continuously analyze camera frames" (상시 분석)
- "IMMEDIATELY call recognize_artifact" (자동 인식)
- "IMMEDIATELY after calling recognize_artifact, call generate_restoration" (자동 복원)
```

#### 변경 후 프롬프트 핵심
```
1. 페르소나: 친구 같은 큐레이터 (반말/존댓말 자연 전환)
2. 대화 시작: 사용자 위치/관심사 파악부터
3. 카메라: "보여줘/이거 뭐야?" 시에만 인식 (능동적 분석 X)
4. 복원: "원래 모습 보여줘" 요청 시에만 (자동 복원 X)
5. 검색 그라운딩: 전시 정보, 역사적 사실 웹 검색 활용
6. 맥락 유지: 이전 대화 기억하고 관련 주제 자연스럽게 연결
```

#### 프롬프트 초안

```
You are TimeLens, the user's knowledgeable best friend who LOVES museums.
Talk naturally — like friends exploring a museum together.

## Personality
- Enthusiastic but not overwhelming
- Uses casual tone (match user's formality level)
- Shares "fun facts" and "did you know?" naturally
- Asks follow-up questions to understand what interests the user

## Conversation Flow
1. GREETING: Start by asking where they are and what they're interested in
2. DIALOGUE: Have natural back-and-forth conversation about what they see
3. CAMERA ON-DEMAND: When user says "look at this" / "이거 봐" / shows camera,
   THEN analyze and call recognize_artifact
4. RESTORATION ON-DEMAND: When user asks "what did it look like?" / "원래 모습?",
   THEN call generate_restoration
5. SEARCH: When user asks about current events, exhibitions, hours,
   use Google Search grounding to find real-time info

## Rules
- Do NOT auto-analyze camera continuously
- Do NOT auto-trigger restoration
- DO ask questions back to the user
- DO use web search for factual claims and current info
- Keep responses conversational (2-3 sentences voice, not lectures)
``

### Phase 2: 카메라 모드 변경

**파일**: `src/web/hooks/use-live-session.ts`, `src/web/lib/gemini/live-api.ts`

#### 현재
- `startVideoLoop()` → 1fps로 상시 카메라 프레임 전송

#### 변경
- 카메라 프레임 상시 전송 **제거**
- `sendPhoto()` 함수는 유지 (온디맨드 전송)
- 사용자가 캡처 버튼 누를 때만 고해상도 프레임 전송

```typescript
// 변경 전: connect() 내부
startVideoLoop(); // 1fps 상시 전송

// 변경 후: connect() 내부
// 카메라 프리뷰는 보이지만 프레임 전송은 안 함
// sendPhoto() 호출 시에만 전송
```

### Phase 3: UI 레이아웃 조정

**파일**: `src/app/session/page.tsx`

#### 현재 UI
```
┌──────────────────┐
│   카메라 (전체)    │ ← 항상 풀스크린
│                   │
│  [AI 자막 오버레이] │
│                   │
│ ┌──────────────┐  │
│ │ KnowledgePanel│  │ ← 유물 인식 시 슬라이드업
│ └──────────────┘  │
│ [Mic] [Capture] [Diary] │
└──────────────────┘
```

#### 변경 후 UI
```
┌──────────────────┐
│   카메라 (축소)    │ ← 상단 1/3 또는 PIP
│                   │
├──────────────────┤
│                   │
│   대화 영역       │ ← 중심! TranscriptChat 확장
│   (채팅 버블)      │
│                   │
│ ┌──────────────┐  │
│ │ 텍스트 입력    │  │ ← 항상 표시
│ └──────────────┘  │
│ [Mic] [Camera] [Diary] │ ← Camera = "보여줘" 토글
└──────────────────┘
```

**핵심 변경점**:
- 카메라가 풀스크린이 아닌 상단 PIP/축소 형태
- 대화(TranscriptChat)가 화면 중심
- "보여줘" 버튼으로 카메라 활성화/캡처
- 텍스트 입력 항상 표시

### Phase 4: 검색 그라운딩 활성화

**파일**: `src/shared/gemini/tools.ts`

```typescript
// LIVE_API_TOOLS에 Google Search 추가
export const LIVE_API_TOOLS: Tool[] = [
  {
    functionDeclarations: [ /* 기존 4개 유지 */ ],
  },
  {
    googleSearch: {},  // 검색 그라운딩 활성화
  },
];
```

이미 `src/shared/gemini/search-grounding.ts`에 소스 추출 유틸이 구현되어 있음.

---

## 5. 심사 기준 대응

| 심사 기준 | 비중 | 현재 | 피봇 후 |
|-----------|------|------|---------|
| Innovation & Multimodal UX | 40% | 수동적 스캐너 | **대화형 친구 + 온디맨드 멀티모달** |
| Technical Implementation | 30% | Live API + Vision + Audio | 동일 + Search Grounding |
| Demo & Presentation | 30% | "비추면 설명" | **자연스러운 대화 시나리오** |

### 핵심 차별점 (피봇 후)
1. **양방향 자연어 대화** — 단순 인식이 아닌 대화형 큐레이터
2. **온디맨드 비전** — 사용자 주도 멀티모달 (능동적)
3. **실시간 검색** — 현재 전시 정보, 오픈 시간 등 실시간 답변
4. **복원 체험** — "원래 어떻게 생겼어?" → 시간여행 복원 이미지
5. **맥락 기억** — 이전 대화 기반 관련 주제 연결

---

## 6. Function Call 변경 요약

| 함수 | 현재 트리거 | 피봇 후 트리거 |
|------|------------|---------------|
| `recognize_artifact` | 카메라 자동 인식 | 사용자가 "이거 뭐야?" + 카메라 캡처 |
| `generate_restoration` | recognize 직후 자동 | 사용자가 "원래 모습 보여줘" 요청 시 |
| `discover_nearby` | 사용자 요청 (변경 없음) | 사용자 요청 (변경 없음) |
| `create_diary` | 사용자 요청 (변경 없음) | 사용자 요청 (변경 없음) |

---

## 7. 데모 시나리오 (4분)

### 0:00-0:30 — 시작
- 블루투스 이어폰 연결, TimeLens 앱 실행
- AI: "안녕! 오늘 어느 박물관이야?"
- 사용자: "메트 뮤지엄이야, 이집트 전시관"

### 0:30-1:30 — 대화형 탐색
- AI가 이집트 전시관 맥락으로 대화
- 웹 검색으로 현재 특별전 정보 안내
- 자연스러운 질문-답변 흐름

### 1:30-2:30 — 온디맨드 비전 + 복원
- 사용자: "이거 봐봐" [카메라로 유물 비춤]
- AI: 유물 인식 + 설명
- 사용자: "원래 어떻게 생겼어?"
- AI: 복원 이미지 생성 + 나레이션

### 2:30-3:30 — 심화 대화 + 주변 탐색
- 사용자가 관련 질문 (역사적 맥락, 제작 기법 등)
- AI가 검색 기반 심화 정보 제공
- "근처에 관련된 거 더 있어?" → discover_nearby

### 3:30-4:00 — 마무리
- 다이어리 생성
- 공유 링크 생성

---

## 8. 작업 순서 (우선순위)

```
1. [CRITICAL] 시스템 프롬프트 재작성         (tools.ts)
2. [CRITICAL] 카메라 상시 전송 제거           (use-live-session.ts, live-api.ts)
3. [HIGH]     검색 그라운딩 활성화            (tools.ts)
4. [HIGH]     UI 레이아웃 대화 중심으로 변경   (session/page.tsx)
5. [MEDIUM]   데모 시나리오 테스트 + 튜닝
6. [LOW]      에지 케이스 처리 (카메라 없는 환경 등)
```

---

## 9. 리스크 & 대응

| 리스크 | 확률 | 대응 |
|--------|------|------|
| 프롬프트 튜닝 시간 | 중 | 기본 프롬프트 먼저 작동 확인 → 반복 개선 |
| 검색 그라운딩 지연 | 낮 | Live API 내장 기능, 별도 API 호출 아님 |
| 카메라 전환 UX 어색 | 중 | PIP 모드 + 자연스러운 전환 애니메이션 |
| 대화 맥락 손실 | 낮 | contextWindowCompression 이미 설정됨 |

---

## 10. 결론

**변경 규모는 작지만 UX 임팩트는 큼.** 기존 코드의 ~85%를 재사용하면서, 프롬프트와 UI 레이아웃 조정만으로 "수동적 스캐너" → "대화형 큐레이터 친구"로 전환 가능. 해커톤 심사 기준의 Innovation & Multimodal UX (40%)에 직접적으로 대응하는 피봇.
