# TimeLens — Claude Code Instructions

## Project
TimeLens: AI Cultural Heritage Companion (Gemini Live Agent Challenge)
Deadline: 2026-03-16 17:00 PT = 2026-03-17 09:00 KST
Stack: Next.js 15, React 19, TypeScript 5, Tailwind 4, shadcn/ui, @google/genai, Firebase, Cloud Run

## Source of Truth (충돌 시 우선순위)
1. env var / model ID → `docs/contracts/gemini-sdk-reference.md`
2. 타입 / 파일 소유권 → `docs/contracts/shared-contract.md`
3. 파트별 설계 → `docs/design/part{1-5}-*.md`
4. UI 플로우 → `docs/prd/timelens-ui-flow.md`

## 아키텍처 결정 (확정)
- **오케스트레이션**: Live API 시스템 프롬프트 + Function Calling이 메인 라우팅. ADK Orchestrator는 텍스트 폴백 전용.
- **듀얼 파이프라인**: Pipeline 1 = Live API (스트리밍 오디오/비디오), Pipeline 2 = REST (이미지 생성 등)
- **ADK**: 서버 REST 에이전트 전용 (Part 3 Restoration, Part 4 Discovery/Diary). Live 경로에서는 사용하지 않음.

## 구현 순서 (엄격)
Part 5 (scaffold) → Part 1 (core) → Part 2/3/4 (병렬, 파일 겹침 없음)

**Part 5를 반드시 최초로 실행**: package.json 생성 + `npm install` 완료 후에야 tsc/lint/prettier가 동작합니다. Part 5 없이 다른 파트를 시작하면 Ralph 검증 훅이 스킵되어 품질 보장이 불가능합니다.

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
- `@/types/*` 경로 별칭으로 타입 import (shared-contract.md 기준)
- API route는 Zod 검증 + `ApiResponse<T>` 형태 반환
- `any` 타입, `@ts-ignore` 금지
- `@google/genai` 사용 (deprecated `@google/generative-ai` 아님)
- 다른 파트 소유 파일 수정 금지 (shared-contract.md §L 참조)

## 커밋 규칙
`feat(part-N): description` 형식. Quality Score 포함.
