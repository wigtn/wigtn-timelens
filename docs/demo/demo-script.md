# TimeLens 데모 대본 (영어 대사 + 한국어 해설)
> Gemini Live Agent Challenge 2026 | Team wigtn
> 총 러닝타임: **약 3분 20초**
> 대사: 영어 | 설명: 한국어 | 다이어리 기능 제외

---

## 트리거 기능 목록

| 기능 | 트리거 대사 | 타임스탬프 |
|------|------------|-----------|
| 유물 인식 | *"Let me show you."* + 카메라 탭 | 1:10 |
| 토픽 탐색 | "Original Colors" 칩 탭 | 1:35 |
| AI 복원 | *"Can you show me what she originally looked like?"* | 1:50 |
| 주변 발견 | *"What else can I visit nearby?"* | 2:30 |

---

## ACT 1: 오프닝 — Sora 영상 + 로고 (0:00–0:25)

> 대사 없음. 비주얼 + 자막이 감정을 전달한다.

---

### [0:01–0:05] 자막 1 — 니케 복원 장면

> *"Ever wondered what she looked like 2,200 years ago?"*
>
> (한국어) 그녀가 2,200년 전에 어떤 모습이었는지 궁금해본 적 있나요?

---

### [0:06–0:10] 자막 2 — 박물관 언어 장벽 장면

> *"No guide in your language. Audio packs? Expensive and clunky."*
>
> (한국어) 당신 언어로 된 가이드가 없네요. 오디오 가이드? 비싸고 불편하죠.

---

### [0:10–0:15] 자막 3 — 시칠리아 유적지 장면

> *"What is this? What did it once look like?"*
>
> (한국어) 이건 뭐지? 원래는 어떤 모습이었을까?

---

### [0:20–0:25] 나레이션 — 로고 + 솔루션 소개

> *"This is TimeLens — an AI companion that brings cultural heritage to life through real-time voice, camera recognition, and historical restoration."*
>
> (한국어) 이것이 TimeLens입니다. 실시간 음성, 카메라 인식, 역사적 복원을 통해 문화유산을 생생하게 되살리는 AI 동반자입니다.

---

## ACT 2: 아키텍처 다이어그램 (0:25–0:45)

> 다이어그램 요소가 나레이션 순서에 맞춰 왼쪽에서 오른쪽으로 순차 등장.

### [0:25–0:45] 나레이션

> *"TimeLens uses a dual-pipeline multi-agent architecture.*
> *Pipeline one: Gemini's Live API streams real-time audio and video, with Function Calling orchestrating specialized tools.*
> *Pipeline two: Google ADK powers a multi-agent backend — an Orchestrator routes requests to Curator, Restoration, and Discovery agents, each with dedicated Gemini models.*
> *Deployed on Cloud Run, backed by Firebase and Google Places API."*
>
> (한국어) TimeLens는 듀얼 파이프라인 멀티에이전트 아키텍처를 사용합니다.
> 파이프라인 1: Gemini Live API가 실시간 오디오·비디오를 스트리밍하며, Function Calling이 전문 도구들을 오케스트레이션합니다.
> 파이프라인 2: Google ADK가 멀티에이전트 백엔드를 구동합니다. 오케스트레이터가 Curator, Restoration, Discovery 에이전트로 요청을 라우팅하며, 각 에이전트는 전용 Gemini 모델을 보유합니다.
> Cloud Run에 배포되었으며, Firebase와 Google Places API가 뒷받침합니다.

---

## ACT 3: 라이브 데모 (0:45–2:40)

> **이 섹션이 핵심이다. 반드시 실제 디바이스에서 녹화할 것. 시뮬레이터 사용 금지.**

---

### [0:45–1:10] 온보딩 — 점프컷

> 언어 선택 → 권한 허용 → GPS 박물관 감지 → 세션 연결 순서로 빠른 점프컷 편집.

#### AI 자동 인사 (세션 연결 후 자동 발화)

> *"Welcome to the Louvre Museum! I'm your TimeLens guide. We're in the Denon Wing — home to some of the world's most celebrated sculptures. What would you like to explore today?"*
>
> (한국어) 루브르 박물관에 오신 것을 환영합니다! 저는 TimeLens 가이드입니다. 지금 세계에서 가장 유명한 조각들이 있는 드농 관에 계십니다. 오늘 무엇을 탐험하고 싶으신가요?

#### 나레이션

> *"Getting started takes seconds. TimeLens auto-detects nearby museums using GPS, and Gemini greets you with real-time knowledge about current exhibitions — powered by Google Search grounding."*
>
> (한국어) 시작하는 데 몇 초면 충분합니다. TimeLens가 GPS로 근처 박물관을 자동 감지하고, Gemini가 Google 검색 그라운딩을 통해 현재 전시 정보로 인사를 건넵니다.

