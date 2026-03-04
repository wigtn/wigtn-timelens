# TimeLens PRD - AI 문화유산 컴패니언

> **해커톤**: Gemini Live Agent Challenge ($80K+ 상금)
> **마감**: 2026년 3월 16일 오후 5:00 PT
> **카테고리**: Live Agents (+ Grand Prize 타겟)
> **버전**: 1.1
> **최종 수정**: 2026-03-04

---

## 계약 문서 (Contract Documents)

> 각 섹션 구현 시, **반드시 해당 계약 파일을 참조**하여 정확한 TypeScript 인터페이스, API 시그니처, SDK 사용 패턴을 확인하세요.

| 문서 | 경로 | 용도 |
|---|---|---|
| **공유 계약** | [`docs/contracts/shared-contract.md`](../contracts/shared-contract.md) | 5개 파트 간 모든 TypeScript 인터페이스 (타입, Props, Hooks, 프로토콜, 모델) |
| **Gemini SDK 레퍼런스** | [`docs/contracts/gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) | Live API, Image Gen, ADK, Places API의 정확한 SDK import/method/config/model ID |
| **팀 빌드 가이드** | [`docs/contracts/README.md`](../contracts/README.md) | 팀 워크플로우, 병렬 빌드 실행 방법, 설계 문서 체크리스트 |
| **UI 플로우 & 시나리오** | [`docs/prd/timelens-ui-flow.md`](./timelens-ui-flow.md) | ASCII 목업, 화면 전환, Knowledge Panel 상태, 애니메이션 스펙 |

---

## 목차

1. [개요](#1-개요)
2. [사용자 스토리](#2-사용자-스토리)
3. [인수 기준](#3-인수-기준)
4. [기능 요구사항](#4-기능-요구사항)
5. [비기능 요구사항](#5-비기능-요구사항)
6. [기술 아키텍처](#6-기술-아키텍처)
7. [구현 단계](#7-구현-단계)
8. [해커톤 제출 매핑](#8-해커톤-제출-매핑)
9. [데모 스크립트](#9-데모-스크립트)
10. [리스크 평가](#10-리스크-평가)
11. [부록](#11-부록)

---

## 1. 개요

### 1.1 문제 정의

박물관에는 인류 최고의 보물이 있다 — 그런데 관람 경험은 근본적으로 망가져 있다. 관광객이 3,000년 된 이집트 석관 앞에 서서, 50자짜리 안내판을 읽고, 그냥 지나간다. 학생이 금 간 그리스 도자기를 바라보지만, 온전한 모습을 상상할 수 없다. *보는 것*과 *이해하는 것* 사이의 간극은 거대하다:

- **정보 접근 격차**: 박물관 방문객의 73%가 전시물의 역사적 의미를 이해하지 못한 채 떠난다 (AAM Survey 2024). 안내판은 너무 짧고, 오디오 가이드는 경직되고 구식이다
- **오디오 가이드의 선형성 문제**: 기존 오디오 가이드는 처음부터 끝까지 순서대로 모든 내용을 들어야 한다. "이거 언제 만들어졌지?"라는 단순한 궁금증 하나를 위해 3분짜리 해설을 전부 들어야 하는 것이다. 텍스트는 훑어볼 수 있지만 음성은 불가능하다 — 핵심만 빠르게 확인할 방법이 없다
- **상상력 격차**: 깨진 유물, 색바랜 그림, 손상된 조각상 — 방문객은 이 보물들이 새것이었을 때 어떤 모습이었는지 상상할 수 없다. 깨진 도자기 파편은 한때 화려한 의식용 그릇이었고, 풍화된 대리석 조각상은 한때 선명한 색으로 칠해져 있었다
- **맥락 격차**: 유물은 고립된 상태로 전시된다. 방문객은 눈앞의 물건 뒤에 숨은 문명, 일상생활, 이야기를 이해하지 못한다
- **발견 격차**: 주변의 박물관과 문화유산이 눈에 띄지 않는다; 방문객은 반경 1km 내 유산의 60%를 놓친다
- **기억 격차**: 경험은 몇 주 안에 희미해진다; 유리 진열장 사진에는 서사적 맥락이 없다

### 1.2 솔루션

**TimeLens**는 AI 기반 박물관 및 문화유산 컴패니언으로, 수동적 관람을 인터랙티브하고 다감각적인 탐험으로 전환한다. Gemini의 최첨단 AI 기능을 활용하여 다음을 제공한다:

1. **실시간 AI 큐레이터** — 박물관 유물, 회화, 조각상에 카메라를 향하면, 세계 최고 수준 박물관 도슨트의 깊이를 가진 즉각적인 음성 해설 제공. 단순 음성만이 아닌, 채팅 형태의 **인터랙티브 지식 패널**로 핵심 정보를 시각적으로 즉시 확인 가능 — 3분 듣지 않아도 "시대, 용도, 핵심 포인트"를 3초 만에 파악
2. **유물 복원** — 손상되거나 깨지거나 색바랜 유물을 AI 생성 이미지로 원래 상태로 복원, 인터랙티브 Before/After 비교 (깨진 도자기 → 온전한 그릇, 색바랜 프레스코 → 선명한 원작)
3. **주변 발견** — GPS 기반 주변 박물관 및 문화유산 탐색
4. **박물관 다이어리** — 전시 사진, AI 인사이트, 복원된 유물 이미지를 결합한 자동 생성 삽화 저널

### 1.3 가치 제안

| 이해관계자 | 가치 |
|---|---|
| **박물관 방문객** | 모든 유물이 대화가 된다 — 어떤 언어로든 무엇이든 질문하고, 시각적 복원과 함께 즉각적인 전문가급 답변을 받는다 |
| **교육자** | 시각적 + 대화형 AI를 통한 교실 수준의 역사 콘텐츠; 학생들에게 유물이 새것이었을 때의 모습을 보여줄 수 있다 |
| **박물관** | 인프라 투자 없이 방문객 참여도와 체류 시간 증가; 기존 전시 라벨과 함께 작동 |
| **해커톤 심사위원** | 9개 Gemini 기능을 하나의 일관된 프로덕션 품질 에이전트 시스템에서 시연 |

### 1.4 경쟁 분석

| 경쟁사 | 접근 방식 | 약점 | TimeLens 우위 |
|---|---|---|---|
| Google Arts & Culture | 사전 큐레이팅 콘텐츠 | 실시간 상호작용 없음, 사용자 카메라 입력 없음, 제휴 박물관에 한정 | 어떤 박물관에서든 실시간 비전 + 음성 대화 |
| Smartify | QR/바코드 스캔 | 박물관 제휴 필요, 라벨링된 전시물에만 작동 | 어떤 유물에든 작동, 박물관 셋업 불필요 |
| ChatGPT + 카메라 | 사진 업로드 + 텍스트 채팅 | 스트리밍 없음, 높은 지연, 음성 없음, 유물 복원 없음 | 1초 이내 음성 응답 + 유물 복원 이미지 |
| 전통적 오디오 가이드 | 사전 녹음 해설 | 고정 스크립트, 후속 질문 불가, 시각적 보강 없음, **핵심만 빠르게 확인 불가 — 처음부터 끝까지 전부 청취해야 함** | 인터럽트 가능한 동적 대화 + 시각적 유물 복원 + **채팅형 지식 패널로 핵심 정보 즉시 텍스트 확인** |
| **경쟁사 없음** | 유물 복원 | 손상된 유물을 실시간으로 시각적 복원하는 기존 제품 없음 | **유일무이: 깨진 → 완전, 색바랜 → 선명 (AI 이미지 생성)** |

### 1.5 카테고리 전략: Live Agents + Grand Prize

TimeLens는 **"Live Agents"** 카테고리 (실시간 오디오/비전 인터랙션 + 자연스러운 인터럽트 핸들링)에 제출하면서, Grand Prize (전체 최고 점수)를 동시에 노린다.

**심사 기준 정렬** (공식 규칙 실제 배점):

| 기준 | 배점 | TimeLens 강점 |
|---|---|---|
| **Innovation & Multimodal UX** | **40%** | 음성 + 비전 + 이미지 생성 + 인터럽트 + 지식 패널 — "텍스트 박스" 패러다임을 완전히 탈피 |
| **Technical Implementation & Agent Architecture** | **30%** | ADK 멀티에이전트 (4 전문가 + 오케스트레이터), 듀얼 파이프라인, Function Calling Bridge, GCP Cloud Run |
| **Demo & Presentation** | **30%** | Before/After 슬라이더 "킬러 모먼트", 명확한 문제→솔루션 스토리, 아키텍처 다이어그램, 라이브 배포 증명 |

**Live Agents 카테고리 세부 평가 포인트**:
- 인터럽트를 자연스럽게 처리 → FR-04 음성 인터럽트 (500ms 응답)
- 뚜렷한 페르소나 → Curator Agent의 열정적 박물관 도슨트
- 에이전트가 "보고, 듣고, 말하는" 것이 매끄러움 → 카메라 + 마이크 + 오디오 출력 풀커버

**보너스 포인트 전략** (5점 만점 위에 최대 +1.0점 추가):

| 보너스 | 최대 점수 | 계획 |
|---|---|---|
| 콘텐츠 발행 (블로그/팟캐스트/영상, 공개 플랫폼, `#GeminiLiveAgentChallenge` 태그) | +0.6 | Dev.to 또는 Medium에 빌드 과정 문서 작성 |
| 자동화 클라우드 배포 (IaC, 공개 레포에 포함) | +0.2 | `cloudbuild.yaml` + 배포 스크립트 이미 계획됨 |
| GDG 멤버십 (활성 멤버 + 공개 프로필 링크) | +0.2 | 팀원이 제출 전 GDG 가입 |

---

## 2. 사용자 스토리

### 2.1 페르소나: 박물관 방문객 (Primary)

> *"대영박물관에서 로제타 스톤 앞에 서 있다. 안내판은 거의 아무것도 알려주지 않는다. 내가 정말로 무엇을 보고 있는지 이해하고 싶다."*

| ID | 사용자 스토리 | 우선순위 |
|---|---|---|
| US-01 | 박물관 방문객으로서, 박물관 유물에 폰을 향하면 즉각적인 음성 설명을 받고 싶다 — 작은 안내판을 읽지 않아도 되도록 | P0 |
| US-02 | 박물관 방문객으로서, 해설 중간에 후속 질문(인터럽트)을 하고 싶다. "이건 뭐에 쓰이던 거예요?" "이게 얼마나 오래된 거예요?" 같은 호기심을 탐구할 수 있도록 | P0 |
| US-12 | 박물관 방문객으로서, 오디오 가이드를 처음부터 끝까지 다 듣지 않고도 **핵심 정보(시대, 용도, 중요성)를 텍스트로 즉시 확인**하고 싶다 — 궁금한 부분만 골라서 더 깊이 대화할 수 있도록 | P0 |
| US-03 | 박물관 방문객으로서, 손상되거나 불완전한 유물이 새것이었을 때의 모습을 보고 싶다 (예: 깨진 도자기 → 온전한 그릇, 색바랜 그림 → 원래 색상, 머리 없는 조각상 → 전신) | P0 |
| US-04 | 박물관 방문객으로서, 놓칠 뻔한 주변 박물관과 문화유산을 발견하고 싶다 — 여행을 최대한 활용하기 위해 | P1 |
| US-05 | 박물관 방문객으로서, 유물 사진과 AI 인사이트로 자동 생성된 박물관 다이어리를 받고 싶다 — 경험을 공유하고 기억하기 위해 | P1 |
| US-06 | 박물관 방문객으로서, AI가 내가 선호하는 언어로 말해주길 원한다 — 어느 나라 박물관에서든 전시물을 이해할 수 있도록 | P0 |
| US-10 | 박물관 방문객으로서, 유물 뒤의 문화적 맥락을 이해하고 싶다 — 누가 만들었는지, 일상에서 어떻게 사용했는지, 어떤 문명에 속했는지 | P0 |
| US-11 | 박물관 방문객으로서, 시대별 유물을 자연스러운 대화로 비교하고 싶다 (예: "이 그리스 도자기는 로마 것과 어떻게 달라요?") | P1 |

### 2.2 페르소나: 교육자

> *"역사 선생님으로서 가상 현장학습을 준비 중이다. 수업에 사용할 정확하고 흥미로운 콘텐츠가 필요하다."*

| ID | 사용자 스토리 | 우선순위 |
|---|---|---|
| US-07 | 교육자로서, 유물 이미지를 업로드하면 상세한 역사적 맥락을 받아 수업 자료를 만들고 싶다 | P1 |
| US-08 | 교육자로서, 검색 결과로 검증된 AI 정보를 원한다 — 교육용으로 정확성을 신뢰할 수 있도록 | P0 |
| US-09 | 교육자로서, 유물 복원 이미지로 학생들에게 고대 유물이 만들어졌을 때의 모습을 보여주고 싶다 — 현재의 손상된 상태만이 아니라 | P1 |

---

## 3. 인수 기준

### 3.1 BDD 시나리오

```gherkin
Feature: 실시간 박물관 유물 인식 및 탐험

  Scenario: 사용자가 박물관 유물에 카메라를 향한다
    Given 사용자가 카메라와 마이크 권한을 허용했다
    And Live API WebSocket 연결이 수립되었다
    When 사용자가 박물관 진열장의 그리스 암포라에 카메라를 향한다
    Then Curator Agent가 3초 이내에 유물을 식별한다
    And 유물의 기원, 시대, 제작 기법, 문화적 의미에 대한 음성 해설을 시작한다
    And 해설은 Google 검색 결과로 근거가 확보된다

  Scenario: 사용자가 해설 중간에 후속 질문을 한다
    Given Curator Agent가 전시된 유물에 대해 해설 중이다
    When 사용자가 "이게 실제 일상에서 어떻게 사용됐어요?"라고 끼어든다
    Then 에이전트가 500ms 이내에 현재 해설을 중단한다
    And 문화적 맥락이 풍부한 후속 질문 응답을 한다
    And 원래 유물에 대한 맥락적 인식을 유지한다

  Scenario: 사용자가 핵심 정보만 빠르게 확인한다 (인터랙티브 지식 패널)
    Given 사용자가 박물관 유물에 카메라를 향하고 있다
    And Curator Agent가 유물을 식별했다
    Then UI에 요약 카드가 즉시 표시된다 (이름, 시대, 한줄 핵심 설명)
    And 음성 해설이 동시에 시작되지만, 사용자는 텍스트만으로도 핵심 정보를 3초 이내에 파악할 수 있다
    When 사용자가 요약 카드의 "용도" 항목을 탭한다
    Then 해당 주제에 대한 상세 설명이 채팅 형태로 확장된다
    And 사용자는 오디오를 듣지 않고도 텍스트만으로 원하는 깊이의 정보를 탐색할 수 있다

  Scenario: 사용자가 유물 복원을 요청한다
    Given 사용자가 손상된 유물을 카메라로 보고 있다
    When 사용자가 "이거 새것이었을 때 어떤 모습이었는지 보여줘"라고 말한다
    Then Orchestrator가 Restoration Agent로 라우팅한다
    And Restoration Agent가 10초 이내에 복원된 이미지를 생성한다
    And UI가 Before/After 슬라이더 비교를 표시한다
    Examples:
      | 현재 상태                    | 복원된 상태                                  |
      | 금 간 그리스 도자기          | 원래 채색 문양이 있는 온전한 그릇             |
      | 머리 없는 대리석 조각상      | 원래 다색 채색이 있는 전신                    |
      | 색바랜 르네상스 프레스코     | 선명한 원래 색상과 디테일                     |
      | 부식된 청동 유물             | 원래 표면 처리가 빛나는 청동                  |
      | 파편화된 모자이크 바닥       | 전체 패턴이 완성된 모자이크                   |

  Scenario: 사용자가 야외 기념물에 카메라를 향한다
    Given 사용자가 박물관 밖 유산 현장 근처에 있다
    When 사용자가 역사적 건물이나 유적에 카메라를 향한다
    Then Curator Agent가 3초 이내에 건축물을 식별한다
    And 해당 현장에 대한 역사적 맥락을 제공한다
    And 사용자가 원래 상태를 보기 위한 시간 복원을 요청할 수 있다

  Scenario: 주변 박물관 및 유산 발견
    Given 사용자가 위치 권한을 허용했다
    When 사용자가 "근처에 다른 박물관이나 유적지 있어?"라고 말한다
    Then Discovery Agent가 Google Places API를 쿼리한다
    And 2km 이내 최대 5개 박물관 및 문화유산을 반환한다
    And 각 결과에 거리, 간단한 설명, 도보 시간이 포함된다

  Scenario: 박물관 다이어리 생성
    Given 사용자가 현재 세션에서 최소 3개 유물을 관람했다
    When 사용자가 "내 박물관 다이어리 만들어줘"라고 말한다
    Then Diary Agent가 인터리브된 텍스트 + 이미지 저널을 생성한다
    And 관람한 각 유물에 대한 AI 생성 요약이 포함된다
    And 유물당 최소 하나의 AI 복원 삽화가 포함된다
    And 박물관 관람 순서대로 항목이 정리된다

  Scenario: 타임아웃 후 세션 재연결
    Given 사용자의 Live API 세션이 15분간 유휴 상태였다
    When 세션이 타임아웃되고 사용자가 돌아온다
    Then 시스템이 자동으로 WebSocket 연결을 재수립한다
    And Firestore에서 대화 맥락을 복원한다
    And 사용자가 유물 탐험을 끊김 없이 계속할 수 있다
```

---

## 4. 기능 요구사항

### 4.1 P0 - 필수 (데모용 MVP)

| ID | 요구사항 | 사용되는 Gemini 기능 |
|---|---|---|
| FR-01 | **실시간 음성 대화**: Gemini Live API를 통한 사용자와 Curator Agent 간 양방향 오디오 스트리밍 | Live API, Native Audio |
| FR-01a | **인터랙티브 지식 패널**: 음성 해설과 동시에 채팅 형태의 텍스트 UI로 핵심 정보를 시각적으로 표시. 유물 인식 즉시 **요약 카드**(이름, 시대, 한줄 설명)를 먼저 보여주고, 사용자가 궁금한 항목을 탭하거나 질문하면 해당 주제만 깊이 있게 확장. 오디오 가이드의 선형성 문제를 해결하여 사용자가 원하는 정보에 비선형적으로 접근 가능 | Live API, Native Audio |
| FR-02 | **실시간 비전 인식**: 박물관 유물 식별(도자기, 조각, 회화, 무기, 장신구, 비문, 직물)과 야외 기념물 인식을 위한 연속 카메라 프레임 분석 | Live API, Vision |
| FR-03 | **검색 그라운딩**: 모든 사실적 응답을 Google 검색으로 정확도 검증 | Google Search Grounding |
| FR-04 | **음성 인터럽트**: 사용자가 AI 해설 중 언제든 끼어들 수 있음; 에이전트가 500ms 이내에 새 입력에 응답 | Live API |
| FR-05 | **유물 복원 & 시간 복원**: 손상된 유물을 원래 상태로 복원한 Before/After 이미지 생성 (깨진 도자기 → 온전, 색바랜 그림 → 선명, 폐허 → 원래 건축물) | Image Generation |
| FR-06 | **Before/After UI 슬라이더**: 시간 복원 이미지를 위한 인터랙티브 비교 슬라이더 | - |
| FR-07 | **멀티에이전트 오케스트레이션**: Orchestrator가 사용자 의도를 적절한 전문 에이전트로 라우팅 | ADK Multi-Agent |
| FR-08 | **세션 재연결**: 타임아웃 후 맥락 보존과 함께 WebSocket 자동 재연결 | Session Resumption |
| FR-09 | **다국어 지원**: AI가 사용자의 감지된 또는 선택된 언어로 응답 | Native Audio |

> **📋 계약 참조 — P0 요구사항**
>
> | FR | 계약 파일 | 섹션 |
> |---|---|---|
> | FR-01, FR-04, FR-08 | [`shared-contract.md`](../contracts/shared-contract.md) | §B. Part 1↔2 Live Session Contract (`LiveSessionEvents`, `LiveSessionControls`, `UseLiveSessionReturn`) |
> | FR-01, FR-04, FR-08 | [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) | §2. Gemini Live API (Session connect, `sendRealtimeInput`, VAD, Session Resumption) |
> | FR-01a | [`shared-contract.md`](../contracts/shared-contract.md) | §H. Component Props (`KnowledgePanelProps`, `TranscriptProps`) |
> | FR-02 | [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) | §2.3 `sendRealtimeInput()` — 비디오 프레임 (JPEG 1fps) |
> | FR-03 | [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) | §6. Google Search Grounding (`GOOGLE_SEARCH` 단독 사용 제약) |
> | FR-05 | [`shared-contract.md`](../contracts/shared-contract.md) | §C. Part 1↔3 Restoration Contract (`RestorationRequest`, `RestorationResponse`) |
> | FR-05 | [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) | §3. Gemini Image Generation (`generateContent`, 이미지 편집) |
> | FR-06 | [`shared-contract.md`](../contracts/shared-contract.md) | §H. Component Props (`BeforeAfterSliderProps`) |
> | FR-07 | [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) | §4. Google ADK (`LlmAgent`, `subAgents`, `FunctionTool`) |
> | FR-09 | [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) | §2.6 사용 가능한 음성 (30개 HD 음성, 다국어) |

### 4.2 P1 - 권장

| ID | 요구사항 | 사용되는 Gemini 기능 |
|---|---|---|
| FR-10 | **GPS 주변 발견**: 설정 가능한 반경 내 주변 박물관 및 문화유산 검색 | Google Search Grounding |
| FR-11 | **박물관 다이어리 생성**: 인터리브된 텍스트 + 복원된 유물 이미지가 포함된 박물관 방문 다이어리 자동 생성 | Interleaved Output, Image Generation |
| FR-12 | **컨텍스트 윈도우 압축**: 긴 대화 기록을 압축하여 세션 지속 시간 연장 | Context Window Compression |
| FR-13 | **방문 기록**: 방문한 유적지와 대화를 Firestore에 저장 | - |
| FR-14 | **다이어리 공유**: 다이어리를 공유 가능한 링크 또는 PDF로 내보내기 | - |

> **📋 계약 참조 — P1 요구사항**
>
> | FR | 계약 파일 | 섹션 |
> |---|---|---|
> | FR-10 | [`shared-contract.md`](../contracts/shared-contract.md) | §D. Part 1↔4 Discovery & Diary Contract (`NearbyPlace`, `DiscoveryToolCall`) |
> | FR-10 | [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) | §5. Google Places API New (searchNearby, Field Mask, Place Types) |
> | FR-11 | [`shared-contract.md`](../contracts/shared-contract.md) | §D. Part 1↔4 (`DiaryData`, `DiaryEntry`) |
> | FR-11 | [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) | §3.2 텍스트→이미지 생성 (`responseModalities: [TEXT, IMAGE]`) |
> | FR-12 | [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) | §2.2 Session Config (`contextWindowCompression.slidingWindow`) |
> | FR-13 | [`shared-contract.md`](../contracts/shared-contract.md) | §G. Firestore Data Model (`SessionDoc`, `VisitDoc`, `DiaryDoc`) |

### 4.3 P2 - 선택

| ID | 요구사항 | 사용되는 Gemini 기능 |
|---|---|---|
| FR-15 | **AR 오버레이**: 카메라 피드에 복원 이미지 오버레이 | - |
| FR-16 | **협업 모드**: 다수 사용자가 가이드 세션 공유 | - |
| FR-17 | **오프라인 모드**: 이전에 방문한 유적지 데이터를 오프라인 접근용으로 캐시 | - |

---

## 5. 비기능 요구사항

### 5.1 성능

| 지표 | 목표 | 근거 |
|---|---|---|
| 음성 응답 지연 | < 1.5초 (첫 바이트) | 대화형 느낌을 위해 거의 실시간 필요 |
| 비전 인식 | < 3초 | 카메라 인식에 대한 사용자 인내 임계값 |
| 이미지 생성 | < 15초 | 로딩 애니메이션과 함께 수용 가능한 대기 |
| WebSocket 재연결 | < 2초 | 네트워크 중단 시 끊김 없는 경험 |
| Time to Interactive (TTI) | 4G에서 < 3초 | 모바일 퍼스트 성능 |
| Lighthouse 성능 | > 85 | 제출 품질 기준 |

### 5.2 보안

| 요구사항 | 구현 |
|---|---|
| API 키 보호 | 서버사이드 프록시; Gemini API 키가 클라이언트에 노출되지 않음 |
| 카메라/마이크 권한 | Permissions API를 통한 명시적 사용자 동의; 자동 활성화 없음 |
| 데이터 프라이버시 | 카메라 프레임 서버측 저장 없음; 메모리에서만 처리 |
| 인증 | 세션 추적용 Firebase Anonymous Auth; PII 수집 없음 |
| HTTPS | 모든 트래픽 암호화; Cloud Run을 통해 강제 |

### 5.3 신뢰성

| 요구사항 | 목표 |
|---|---|
| 데모 중 가동시간 | 99.9% (GCP Cloud Run 오토스케일링) |
| 우아한 퇴화 | Live API 실패 시 → 텍스트 채팅 + Gemini 2.5 Flash로 폴백 |
| 오류 복구 | 지수 백오프로 WebSocket 3회 자동 재시도 |
| 세션 영속성 | 세션 데이터에 대한 24시간 TTL로 Firestore 저장 |

### 5.4 호환성

| 플랫폼 | 최소 버전 |
|---|---|
| Chrome (Android) | 90+ |
| Safari (iOS) | 15.4+ (MediaDevices API 지원) |
| Chrome (Desktop) | 90+ |
| 화면 크기 | 360px - 1440px (반응형) |

---

## 6. 기술 아키텍처

### 6.1 시스템 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                        클라이언트 (Next.js PWA)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │  카메라   │  │  마이크   │  │   GPS    │  │     React UI       │  │
│  │  모듈     │  │  모듈    │  │  모듈    │  │  (모바일 퍼스트)    │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬───────────┘  │
│       │              │             │                  │              │
│  ┌────▼──────────────▼─────────────▼──────────────────▼───────────┐  │
│  │            WebSocket Manager + REST Client                     │  │
│  └────────────────────────────┬───────────────────────────────────┘  │
└───────────────────────────────┼──────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │    Cloud Run (API)     │
                    │    Next.js Server      │
                    └───────────┬───────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                  │
    ┌─────────▼────────┐ ┌─────▼──────┐ ┌────────▼────────┐
    │  파이프라인 1      │ │ 파이프라인 2│ │  외부 API        │
    │  Gemini Live API  │ │  Gemini 2.5 │ │                  │
    │  (양방향 스트리밍) │ │  Flash Image│ │  - Places API    │
    │                   │ │  (REST)     │ │  - Geocoding API │
    │  - 오디오 입출력   │ │             │ │                  │
    │  - 비디오 프레임   │ │  - 이미지   │ │                  │
    │  - 도구 호출       │ │    생성     │ │                  │
    │                   │ │  - 인터리브 │ │                  │
    │                   │ │    출력     │ │                  │
    └─────────┬────────┘ └─────┬──────┘ └────────┬────────┘
              │                │                  │
              └────────────────┼──────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │     Firestore       │
                    │  - 세션              │
                    │  - 방문 기록         │
                    │  - 다이어리 항목     │
                    └─────────────────────┘
```

### 6.2 듀얼 파이프라인 아키텍처

> **📋 SDK 참조**: [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) §Appendix — TimeLens 아키텍처-API 매핑 다이어그램

TimeLens는 Gemini의 실시간 스트리밍과 배치 이미지 생성 기능을 모두 활용하기 위해 **듀얼 파이프라인** 설계를 채택한다:

#### 파이프라인 1: 실시간 스트리밍 (Gemini Live API)

> **📋 SDK**: [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) §2 — `ai.live.connect()`, Session Methods, VAD, Ephemeral Tokens

```
사용자 마이크 ──► PCM 16kHz ──► WebSocket ──► Live API ──► 오디오 응답
사용자 카메라 ──► JPEG 1fps ──► WebSocket ──► Live API ──► 비전 분석
                                                       ──► 도구 호출 ──► 파이프라인 2
```

- **프로토콜**: WebSocket (양방향 스트리밍)
- **모델**: `gemini-2.5-flash-native-audio-preview-12-2025` *(모델 수명 주기: [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) §2.1 참조)*
- **입력**: 인터리브된 오디오 (PCM 16비트, 16kHz 모노) + 비디오 프레임 (JPEG, 1fps, 768px 최대)
- **출력**: 오디오 스트림 (PCM **24kHz**) + 텍스트 트랜스크립트 + 도구 호출 이벤트
- **사용 기능**: Live API, Vision, Native Audio, Google Search Grounding, Session Resumption, Context Window Compression

#### 파이프라인 2: 배치 이미지 생성 (Gemini 2.5 Flash)

> **📋 SDK**: [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) §3 — `ai.models.generateContent()`, 이미지 편집, 응답 파싱

```
도구 호출 이벤트 ──► REST API ──► Gemini 2.5 Flash ──► 생성된 이미지
                                                   ──► 인터리브된 텍스트 + 이미지
```

- **프로토콜**: REST (요청/응답)
- **모델**: `gemini-2.5-flash-image-preview` *(모델 별칭: [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) §3.1 참조)*
- **입력**: 텍스트 프롬프트 + 선택적 참조 이미지 (base64)
- **출력**: 생성된 이미지 (PNG) + 텍스트
- **사용 기능**: Image Generation, Interleaved Output

#### 파이프라인 동기화: Function Calling Bridge

```
Live API 세션                             REST API
     │                                       │
     ├── 사용자: "이거 새것이었을 때          │
     │   어떤 모습이었는지 보여줘"            │
     │                                       │
     ├── 도구 호출: generate_restoration      │
     │   {artifact: "아테네 적회식            │
     │    크라테르", era: "기원전 460년",     │
     │    damage: "균열, 색바랜 채색,         │
     │    손잡이 분실"}                       │
     │        │                              │
     │        └──────────────────────────────►├── POST /restore
     │                                       │   model: gemini-2.5-flash
     │   ◄── 도구 응답 ─────────────────────┤   response: {image_url}
     │                                       │
     ├── 오디오: "기원전 460년 아테네          │
     │   도공 작업장에서 막 완성된              │
     │   크라테르의 모습입니다..."              │
     │                                       │
     └── 클라이언트가 도구 호출 결과로         │
         image_url 수신 → 슬라이더 렌더링      │
```

### 6.3 ADK 멀티에이전트 설계

> **📋 SDK**: [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) §4 — `LlmAgent`, `FunctionTool` (Zod), `subAgents`, `SequentialAgent`/`ParallelAgent`, `GOOGLE_SEARCH` 단독 사용 제약
> **📋 계약**: [`shared-contract.md`](../contracts/shared-contract.md) §B/C/D — 에이전트 간 타입 계약

```
                    ┌───────────────────────┐
                    │    Orchestrator       │
                    │  (의도 라우터)         │
                    │                       │
                    │  Live API 입력을 통해  │
                    │  사용자 의도 분석      │
                    └───────┬───────────────┘
                            │
            ┌───────────────┼───────────────┬──────────────────┐
            │               │               │                  │
   ┌────────▼────────┐ ┌───▼──────────┐ ┌──▼───────────┐ ┌───▼──────────┐
   │  Curator Agent  │ │ Restoration  │ │  Discovery   │ │  Diary       │
   │                 │ │ Agent        │ │  Agent       │ │  Agent       │
   │ - Live API      │ │              │ │              │ │              │
   │ - Vision        │ │ - 이미지 생성│ │ - Places API │ │ - 인터리브   │
   │ - 검색 그라운딩 │ │ - Before/    │ │ - Geocoding  │ │   출력       │
   │ - Native Audio  │ │   After      │ │ - 검색       │ │ - 이미지 생성│
   │ - 세션 재연결   │ │              │ │   그라운딩   │ │              │
   │ - 컨텍스트 압축 │ │              │ │              │ │              │
   └─────────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

#### 에이전트 명세

**Orchestrator**
- **역할**: 모든 사용자 입력을 가로채어 의도를 판단하고 적절한 전문 에이전트로 라우팅
- **라우팅 로직**:
  - 유물/건물 인식 / 일반 질문 / "이게 뭐야" → Curator
  - "원래 모습 보여줘" / "새것이었을 때 어떻게 생겼어" / "복원해줘" / 복원 관련 → Restoration
  - "근처에 박물관 있어" / "다른 유적지" / 위치 관련 → Discovery
  - "다이어리 만들어줘" / "방문 요약해줘" / "박물관 다이어리" → Diary
- **구현**: 라우팅 함수 호출을 도구로 정의한 ADK `Agent`

**Curator Agent**
- **역할**: 실시간 유산 탐험을 위한 주요 대화 에이전트
- **파이프라인**: 파이프라인 1 (Live API)
- **시스템 프롬프트 전략**:
  ```
  당신은 TimeLens Curator, 세계 최고 수준의 박물관 도슨트이자 문화유산 전문가입니다.
  열정적인 큐레이터처럼 말합니다 — 박식하면서도 쉽게 접근 가능하고, 스토리텔링 중심입니다.

  행동 원칙:
  - 카메라 프레임을 분석하여 박물관 유물 식별: 도자기, 조각상, 회화,
    무기, 장신구, 비문, 직물, 화석, 동전, 가면
  - 야외 기념물, 건물, 유적, 건축적 특징도 인식
  - 풍부한 역사적 맥락 제공: 기원, 시대, 문명, 제작 기법,
    문화적 의미, 일상생활에서의 용도 — Google 검색으로 근거 확보
  - 유물을 설명할 때, 그것이 속했던 세계의 생생한 그림을 그린다
    ("이 암포라는 기원전 5세기 아테네의 심포시엄에서 와인을 담았을 것입니다...")
  - 후속 질문이 있는 자연스러운 대화 지원
  - 사용자의 언어로 말하기 (자동 감지 또는 사용자 지정)
  - 유물 인식 시 즉시 구조화된 요약 카드를 생성:
    {이름, 시대, 문명, 한줄 설명, 핵심 키워드 3개}
    — 음성 해설과 동시에 UI에 텍스트로 표시하여 핵심 정보 즉시 파악 가능
  - 음성 해설 내용을 채팅 형태의 텍스트로도 동시에 표시
  - 사용자가 특정 주제를 탭하면 해당 주제만 깊이 있는 대화로 확장
  - 사용자가 복원/재건을 요청하면 generate_restoration 도구 호출
  - 사용자가 주변 박물관/유적지를 물으면 discover_nearby 도구 호출
  ```
- **사용 가능한 도구**:
  - `generate_restoration(artifact_name, era, artifact_type, damage_description)` → Restoration Agent 트리거
  - `discover_nearby(lat, lng, radius_km)` → Discovery Agent 트리거
  - `create_diary(session_id)` → Diary Agent 트리거
  - `google_search(query)` → Search Grounding

**Restoration Agent**
- **역할**: 손상된 유물과 유산 현장의 역사적으로 정확한 복원 이미지 생성
- **파이프라인**: 파이프라인 2 (Gemini 2.5 Flash Image)
- **입력**: 유물/현장 식별 + 시대 + 손상 설명 + 현재 사진 (선택적 참조)
- **출력**: 복원/재건된 이미지 + 설명 텍스트
- **복원 카테고리**:
  | 카테고리 | 입력 예시 | 출력 예시 |
  |---|---|---|
  | 깨진 도자기/도예 | 손잡이가 없어진 금 간 그리스 암포라 | 신화적 장면이 그려진 온전한 그릇 |
  | 손상된 조각상 | 머리와 팔이 없는 대리석 조각상 | 원래 다색 채색이 있는 전신상 |
  | 색바랜 회화/프레스코 | 변질된 르네상스 프레스코 | 선명한 원래 색상과 또렷한 디테일 |
  | 부식된 금속 | 녹색 녹이 슨 청동 투구 | 원래 표면이 빛나는 청동 |
  | 파편화된 모자이크 | 불완전한 로마 바닥 모자이크 | 전체 패턴이 완성된 모자이크 |
  | 파괴된 건축물 | 무너진 신전 기둥 | 지붕과 장식이 있는 온전한 신전 |
- **프롬프트 템플릿 (유물)**:
  ```
  {era}에 새로 만들어졌을 당시의 {artifact_name}의 사실적 이미지를 생성하세요.

  유물 유형: {artifact_type}
  역사적 맥락: {search_grounded_context}
  현재 상태: {damage_description}

  요구사항:
  - 고고학 기록에 기반한 역사적으로 정확한 복원
  - 참조 사진과 동일한 시점
  - 유물을 깨끗하고 새로 만든 상태로 표현
  - 원래 모습 그대로의 선명한 색상과 재질
  - 공예, 조각, 채색의 세밀한 디테일
  ```
- **프롬프트 템플릿 (건축물)**:
  ```
  {era} 당시 {site_name}의 사실적 이미지를 생성하세요.

  역사적 맥락: {search_grounded_context}
  참조: 현재 상태는 {current_description}입니다.

  요구사항:
  - 역사적 기록에 기반한 건축적 정확성
  - 참조 사진과 동일한 시점
  - 원래 도색과 재료를 반영한 선명한 색상
  - 시대에 맞는 주변 환경 포함 (사람, 식생, 하늘)
  ```

**Discovery Agent**
- **역할**: 주변 박물관 및 문화유산 검색 및 추천
- **파이프라인**: 파이프라인 2 (REST) + Google Places API
- **입력**: 사용자 GPS 좌표 + 반경 + 선택적 관심사 필터 (예: "고대 이집트", "현대 미술")
- **출력**: 주변 박물관 및 유산 현장 목록과 메타데이터
- **데이터 소스**: Google Places API (type: `museum`, `art_gallery`, `tourist_attraction`, `church`, `hindu_temple`, `synagogue`, `mosque`) + 설명을 위한 Google Search Grounding
- **박물관 특화 보강**: 각 박물관 결과에 현재 전시, 주요 소장품, 운영 시간을 Search Grounding으로 포함

**Diary Agent**
- **역할**: 세션 기록에서 삽화가 포함된 박물관 방문 저널 생성
- **파이프라인**: 파이프라인 2 (Gemini 2.5 Flash with Interleaved Output)
- **입력**: 세션 방문 기록 (관람한 유물, 대화, 사진, 복원)
- **출력**: 인터리브된 텍스트 내러티브와 AI 생성 삽화가 포함된 마크다운 형식 다이어리
- **인터리브 출력 형식**:
  ```
  [텍스트: "대영박물관에서의 아침 — 4전시실: 이집트 조각"]
  [이미지: AI 생성 박물관 갤러리 수채화 삽화]
  [텍스트: "로제타 스톤은 유리 뒤에 서 있다, 예상보다 작지만
   무한히 더 중요하다. 기원전 196년에 새겨진 이 화강섬록암
   석판이 이집트 상형문자 체계 전체를 풀었다..."]
  [이미지: 복원 — 새로 새겨졌을 당시의 로제타 스톤]
  [텍스트: "인접 전시실에서 금 간 아테네 적회식 크라테르가
   눈길을 끌었다. TimeLens가 2,500년 전의 모습을 보여주었다..."]
  [이미지: Before/After — 금 간 크라테르 → 생생한 장면의 온전한 그릇]
  [텍스트: "10분 동쪽으로 걸어가니 존 소인 경 박물관을 발견했다..."]
  [이미지: AI 생성 박물관 파사드 스케치]
  ```

### 6.4 WebSocket 프로토콜

> **📋 계약**: [`shared-contract.md`](../contracts/shared-contract.md) §E — 전체 WebSocket 프로토콜 (Client→Server 5타입, Server→Client 9타입의 정확한 TypeScript 인터페이스)
> **📋 SDK**: [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) §2.3/2.4 — Live API 세션 메서드 & 서버 메시지 처리

#### 클라이언트 → 서버 메시지

```typescript
// Live API 세션 수립
interface SessionConfig {
  type: 'session.config';
  payload: {
    language: string;        // 예: 'en', 'ko', 'ja'
    sessionId?: string;      // 세션 재연결용
  };
}

// 마이크에서 오디오 청크
interface AudioInput {
  type: 'audio.input';
  payload: {
    data: string;            // base64 인코딩된 PCM 16비트 16kHz 모노
    timestamp: number;
  };
}

// 카메라 프레임
interface VideoFrame {
  type: 'video.frame';
  payload: {
    data: string;            // base64 인코딩된 JPEG (최대 768px)
    timestamp: number;
  };
}

// 사용자 인터럽트 신호
interface Interrupt {
  type: 'audio.interrupt';
}
```

#### 서버 → 클라이언트 메시지

```typescript
// 오디오 응답 청크
interface AudioOutput {
  type: 'audio.output';
  payload: {
    data: string;            // base64 인코딩된 PCM 24kHz
    transcript?: string;     // 선택적 텍스트 트랜스크립트
  };
}

// 도구 호출 결과 (예: 복원 이미지)
interface ToolResult {
  type: 'tool.result';
  payload: {
    tool: 'generate_restoration' | 'discover_nearby' | 'create_diary';
    result: Record<string, unknown>;
  };
}

// 세션 상태 업데이트
interface SessionStatus {
  type: 'session.status';
  payload: {
    status: 'connected' | 'reconnecting' | 'expired';
    sessionId: string;
    expiresAt?: number;
  };
}

// 에이전트 라우팅 알림
interface AgentSwitch {
  type: 'agent.switch';
  payload: {
    from: string;
    to: string;
    reason: string;
  };
}
```

### 6.5 REST API

> **📋 계약**: [`shared-contract.md`](../contracts/shared-contract.md) §F — REST API 엔드포인트 계약 (7개 엔드포인트의 전체 Request/Response TypeScript 타입)

| 메서드 | 엔드포인트 | 설명 | 요청 | 응답 |
|---|---|---|---|---|
| POST | `/api/session` | 새 세션 생성 | `{ language, userId? }` | `{ sessionId, wsUrl, expiresAt }` |
| POST | `/api/session/resume` | 만료된 세션 재연결 | `{ sessionId }` | `{ wsUrl, context, expiresAt }` |
| POST | `/api/restore` | 유물 복원 / 시간 복원 생성 | `{ artifactName, era, artifactType?, damageDescription?, referenceImage? }` | `{ imageUrl, description }` |
| GET | `/api/discover` | 주변 박물관 및 유산 검색 | `?lat=&lng=&radius=&type=` | `{ sites: Site[] }` |
| POST | `/api/diary/generate` | 박물관 방문 다이어리 생성 | `{ sessionId }` | `{ diary: DiaryEntry[] }` |
| GET | `/api/diary/:id` | 생성된 다이어리 조회 | - | `{ diary: DiaryEntry[] }` |
| GET | `/api/health` | 헬스 체크 | - | `{ status, version, uptime }` |

### 6.6 Firestore 데이터 모델

> **📋 계약**: [`shared-contract.md`](../contracts/shared-contract.md) §G — Firestore 데이터 모델 (`SessionDoc`, `VisitDoc`, `DiaryDoc` 필드 수준 타입 및 Firestore 컬렉션 경로)

```typescript
// 컬렉션: sessions
interface Session {
  id: string;                          // 자동 생성
  userId: string;                      // Firebase Anonymous Auth UID
  language: string;
  status: 'active' | 'paused' | 'completed';
  liveApiSessionId?: string;           // Gemini Live API 세션 핸들
  contextSnapshot?: string;            // 재연결용 압축된 컨텍스트
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt: Timestamp;               // TTL: 24시간
}

// 컬렉션: sessions/{sessionId}/visits
interface Visit {
  id: string;
  itemName: string;                    // 유물 이름 또는 현장 이름
  location: GeoPoint;
  venueName?: string;                  // 예: "대영박물관", "4전시실"
  recognizedAt: Timestamp;
  conversationSummary: string;         // Context Window Compression으로 압축
  restorationImageUrl?: string;        // AI 복원된 유물 이미지
  userPhotoUrl?: string;               // Cloud Storage에 업로드
  metadata: {
    era?: string;
    category: 'artifact' | 'monument' | 'building' | 'painting' | 'sculpture';
    artifactType?: string;             // 'pottery' | 'sculpture' | 'painting' | 'weapon' | 'jewelry' | 'textile' | 'coin' | 'mosaic' | 'inscription'
    material?: string;                 // 'marble' | 'bronze' | 'ceramic' | 'gold' | 'stone'
    civilization?: string;             // 'Greek' | 'Roman' | 'Egyptian' | 'Mesopotamian' 등
    damageDescription?: string;        // 복원 참조용
    searchGroundingSources?: string[];
  };
}

// 컬렉션: diaries
interface Diary {
  id: string;
  sessionId: string;
  userId: string;
  title: string;
  entries: DiaryEntry[];
  createdAt: Timestamp;
  shareToken?: string;                // 공개 공유용
}

interface DiaryEntry {
  type: 'text' | 'image';
  content: string;                    // 마크다운 텍스트 또는 이미지 URL
  siteName?: string;
  order: number;
}
```

### 6.7 핵심 설계 결정

| # | 결정 | 선택 | 근거 | 검토된 대안 |
|---|---|---|---|---|
| 1 | **플랫폼** | Next.js 모바일 웹 (PWA) | 설치 없이 즉시 접근; 심사위원이 URL 클릭 → 즉시 접근; 앱스토어 심사 리스크 제거 | React Native (Expo) — 앱스토어 심사 일정으로 기각 |
| 2 | **실시간 통신** | Gemini Live API (WebSocket) | 네이티브 양방향 오디오+비디오 스트리밍; < 1초 지연; 내장 턴 감지 | WebRTC → 불필요한 복잡성; REST 폴링 → 너무 느림 |
| 3 | **이미지 생성** | Gemini 2.5 Flash (Image) | 단일 벤더 (Gemini 생태계); 인터리브 출력 지원; 추가 API 키 불필요 | DALL-E 3, Stable Diffusion → 별도 서비스, 인터리브 출력 없음 |
| 4 | **에이전트 프레임워크** | Google ADK | 해커톤 필수; 네이티브 Gemini 통합; 멀티에이전트 오케스트레이션 | LangGraph, CrewAI → Gemini 네이티브 아님, 해커톤 점수 손실 |
| 5 | **데이터베이스** | Firestore | 서버리스, 실시간 동기화, GCP 네이티브, 해커톤에 충분한 무료 티어 | Supabase → 비GCP; Redis → 영속성 없음 |
| 6 | **배포** | Cloud Run | 서버리스, 오토스케일링, WebSocket 지원, GCP 요구사항 충족 | Cloud Functions → WebSocket 미지원; GKE → 과잉 |

---

## 7. 구현 단계

### 10일 스프린트 계획

```
일차  단계                     산출물                                    리스크
─────────────────────────────────────────────────────────────────────────────────
 1    프로젝트 셋업 + PoC      Next.js 스캐폴드, GCP 프로젝트,          LOW
                               Live API WebSocket 헬로월드,
                               카메라 + 마이크 권한 동작

 2    코어 음성 파이프라인      오디오 캡처 → Live API → 오디오           MED
                               재생 루프, 기본 대화 E2E 동작

 3    비전 + 검색              카메라 프레임 → Live API Vision,           MED
                               Google Search Grounding 통합,
                               Curator Agent 시스템 프롬프트 튜닝

 4    멀티에이전트 셋업        ADK Orchestrator + Agent 라우팅,           HIGH
                               Function Calling Bridge
                               (파이프라인 1 → 파이프라인 2)

 5    유물 복원                Restoration Agent, Gemini 2.5 Flash       MED
                               이미지 생성, Before/After 슬라이더 UI,
                               유물 복원 프롬프트 테스트 완료

 6    Discovery Agent          GPS 통합, Places API,                     LOW
                               주변 유적지 목록 UI,
                               Search Grounding 설명

 7    Diary Agent              Interleaved Output 통합,                  MED
                               다이어리 생성 + 렌더링,
                               세션 방문 기록 추적

 8    세션 + 폴리시            Session Resumption, Context Window        MED
                               Compression, 에러 핸들링,
                               로딩 상태, 폴백 플로우

 9    데모 준비                데모 스크립트 리허설, 화면                LOW
                               녹화 셋업, 엣지 케이스 수정,
                               성능 최적화

10    제출                     최종 데모 녹화 (4분),                    LOW
                               README + 아키텍처 다이어그램,
                               GCP 배포 검증, Devpost 제출

11-12 버퍼                     버그 수정, 데모 재녹화 필요 시,           -
                               제출물 폴리시
```

### 단계 상세

> **📋 빌드 가이드**: [`docs/contracts/README.md`](../contracts/README.md) — 팀 워크플로우, 병렬 빌드 실행, git worktree 가이드
> **📋 파일 소유권**: [`shared-contract.md`](../contracts/shared-contract.md) §L — 파일 소유권 매트릭스 (모든 파일 → 담당 파트)

#### Day 1: 프로젝트 셋업 + PoC
- [ ] Next.js 15 프로젝트 초기화 (App Router)
- [ ] Tailwind CSS + shadcn/ui 구성
- [ ] GCP 프로젝트 생성 + API 활성화 (Gemini, Places, Geocoding)
- [ ] Firebase 셋업 (Auth, Firestore, Storage)
- [ ] Live API WebSocket 연결 PoC 구현
- [ ] MediaDevices API로 카메라 접근
- [ ] 마이크 접근 + PCM 인코딩
- [ ] Cloud Run에 배포 (Cloud Build를 통한 CI/CD)
- **종료 기준**: Live API 연결을 수립하고 오디오를 주고받을 수 있음
- **📋 계약**: [`shared-contract.md`](../contracts/shared-contract.md) §A (공유 기본 타입), §J (환경 변수), §L (파일 소유권) / [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) §1 (공통 설정), §7 (환경 변수)

#### Day 2-3: 코어 음성 파이프라인
- [ ] 오디오 캡처 파이프라인 (MediaRecorder → PCM 16kHz → base64)
- [ ] 오디오 재생 파이프라인 (base64 → PCM 24kHz → AudioContext)
- [ ] WebSocket 메시지 프로토콜 구현
- [ ] 카메라 프레임 캡처 (비디오 스트림에서 1fps JPEG 추출)
- [ ] Curator Agent 시스템 프롬프트 + 개성
- [ ] 음성 인터럽트 핸들링 (server_content 취소)
- [ ] 기본 UI: 카메라 뷰파인더 + 오디오 비주얼라이저 + 상태 표시기
- **종료 기준**: 카메라에 보이는 물체에 대해 자연스러운 음성 대화 가능
- **📋 계약**: [`shared-contract.md`](../contracts/shared-contract.md) §B (Live Session), §E (WebSocket 프로토콜), §H (`CameraViewProps`, `AudioVisualizerProps`), §I (Hook 반환 타입) / [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) §2 (Live API 전체 — connect, audio, video, VAD, transcription)

#### Day 4-6: 멀티에이전트 + 복원 + Discovery
- [ ] ADK Orchestrator + 의도 라우팅
- [ ] Function Calling Bridge (Live API 도구 호출 → REST 파이프라인 2)
- [ ] Restoration Agent: 유물 복원 + 건축물 재건 프롬프트
- [ ] 5가지 이상 유물 유형으로 복원 품질 테스트 (도자기, 조각상, 프레스코, 청동, 모자이크)
- [ ] Before/After 슬라이더 컴포넌트 (터치 친화, 애니메이션)
- [ ] Discovery Agent: Places API 통합 + Search Grounding
- [ ] 주변 유적지 목록 UI (거리, 사진, 설명 포함 카드)
- [ ] GPS + Geolocation API 통합
- [ ] Firestore 세션 + 방문 추적
- **종료 기준**: 4개 에이전트 모두 기능 동작; 유물 복원이 품질 높은 before/after 이미지 생성
- **📋 계약**: [`shared-contract.md`](../contracts/shared-contract.md) §C (Restoration 계약), §D (Discovery & Diary 계약), §F (REST API), §G (Firestore), §H (`BeforeAfterSliderProps`, `NearbySitesProps`) / [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) §3 (Image Generation), §4 (ADK), §5 (Places API), §6 (Google Search Grounding)

#### Day 7-8: 다이어리 + 폴리시 + 폴백
- [ ] Diary Agent: 인터리브 텍스트 + 이미지 생성
- [ ] 다이어리 렌더링 UI (스크롤 가능, 공유 가능)
- [ ] Session Resumption 구현
- [ ] 긴 세션용 Context Window Compression
- [ ] 에러 핸들링 + 우아한 퇴화 (Live API → 텍스트 폴백)
- [ ] 로딩 상태 + 스켈레톤 스크린
- [ ] 모바일 UI 폴리시 (세이프 에리어, 방향, 제스처)
- [ ] Firebase Anonymous Auth
- **종료 기준**: 전체 사용자 플로우가 E2E로 동작; 폴백 테스트 완료
- **📋 계약**: [`shared-contract.md`](../contracts/shared-contract.md) §D (`DiaryData`, `DiaryEntry`), §H (`DiaryViewerProps`), §K (통합 시나리오) / [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) §2.2 (Session Resumption, Context Compression), §3.2 (Interleaved Text + Image via `responseModalities`)

#### Day 9-10: 데모 + 제출
- [ ] 데모 스크립트 최종화 (섹션 9 참조)
- [ ] 보이스오버 포함 화면 녹화 (최대 4분)
- [ ] 아키텍처 다이어그램 (깔끔한 SVG/PNG)
- [ ] README.md (셋업 가이드 포함)
- [ ] GCP 배포 확인 + URL 접근 가능
- [ ] Devpost 제출: 텍스트 설명, 데모 영상, 저장소 링크, GCP 증명
- **종료 기준**: 3월 16일 전에 Devpost 제출 완료

---

## 8. 해커톤 제출 매핑

### 8.1 제출 요구사항 커버리지

| 요구사항 | 상태 | TimeLens 산출물 |
|---|---|---|
| **텍스트 설명** | 커버됨 | 섹션 1 (개요)을 Devpost용으로 적용 |
| **코드 저장소** | 커버됨 | GitHub 저장소 (공개 또는 심사위원 접근 가능한 비공개) |
| **GCP 배포 증명** | 커버됨 | Cloud Run URL + GCP 콘솔 스크린샷 |
| **아키텍처 다이어그램** | 커버됨 | 섹션 6.1 다이어그램 (SVG로 내보내기) |
| **데모 영상** | 커버됨 | 섹션 9 스크립트에 따른 4분 영상; YouTube 또는 Vimeo에 공개 업로드 (영어 또는 영어 자막 필수) |

### 8.2 심사 기준 매핑 (실제 배점)

**Stage 1: 적합성 Pass/Fail** — 모든 제출 요구사항 충족? Live Agents 카테고리 대응? 기술 요구사항 적용?

**Stage 2: 채점 (기준별 1-5점, 가중 평균)**

| 기준 | 배점 | TimeLens 전략 | 목표 |
|---|---|---|---|
| **Innovation & Multimodal UX** | **40%** | "텍스트 박스" 패러다임 탈피: 음성+비전+이미지 생성+인터럽트. Live Agents 세부: 인터럽트 자연 처리 (500ms), 뚜렷한 Curator 페르소나, 에이전트가 매끄럽게 보고/듣고/말함 | 5/5 |
| **Technical Implementation & Agent Architecture** | **30%** | ADK 멀티에이전트 (4 전문가 + 오케스트레이터), 듀얼 파이프라인, Function Calling Bridge, GCP Cloud Run, Firestore, 우아한 퇴화, 환각 방지를 위한 Search Grounding | 5/5 |
| **Demo & Presentation** | **30%** | Before/After 슬라이더 "킬러 모먼트", 명확한 문제→솔루션 스토리, 아키텍처 다이어그램, GCP 배포 증명, 실제 작동 소프트웨어 (목업 아님). YouTube 공개 업로드 (영어) | 5/5 |

**Stage 3: 보너스 포인트 (최대 +1.0)**

| 보너스 | 최대 | TimeLens 계획 | 상태 |
|---|---|---|---|
| 콘텐츠 발행 (공개 플랫폼 블로그/팟캐스트/영상, `#GeminiLiveAgentChallenge` 태그) | +0.6 | Dev.to에 빌드 과정 문서 작성 | TODO |
| 자동화 클라우드 배포 (공개 레포에 IaC 포함) | +0.2 | `cloudbuild.yaml` + 배포 스크립트 이미 계획됨 | PLANNED |
| GDG 멤버십 (활성 멤버 + 공개 프로필 링크) | +0.2 | 팀원이 제출 전 GDG 가입 | TODO |

**최대 가능 점수: 6.0** (기본 5.0 + 보너스 1.0)

### 8.3 Gemini 기능 매트릭스 (제출 설명용)

| # | Gemini 기능 | 사용 위치 | 사용자 체감 영향 |
|---|---|---|---|
| 1 | **Live API** (양방향 스트리밍) | Curator Agent | 실시간 음성 + 비디오 대화 |
| 2 | **Vision** (이미지 분석) | Curator Agent | 즉각적인 유물/건물 인식 |
| 3 | **Google Search Grounding** | Curator, Discovery | 검증된 정확한 역사 정보 |
| 4 | **Image Generation** | Restoration Agent | 유물 복원 + 시간 복원 (깨진 → 온전, 색바랜 → 선명) |
| 5 | **Interleaved Output** | Diary Agent | 텍스트 + 이미지가 풍부한 박물관 방문 저널 |
| 6 | **ADK Multi-Agent** | 전체 Agent | 4개 전문 에이전트 간 지능적 라우팅 |
| 7 | **Session Resumption** | 전체 Agent | 타임아웃 후 끊김 없는 재연결 |
| 8 | **Context Window Compression** | Curator Agent | 확장된 대화 세션 |
| 9 | **Native Audio** | Curator Agent | 자연스러운 다국어 음성 출력 |

---

## 9. 데모 스크립트

### 4분 영상 브레이크다운

#### 0:00 - 0:30 | 훅 + 문제 정의 (30초)

```
[화면: 타이틀 카드 "TimeLens - See History Come Alive"]

내레이터: "10만 개의 박물관. 수십억 개의 유물. 그리고 이것이
우리가 그것들을 경험하는 방식입니다..."

[컷: 박물관에서 고대 그리스 도자기 옆 작은 안내판을 찡그리며
보다가 혼란스러운 표정으로 8초 후 지나가는 사람]

"당신의 폰이 세계 최고의 박물관 도슨트가 될 수 있다면?
당신이 보는 것을 보고, 모든 유물 뒤의 이야기를 들려주고,
시간이 앗아간 것을 보여주는?"

[컷: 박물관 안에서 폰으로 TimeLens 앱 열리는 장면]
```

#### 0:30 - 1:30 | 박물관 유물 인식 + 음성 대화 (60초)

```
[화면: 박물관에서 사용자가 금 간 아테네 적회식 크라테르에 폰을 향하고 있음]

사용자: *도자기에 카메라를 향한다*

TIMELENS (음성): "아테네 적회식 크라테르를 보고 계시네요,
아마 기원전 460년경 것입니다. 이것은 혼합 그릇이었어요 —
고대 그리스인들은 와인을 원액으로 마시지 않았습니다.
심포시엄(연회)에서 하인이 바로 이런 크라테르에
와인과 물을 섞었을 겁니다..."

[UI 표시: "아테네 적회식 크라테르, 기원전 약 460년" + 검색 그라운딩 아이콘]

사용자 (끼어들며): "그 위에 그려진 그림은 뭐예요?"

TIMELENS (음성): "좋은 관찰이에요! 그 장면들은 헤라클레스가
네메아 사자와 싸우는 모습입니다 — 그의 12가지 과업 중 하나죠.
독특한 적회식 기법을 주목하세요: 화가가 배경을 검게 칠하고
인물은 자연스러운 붉은 점토 색으로 남겨두었습니다.
이것은 실제로 기원전 530년경 아테네에서 발명된
혁명적인 기법이었습니다..."

[UI 표시: 실시간 트랜스크립트, 자연스럽게 흐르는 대화]

사용자: "많이 손상됐네요. 새것이었을 때 어떤 모습이었는지 보여줄 수 있어요?"

TIMELENS: "물론이죠. 복원해 드릴게요..."
```

#### 1:30 - 2:15 | 유물 복원 - 킬러 모먼트 (45초)

```
[화면: 로딩 애니메이션 "기원전 460년으로 복원 중..."]

[화면: Before/After 슬라이더 등장]
- 왼쪽: 현재 금 간 크라테르 (카메라 사진) —
  균열 보임, 채색 바랬음, 조각 누락
- 오른쪽: AI 생성 깨끗한 크라테르 — 광택 있는 검정 위
  선명한 붉은 인물, 완전한 손잡이, 날카로운 디테일, 손상 없음

[사용자가 슬라이더를 이리저리 드래그 — 극적인 공개]

TIMELENS (음성): "기원전 460년 아테네 도공 작업장에서
막 완성된 크라테르의 모습입니다. 선명한 붉은 인물을 주목하세요
— 헤라클레스의 근육이 뚜렷하게 표현되어 있습니다.
광택 있는 검은 슬립은 옻칠처럼 빛났을 겁니다..."

[빠른 몽타주: 3개 추가 유물에 슬라이더]
- 머리 없는 대리석 조각상 → 채색된 전신상
- 부식된 청동 투구 → 빛나는 원본
- 색바랜 이집트 파피루스 → 선명한 상형문자

내레이터: "TimeLens는 유물에 대해 말해주는 것만이 아닙니다 —
시간이 지운 것을 보여줍니다."
```

#### 2:15 - 2:50 | GPS 주변 발견 (35초)

```
[화면: 사용자가 박물관 밖으로 나온다]

사용자: "근처에 다른 박물관 있어?"

[화면: 핀이 나타나는 지도 뷰]

TIMELENS (음성): "걸어갈 수 있는 거리에 3개 박물관을 찾았어요:
국립고고학박물관이 북쪽 800미터 — 도보 10분입니다.
아가멤논의 마스크와 세계 최고의 청동기 시대
컬렉션 중 하나를 소장하고 있습니다..."

[UI 표시: 거리, 사진, 현재 전시를 포함한 박물관 카드]

사용자가 국립고고학박물관 탭 → 길찾기 표시
```

#### 2:50 - 3:25 | 박물관 다이어리 (35초)

```
사용자: "내 박물관 방문 다이어리 만들어줘"

[화면: 로딩 "박물관 다이어리 생성 중..."]

[화면: 인터리브 콘텐츠가 있는 아름다운 다이어리 페이지 등장]
- 텍스트: "고전 고대 유물 박물관에서의 아침"
- AI 삽화: 박물관 갤러리 수채화
- 텍스트: "적회식 크라테르 앞에서 발걸음이 멈췄다..."
- 이미지: before/after 복원 슬라이더
- 텍스트: "모퉁이를 돌자 머리 없는 대리석 아프로디테..."
- 이미지: 원래 다색 채색으로 AI 복원된 조각상

내레이터: "모든 박물관 방문이 간직할 가치 있는 이야기가 됩니다."

[사용자가 공유 탭 → 링크 복사됨]
```

#### 3:25 - 4:00 | 아키텍처 + 마무리 (35초)

```
[화면: 아키텍처 다이어그램 (깔끔하고 전문적)]

내레이터: "내부적으로 TimeLens는 9개 Gemini 기능이
멀티에이전트 아키텍처를 통해 함께 작동합니다:

[언급할 때마다 하이라이트]
실시간 음성과 비전을 위한 Live API...
유물 복원을 위한 Image Generation...
멀티에이전트 오케스트레이션을 위한 ADK...
그리고 매끄러운 경험을 만드는 6개 추가 기능."

[화면: 기능 매트릭스 테이블]

"TimeLens — 모든 유물에는 이야기가 있으니까.
Gemini로 만들었습니다, 세계의 유산을 위해."

[엔드 카드: GitHub 저장소 + 배포 URL + 팀 이름]
```

---

## 10. 리스크 평가

### 10.1 기술 리스크

| 리스크 | 확률 | 영향 | 대응 |
|---|---|---|---|
| **Live API WebSocket 불안정** | 중간 | 높음 | 지수 백오프로 자동 재연결 구현 (3회 재시도); 텍스트 기반 Gemini 2.5 Flash 채팅으로 폴백 |
| **이미지 생성 품질 일관성 부족** | 중간 | 중간 | 다수 유산 현장으로 프롬프트 사전 테스트; 검증된 프롬프트 라이브러리 유지; 각도 매칭용 참조 이미지 포함 |
| **Live API 오디오 지연 > 2초** | 낮음 | 높음 | 오디오 청크 크기 최적화 (100ms); 데모 위치에 가장 가까운 서버 사용; 데모 전 연결 웜업 |
| **비전이 유물을 잘못 식별** | 중간 | 중간 | Google Search Grounding으로 보완; 시스템 프롬프트에 "확실하지 않지만..." 신뢰도 표현 추가; 유리 진열장 내 유물은 비전 품질 저하 가능 — 유리 반사로 테스트 |
| **박물관 조명/유리 진열장 반사** | 중간 | 중간 | UI에서 각도 조정 안내 ("반사를 줄이려면 폰을 기울여보세요"); 다양한 조명 조건으로 테스트; 반사 감소를 위한 이미지 전처리 추가 |
| **모바일 Safari WebSocket 이슈** | 중간 | 중간 | iOS Safari 15.4+에서 집중 테스트; Chrome Android를 백업 데모 기기로 준비 |
| **데모 중 Gemini API 속도 제한** | 낮음 | 치명적 | 전용 GCP 프로젝트 + 과금 사용; 쿼터 증가 요청; 데모 전 워밍업 호출 |

### 10.2 일정 리스크

| 리스크 | 확률 | 영향 | 대응 |
|---|---|---|---|
| **멀티에이전트 라우팅 복잡도** | 높음 | 높음 | 단순 if/else 라우팅으로 시작; 시간 허용 시 ADK 오케스트레이션으로 업그레이드; 최소: 데모용 2개 에이전트 동작 |
| **Image Generation API 변경** | 낮음 | 높음 | 특정 모델 버전 고정; 매일 테스트; DALL-E 3을 긴급 백업으로 준비 |
| **UI 폴리시 부족** | 중간 | 중간 | shadcn/ui 컴포넌트 사용 (사전 제작, 폴리시됨); 핵심 3개 화면에만 집중 |
| **데모 녹화 이슈** | 낮음 | 중간 | 여러 테이크 녹화; 백업 데모 환경 준비 (로컬 + 배포) |

### 10.3 데모 특화 리스크

| 리스크 | 확률 | 영향 | 대응 |
|---|---|---|---|
| **라이브 데모 중 네트워크 장애** | 해당 없음 (사전 녹화) | 없음 | 데모는 사전 녹화 영상; 라이브 아님 |
| **AI가 역사적으로 부정확한 콘텐츠 생성** | 중간 | 중간 | 모든 사실적 주장에 Search Grounding 사용; UI에 출처 추가; 데모 스크립트 유적지로 사전 테스트 |
| **Before/After 슬라이더 인상적이지 않음** | 낮음 | 높음 | 5가지 이상 유물 유형으로 테스트 (도자기, 조각상, 프레스코, 청동, 모자이크); 데모용 가장 극적인 복원 선택; 부드러운 애니메이션 추가 |
| **데모 4분 초과** | 중간 | 낮음 | 리허설 중 각 섹션 시간 측정; 초과 시 Discovery 섹션 축소 |

---

## 11. 부록

### 11.1 기술 스택

| 레이어 | 기술 | 버전 | 용도 |
|---|---|---|---|
| **프레임워크** | Next.js | 15.x | App Router, Server Components, API Routes |
| **언어** | TypeScript | 5.x | 풀스택 타입 안전성 |
| **스타일링** | Tailwind CSS | 4.x | 유틸리티 퍼스트, 모바일 반응형 |
| **UI 컴포넌트** | shadcn/ui | 최신 | 사전 제작 접근성 컴포넌트 |
| **AI 플랫폼** | Gemini API | 2.5 Flash Image / 2.5 Flash Native Audio | 듀얼 파이프라인 AI 기능 |
| **에이전트 프레임워크** | Google ADK | 최신 | 멀티에이전트 오케스트레이션 |
| **인증** | Firebase Auth | 10.x | 익명 인증 |
| **데이터베이스** | Firestore | 10.x | 세션 + 방문 + 다이어리 저장 |
| **스토리지** | Cloud Storage | - | 이미지 저장 (복원, 다이어리) |
| **지도** | Google Maps JS API | 3.x | GPS + 주변 시각화 |
| **호스팅** | Cloud Run | - | 서버리스 컨테이너 호스팅 |
| **CI/CD** | Cloud Build | - | 푸시 시 자동 배포 |
| **오디오** | Web Audio API | 네이티브 | 오디오 캡처 + 재생 |
| **카메라** | MediaDevices API | 네이티브 | 카메라 스트림 캡처 |

### 11.2 프로젝트 파일 구조

> **📋 파일 소유권**: [`shared-contract.md`](../contracts/shared-contract.md) §L — 파일 소유권 매트릭스 (각 파일 → Part 1-5 매핑)
> **📋 컴포넌트 Props**: [`shared-contract.md`](../contracts/shared-contract.md) §H — 모든 React 컴포넌트 Props 인터페이스
> **📋 Hook 타입**: [`shared-contract.md`](../contracts/shared-contract.md) §I — Hook 반환 타입 계약 (`UseCamera`, `UseMicrophone`, `UseGeolocation`)

```
timelens/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # 루트 레이아웃 (PWA 메타, 폰트)
│   │   ├── page.tsx                  # 랜딩 / 카메라 뷰
│   │   ├── diary/
│   │   │   └── [id]/page.tsx         # 다이어리 뷰 + 공유
│   │   └── api/
│   │       ├── session/
│   │       │   ├── route.ts          # POST: 세션 생성
│   │       │   └── resume/route.ts   # POST: 세션 재연결
│   │       ├── ws/route.ts           # WebSocket 업그레이드 → Live API 프록시
│   │       ├── restore/route.ts      # POST: 유물 복원 / 이미지 생성
│   │       ├── discover/route.ts     # GET: 주변 유적지
│   │       ├── diary/
│   │       │   ├── generate/route.ts # POST: 다이어리 생성
│   │       │   └── [id]/route.ts     # GET: 다이어리 조회
│   │       └── health/route.ts       # GET: 헬스 체크
│   ├── agents/                       # ADK 멀티에이전트
│   │   ├── orchestrator.ts           # 의도 라우터
│   │   ├── curator.ts                # Live API 음성 + 비전
│   │   ├── restoration.ts            # 이미지 생성
│   │   ├── discovery.ts              # Places API + 검색
│   │   └── diary.ts                  # 인터리브 출력
│   ├── lib/
│   │   ├── gemini/
│   │   │   ├── live-api.ts           # Live API용 WebSocket 클라이언트
│   │   │   ├── flash-image.ts        # 이미지 생성용 REST 클라이언트
│   │   │   └── search-grounding.ts   # 검색 그라운딩 래퍼
│   │   ├── firebase/
│   │   │   ├── config.ts             # Firebase 초기화
│   │   │   ├── auth.ts               # 익명 인증
│   │   │   └── firestore.ts          # DB 작업
│   │   ├── audio/
│   │   │   ├── capture.ts            # 마이크 → PCM 인코딩
│   │   │   └── playback.ts           # PCM 디코딩 → 스피커
│   │   ├── camera/
│   │   │   └── capture.ts            # 카메라 → JPEG 프레임
│   │   ├── geo/
│   │   │   └── location.ts           # GPS + Places API
│   │   └── ws/
│   │       └── manager.ts            # WebSocket 라이프사이클 + 재연결
│   ├── components/
│   │   ├── camera-view.tsx           # 메인 카메라 뷰파인더
│   │   ├── audio-visualizer.tsx      # 음성 활동 표시기
│   │   ├── before-after-slider.tsx   # 시간 복원 비교
│   │   ├── nearby-sites.tsx          # Discovery 결과 카드
│   │   ├── diary-viewer.tsx          # 다이어리 렌더링
│   │   ├── knowledge-panel.tsx       # 인터랙티브 지식 패널 (요약 카드 + 채팅형 상세)
│   │   ├── transcript.tsx            # 실시간 트랜스크립트 오버레이
│   │   ├── agent-indicator.tsx       # 활성 에이전트 표시
│   │   └── ui/                       # shadcn/ui 컴포넌트
│   ├── hooks/
│   │   ├── use-live-session.ts       # Live API 세션 관리
│   │   ├── use-camera.ts             # 카메라 스트림 훅
│   │   ├── use-microphone.ts         # 오디오 캡처 훅
│   │   └── use-geolocation.ts        # GPS 위치 훅
│   └── types/
│       ├── ws-messages.ts            # WebSocket 프로토콜 타입
│       ├── agents.ts                 # 에이전트 타입
│       └── models.ts                 # Firestore 모델 타입
├── public/
│   ├── manifest.json                 # PWA 매니페스트
│   ├── icons/                        # 앱 아이콘 (192, 512)
│   └── sw.js                         # 서비스 워커 (최소)
├── Dockerfile                        # Cloud Run 컨테이너
├── cloudbuild.yaml                   # CI/CD 파이프라인
├── .env.example                      # 환경 변수 템플릿
├── next.config.ts                    # Next.js 설정
├── tailwind.config.ts                # Tailwind 설정
├── tsconfig.json                     # TypeScript 설정
└── README.md                         # 셋업 + 아키텍처 + 데모
```

### 11.3 환경 변수

> **📋 계약**: [`shared-contract.md`](../contracts/shared-contract.md) §J — 전체 `env.d.ts` 타입 정의 (`NEXT_PUBLIC_*` vs 서버 전용 분류)
> **📋 SDK**: [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) §7 — 모든 환경 변수 설명
> **⚠️ ADK 주의**: ADK TypeScript는 `GOOGLE_GENAI_API_KEY` 사용 (`GOOGLE_GEMINI_API_KEY` 아님). [`gemini-sdk-reference.md`](../contracts/gemini-sdk-reference.md) §4.2 참조

```bash
# Gemini API
GEMINI_API_KEY=                      # Gemini API 키 (Live API, Image Gen)
GOOGLE_GENAI_API_KEY=                # ADK에서 사용하는 이름
GOOGLE_CLOUD_PROJECT=                # GCP 프로젝트 ID

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_KEY=        # Base64 인코딩 (서버사이드 전용)

# Google Maps / Places
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
GOOGLE_PLACES_API_KEY=               # 서버사이드 전용

# 앱 설정
NEXT_PUBLIC_APP_URL=                  # 배포된 URL
NEXT_PUBLIC_WS_URL=                  # WebSocket 엔드포인트
```

### 11.4 수상 확률 최적화 전략

**주요 목표**: Live Agents 카테고리 ($10K + NEXT 티켓 + $1K 크레딧)
**동시 목표**: Grand Prize ($25K + $3K 크레딧 + NEXT 티켓 + 여행 경비 최대 $6K + 데모 기회)
**추가 목표**: Best Multimodal Integration & UX ($5K), Best Technical Execution ($5K)

**상금 구조 요약**:

| 상 | 금액 | 요건 |
|---|---|---|
| Live Agents 카테고리 수상 | $10K + 2x NEXT 티켓 ($2,299 각) + $1K 크레딧 + Google 가상 커피 | Live Agents 카테고리 최고 점수 |
| Grand Prize | $25K + $3K 크레딧 + 2x NEXT 티켓 + 2x 여행 경비 (최대 $3K 각) + NEXT 데모 | 전체 카테고리 최고 점수 |
| Best Multimodal Integration & UX | $5K + $500 크레딧 | 세부 카테고리 수상 |
| Best Technical Execution | $5K + $500 크레딧 | 세부 카테고리 수상 |
| Honorable Mention (5개) | $2K + $500 크레딧 각 | 상위 출품작 |

**차별화 핵심**:

1. **시각적 "와우" 모먼트**: 손상된 유물 → 깨끗한 복원을 Before/After 슬라이더로 — 즉시 이해 가능하고 감정적으로 강렬함. 심사위원이 기억함
2. **박물관 퍼스트 = 미개척 니치**: 박물관에서 실시간 AI 유물 복원 + 음성 대화를 하는 기존 제품 없음
3. **멀티모달 UX 리더십** (40% 배점): 음성 + 비전 + 이미지 생성 + 인터럽트 + 지식 패널 — 챗봇이 아님
4. **제로 마찰**: URL → 카메라 → 10초 이내 AI와 대화
5. **멀티에이전트 정교함**: 파이프라인 오케스트레이션을 가진 4개 전문 에이전트
6. **프로덕션 품질**: GCP 배포, 반응형 모바일 UI, 적절한 에러 핸들링
7. **보너스 포인트**: 블로그 (+0.6) + IaC (+0.2) + GDG (+0.2) = 풀 +1.0 보너스

**경쟁자 공통 약점 활용**:
- 대부분의 해커톤 출품작은 2-3개 Gemini 기능 사용 → TimeLens는 7개+ 핵심 기능
- 대부분 챗봇 제작 → TimeLens는 멀티모달 (음성 + 비전 + 이미지 생성)
- 대부분 모바일 최적화 생략 → TimeLens는 모바일 퍼스트
- 대부분 텍스트 전용 출력 → TimeLens는 이미지 + 인터리브 콘텐츠 생성
- **대부분 야외/범용 유즈케이스에 집중** → TimeLens는 유물 복원이라는 고유 킬러 기능으로 박물관 니치를 독점
- **대부분 보너스 포인트를 놓침** → TimeLens는 풀 +1.0 보너스 목표 (블로그 + IaC + GDG)

---

*Gemini Live Agent Challenge 2026을 위해 제작*
*카테고리: Live Agents | 목표: Grand Prize*
*"모든 유물에는 이야기가 있습니다. TimeLens가 들려드립니다."*
