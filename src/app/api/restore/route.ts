// ============================================================
// 파일: src/app/api/restore/route.ts
// 담당: Part 3 (Part 1 스캐폴드 교체)
// 역할: POST /api/restore — 복원 이미지 생성 REST API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient } from '@back/lib/gemini/client';
import {
  buildRestorationPrompt,
  generateRestorationImage,
} from '@back/lib/gemini/flash-image';
import type {
  RestorationRequest,
  RestorationResponse,
  RestorationErrorResponse,
} from '@shared/types/restoration';

const MAX_IMAGE_SIZE = 7 * 1024 * 1024; // 7MB

export async function POST(
  request: NextRequest,
): Promise<NextResponse<RestorationResponse | RestorationErrorResponse>> {
  try {
    const body = (await request.json()) as RestorationRequest;

    // 필수 필드 검증
    if (!body.artifactName || !body.era) {
      return NextResponse.json(
        {
          success: false as const,
          error: 'artifactName and era are required',
          code: 'GENERATION_FAILED' as const,
          retryable: false,
        },
        { status: 400 },
      );
    }

    // 참조 이미지 크기 검증
    if (body.referenceImage) {
      const approximateBytes = (body.referenceImage.length * 3) / 4;
      if (approximateBytes > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          {
            success: false as const,
            error: 'Reference image exceeds 7MB limit',
            code: 'GENERATION_FAILED' as const,
            retryable: false,
          },
          { status: 400 },
        );
      }
    }

    // Gemini 클라이언트 획득
    const client = getGeminiClient();

    // 프롬프트 생성
    const prompt = buildRestorationPrompt({
      artifactName: body.artifactName,
      era: body.era,
      artifactType: body.artifactType,
      damageDescription: body.damageDescription,
      isArchitecture: body.isArchitecture,
      siteName: body.siteName,
      currentDescription: body.currentDescription,
    });

    // 이미지 생성 호출
    const startTime = Date.now();

    const result = await generateRestorationImage(client, {
      prompt,
      referenceImage: body.referenceImage
        ? { data: body.referenceImage, mimeType: 'image/jpeg' }
        : undefined,
      timeoutMs: 30000,
    });

    const generationTimeMs = Date.now() - startTime;

    // data URL로 반환 (Cloud Storage 업로드는 추후 최적화)
    const imageUrl = `data:${result.mimeType};base64,${result.imageBase64}`;

    return NextResponse.json({
      success: true as const,
      imageUrl,
      description: result.description,
      era: body.era,
      generationTimeMs,
    });
  } catch (error) {
    console.error('[/api/restore] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    let code: RestorationErrorResponse['code'] = 'GENERATION_FAILED';
    let retryable = true;
    let status = 500;

    if (message.includes('TIMEOUT')) {
      code = 'TIMEOUT';
      retryable = true;
      status = 504;
    } else if (
      message.includes('SAFETY') ||
      message.includes('blocked') ||
      message.includes('filtered')
    ) {
      code = 'CONTENT_FILTERED';
      retryable = false;
      status = 422;
    } else if (
      message.includes('429') ||
      message.includes('RATE') ||
      message.includes('quota')
    ) {
      code = 'RATE_LIMITED';
      retryable = true;
      status = 429;
    }

    return NextResponse.json(
      {
        success: false as const,
        error: message,
        code,
        retryable,
      },
      { status },
    );
  }
}
