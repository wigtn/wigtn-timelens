// ============================================================
// 파일: src/shared/types/common.ts
// 담당: Part 5 (인프라) 가 생성, 모든 파트가 참조
// 출처: shared-contract.md §A
// ============================================================

// --- 에이전트 ---
export type AgentType = 'curator' | 'restoration' | 'discovery' | 'diary';

// --- 세션 ---
export type SessionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'expired';

// --- 유물 카테고리 ---
export type ArtifactCategory =
  | 'pottery'
  | 'sculpture'
  | 'painting'
  | 'weapon'
  | 'jewelry'
  | 'textile'
  | 'coin'
  | 'mosaic'
  | 'inscription'
  | 'fossil'
  | 'mask';

export type HeritageCategory =
  | 'artifact'
  | 'monument'
  | 'building'
  | 'painting'
  | 'sculpture';

export type Material =
  | 'marble'
  | 'bronze'
  | 'ceramic'
  | 'gold'
  | 'stone'
  | 'wood'
  | 'iron'
  | 'glass';

export type Civilization =
  | 'Greek'
  | 'Roman'
  | 'Egyptian'
  | 'Mesopotamian'
  | 'Chinese'
  | 'Japanese'
  | 'Korean'
  | 'Indian'
  | 'Persian'
  | 'Mayan'
  | 'Other';

// --- 연결 단계 (모바일 전용 UI) ---
export type ConnectionStage =
  | 'idle'
  | 'auth'
  | 'token'
  | 'websocket'
  | 'audio'
  | 'camera'
  | 'ready';

// --- Knowledge Panel ---
export type PanelState = 'closed' | 'mini' | 'expanded' | 'fullscreen';

// --- 오디오 ---
export type AudioState = 'idle' | 'listening' | 'speaking' | 'generating';

// --- 에러 ---
export interface AppError {
  code: string;
  message: string;
  recoverable: boolean;
  action?: 'retry' | 'fallback' | 'manual';
}
