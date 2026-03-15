# PRD: ADK Multi-Agent Integration into REST Pipeline

> **Status**: Draft
> **Author**: Harrison (with Claude)
> **Deadline**: 2026-03-17 09:00 KST (D-3)
> **Priority**: High — 해커톤 심사 "Technical Implementation" (30%) 직접 영향

---

## 1. 배경 (Background)

### 현재 상태

TimeLens는 **듀얼 파이프라인** 아키텍처:

| Pipeline | 역할 | 현재 구현 |
|----------|------|----------|
| **Pipeline 1** (Live) | 실시간 음성/비전 대화 | Gemini Live API + Function Calling ✅ |
| **Pipeline 2** (REST) | 복원/발견/다이어리 생성 | Next.js API Routes → 직접 API 호출 ✅ |

**문제**: Pipeline 2의 REST 라우트가 Gemini/Places API를 **직접 호출**하고 있어, ADK 에이전트 4개(`orchestrator`, `curator`, `discovery`, `diary`)가 **완전한 데드코드**(181줄)로 존재.

```
현재 플로우:
Live API → Function Call "generate_restoration"
  → Client fetch("/api/restore")
  → route.ts → flash-image.ts → Gemini Flash API (직접 호출)
  → Response

ADK 에이전트: 아무 곳에서도 import/호출되지 않음
```

### 해커톤 심사 기준과의 갭

| 심사 항목 | 배점 | 현재 | ADK 연결 후 |
|----------|------|------|------------|
| Innovation & Multimodal UX | 40% | ✅ 강함 | 동일 |
| Technical Implementation | 30% | ⚠️ ADK 미활용 | ✅ ADK Multi-Agent 구조 |
| Demo & Presentation | 30% | 진행중 | ADK 흐름 시각화 가능 |
| Bonus: ADK Agent | +1.0 | ❌ | ✅ |

**ADK를 연결하면 Technical Implementation 점수 + Bonus +1.0을 확보할 수 있음.**

---

## 2. 목표 (Goals)

### Must-Have (P0)
1. **REST 라우트 3개가 ADK Agent를 경유**하도록 리팩토링
   - `/api/restore` → `RestorationAgent` (ADK)
   - `/api/discover` → `DiscoveryAgent` (ADK)
   - `/api/diary/generate` → `DiaryAgent` (ADK)
2. **Orchestrator Agent가 라우팅 판단** (어떤 sub-agent를 호출할지)
3. 기존 기능 **100% 동일하게 동작** (regression 없음)

### Nice-to-Have (P1)
4. ADK Agent가 **자율적으로 프롬프트 구성** (현재 하드코딩된 프롬프트를 Agent instruction으로 이동)
5. Agent 실행 로그/trace를 **DevPost 제출물에 시각화**

### Non-Goal
- Live API (Pipeline 1) 변경 — 이미 잘 작동하므로 건드리지 않음
- 새로운 Agent 추가 — 기존 4개만 활용
- ADK Runner/Session 전체 도입 — Agent를 도구로만 사용

---

## 3. 현재 코드 분석

### 3.1 REST Routes (활성, ~370줄)

| Route | 파일 | 줄수 | 핵심 로직 |
|-------|------|------|----------|
| `POST /api/restore` | `src/app/api/restore/route.ts` | 121 | Zod 검증 → `buildRestorationPrompt()` → `generateRestorationImage()` (Gemini Flash) |
| `GET /api/discover` | `src/app/api/discover/route.ts` | 63 | 좌표 검증 → `searchNearbyPlaces()` (Places API) |
| `POST /api/diary/generate` | `src/app/api/diary/generate/route.ts` | 186 | Zod 검증 → `buildDiaryPrompt()` → Gemini 3 Pro Image interleaved → 파싱 |

### 3.2 Helper Libraries (활성, ~450줄)

| 파일 | 줄수 | 역할 |
|------|------|------|
| `src/back/lib/gemini/flash-image.ts` | ~290 | 7종 카테고리별 복원 프롬프트 + 이미지 생성 |
| `src/back/lib/geo/places.ts` | ~160 | Google Places API (New) 호출 |

### 3.3 ADK Agents (데드코드, 181줄)

| Agent | 파일 | 줄수 | 상태 |
|-------|------|------|------|
| `orchestrator` | `src/back/agents/orchestrator.ts` | 50 | ❌ instruction만 있음, 도구 정의 없음 |
| `curator` | `src/back/agents/curator.ts` | 58 | ❌ 텍스트 응답만, 도구 없음 |
| `discovery` | `src/back/agents/discovery.ts` | 34 | ❌ instruction만, Places API 연결 없음 |
| `diary` | `src/back/agents/diary.ts` | 39 | ❌ instruction만, 이미지 생성 연결 없음 |

---

## 4. 타깃 아키텍처

### 4.1 플로우 변경

