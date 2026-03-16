# TimeLens 데모 영상 시나리오
> Gemini Live Agent Challenge 2026 | Team wigtn
> 목표 길이: **3분 40초** (최대 4분)
> 영상 언어: **영어** (나레이션 + 자막)

---

## 사전 준비 체크리스트

| 항목 | 상태 | 우선순위 |
|------|------|----------|
| 오프닝 영상 3개 — 사진+Ken Burns 또는 Sora (→ `sora-prompts.md` 참고) | TODO | 높음 |
| 모바일 실제 화면 녹화 (프로덕트 데모) | TODO | 높음 |
| 아키텍처 다이어그램 (깔끔한 PNG/SVG) | TODO | 높음 |
| Cloud Run 콘솔 스크린샷/녹화 | TODO | 높음 |
| 영어 나레이션 녹음 | TODO | 높음 |
| 데모용 유물 사진 (카메라 인식용) | TODO | 높음 |
| 제품 내 영어 하드코딩 텍스트 수정 (i18n) | TODO | 높음 |
| 배경 음악 (잔잔한 시네마틱) | 선택 | 낮음 |

### 오프닝 영상 소재 (택 1)
- **방법 A (빠름):** Unsplash/Pexels 사진 3장 + Ken Burns 효과 (20분)
- **방법 B (고퀄):** Sora로 3초 영상 3개 생성 (→ `sora-prompts.md` 별도 문서)
- 어느 쪽이든 3개 클립, 각 3~5초 분량

---

## 영상 전체 구조

```
[0:00-0:15]  Sora 3장면 + 자막 (니케/박물관/유적)     ← 15초 오프닝
[0:15-0:20]  제품 화면: 니케 Before/After 슬라이더     ← 답 = 우리 제품
[0:20-0:25]  로고 + 솔루션 나레이션                    ← 소개
[0:25-0:45]  아키텍처 다이어그램                       ← 기술력 (심사 30%)
[0:45-1:10]  온보딩 (점프컷으로 빠르게)               ← 제품 시작
[1:10-1:50]  실시간 음성 대화 + 유물 인식             ← 핵심 기능
[1:50-2:30]  AI 복원 — 킬러 피처                      ← 클라이맥스
[2:30-2:50]  주변 발견 + 다이어리                     ← 기능 폭 보여주기
[2:50-3:15]  Cloud Run 배포 증거 + 기술 스택          ← 필수 제출 요건
[3:15-3:40]  클로징                                   ← 여운
```

---

## 상세 장면 스크립트

---

### ACT 1: 오프닝 — Sora 15초 + 제품 + 로고 (0:00 - 0:25)

> **컨셉: 3장면 각각에 자막. 비주얼 + 텍스트가 동시에 감정을 때린다.**
> 니케 → 박물관 → 유적지. 그리고 제품이 답한다.
> 프롬프트 상세: `sora-prompts.md` 참고.

---

#### [0:00-0:06] 장면 1 — 니케: 손상 → 복원 변환

**화면:** 루브르 다뤼 계단. 서양인 관광객(뒷모습)이 현재의 니케를 올려다봄
(머리 없고, 팔 없고, 풍화된 흰 대리석).
카메라 천천히 전진 3초. 그 후 매끄러운 변환 시작 —
머리가 나타나고, 팔이 뻗어나오고, 날개가 완성되고,
선명한 고대 채색(파랑 날개, 진홍 옷, 금색 디테일)이 물들며
**기원전 190년 원래 모습으로 완전 복원**.

**자막 (0:01-0:05):**
> *"Ever wondered what she looked like 2,200 years ago?"*

**오디오:** 잔잔한 앰비언트/피아노. 나레이션 없음.

---

#### [0:06-0:10] 장면 2 — 박물관 언어 장벽

**화면:** 다른 박물관 내부. 인도 여성 관광객(사리 착용, 뒷모습)이
영어/프랑스어/독일어로만 된 안내판을 보다가 돌아섬.

