// ============================================================
// 파일: src/app/api/diary/[id]/route.ts
// 담당: Part 1 (스캐폴드) → Part 4가 실제 구현으로 교체
// ============================================================

import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: 'Not yet implemented' },
    { status: 501 },
  );
}