```
Before (현재):
  Live API → Function Call
    → Client fetch("/api/restore")
    → route.ts → flash-image.ts → Gemini Flash (직접)

After (목표):
  Live API → Function Call
    → Client fetch("/api/restore")
    → route.ts → RestorationAgent.execute(params)
                    ↓
              ADK LlmAgent
              - instruction: 복원 전문가 역할
              - tools: [generateRestorationTool]
                    ↓
              Agent가 도구 호출 판단
                    ↓
              generateRestorationTool → flash-image.ts → Gemini Flash
                    ↓
              Agent가 결과 해석 + description 생성
    → route.ts ← 구조화된 응답
```

### 4.2 Agent 도구 매핑

| Agent | ADK Tools | 기존 헬퍼 재사용 |
|-------|-----------|----------------|
| `RestorationAgent` | `generate_restoration_image` | `flash-image.ts` 그대로 |
| `DiscoveryAgent` | `search_nearby_places` | `places.ts` 그대로 |
| `DiaryAgent` | `generate_diary_content` | Gemini interleaved 호출 로직 |
| `Orchestrator` | 없음 (sub-agent 라우팅만) | — |

### 4.3 핵심 설계 원칙

1. **기존 헬퍼 100% 재사용** — `flash-image.ts`, `places.ts`는 그대로. Agent가 이들을 도구로 감싼다.
2. **Route는 얇은 래퍼** — Zod 검증 + Agent 호출 + 응답 포맷팅만 담당
3. **Agent instruction이 프롬프트 역할** — 현재 `buildRestorationPrompt()`의 하드코딩 프롬프트를 Agent instruction으로 이동
4. **Orchestrator는 선택적** — REST 라우트가 이미 URL로 라우팅하므로, Orchestrator는 데모/설명용

---

## 5. 구현 계획

### Phase 1: ADK Agent Tool 정의 (예상 ~2시간)

**새 파일: `src/back/agents/tools/`**

```
src/back/agents/tools/
  restoration-tool.ts    — generateRestorationImage를 ADK FunctionTool로 래핑
  discovery-tool.ts      — searchNearbyPlaces를 ADK FunctionTool로 래핑
  diary-tool.ts          — Gemini interleaved 호출을 ADK FunctionTool로 래핑
```

각 도구는 기존 헬퍼 함수를 그대로 호출하되, ADK의 `FunctionTool` 인터페이스에 맞게 래핑:

```typescript
// 예시: restoration-tool.ts
import { FunctionTool } from '@google/adk';
import { generateRestorationImage, buildRestorationPrompt } from '@back/lib/gemini/flash-image';

export const generateRestorationTool = new FunctionTool({
  name: 'generate_restoration_image',
  description: 'Generate a historically accurate restoration image of a damaged artifact',
  parameters: { ... },  // Zod → JSON Schema
  async execute(params) {
    const prompt = buildRestorationPrompt(params);
    const result = await generateRestorationImage(client, { prompt, ... });
    return result;
  },
});
```

### Phase 2: Agent 리팩토링 (예상 ~1.5시간)

**수정 파일:**
- `src/back/agents/curator.ts` → 삭제 또는 축소 (curator 역할은 Live API가 담당)
- `src/back/agents/discovery.ts` → `tools: [searchNearbyTool]` 추가
- `src/back/agents/diary.ts` → `tools: [generateDiaryTool]` 추가
- **새 파일**: `src/back/agents/restoration.ts` — 복원 전용 Agent (현재 없음)

```typescript
// 예시: restoration.ts
export const restorationAgent = new LlmAgent({
  name: 'restoration_agent',
  model: 'gemini-2.5-flash',
  description: 'Generates historically accurate artifact restoration images',
  instruction: `You are a cultural heritage restoration specialist...`,
  tools: [generateRestorationTool],
});
```

**Orchestrator 수정:**
```typescript
export const orchestrator = new LlmAgent({
  name: 'timelens_orchestrator',
  ...
  subAgents: [restorationAgent, discoveryAgent, diaryAgent],
});
```

### Phase 3: Route 리팩토링 (예상 ~1.5시간)

**수정 파일:**
- `src/app/api/restore/route.ts` — Agent 호출로 전환
- `src/app/api/discover/route.ts` — Agent 호출로 전환
- `src/app/api/diary/generate/route.ts` — Agent 호출로 전환

**새 파일: `src/back/agents/runner.ts`**
- ADK InMemoryRunner + InMemorySessionService 초기화
- `executeAgent(agentName, params)` 유틸 함수

```typescript
// Route 변경 예시 (restore)
export async function POST(request: NextRequest) {
  const parsed = restoreRequestSchema.safeParse(await request.json());
  if (!parsed.success) return error400(...);

  // Before: 직접 호출
  // const result = await generateRestorationImage(client, {...});

  // After: ADK Agent 경유
  const result = await executeAgent('restoration_agent', parsed.data);

  return NextResponse.json(result);
}
```

### Phase 4: 검증 (예상 ~1시간)