**자막 (0:06-0:10):**
> *"No guide in your language. Audio packs? Expensive and clunky."*

---

#### [0:10-0:15] 장면 3 — 시칠리아 신전 유적

**화면:** 시칠리아 아그리젠토, 신전의 계곡(Valle dei Templi). 골든아워.
거대한 도리스식 기둥 유적이 길을 따라 서 있음. 표지판 없음, 가이드 없음.
관광객 몇 명이 멈추지 않고 지나감. 석양에 고대 돌이 호박색으로 빛남.

**자막 (0:10-0:15):**
> *"What is this? What did it once look like?"*

**편집 노트:** 장면 3 마지막 0.5초에서 페이드 투 블랙.

---

#### [0:15-0:20] 답 — Before/After 슬라이더

**화면:** 실제 제품 화면 녹화.
니케의 현재 모습(머리/팔 없음) → 슬라이더가 천천히 움직이며 →
AI가 복원한 완전한 니케(머리, 양팔, 채색) 등장.

**자막 없음.** 비주얼이 답이다. Sora의 "환영"에 대한 실제 답.

---

#### [0:20-0:25] 로고 + 솔루션 소개

**화면:** TimeLens 로고 페이드인.

**나레이션:**
> *"This is TimeLens — an AI companion that brings cultural heritage to life
> through real-time voice, camera recognition, and historical restoration."*

---

### ACT 2: 아키텍처 (0:25 - 0:45)

---

#### [0:25-0:45] 시스템 아키텍처 다이어그램 (20초)

**화면:** 깔끔한 아키텍처 다이어그램. 나레이션 순서에 맞춰 화살표가 순차적으로 나타나는 애니메이션.

```
                         WebSocket (실시간 오디오 + 비전)
  ┌──────────┐     ◄═══════════════════════════════►     ┌───────────────────┐
  │  모바일   │                                          │  Gemini 2.5 Flash │
  │  브라우저  │                                          │  Native Audio     │
  │           │                                          │                   │
  │  Next.js  │     Function Calling ──────────────►     │  Live API         │
  │  React 19 │       recognize_artifact                 │  Orchestrator     │
  │  TypeScript│       generate_restoration               │  Google Search    │
  └─────┬─────┘       discover_nearby                    │  Grounding        │
        │             create_diary                       └────────┬──────────┘
        │                                                         │
   ┌────┴─────────────────────────┐          ┌────────────────────┴───────────┐
   │  Google Cloud Run            │          │  ADK Multi-Agent (REST)        │
   │  Firebase (Firestore + Auth) │◄────────►│  Orchestrator → 4 Sub-Agents  │
   │  Google Places API           │          │  Curator / Restoration /       │
   └──────────────────────────────┘          │  Discovery / Diary             │
                                             └────────────────────────────────┘
```

**나레이션:**
> *"TimeLens uses a dual-pipeline multi-agent architecture.
> Pipeline one: Gemini's Live API streams real-time audio and video,
> with Function Calling orchestrating four specialized tools.
> Pipeline two: Google ADK powers a multi-agent backend —
> an Orchestrator routes requests to Curator, Restoration, Discovery, and Diary agents,
> each with dedicated Gemini models and tools.
> Deployed on Cloud Run, backed by Firebase and Google Places API."*

**편집 노트:** 최대 20초. 심사관은 다이어그램보다 동작하는 제품을 보고 싶어한다.
나레이션 진행에 맞춰 다이어그램 요소가 왼쪽에서 오른쪽으로 나타나게 할 것.

---

### ACT 3: 라이브 데모 (0:45 - 2:50)

> 이 섹션이 영상의 핵심이다. **심사 비중 40%가 여기서 결정된다.**
> 반드시 실제 디바이스에서 녹화할 것. 시뮬레이터 사용 금지.

---

#### [0:45-1:10] 온보딩 — 점프컷 (25초)

