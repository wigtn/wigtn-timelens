# TimeLens 팀 빌드 가이드

> 5인 팀이 12일 안에 해커톤 프로젝트를 완성하기 위한 작업 방식 가이드
> 이 문서를 읽지 않고 작업을 시작하지 마세요.

---

## 1. 우리가 만드는 것

**TimeLens** — 박물관 유물에 카메라를 비추면 AI가 실시간 음성으로 해설해주고, 손상된 유물의 원래 모습을 복원해서 보여주는 앱.

**해커톤**: Gemini Live Agent Challenge ($80K+ 상금, 마감 3/16)
**카테고리**: Live Agents (실시간 음성+비전 에이전트)
**기술**: Next.js + Gemini Live API + ADK + GCP

상세 기획은 `docs/prd/timelens-prd-ko.md`를, UI 흐름은 `docs/prd/timelens-ui-flow.md`를 참고.

---

## 2. 왜 이 방식으로 진행하는가

### 문제: 5명이 동시에 코딩하면 생기는 일

해커톤에서 가장 흔한 실패 패턴:

```
Day 1: "각자 파트 나눠서 코딩하자!"
Day 2: A가 만든 타입과 B가 만든 타입이 다름
Day 3: Git 머지 충돌 30개. 해결하는 데 반나절
Day 4: C가 만든 API 응답 형식이 D의 프론트엔드 기대값과 불일치
Day 5: "한번 전체 싹 다 맞추자" — 반나절 회의
Day 6: 맞추고 나니 버그 수십 개
Day 7-8: 버그 수정
Day 9: 겨우 동작하지만 UI가 조잡함
Day 10: 데모 녹화인데 에러가 남
```

**핵심 원인**: 인터페이스를 합의하지 않고 각자 코딩을 시작했기 때문.

### 우리의 접근: "설계 먼저, 구현은 AI에게"

```
Day 1-3: 5명 전원이 설계에 집중
         → 인터페이스 합의, 각 파트 상세 설계 문서 작성
Day 4-10: 1명이 Claude Code 에이전트를 병렬로 돌려서 구현
         → 나머지 4명은 프롬프트 테스트, 블로그, 데모, QA
```

### 왜 이게 더 빠른가

**1) Claude Code는 명세가 명확하면 실수를 안 한다**

사람 5명이 코딩하면 각자의 해석이 다르다. "API 응답에 에러 코드를 넣자"라고 했을 때,
A는 `{ error: "message" }`로, B는 `{ code: 400, message: "..." }`로 구현한다.
Claude Code는 타입 정의를 정확히 주면 그대로 구현한다. 해석의 차이가 없다.

**2) 1명이 돌리면 충돌이 없다**

5명이 동시에 같은 레포에 코드를 쓰면 Git 충돌이 필연적이다.
1명이 순서를 제어하면서 돌리면 충돌이 원천 차단된다.
병렬 실행이 필요한 파트는 파일 경계가 겹치지 않게 Contract에서 미리 나눠놨다.

**3) 설계 시간이 곧 구현 시간을 줄인다**

상세 설계 문서 없이 Claude Code에 "복원 기능 만들어줘"라고 하면:
- 프롬프트 형식을 물어봄 → 대답 → 다시 시작
- API 응답 형식을 물어봄 → 대답 → 다시 수정
- UI를 물어봄 → 대답 → 다시 고침
- 결과: 3시간에 5번의 반복

설계 문서가 있으면:
- "이 설계 문서대로 구현해줘" → 한 번에 완성
- 결과: 30분에 1번

**4) 5명의 전문성을 설계에 집중시킨다**

코딩은 AI가 더 빠르다. 하지만 "어떤 프롬프트가 좋은 복원 이미지를 만드는가",
"어떤 UX 흐름이 자연스러운가", "어떤 시스템 프롬프트가 좋은 도슨트 페르소나를 만드는가"는
사람의 판단이 필요하다. 5명이 코딩 대신 이런 판단에 집중하면 결과물 품질이 올라간다.

---

## 3. 공유 계약(Shared Contract)이 뭔가

`shared-contract.md` 파일은 **5개 파트 사이의 모든 연결 지점을 TypeScript 타입으로 확정한 문서**다.

비유하자면:

- 건물 설계도 없이 "너는 1층, 나는 2층 만들어"라고 하면 → 계단 위치가 안 맞음
- 설계도에 "계단은 여기, 배관은 여기"를 확정하면 → 각자 만들어도 합쳐짐

이 Contract가 확정하는 것:

