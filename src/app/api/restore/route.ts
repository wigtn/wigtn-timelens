// ============================================================
// 파일: src/app/api/restore/route.ts
// 담당: Part 3 (Part 1 스캐폴드 교체)
// 역할: POST /api/restore — 복원 이미지 생성 REST API
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGeminiClient } from '@back/lib/gemini/client';
import {
  buildRestorationPrompt,
  generateRestorationImage,
} from '@back/lib/gemini/flash-image';
import { classifyGeminiError } from '@back/lib/gemini/errors';
import { formatZodErrors } from '@back/lib/validation';
import type {
  RestorationResponse,
  RestorationErrorResponse,
} from '@shared/types/restoration';

const MAX_IMAGE_SIZE = 7 * 1024 * 1024; // 7MB

const restoreRequestSchema = z.object({
  artifactName: z.string().min(1),
  era: z.string().min(1),
  artifactType: z.string().optional(),
  damageDescription: z.string().optional(),
  referenceImage: z.string().optional(),
  referenceImageMimeType: z.string().optional(),
  isArchitecture: z.boolean(),
  siteName: z.string().optional(),
  currentDescription: z.string().optional(),
});

export async function POST(
  request: NextRequest,
): Promise<NextResponse<RestorationResponse | RestorationErrorResponse>> {
  try {
    const raw = await request.json();
    const parsed = restoreRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false as const,
          error: formatZodErrors(parsed.error.issues),
          code: 'GENERATION_FAILED' as const,
          retryable: false,
        },
        { status: 400 },
      );
    }

    const body = parsed.data;

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

    const client = getGeminiClient();

    const prompt = buildRestorationPrompt({
      artifactName: body.artifactName,
      era: body.era,
      artifactType: body.artifactType,
      damageDescription: body.damageDescription,
      isArchitecture: body.isArchitecture,
      siteName: body.siteName,
      currentDescription: body.currentDescription,
    });

    const startTime = Date.now();

    const result = await generateRestorationImage(client, {
      prompt,
      referenceImage: body.referenceImage
        ? { data: body.referenceImage, mimeType: body.referenceImageMimeType ?? 'image/jpeg' }
        : undefined,
      timeoutMs: 60000,
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
    const classified = classifyGeminiError(message);

    return NextResponse.json(
      {
        success: false as const,
        error: message,
        code: classified.code,
        retryable: classified.retryable,
      },
      { status: classified.httpStatus },
    );
  }
}