**화면:** 실제 모바일 디바이스 화면 녹화. 빠른 편집.

| 단계 | 화면 | 시간 | 동작 |
|------|------|------|------|
| 1 | 언어 선택 | 2초 | "English" 탭 |
| 2 | 권한 요청 | 2초 | "Allow" 탭 |
| 3 | 박물관 선택 | 5초 | GPS가 근처 박물관 감지 → 선택 |
| 4 | 스플래시 | 3초 | "연결 중..." → 연결 완료 |
| 5 | 세션 시작 | 5초 | AI 음성: *"Welcome to the National Museum of Korea!"* |

**나레이션:**
> *"Getting started takes seconds.
> TimeLens auto-detects nearby museums using GPS,
> and Gemini greets you with real-time knowledge about current exhibitions —
> powered by Google Search grounding."*

**편집 노트:** 온보딩 단계 사이는 점프컷으로 빠르게 넘길 것. 풀 트랜지션 불필요.
박물관 인사말이 핵심 — AI가 사용자 위치를 알고 있다는 걸 증명하는 장면.

---

#### [1:10-1:50] 핵심 데모: 음성 대화 + 유물 인식 (40초)

**화면:** 세션 화면. 트랜스크립트 채팅 보이고, 오디오 파형 활성화.

**실제 라이브 인터랙션 (디바이스 오디오 녹화):**

> **사용자 (음성):** *"I see something incredible up ahead. Let me show you."*

*사용자가 카메라 버튼 탭 → 카메라 PIP 열림 → 사모트라케의 니케 사진에 카메라 겨냥 → 캡처 버튼 탭*

> **AI (음성, 실시간):** *"Oh wow — you're looking at the Winged Victory of Samothrace!
> This is from around 190 BC, one of the greatest masterpieces of Hellenistic sculpture.
> She was originally placed on the prow of a stone ship, celebrating a naval victory..."*

**AI 응답 중 화면 변화:**
1. 에이전트 인디케이터에 "Curator" 표시 + 파형 애니메이션
2. 지식 카드 슬라이드업: "Winged Victory of Samothrace · 190 BC · Hellenistic Greek"
3. 토픽 칩 등장: "Naval Victory", "Missing Parts", "Original Colors"

*사용자가 "Original Colors" 칩 탭*

> **AI (음성):** *"Most people don't realize this, but she was originally painted
> in vivid colors — deep blue and red on the wings, golden details on the drapery..."*

**나레이션 (라이브 인터랙션 후):**
> *"The entire interaction is voice-first.
> Gemini's Function Calling returns structured artifact data in real-time,
> while the conversation flows naturally.
> Topic chips let users dive deeper with a single tap."*

**편집 노트:** 이 섹션은 **반드시 실제 디바이스 오디오를 사용**해야 한다.
음성 품질과 응답 속도가 진짜 라이브임을 증명하는 핵심.
지연이 있어도 괜찮다 — 오히려 사전 녹화가 아닌 실제 동작임을 보여준다.

---

#### [1:50-2:30] AI 복원 — 킬러 피처, 클라이맥스 (40초)

**화면:** 이전 세션에서 이어지는 대화.

> **사용자 (음성):** *"You said she was painted in colors? Can you show me what she originally looked like?"*

**화면 순서:**
1. 에이전트 인디케이터 전환 애니메이션: Curator → Restoration
2. 오디오 비주얼라이저에 "생성 중" 상태 표시
3. 카메라 자동 닫힘
4. 복원 로딩 카드 + 프로그레스 바 표시

> **AI (음성, 로딩 중):** *"Around 190 BC, she would have stood over 3 meters tall
> on the prow of a ship — head held high, wings spread wide,
> painted in brilliant blues and golds.
> Let me restore her for you..."*

**[컷편집 — 대기 시간 건너뛰기, 프로그레스 40% → 100% 점프]**

