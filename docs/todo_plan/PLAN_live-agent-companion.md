# Task Plan: Live Agent Companion

> **Generated from**: docs/prd/PRD_live-agent-companion.md
> **Created**: 2026-03-05
> **Status**: pending

## Execution Config

| Option | Value | Description |
|--------|-------|-------------|
| `auto_commit` | true | 완료 시 자동 커밋 |
| `commit_per_phase` | true | Phase별 중간 커밋 |
| `quality_gate` | true | /auto-commit 품질 검사 |

## Phases

### Phase 1: 능동적 AI 심장 (Core)
- [ ] `tools.ts` 시스템 프롬프트 전면 리팩토링
- [ ] `live-api.ts` sendWelcomePrompt() 추가
- [ ] `use-live-session.ts` connectionStage 상태 추가
- [ ] `session/page.tsx` 연결 단계별 UX 오버레이
- [ ] tsc + lint 검증

### Phase 2: 실시간 UI (Presence)
- [ ] `LiveTranscript.tsx` 신규 생성
- [ ] `AudioVisualizer.tsx` idle 숨쉬기 애니메이션
- [ ] `CameraView.tsx` ScanLine 오버레이
- [ ] `session/page.tsx` LiveTranscript 통합 + speaking 시 패널 자동 열기
- [ ] `capture.ts` 1fps → 2fps
- [ ] tsc + lint 검증

### Phase 3: 대화 기능 확장 (Companion)
- [ ] `tools.ts` navigate_exhibit, generate_historical_scene, suggest_next 함수 선언
- [ ] `live-api.ts` 3개 핸들러 (handleNavigation, handleHistoricalScene, handleSuggestNext)
- [ ] `api/scene/route.ts` 신규 생성 (히스토리컬 씬 API)
- [ ] `ExhibitSelector.tsx` 신규 생성
- [ ] `HistoricalScene.tsx` 신규 생성
- [ ] `use-live-session.ts` exhibitOptions + historicalScene 상태
- [ ] `session/page.tsx` ExhibitSelector + HistoricalScene 통합
- [ ] `types/live-session.ts` 타입 추가
- [ ] tsc + lint 검증

### Phase 4: 품질 검증
- [ ] 전체 tsc --noEmit 통과
- [ ] 전체 eslint 통과
- [ ] 브라우저 E2E 수동 테스트

## Progress

| Metric | Value |
|--------|-------|
| Total Tasks | 0/20 |
| Current Phase | - |
| Status | pending |

## Execution Log

| Timestamp | Phase | Task | Status |
|-----------|-------|------|--------|
| - | - | - | - |
