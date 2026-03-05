// ============================================================
// 파일: src/app/api/session/resume/route.ts
// 담당: Part 1
// 역할: 세션 재연결 — 새 Ephemeral Token 발급
// ============================================================

import { NextResponse } from 'next/server';
import { getGeminiClient } from '@back/lib/gemini/client';
import type { ApiResponse, ResumeSessionResponse, ResumeSessionRequest } from '@shared/types/api';

export async function POST(request: Request): Promise<NextResponse<ApiResponse<ResumeSessionResponse>>> {
  try {
    const body = (await request.json()) as ResumeSessionRequest;

    if (!body.sessionId) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'sessionId is required', retryable: false } },
        { status: 400 },
      );
    }

    const ai = getGeminiClient();

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        wsUrl: token.name ?? '',
        context: '',
        expiresAt: Date.now() + 30 * 60 * 1000,
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
