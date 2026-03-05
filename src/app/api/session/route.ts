// ============================================================
// 파일: src/app/api/session/route.ts
// 담당: Part 1
// 역할: 세션 생성 + Ephemeral Token 발급
// ============================================================

import { NextResponse } from 'next/server';
import { getGeminiClient } from '@back/lib/gemini/client';
import type { ApiResponse, CreateSessionResponse, CreateSessionRequest } from '@shared/types/api';

export async function POST(request: Request): Promise<NextResponse<ApiResponse<CreateSessionResponse>>> {
  try {
    const body = (await request.json()) as CreateSessionRequest;

    if (!body.language) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'language is required', retryable: false } },
        { status: 400 },
      );
    }

    const ai = getGeminiClient();

    // Ephemeral Token 생성
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });

    const sessionId = crypto.randomUUID();

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        wsUrl: token.name ?? '',
        expiresAt: Date.now() + 30 * 60 * 1000,
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