| 무엇을 | 왜 |
|---|---|
| **이벤트 인터페이스** (Part 1→2) | 코어가 "유물 인식됨"을 알릴 때 어떤 데이터를 보내는지 합의 |
| **REST API 스키마** (Part 1↔3,4) | `/api/restore` 에 뭘 보내고 뭘 받는지 합의 |
| **컴포넌트 Props** (Part 2,3,4) | 슬라이더 컴포넌트에 어떤 데이터를 넘기는지 합의 |
| **Firestore 모델** (Part 5→전체) | DB에 뭘 저장하는지 합의 |
| **파일 소유권** (전체) | 누가 어떤 파일을 만드는지 합의 → 충돌 원천 차단 |

**한 마디로: 각자의 "입력"과 "출력"이 뭔지 미리 정하는 것.**

이걸 정하지 않으면, 구현 중에 "너 이거 이렇게 만들어줬어야 하는데?"라는 대화가 반복된다.
이걸 정하면, 각자 자기 파트만 보고 독립적으로 작업할 수 있다.

---

## 4. 5명의 역할

### 설계 단계 (Day 1-3): 전원 설계 문서 작성

| 파트 | 담당 | 핵심 산출물 | 왜 이 파트가 중요한가 |
|---|---|---|---|
| **Part 1: 코어 파이프라인** | Person 1 | Live API 연결, 오디오, 카메라, WebSocket | 모든 기능의 기반. 이게 안 되면 아무것도 안 됨 |
| **Part 2: Curator + UI** | Person 2 | 메인 화면, 지식 패널, 에이전트 UI | 사용자가 보는 전부. 데모 품질을 결정 |
| **Part 3: Restoration + UI** | Person 3 | 이미지 생성 프롬프트, Before/After 슬라이더 | **킬러 피처**. 심사위원이 기억하는 장면 |
| **Part 4: Discovery + Diary** | Person 4 | 주변 탐색, 다이어리 생성 | Gemini 기능 커버리지를 높이는 파트 |
| **Part 5: 인프라 + 보너스** | Person 5 | GCP, Firebase, CI/CD, 블로그, 데모 | +1.0 보너스 포인트 + 데모 품질 담당 |

각 파트의 설계 문서가 포함해야 하는 것:

```
1. 담당 파일 목록 (Contract의 파일 소유권 매트릭스 참조)
2. 각 파일이 하는 일 (함수 시그니처, 로직 흐름)
3. 다른 파트에서 받는 입력 (Contract의 어떤 타입을 쓰는지)
4. 다른 파트에 보내는 출력 (Contract의 어떤 타입을 반환하는지)
5. 에러 시나리오와 대응
6. Claude Code에게 줄 구체적 지시사항
```

**중요**: "Claude Code가 혼자 읽고 구현할 수 있는 수준"이 기준.
"대충 이렇게 해" 수준이 아니라, "이 함수는 이 파라미터를 받아서 이 로직으로 처리하고 이 값을 반환한다" 수준.

### 구현 단계 (Day 4-10): 역할 전환

| 역할 | 담당 | 하는 일 |
|---|---|---|
| **빌드 오퍼레이터** | 1명 | Claude Code를 돌려서 구현. 설계 문서를 넣고, 결과를 확인하고, 머지 |
| **프롬프트 엔지니어** | 1명 | Curator 시스템 프롬프트 + Restoration 프롬프트를 Gemini API에서 직접 테스트/튜닝 |
| **QA + 통합 테스트** | 1명 | 구현된 기능을 실제 디바이스에서 테스트. 버그 리포트 |
| **데모 + 콘텐츠** | 1명 | 데모 영상 기획, 블로그 작성 (보너스 +0.6), GDG 가입 (보너스 +0.2) |
| **유동적 지원** | 1명 | 병목이 생기는 곳 지원. 프롬프트 테스트, 추가 QA, 아키텍처 다이어그램 제작 등 |

---

## 5. 타임라인