---

### [1:10–1:50] 핵심 데모: 음성 대화 + 유물 인식

> 사용자가 태블릿/모니터에 띄운 '사모트라케의 니케' 사진에 카메라를 겨눈다.
> 카메라 캡처 버튼 탭 → 스캔 코너 애니메이션 → 인식 발화.

#### 사용자 대사 (음성)

> *"Oh wow. I see something incredible up ahead. Let me show you."*
>
> (한국어) 와. 저기 믿을 수 없는 게 있어요. 보여드릴게요.

> **⚙️ TRIGGER: `recognize_artifact` — 카메라 캡처 탭과 동시에 발화**

#### AI 응답 (실시간 음성 — Gemini Kore 음성 그대로 사용)

> *"You're looking at the Winged Victory of Samothrace! Created around 190 BC, she's one of the greatest masterpieces of Hellenistic sculpture.*
> *She was originally placed on the prow of a stone ship, celebrating a naval victory.*
> *Notice how her drapery seems to billow in the wind — carved as if she just landed, mid-flight."*
>
> (한국어) 사모트라케의 니케를 보고 계시군요! 기원전 190년경에 제작된 이 작품은 헬레니즘 조각의 최고 걸작 중 하나입니다.
> 원래는 돌로 만든 배의 이물머리에 세워져 해전 승리를 기념했습니다.
> 옷자락이 바람에 휘날리는 것을 보세요. 막 착지하는 순간처럼 조각되었습니다.

> 지식 카드 슬라이드업: **"Winged Victory of Samothrace · 190 BC · Hellenistic Greek"**
> 토픽 칩 등장: **"Naval Victory" | "Missing Parts" | "Original Colors"**

#### 사용자 — "Original Colors" 칩 탭 (음성 없이 탭만)

#### AI 응답 (토픽 탭 후 자동 발화)

> *"Most people don't realize this — she was never meant to be white.*
> *Her wings were painted deep blue and crimson. The drapery had golden highlights.*
> *Standing on that stone ship, she would have blazed with color against the open sky."*
>
> (한국어) 대부분의 사람들이 모르는 사실이 있습니다. 그녀는 원래 흰색이 아니었습니다.
> 날개는 짙은 파랑과 진홍색으로 채색되었고, 옷자락에는 금색 하이라이트가 있었습니다.
> 저 돌배 위에서, 그녀는 열린 하늘을 배경으로 색채의 불꽃처럼 빛났을 것입니다.

#### 나레이션

> *"Voice-first interaction. Gemini's Function Calling returns structured artifact data in real-time, while the conversation flows naturally. Topic chips let users dive deeper with a single tap."*
>
> (한국어) 음성 우선 인터랙션. Gemini의 Function Calling이 실시간으로 구조화된 유물 데이터를 반환하는 동안 대화는 자연스럽게 이어집니다. 토픽 칩으로 한 번의 탭으로 더 깊이 탐구할 수 있습니다.

---

### [1:50–2:30] AI 복원 — 킬러 피처 (클라이맥스)

> 이전 대화에서 자연스럽게 이어진다. 카메라 뷰는 자동으로 닫힌다.

#### 사용자 대사 (음성)

> *"You said she was painted in colors. Can you show me what she originally looked like?"*
>
> (한국어) 채색되어 있었다고 하셨잖아요. 원래 어떤 모습이었는지 보여주실 수 있나요?

> **⚙️ TRIGGER: `generate_restoration` — 복원 요청 트리거**

> 에이전트 인디케이터 전환 애니메이션: 🤖 Curator → 🎨 Restoration
> 프로그레스 바 등장 (스피드 램프 편집: 40% → 100% 2초로 압축)

#### AI 응답 (로딩 중 음성 — 대기 시간을 콘텐츠로 채움)

> *"Around 190 BC, she would have stood over three meters tall on the prow of a warship — head held high, wings spread wide, painted in brilliant blues and golds.*
> *Let me restore her for you..."*
>
> (한국어) 기원전 190년경, 그녀는 군함의 이물머리 위에 3미터가 넘는 키로 서 있었을 것입니다. 고개를 높이 들고, 날개를 활짝 펴고, 짙은 파랑과 황금빛으로 빛나며.
> 복원해 드리겠습니다...

> BeforeAfterSlider 등장 (크로스페이드 400ms)
> **왼쪽: 머리·팔 없는 현재 니케 | 오른쪽: AI가 복원한 완전한 니케 (머리, 양팔, 채색)**

