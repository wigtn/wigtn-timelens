// ============================================================
// 파일: src/types/restoration.ts
// Part 1이 Tool Call 이벤트 전달, Part 3이 REST API + UI 구현
// 출처: shared-contract.md §C
// ============================================================

import type { ArtifactCategory } from './common';

// --- Live API가 발생시키는 Tool Call ---
export interface RestorationToolCall {
  tool: 'generate_restoration';
  params: {
    artifact_name: string;
    era: string;
    artifact_type?: string;
    damage_description?: string;
    site_name?: string;
    current_description?: string;
  };
}

// --- REST API: POST /api/restore ---
export interface RestorationRequest {
  artifactName: string;
  era: string;
  artifactType?: ArtifactCategory;
  damageDescription?: string;
  referenceImage?: string;
  isArchitecture: boolean;
  siteName?: string;
  currentDescription?: string;
}

export interface RestorationResponse {
  success: true;
  imageUrl: string;
  description: string;
  era: string;
  generationTimeMs: number;
}

export interface RestorationErrorResponse {
  success: false;
  error: string;
  code: 'GENERATION_FAILED' | 'TIMEOUT' | 'CONTENT_FILTERED' | 'RATE_LIMITED';
  retryable: boolean;
}

// --- Tool Result -> UI로 전달되는 결과 ---
export interface RestorationResult {
  type: 'restoration';
  imageUrl: string;
  description: string;
  artifactName: string;
  era: string;
  referenceImageUrl?: string;
}

// --- Before/After 슬라이더 상태 ---
export type RestorationUIState =
  | { status: 'idle' }
  | { status: 'loading'; progress: number; artifactName: string; era: string }
  | { status: 'ready'; data: RestorationResult }
  | { status: 'error'; error: string; retryable: boolean };
