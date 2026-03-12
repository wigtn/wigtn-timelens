// ============================================================
// 파일: src/app/api/restore/video/route.ts
// 역할: POST /api/restore/video — 복원 이미지 → Veo 3.1 영상 생성
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getGeminiClient } from '@back/lib/gemini/client';
import { formatZodErrors } from '@back/lib/validation';
import type { ApiResponse } from '@shared/types/api';

const VEO_MODEL = 'veo-3.1-generate-preview';
const MAX_POLL_ATTEMPTS = 18; // 18 * 10s = 180s max
const POLL_INTERVAL_MS = 10_000;

interface VideoGenerationResponse {
  videoUrl: string;
  mimeType: string;
}

const videoRequestSchema = z.object({
  imageBase64: z.string().min(1),
  mimeType: z.string().default('image/png'),
  artifactName: z.string().min(1),
  era: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = videoRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { code: 'VALIDATION_ERROR', message: formatZodErrors(parsed.error.issues), retryable: false } },
        { status: 400 },
      );
    }

    const { imageBase64, mimeType, artifactName, era } = parsed.data;
    const client = getGeminiClient();

    const prompt = `Cinematic time-lapse showing the historical restoration of "${artifactName}" from the ${era} era. ` +
      `The scene begins with the artifact in its current damaged state and smoothly transforms into its original pristine glory. ` +
      `Camera slowly pans across the artifact as colors become vivid, missing pieces reform, and details sharpen. ` +
      `Warm golden lighting, museum atmosphere, 4 seconds.`;

    // Start video generation with the restoration image as reference
    let operation = await client.models.generateVideos({
      model: VEO_MODEL,
      prompt,
      image: {
        imageBytes: imageBase64,
        mimeType,
      },
      config: {
        aspectRatio: '16:9',
        numberOfVideos: 1,
      },
    });

    // Poll until complete (blocks up to 180s — Cloud Run timeout must be >= 180s)
    let attempts = 0;
    while (!operation.done && attempts < MAX_POLL_ATTEMPTS) {
      attempts++;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      operation = await client.operations.getVideosOperation({ operation });
    }

    if (!operation.done) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { code: 'TIMEOUT', message: 'Video generation timed out', retryable: true } },
        { status: 504 },
      );
    }

    // @google/genai SDK types don't expose generatedVideos on operation.response yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const video = (operation as any).response?.generatedVideos?.[0]?.video;
    if (!video?.uri) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { code: 'GENERATION_FAILED', message: 'No video generated', retryable: true } },
        { status: 500 },
      );
    }

    return NextResponse.json<ApiResponse<VideoGenerationResponse>>({
      success: true,
      data: {
        videoUrl: video.uri,
        mimeType: video.mimeType || 'video/mp4',
      },
    });
  } catch (error) {
    console.error('[/api/restore/video] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: 'INTERNAL_ERROR', message, retryable: true } },
      { status: 500 },
    );
  }
}
