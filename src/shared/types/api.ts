// ============================================================
// 파일: src/types/api.ts
// Part 5가 공통 에러 형식 정의
// Part 1/3/4가 각 엔드포인트 구현
// 출처: shared-contract.md §F
// ============================================================

// --- 공통 API 응답 ---
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// --- POST /api/session ---
export interface CreateSessionRequest {
  language: string;
  userId?: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  wsUrl: string;
  expiresAt: number;
}

// --- POST /api/session/resume ---
export interface ResumeSessionRequest {
  sessionId: string;
}

export interface ResumeSessionResponse {
  wsUrl: string;
  context: string;
  expiresAt: number;
}

// --- GET /api/health ---
export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  uptime: number;
  services: {
    liveApi: boolean;
    imageGen: boolean;
    firebase: boolean;
    placesApi: boolean;
  };
}
