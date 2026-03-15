#!/usr/bin/env npx tsx
// ============================================================
// ADK Multi-Agent Demo Script
// 실행: GEMINI_API_KEY=... npx tsx scripts/adk-demo.ts
//
// TimeLens의 ADK 에이전트 오케스트레이션을 시연합니다.
// - Orchestrator가 사용자 의도를 분석하고 적절한 sub-agent로 라우팅
// - 각 sub-agent가 FunctionTool을 통해 실제 API를 호출
// ============================================================

import { InMemoryRunner, InMemorySessionService, type Event } from '@google/adk';
import type { Part } from '@google/genai';
import { orchestrator } from '../src/back/agents/orchestrator';

const SESSION_USER = 'demo-user';
const SESSION_ID = 'demo-session-001';

// ── 데모 시나리오 ──
const DEMO_SCENARIOS = [
  {
    label: '🏛️ 유물 설명 요청 (→ curator_agent)',
    message: '그리스 암포라에 대해 설명해줘',
  },
  {
    label: '🔮 복원 요청 (→ restoration_agent)',
    message: '파르테논 신전을 원래 모습으로 복원해줘. 기원전 438년에 완공된 건축물이야.',
  },
  {
    label: '🗺️ 주변 탐색 요청 (→ discovery_agent)',
    message: '내 근처 박물관 찾아줘. 현재 위치는 위도 37.5236, 경도 127.0234야.',
  },
  {
    label: '📔 다이어리 요청 (→ diary_agent)',
    message:
      '오늘 방문 다이어리를 만들어줘. 국립중앙박물관에서 금동미륵보살반가사유상과 청자상감운학문매병을 관람했어.',
  },
];

/** ADK Event의 주요 정보를 콘솔에 출력 */
function logEvent(event: Event): void {
  const agent = event.author ?? 'unknown';
  const parts: Part[] = event.content?.parts ?? [];

  for (const part of parts) {
    if (part.functionCall) {
      console.log(`   🔧 [${agent}] Tool Call: ${part.functionCall.name}`);
      console.log(`      Args: ${JSON.stringify(part.functionCall.args).slice(0, 200)}`);
    } else if (part.functionResponse) {
      console.log(`   ✅ [${agent}] Tool Result: ${part.functionResponse.name}`);
      const resp = JSON.stringify(part.functionResponse.response).slice(0, 200);
      console.log(`      Response: ${resp}`);
    } else if (part.text?.trim()) {
      const text = part.text;
      console.log(`   💬 [${agent}]: ${text.slice(0, 300)}${text.length > 300 ? '...' : ''}`);
    }
  }
}

async function runDemo() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     TimeLens ADK Multi-Agent Orchestration Demo         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log();

  // Runner + Session 초기화
  const sessionService = new InMemorySessionService();
  const runner = new InMemoryRunner({
    agent: orchestrator,
    appName: 'timelens-demo',
    sessionService,
  });

  // 세션 생성
  const session = await sessionService.createSession({
    appName: 'timelens-demo',
    userId: SESSION_USER,
    sessionId: SESSION_ID,
  });

  console.log(`✅ Session created: ${session.id}`);
  console.log(`   App: timelens-demo | User: ${SESSION_USER}`);
  console.log();

  // 데모 시나리오 실행 (첫 번째만 — API 호출 비용 절약)
  const scenario = DEMO_SCENARIOS[0];
  console.log('─'.repeat(60));
  console.log(`\n${scenario.label}`);
  console.log(`📝 User: "${scenario.message}"`);
  console.log();

  const startTime = Date.now();

  try {
    const events = runner.runAsync({
      userId: SESSION_USER,
      sessionId: session.id,
      newMessage: {
        role: 'user',
        parts: [{ text: scenario.message }],
      },
    });

    let eventCount = 0;
    for await (const event of events) {
      eventCount++;
      logEvent(event);
    }

    const elapsed = Date.now() - startTime;
    console.log(`\n   ⏱️  ${eventCount} events in ${elapsed}ms`);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.log(`   ❌ Error after ${elapsed}ms: ${error instanceof Error ? error.message : error}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log('\n📋 등록된 에이전트 구조:');
  console.log('');
  console.log('   timelens_orchestrator (Gemini 2.5 Flash)');
  console.log('   ├── curator_agent        — 유물 인식 & 역사 해설');
  console.log('   ├── restoration_agent    — 복원 이미지 생성');
  console.log('   │   └── 🔧 generate_restoration_image (Gemini Flash Image)');
  console.log('   ├── discovery_agent      — 주변 유적지 탐색');
  console.log('   │   └── 🔧 search_nearby_places (Google Places API)');
  console.log('   └── diary_agent          — 방문 다이어리 생성');
  console.log('       └── 🔧 generate_diary (Gemini Pro Image interleaved)');
  console.log();

  // 추가 시나리오 목록 출력 (실행은 안 함)
  console.log('📝 추가 데모 시나리오 (API 비용으로 스킵):');
  for (let i = 1; i < DEMO_SCENARIOS.length; i++) {
    console.log(`   ${DEMO_SCENARIOS[i].label}`);
    console.log(`   → "${DEMO_SCENARIOS[i].message}"`);
  }
  console.log();
}

runDemo().catch(console.error);
