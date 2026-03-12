// ============================================================
// 파일: src/app/api/session/resume/route.ts
// 담당: Part 1
// 역할: 세션 재연결 — 새 Ephemeral Token 발급
// ============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getGeminiClient } from '@back/lib/gemini/client';
import { createEphemeralToken } from '@back/lib/gemini/token';
import { formatZodErrors } from '@back/lib/validation';
import type { ApiResponse, ResumeSessionResponse } from '@shared/types/api';

const resumeSessionSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
});

export async function POST(request: Request): Promise<NextResponse<ApiResponse<ResumeSessionResponse>>> {
  try {
    const raw = await request.json();
    const parsed = resumeSessionSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: formatZodErrors(parsed.error.issues), retryable: false } },
        { status: 400 },
      );
    }

    const ai = getGeminiClient();
    const token = await createEphemeralToken(ai);

    return NextResponse.json({
      success: true,
      data: {
        wsUrl: token.name,
        context: '',
        expiresAt: token.expiresAt,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: { code: 'RESUME_FAILED', message, retryable: true } },
      { status: 500 },
    );
  }
}