5. **BeforeAfterSlider 입장 애니메이션과 함께 등장**
   - 왼쪽: 머리·양팔 없는 현재 니케
   - 오른쪽: AI가 복원한 완전한 니케 (머리, 양팔, 채색)

**화면:** 사용자가 슬라이더를 천천히 좌우로 드래그. **4~5초간 유지.**

> **사용자가 Save 버튼 탭 → 토스트: "Saved"**

**나레이션:**
> *"This is the moment.
> The Live API triggers a Function Call, which hands off to the ADK Restoration Agent.
> Gemini Flash Image generates a historically accurate restoration —
> and the before-and-after slider creates a tangible time-travel experience.
> Users can save and share their personal piece of restored history."*

**편집 노트:** 슬라이더 드래그가 **전체 영상의 히어로 샷**이다.
실제 디바이스에서 손가락이 보이게 촬영할 것.
느리고 의도적인 움직임. 시청자가 시각적 차이를 충분히 흡수하게 할 것.
**이 장면에서 음악 볼륨 살짝 올리면 효과적.**

---

#### [2:30-2:50] 주변 발견 + 다이어리 (20초)

**화면:** 세션으로 돌아옴.

> **사용자 (음성):** *"What else can I visit nearby?"*

**화면:** 주변 유적지 카드 등장 — 박물관/문화유산 목록, 거리, 평점 표시.

**나레이션:**
> *"Google Places API finds walkable cultural heritage within range."*

**빠른 컷:** 사용자가 다이어리 버튼 (BookOpen 아이콘) 탭

**화면:** 다이어리 페이지 로드 — AI 생성 서사 텍스트 + 일러스트레이션

**나레이션:**
> *"At the end of the visit, TimeLens generates a personal diary —
> an emotional narrative combining every artifact explored,
> with AI-generated illustrations."*

**편집 노트:** 이 섹션은 빠르게. 보조 기능이다.
복원 슬라이더가 클라이맥스였으니 여기서 오래 머물면 안 된다.

---

### ACT 4: 배포 증거 + 클로징 (2:50 - 3:40)

---

#### [2:50-3:15] Cloud 배포 증거 + 기술 스택 (25초)

**화면 1 (8초):** Google Cloud 콘솔 — Cloud Run 서비스 실행 중.
강조: 리전 (asia-northeast3), 상태 (active), URL.

**화면 2 (5초):** GitHub Actions — CI/CD 파이프라인 성공 화면.

**화면 3 (7초):** 코드 빠르게 스크롤 — 핵심 스니펫 하이라이트:
- `live-api.ts` — Live API 세션 연결
- `tools.ts` — Function Calling 선언
- `orchestrator.ts` — ADK 멀티에이전트 라우터
- `restoration.ts` — ADK Restoration Agent

**나레이션:**
> *"TimeLens is fully deployed on Google Cloud Run.
> Our tech stack:
> Gemini 2.5 Flash with Live API for native audio streaming,
> Google ADK with four specialized agents — Curator, Restoration, Discovery, and Diary,
> Function Calling for real-time tool orchestration,
> Google Search grounding for live facts,
> Firebase for persistence,
> and Next.js 15 with strict TypeScript."*

**자막 (불릿 포인트 순차 등장):**
- Gemini 2.5 Flash + Live API (Native Audio)
- Google ADK — 4 Agents (Curator / Restoration / Discovery / Diary)
- Function Calling (4 tools) + Google Search Grounding
- Context Window Compression + Session Resumption
- Cloud Run + Firebase + Google Places API
- Next.js 15 / React 19 / TypeScript Strict

---

#### [3:15-3:30] 비전 + 확장성 (15초)

**화면:** 분할 화면 —
왼쪽: 박물관 내부 (제품 실행 중)
오른쪽: 야외 유적지 (제품 실행 중)

