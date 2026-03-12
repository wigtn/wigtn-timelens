// ============================================================
// 파일: src/app/api/session/route.ts
// 담당: Part 1
// 역할: 세션 생성 + Ephemeral Token 발급
// ============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getGeminiClient } from '@back/lib/gemini/client';
import { createEphemeralToken } from '@back/lib/gemini/token';
import { formatZodErrors } from '@back/lib/validation';
import type { ApiResponse, CreateSessionResponse } from '@shared/types/api';

const createSessionSchema = z.object({
  language: z.string().min(1, 'language is required'),
});

export async function POST(request: Request): Promise<NextResponse<ApiResponse<CreateSessionResponse>>> {
  try {
    const raw = await request.json();
    const parsed = createSessionSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: formatZodErrors(parsed.error.issues), retryable: false } },
        { status: 400 },
      );
    }

    const ai = getGeminiClient();
    const token = await createEphemeralToken(ai);
    const sessionId = crypto.randomUUID();

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        wsUrl: token.name,
        expiresAt: token.expiresAt,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: { code: 'TOKEN_CREATION_FAILED', message, retryable: true } },
      { status: 500 },
    );
  }
}
