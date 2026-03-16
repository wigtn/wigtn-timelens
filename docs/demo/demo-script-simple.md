# TimeLens 라이브 데모 대본 (심플 버전)

> Gemini Live Agent Challenge 2026 | Team wigtn
> 총 러닝타임: **약 2분**
> 대사: 영어 | 제목/해설: 한국어

---

## 트리거 요약

| 기능 | 트리거 | 타임스탬프 |
|------|--------|-----------|
| GPS 박물관 자동 감지 | 앱 오픈 | 0:20 |
| 유물 인식 | 카메라 탭 | 0:35 |
| 토픽 탐색 | "Original Colors" 칩 탭 | 0:50 |
| AI 복원 | *"Can you show me..."* | 1:00 |
| 주변 발견 | *"What else nearby?"* | 1:35 |

---

## 1장: 훅 — 문제 제시 (0:00–0:20)

> *"You're standing in front of a 2,200-year-old statue. No guide. No context. Just silence."*
>
> (한국어) 2,200년 된 조각상 앞에 서 있습니다. 가이드도 없고, 설명도 없고, 그냥 침묵만.

> *"This is TimeLens."*

---

## 2장: GPS 자동 감지 (0:20–0:35)

**⚙️ TRIGGER: 위치 기반 자동 박물관 감지**

> 사용자가 앱을 연다. 세션이 자동 연결되며 AI 인사.

> **AI:** *"Welcome to the Louvre. You're in the Denon Wing — home to Hellenistic sculpture. What would you like to explore?"*
>
> (한국어) 루브르에 오신 걸 환영합니다. 헬레니즘 조각의 드농 관에 계십니다.

---

## 3장: 유물 인식 (0:35–1:00)

**⚙️ TRIGGER: `recognize_artifact` — 카메라로 니케를 스캔**

> **사용자:** *"Let me show you something."* + 카메라 탭
>
> (한국어) 뭔가 보여드릴게요.

> **AI:** *"That's the Winged Victory of Samothrace — 190 BC. She stood on the prow of a warship, celebrating a naval victory. Notice the drapery? Carved as if she just landed, mid-flight."*
>
> (한국어) 사모트라케의 니케입니다. 기원전 190년. 해전 승리를 기념해 군함 이물머리에 세워졌습니다. 옷자락을 보세요. 막 착지하는 순간처럼 조각되었습니다.

> 토픽 칩 등장 → **"Original Colors"** 탭

> **AI:** *"She was never white. Her wings were painted deep blue and crimson, with gold highlights."*
>
> (한국어) 원래 흰색이 아니었습니다. 날개는 짙은 파랑과 진홍, 황금색이었습니다.

---

## 4장: AI 복원 — 킬러 피처 (1:00–1:35)

**⚙️ TRIGGER: `generate_restoration` — 복원 요청**

> **사용자:** *"Can you show me what she originally looked like?"*
>
> (한국어) 원래 모습을 보여주실 수 있나요?

> **AI (로딩 중):** *"Let me restore her for you..."*

> → **Before/After 슬라이더 등장** ← 히어로 샷, 5초 유지
>
> (한국어) 왼쪽: 현재 모습(머리·팔 없음) ↔ 오른쪽: AI 복원(완전한 채색 니케)

---

## 5장: 주변 발견 (1:35–1:50)

**⚙️ TRIGGER: `discover_nearby` — Google Places 연동**

> **사용자:** *"What else can I visit nearby?"*
>
> (한국어) 근처에 또 어디를 가볼 수 있을까요?

> → 주변 문화유산 카드 목록 순차 등장 (거리·도보 시간·평점)

---

## 6장: 클로징 (1:50–2:00)

> *"Any artifact. Any language. Anywhere."*
>
> (한국어) 어떤 유물이든. 어떤 언어로든. 어디서든.

> *"TimeLens — where every artifact has a story to tell."*

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
