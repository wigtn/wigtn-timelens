// ============================================================
// 파일: src/back/lib/validation.ts
// 역할: Zod 검증 에러 포맷 공유 유틸리티
// ============================================================

import type { ZodIssue } from 'zod';

/**
 * Zod 이슈 배열을 사람이 읽기 좋은 문자열로 변환한다.
 */
export function formatZodErrors(issues: ZodIssue[]): string {
  return issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
}