**나레이션:**
> *"TimeLens works everywhere cultural heritage lives —
> inside museums, at outdoor monuments, on ancient streets.
> In any language. With just your voice and a camera."*

**자막:**
> *"Any artifact. Any language. Anywhere."*

---

#### [3:30-3:40] 클로징 (10초)

**화면:** 검은 배경. TimeLens 로고 중앙. 은은한 골드 글로우.

**텍스트 순차 페이드인:**
```
TimeLens
Where every artifact has a story to tell.

Team wigtn
Built with Gemini Live API
Deployed on Google Cloud

Gemini Live Agent Challenge 2026
```

**나레이션:**
> *"TimeLens. Where every artifact has a story to tell."*

**오디오:** 음악 마무리. 정적.

---

## 제작 가이드

### 녹화 팁
1. 모든 제품 화면은 **실제 모바일 디바이스**로 녹화 (시뮬레이터 금지)
2. **Gemini 실제 응답**을 녹화할 것 — 실제 지연 시간이 진위를 증명함
3. 카메라 인식용 **데모 유물 사진**을 태블릿/모니터에 미리 준비
4. 녹화 전 **전체 플로우를 3회 이상 테스트**하여 매끄럽게 진행되게 할 것
5. 깔끔한 음성 인터랙션 녹음을 위해 **조용한 방**에서 녹화

### 편집 팁
1. 온보딩은 **점프컷** (풀 트랜지션 보여주지 말 것)
2. 복원 로딩은 **스피드 램프** (40% → 100%를 2초로)
3. Before/After 슬라이더 드래그는 **슬로우 모션** (히어로 모먼트)
4. 자막 스타일 통일: 흰 텍스트, 약간의 드롭 쉐도우, 하단 중앙
5. 아키텍처 다이어그램: 나레이션 타이밍에 맞춰 요소 순차 등장

### 데모 사전 준비
1. 브라우저 캐시 초기화 + 새 세션 확보
2. 카메라/마이크 권한 미리 허용 (또는 온보딩에서 허용하는 장면 포함)
3. 안정적인 WiFi/셀룰러 확보
4. 복원 API 사전 테스트 — Gemini 쿼터 확인
5. 라이브 데모 실패 대비 **백업 녹화본** 준비

### 오디오 믹싱
- 나레이션: 명확하고 자신감 있게, 적당한 속도
- AI 음성: Gemini 실제 Kore 음성 그대로 사용 (더빙 금지)
- 음악: 로파이 앰비언트 또는 잔잔한 시네마틱 (Artlist, Epidemic Sound 무료 티어)
- 믹스 비율: 나레이션 100% / AI 음성 80% / 음악 20%

---

## 심사 기준 대응표

| 심사 기준 (비중) | 대응 구간 | 타임스탬프 |
|---|---|---|
| 혁신성 & 멀티모달 UX (40%) | 음성 + 카메라 + 복원 + 다이어리 | 1:10-2:50 |
| 기술 구현 (30%) | 아키텍처 + 코드 + 배포 | 0:25-0:45, 2:50-3:15 |
| 데모 & 프레젠테이션 (30%) | 영상 전체 퀄리티 + 라이브 데모 | 전체 |

### 카테고리별 수상 타겟

**Best of Live Agents (주 타겟: $10K)**
- 실시간 오디오 스트리밍 증명 (1:10-1:50)
- 음성 우선 인터랙션 모델
- Function Calling 오케스트레이션
- ADK 멀티에이전트 아키텍처 (Orchestrator + 4 Sub-Agents)

**Best Multimodal Integration & UX ($5K)**
- 음성 + 비전 + 이미지 생성 + 텍스트
- Before/After 슬라이더 = 만질 수 있는 결과물
- 다이어리 = 영속적 멀티모달 아티팩트

**Grand Prize ($25K)**
- 완성된, 배포된, 폴리싱된 제품
- 설득력 있는 문제 + 솔루션 서사
- 기술적 깊이 + 데모 품질의 결합