1. `npx tsc --noEmit` 통과
2. `npm run lint` 통과
3. 각 REST endpoint 수동 테스트
4. Live API → Function Call → REST → Agent 전체 플로우 테스트
5. 기존 기능 regression 없음 확인

---

## 6. 파일 변경 요약

| 액션 | 파일 | 변경 내용 |
|------|------|----------|
| **새로 생성** | `src/back/agents/tools/restoration-tool.ts` | flash-image.ts ADK 래핑 |
| **새로 생성** | `src/back/agents/tools/discovery-tool.ts` | places.ts ADK 래핑 |
| **새로 생성** | `src/back/agents/tools/diary-tool.ts` | Gemini interleaved ADK 래핑 |
| **새로 생성** | `src/back/agents/restoration.ts` | 복원 전용 Agent |
| **새로 생성** | `src/back/agents/runner.ts` | ADK Runner + executeAgent 유틸 |
| **수정** | `src/back/agents/orchestrator.ts` | subAgents에 restorationAgent 추가 |
| **수정** | `src/back/agents/discovery.ts` | tools 배열 추가 |
| **수정** | `src/back/agents/diary.ts` | tools 배열 추가 |
| **수정** | `src/app/api/restore/route.ts` | Agent 경유로 전환 |
| **수정** | `src/app/api/discover/route.ts` | Agent 경유로 전환 |
| **수정** | `src/app/api/diary/generate/route.ts` | Agent 경유로 전환 |
| **삭제/축소** | `src/back/agents/curator.ts` | 텍스트 폴백 전용으로 유지 또는 제거 |

**총 변경**: 5개 신규 + 6개 수정 + 1개 축소 = **12 파일**

---

## 7. 리스크 분석

### 높은 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| **ADK FunctionTool API 불안정** | 빌드 실패 | `@google/adk` 버전 고정, 빌드 먼저 검증 |
| **Agent 호출 레이턴시 증가** | UX 저하 (복원 이미 10초+) | Agent가 도구 즉시 호출하도록 instruction 최적화 |
| **Regression** | 기존 기능 깨짐 | 변경 전 각 endpoint curl 스냅샷 저장, 변경 후 비교 |

### 중간 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| **데드라인 초과** | 해커톤 제출 못함 | Phase 1-2만 완료 + route는 기존 유지 (부분 적용) |
| **ADK Runner 서버사이드 제약** | Next.js API Route에서 동작 안 할 수 있음 | `InMemoryRunner` 경량 사용, 세션 상태 불필요 |

### 낮은 리스크

| 리스크 | 영향 | 대응 |
|--------|------|------|
| **타입 불일치** | tsc 오류 | Zod ↔ ADK schema 매핑 레이어에서 해결 |

---

## 8. ROI 평가

### 투입 비용
- **예상 작업 시간**: ~6시간 (Phase 1~4)
- **리스크**: 중간 (ADK API 안정성, 레이턴시)

### 기대 효과

| 항목 | 현재 | ADK 연결 후 |
|------|------|------------|
| Technical Implementation (30%) | "Function Calling으로 라우팅" | "ADK Multi-Agent + Function Calling 이중 오케스트레이션" |
| Bonus ADK (+1.0) | ❌ 미획득 | ✅ 획득 |
| 코드 구조 | REST route가 모든 로직 보유 | Agent가 도메인 로직, Route는 HTTP 래퍼 |
| DevPost 설명 | "4 agents defined" (미사용) | "4 ADK agents actively orchestrate REST pipeline" |

### 결론

**D-3 시점에서 6시간 투자로 Bonus +1.0 + Technical 점수 향상은 ROI가 높음.**

단, Phase 1-2까지만 완료해도 "ADK Agent가 도구를 갖추고 있다"는 것은 보여줄 수 있으므로, **시간 부족 시 Phase 3(Route 리팩토링)은 스킵**하고 DevPost에서 아키텍처 다이어그램으로 커버 가능.

---

## 9. 대안 비교

| 옵션 | 작업량 | 해커톤 효과 | 리스크 |
|------|--------|------------|--------|
| **A: 풀 ADK 연결** (이 PRD) | 6시간 | ⭐⭐⭐⭐⭐ | 중간 |
| **B: Agent 도구만 정의** (Phase 1-2만) | 3시간 | ⭐⭐⭐⭐ | 낮음 |
| **C: DevPost 설명만** (코드 변경 없음) | 1시간 | ⭐⭐ | 없음 |

**추천: 옵션 A 시도, 시간 부족 시 B로 폴백.**

---

## 10. ADK 패키지 의존성 확인

현재 `@google/adk`가 `package.json`에 이미 설치되어 있음 (ADK agent 파일들이 `import { LlmAgent } from '@google/adk'`로 사용 중).

확인 필요:
- `FunctionTool` export 존재 여부
- `InMemoryRunner`, `InMemorySessionService` export 존재 여부
- 서버사이드 (Node.js) 환경에서의 동작 여부
