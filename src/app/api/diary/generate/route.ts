// ============================================================
// 파일: src/app/api/diary/generate/route.ts
// 담당: Part 1 (스캐폴드) → Part 4가 실제 구현으로 교체
// ============================================================

import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await request.json();
    return NextResponse.json(
      { success: false, error: 'Not yet implemented' },
      { status: 501 },
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 },
    );
  }
}