```
3/4  (오늘)  Contract 완성, 팀 전체 리뷰
3/5  (Day 1) Contract 최종 확정. 각자 설계 문서 작성 시작
3/6  (Day 2) 설계 문서 작성 계속. 중간 체크 (인터페이스 불일치 확인)
3/7  (Day 3) 설계 문서 완성 + 상호 리뷰. Person 5가 스캐폴드 셋업
             GCP 프로젝트 생성, Next.js 초기화, Firebase 셋업
─────────────────── 설계 완료선 ───────────────────
3/8  (Day 4) Part 1 (코어) 구현 시작 — 가장 우선순위 높음
3/9  (Day 5) Part 1 완성. Part 2/3/4 병렬 구현 시작
3/10 (Day 6) Part 2/3/4 구현 계속. 프롬프트 튜닝 병행
3/11 (Day 7) Part 2/3/4 완성. Part 5 인프라 통합
3/12 (Day 8) 전체 통합 + 버그 수정
3/13 (Day 9) 데모 리허설 + 녹화. 블로그 발행
3/14 (Day 10) 데모 최종 녹화. Devpost 제출 준비
3/15 (버퍼)  최종 점검 + 제출
3/16 (마감)  5:00 PM PT 전 Devpost 제출
```

---

## 6. 구현 단계에서 Claude Code를 돌리는 방법

빌드 오퍼레이터가 실제로 하는 일:

### Step 1: Part 5 (스캐폴드) — 기반 생성

```
Claude Code에게:
"이 설계 문서(part5-infra-devops.md)와 공유 계약(shared-contract.md)을 읽고,
Next.js 프로젝트를 초기화해줘. 타입 파일들, Firebase 설정, Dockerfile,
cloudbuild.yaml, shadcn/ui 컴포넌트를 셋업해줘."
```

결과: 빈 프로젝트지만 타입과 인프라가 모두 잡혀 있는 상태.

### Step 2: Part 1 (코어) — 파이프라인 구축

```
Claude Code에게:
"이 설계 문서(part1-core-pipeline.md)를 읽고 구현해줘.
shared-contract.md의 타입을 그대로 사용하고,
src/types/에 이미 정의된 타입을 import해서 써."
```

결과: Live API 연결, 오디오, 카메라, WebSocket이 동작하는 상태.
      useLiveSession 훅이 Contract의 인터페이스대로 이벤트를 발생시킴.

### Step 3: Part 2/3/4 — 병렬 구현

Part 1이 완성되었으므로, Part 2/3/4는 **파일이 겹치지 않아서** 동시에 돌릴 수 있다.

```bash
# 방법 A: Git Worktree로 분리 (추천)
git worktree add ../timelens-part2 -b feat/curator-ui
git worktree add ../timelens-part3 -b feat/restoration
git worktree add ../timelens-part4 -b feat/discovery-diary

# 각 worktree에서 별도 Claude Code 세션 실행
# 완료 후 순차적으로 main에 머지

# 방법 B: 같은 디렉토리에서 순차 실행
# (충돌 없음 — 파일 소유권이 겹치지 않으므로)
```

### Step 4: 통합

모든 파트가 같은 Contract 타입을 사용했으므로, 머지 시 타입 에러가 없어야 한다.
만약 있다면 → Contract 위반 → 해당 파트 수정.

---

## 7. 각 파트의 설계 문서 작성 가이드

설계 문서의 목적은 **"Claude Code에게 줄 명세서"**다.
사람이 읽기 좋은 문서가 아니라, AI가 읽고 바로 코드를 쓸 수 있는 문서여야 한다.

### 좋은 설계 문서 예시

```markdown
## capture.ts — 마이크 오디오 캡처

### 역할
브라우저 마이크에서 오디오를 캡처하여 PCM 16-bit 16kHz mono로 인코딩,
100ms 단위 청크로 base64 변환하여 콜백으로 전달.

### 함수 시그니처
export function createAudioCapture(onChunk: (base64: string) => void): AudioCapture

interface AudioCapture {
  start(): Promise<void>;    // 마이크 권한 요청 + 캡처 시작
  stop(): void;              // 캡처 중단 + 스트림 해제
  getLevel(): number;        // 현재 볼륨 레벨 0-1
}

### 구현 상세
1. navigator.mediaDevices.getUserMedia({ audio: true })로 스트림 획득
2. AudioContext 생성 (sampleRate: 16000)
3. MediaStreamSource → ScriptProcessorNode (bufferSize: 4096)
4. Float32Array → Int16Array 변환 (PCM 16-bit)
5. 100ms 분량 (1600 샘플) 모일 때마다:
   - Int16Array → ArrayBuffer → base64 인코딩
   - onChunk(base64) 콜백 호출
6. AnalyserNode으로 실시간 볼륨 레벨 계산 (getLevel용)

### 에러 핸들링
- 마이크 권한 거부: NotAllowedError → start()가 reject
- 마이크 없음: NotFoundError → start()가 reject
- AudioContext 생성 실패: catch → fallback 없음, 에러 전파

### 의존성
- 없음 (Web API만 사용)

### 테스트 방법
- start() 호출 후 onChunk가 100ms 간격으로 호출되는지 확인
- base64 디코딩 시 Int16Array 길이가 1600인지 확인
```