#### 사용자 — 슬라이더 좌우 드래그 (대사 없음, 4–5초 유지)

> **히어로 샷. 슬로우하고 의도적인 움직임. 음악 볼륨 살짝 올리기.**
> 이 장면이 전체 영상의 클라이맥스다.

#### 사용자 — Save 버튼 탭

> 토스트 등장: *"Saved ✓"*

#### 나레이션

> *"The Live API triggers a Function Call, which hands off to the ADK Restoration Agent. Gemini Flash Image generates a historically accurate restoration — and the before-and-after slider creates a tangible time-travel experience."*
>
> (한국어) Live API가 Function Call을 트리거하고, ADK Restoration 에이전트로 넘깁니다. Gemini Flash Image가 역사적으로 정확한 복원 이미지를 생성하며, Before/After 슬라이더가 손으로 만질 수 있는 시간여행 경험을 만들어냅니다.

---

### [2:30–2:40] 주변 발견 (Discovery)

#### 사용자 대사 (음성)

> *"What else can I visit nearby?"*
>
> (한국어) 근처에 또 어디를 가볼 수 있을까요?

> **⚙️ TRIGGER: `discover_nearby` — Discovery 에이전트 전환**

> 주변 문화유산 카드 목록 순차 등장 (거리·도보시간·평점 포함)

#### 나레이션

> *"Google Places API instantly finds walkable cultural heritage within range — with hours, ratings, and walking time."*
>
> (한국어) Google Places API가 주변의 도보 가능한 문화유산을 즉시 찾아냅니다. 운영시간, 평점, 도보 시간까지 함께 제공합니다.

---

## ACT 4: 배포 증거 + 클로징 (2:40–3:20)

---

### [2:40–3:05] Cloud 배포 증거 + 기술 스택

> 화면 1 (8초): Cloud Run 콘솔 — 서비스 실행 중 (리전, 상태, URL 강조)
> 화면 2 (5초): GitHub Actions — CI/CD 성공 화면
> 화면 3 (7초): 핵심 코드 스니펫 빠른 스크롤

#### 나레이션

> *"TimeLens is fully deployed on Google Cloud Run.*
> *Gemini 2.5 Flash with Live API for native audio streaming,*
> *Google ADK with three specialized agents — Curator, Restoration, and Discovery,*
> *Function Calling for real-time tool orchestration,*
> *Google Search grounding for live facts,*
> *Firebase for persistence,*
> *and Next.js 15 with strict TypeScript."*
>
> (한국어) TimeLens는 Google Cloud Run에 완전 배포되어 있습니다.
> 네이티브 오디오 스트리밍을 위한 Gemini 2.5 Flash + Live API,
> 세 개의 전문 에이전트를 갖춘 Google ADK — Curator, Restoration, Discovery,
> 실시간 도구 오케스트레이션을 위한 Function Calling,
> 실시간 사실 검증을 위한 Google Search 그라운딩,
> 데이터 영속성을 위한 Firebase,
> 그리고 Next.js 15와 strict TypeScript입니다.

---

### [3:05–3:15] 비전

#### 나레이션

> *"TimeLens works everywhere cultural heritage lives — inside museums, at outdoor monuments, on ancient streets. In any language. With just your voice and a camera."*
>
> (한국어) TimeLens는 문화유산이 있는 모든 곳에서 동작합니다. 박물관 내부, 야외 기념물, 고대의 거리. 어떤 언어로도. 음성과 카메라만으로.

#### 자막

> *"Any artifact. Any language. Anywhere."*
>
> (한국어) 어떤 유물이든. 어떤 언어로든. 어디서든.

---

### [3:15–3:20] 클로징

> 검은 화면. TimeLens 로고 중앙. 골드 글로우.
> 텍스트 순차 페이드인: TimeLens / Team wigtn / Built with Gemini Live API / Deployed on Google Cloud

#### 나레이션 (느리고 여운 있게)

> *"TimeLens. Where every artifact has a story to tell."*
>
> (한국어) TimeLens. 모든 유물에는 들려줄 이야기가 있습니다.

---

## 녹화 체크리스트

| 항목 | 확인 |
|------|------|
| 실제 모바일 디바이스 사용 (시뮬레이터 금지) | ☐ |
| 니케 사진 태블릿/모니터에 준비 | ☐ |
| 복원 API 사전 테스트 + 쿼터 확인 | ☐ |
| 조용한 방에서 음성 녹화 | ☐ |
| 전체 플로우 3회 이상 사전 리허설 | ☐ |
| 라이브 실패 대비 백업 녹화본 준비 | ☐ |
