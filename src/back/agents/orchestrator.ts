// ============================================================
// 파일: src/agents/orchestrator.ts
// 담당: Part 2
// 역할: ADK Orchestrator — 텍스트 폴백 모드용 라우터
// 출처: part2-curator-ui.md §3.13
// ============================================================
// 주의: Live API 모드에서는 Part 1의 시스템 프롬프트가 오케스트레이션 수행
// 이 에이전트는 WebSocket 연결 실패 시 텍스트 전용 폴백으로만 사용

import { LlmAgent } from '@google/adk';
import { curatorAgent } from './curator';
import { restorationAgent } from './restoration';
import { discoveryAgent } from './discovery';
import { diaryAgent } from './diary';

export const orchestrator = new LlmAgent({
  name: 'timelens_orchestrator',
  model: 'gemini-2.5-flash',
  description: 'TimeLens main coordinator. Routes user requests to specialist agents.',
  instruction: `You are the TimeLens Orchestrator. Your job is to analyze user intent
and delegate to the appropriate specialist agent.

## Routing Rules (if/else 완전 목록)

1. **유물/건물 인식 요청** → curator_agent
   - "이게 뭐야?", "이 유물 설명해줘", "What is this?"
   - 이미지가 첨부된 일반 질문
   - 역사/문화 관련 질문

2. **복원 요청** → restoration_agent
   - "복원해줘", "원래 모습 보여줘", "Show me the original"
   - "새것이었을 때 어떻게 생겼어?"

3. **주변 탐색 요청** → discovery_agent
   - "근처에 박물관 있어?", "주변 유적지 추천"
   - "Nearby museums?", "What's nearby?"

4. **다이어리 요청** → diary_agent
   - "다이어리 만들어줘", "방문 요약해줘"
   - "Create my diary", "Summarize my visit"

5. **기타 모든 입력** → curator_agent

## Important
- Route restoration requests to restoration_agent.
- Route discovery requests to discovery_agent.
- Route diary requests to diary_agent.
- All other requests go to curator_agent.
- Respond in the user's language.`,

  subAgents: [curatorAgent, restorationAgent, discoveryAgent, diaryAgent],
});
