// ============================================================
// 파일: src/back/lib/gemini/errors.ts
// 역할: Gemini API 에러 분류 유틸리티
// ============================================================

export type GeminiErrorCode =
  | 'TIMEOUT'
  | 'CONTENT_FILTERED'
  | 'RATE_LIMITED'
  | 'GENERATION_FAILED';

export interface ClassifiedError {
  code: GeminiErrorCode;
  retryable: boolean;
  httpStatus: number;
}

/**
 * Gemini API 에러 메시지를 분류하여 에러 코드, 재시도 가능 여부, HTTP 상태를 반환한다.
 */
export function classifyGeminiError(message: string): ClassifiedError {
  const upper = message.toUpperCase();

  if (upper.includes('TIMEOUT')) {
    return { code: 'TIMEOUT', retryable: true, httpStatus: 504 };
  }

  if (
    upper.includes('CONTENT_FILTERED') ||
    upper.includes('SAFETY') ||
    upper.includes('BLOCKED') ||
    upper.includes('RECITATION')
  ) {
    return { code: 'CONTENT_FILTERED', retryable: false, httpStatus: 422 };
  }

  if (
    upper.includes('429') ||
    upper.includes('RATE') ||
    upper.includes('QUOTA') ||
    upper.includes('RESOURCE_EXHAUSTED')
  ) {
    return { code: 'RATE_LIMITED', retryable: true, httpStatus: 429 };
  }

  return { code: 'GENERATION_FAILED', retryable: true, httpStatus: 500 };
}