### 나쁜 설계 문서 예시

```markdown
## 오디오 캡처

마이크에서 오디오를 캡처합니다. Web Audio API를 사용하면 됩니다.
PCM으로 인코딩해서 WebSocket으로 보내면 됩니다.
```

이 수준으로는 Claude Code가 샘플레이트를 몇으로 할지, 청크 크기를 몇으로 할지,
콜백 형태를 어떻게 할지 모두 "추측"해야 한다. 추측은 Contract와 불일치를 만든다.

---

## 8. 보너스 포인트 전략

심사 점수가 5점 만점인데, 보너스로 최대 +1.0점을 받을 수 있다.
경쟁자 대부분은 이걸 모르거나 챙기지 않는다. **우리는 전부 챙긴다.**

| 보너스 | 점수 | 담당 | 난이도 | 마감 |
|---|---|---|---|---|
| **블로그/영상** | +0.6 | Person 5 (데모 담당) | 중 | 제출일 전 발행 |
| **IaC 자동 배포** | +0.2 | Person 5 (인프라 담당) | 하 | cloudbuild.yaml 이미 계획됨 |
| **GDG 가입** | +0.2 | 아무나 1명 | 하 | 가입 후 프로필 링크 제출 |

### 블로그 작성 가이드 (+0.6)

- 플랫폼: Dev.to 또는 Medium (공개)
- 필수 태그: `#GeminiLiveAgentChallenge`
- 필수 문구: "이 프로젝트는 Gemini Live Agent Challenge를 위해 만들어졌습니다"
- 내용: 빌드 과정, 기술적 결정, Gemini API 사용 경험
- 분량: 1,000-2,000단어면 충분
- **작성 시점**: 구현이 50% 이상 진행되었을 때 시작, 제출 전 발행

### GDG 가입 (+0.2)

- https://gdg.community.dev 에서 가장 가까운 GDG 가입
- 프로필을 공개로 설정
- Devpost 제출 시 프로필 링크 포함

---

## 9. 체크리스트

### 지금 당장 할 것 (Day 0)

- [ ] 이 문서를 전원이 읽었다
- [ ] `shared-contract.md`를 전원이 읽었다
- [ ] PRD (`timelens-prd-ko.md`)를 전원이 읽었다
- [ ] UI Flow (`timelens-ui-flow.md`)를 전원이 읽었다
- [ ] 파트 담당자가 확정되었다
- [ ] GDG 가입할 사람이 정해졌다

### Day 1-3 종료 시점에 확인할 것

- [ ] 5개 설계 문서가 `docs/design/` 에 모두 있다
- [ ] 모든 설계 문서가 Contract의 타입을 정확히 참조한다
- [ ] 파트 간 인터페이스가 일치한다 (상호 리뷰 완료)
- [ ] Person 5가 GCP 프로젝트 + Next.js 스캐폴드를 완료했다
- [ ] GDG 가입이 완료되었다

### 제출 전 최종 확인

- [ ] 데모 영상 4분 이내, YouTube 공개 업로드, 영어
- [ ] GitHub 레포 공개, README에 셋업 가이드
- [ ] Cloud Run에 배포 완료, URL 접근 가능
- [ ] GCP 콘솔 스크린샷 또는 배포 증명 영상
- [ ] 아키텍처 다이어그램 (SVG/PNG)
- [ ] Devpost 텍스트 설명 작성
- [ ] 블로그 발행 완료 (보너스 +0.6)
- [ ] cloudbuild.yaml이 레포에 포함 (보너스 +0.2)
- [ ] GDG 프로필 링크 포함 (보너스 +0.2)

---

## 10. 문서 구조

```
docs/
├── prd/
│   ├── timelens-prd.md              ← 영문 PRD (제출용)
│   ├── timelens-prd-ko.md           ← 한글 PRD (팀 내부용)
│   └── timelens-ui-flow.md          ← UI 흐름 + ASCII 목업
├── contracts/
│   ├── README.md                    ← 이 문서 (작업 방식 가이드)
│   └── shared-contract.md           ← 공유 계약 (타입 정의)
└── design/                          ← 각 파트 설계 문서 (Day 1-3에 작성)
    ├── part1-core-pipeline.md
    ├── part2-curator-ui.md
    ├── part3-restoration.md
    ├── part4-discovery-diary.md
    └── part5-infra-devops.md
```
