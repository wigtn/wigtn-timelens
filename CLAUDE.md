# TimeLens — Claude Code Instructions

## Project
TimeLens: AI Cultural Heritage Companion (Gemini Live Agent Challenge)
Deadline: 2026-03-16 17:00 PT = 2026-03-17 09:00 KST
Stack: Next.js 15, React 19, TypeScript 5, Tailwind 4, shadcn/ui, `@google/genai`, `@google/adk`, Firebase, Cloud Run

## Source of Truth (충돌 시 우선순위)
1. env var / model ID → `docs/contracts/gemini-sdk-reference.md` (gitignored, local only)
2. 타입 / 파일 소유권 → `docs/contracts/shared-contract.md` (gitignored, local only)
3. 아키텍처 설계 → `docs/design/architecture.md`
4. UI 플로우 → `docs/prd/timelens-ui-flow.md`

## 아키텍처 결정 (확정)
- **오케스트레이션**: Live API 시스템 프롬프트 + Function Calling이 메인 라우팅. ADK Orchestrator는 텍스트 폴백 전용.
- **듀얼 파이프라인**: Pipeline 1 = Live API (스트리밍 오디오/비디오), Pipeline 2 = REST (이미지 생성 등)
- **ADK**: 텍스트 폴백 에이전트 (Orchestrator + curator/restoration/discovery/diary). Live 경로에서는 사용하지 않음. 동일 백엔드 API 공유.
- **SDK 사용**: `@google/genai` ^1.43 (Live API, 이미지 생성, Function Declaration), `@google/adk` ^0.3 (LlmAgent, FunctionTool, InMemoryRunner)

### Gemini 모델
| 모델 ID | 용도 | 파이프라인 |
|---------|------|----------|
| `gemini-2.5-flash-native-audio-preview-12-2025` | Live 음성/영상 대화 | Pipeline 1 (Live) |
| `gemini-2.5-flash-image` | 복원 이미지 생성 | Pipeline 2 (REST) |
| `gemini-3-pro-image-preview` | 다이어리 (텍스트+삽화) | Pipeline 2 (REST) |
| `gemini-2.5-flash` | ADK 에이전트 라우팅/응답 | ADK (텍스트 폴백) |

### ADK 에이전트 구조
```
src/back/agents/
├── orchestrator.ts        # 텍스트 의도 분석 → sub-agent 위임
├── curator.ts             # 유물 설명 (도구 없음, 순수 LLM)
├── restoration.ts         # → tools/restoration-tool.ts (Gemini Flash Image)
├── discovery.ts           # → tools/discovery-tool.ts (Google Places API)
├── diary.ts               # → tools/diary-tool.ts (Gemini 3 Pro Image)
└── tools/
    ├── restoration-tool.ts  # FunctionTool: generate_restoration_image
    ├── discovery-tool.ts    # FunctionTool: search_nearby_places
    └── diary-tool.ts        # FunctionTool: generate_diary
```

### API 키 요구사항
- **필수**: `GOOGLE_GENAI_API_KEY` — 이 키 하나로 모든 핵심 기능 동작
- **선택**: Firebase 키 — 세션 저장/다이어리 공유 (없으면 graceful degradation)
- **선택**: Places API 키 — 주변 탐색 (없으면 501 NOT_CONFIGURED 반환)

## 구현 상태
모든 Part 구현 완료 (Part 1~5 + Integration + UX Overhaul). 현재는 배포/문서/마무리 단계.

## 컴포넌트 파일명
PascalCase 사용 (예: `CameraView.tsx`, 아닌 `camera-view.tsx`).

## Ralph 반복 프로토콜
코드 변경 후 반드시 이 사이클을 따릅니다:
1. **Execute** — 코드 작성/수정
2. **Verify** — `npx tsc --noEmit` + `npm run lint` 실행
3. **Fix** — 에러가 있으면 즉시 수정
4. **Loop** — 2-3 반복 (최대 10회). 10회 초과 시 STOP하고 블로커 보고
5. **Persist** — PROGRESS.md 업데이트 (완료 항목 체크, 세션 로그 추가)

검증 실패 상태에서 작업 완료를 선언하지 마세요.

## 진행 추적
- 매 세션 시작 시 `PROGRESS.md`를 읽고 현재 상태 파악
- 의미 있는 작업 완료 후 `PROGRESS.md` 업데이트

## 코딩 규칙
- `@shared/`, `@back/`, `@web/` 경로 별칭으로 import
- API route는 Zod 검증 + `ApiResponse<T>` 형태 반환
- `any` 타입, `@ts-ignore` 금지
- `@google/genai` 사용 (deprecated `@google/generative-ai` 아님)
- ADK 도구는 `@google/genai`의 `Type`/`Schema` 사용 (Zod 아님 — v3/v4 호환 문제)

## 커밋 규칙
`feat(part-N): description` 또는 `refactor:`, `docs:`, `fix:` 등 conventional commits 형식. Quality Score 포함.
