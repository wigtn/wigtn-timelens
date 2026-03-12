// ============================================================
// 파일: src/app/api/diary/generate/route.ts
// 담당: Part 4
// 역할: Diary 생성 API — Gemini 2.5 Flash Image interleaved
// 출처: part4-discovery-diary.md §2.4
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { Modality } from '@google/genai';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { getGeminiClient } from '@back/lib/gemini/client';
import { generateId } from '@back/lib/firebase/firestore';
import { formatZodErrors } from '@back/lib/validation';
import type { DiaryGenerateResponse, DiaryEntry, DiaryVisitInput } from '@shared/types/diary';
import type { ApiResponse } from '@shared/types/api';

const diaryVisitSchema = z.object({
  itemName: z.string().min(1),
  venueName: z.string().optional(),
  era: z.string().optional(),
  civilization: z.string().optional(),
  conversationSummary: z.string().min(1),
});

const diaryRequestSchema = z.object({
  sessionId: z.string().min(1).max(128),
  userId: z.string().min(1),
  visits: z.array(diaryVisitSchema).min(1).max(50),
});

function buildDiaryPrompt(visits: DiaryVisitInput[]): string {
  const visitDescriptions = visits
    .map(
      (v, i) =>
        `${i + 1}. ${v.itemName} (${v.venueName ?? '알 수 없는 장소'})
   시대: ${v.era ?? '미상'}
   문명: ${v.civilization ?? '미상'}
   감상: ${v.conversationSummary}`
    )
    .join('\n\n');

  return `당신은 박물관 방문 다이어리 작가입니다.
아래 방문 기록을 바탕으로 감성적이고 교육적인 박물관 다이어리를 작성해주세요.

## 요구사항
- 시적이고 서정적인 제목을 지어주세요
- 1인칭 시점으로 작성
- 각 유물에 대해 2-3문장의 개인적 감상 + 역사적 통찰을 포함
- 각 유물 설명 후에 수채화/스케치 스타일의 삽화를 하나씩 생성해주세요
- 여행 일기장에 그린 것 같은 따뜻한 느낌의 삽화 (사실적이지 않게)
- 한국어로 작성
- 서두(장면 설정)와 결말(방문 소감)을 포함

## 방문 기록

${visitDescriptions}

다이어리를 시작하세요. 텍스트와 삽화를 번갈아 출력해주세요.`;
}

function parseInterleavedResponse(
  parts: Array<{ text?: string; inlineData?: { mimeType?: string; data?: string } }>
): { title: string; entries: DiaryEntry[] } {
  const entries: DiaryEntry[] = [];
  let order = 0;
  let title = '';

  for (const part of parts) {
    if (part.text) {
      // 첫 텍스트에서 제목 추출
      if (!title) {
        const lines = part.text.trim().split('\n');
        const firstLine = lines[0].replace(/^#+\s*/, '').trim();
        if (firstLine) title = firstLine;
      }
      entries.push({ type: 'text', content: part.text, order: order++ });
    } else if (part.inlineData?.mimeType && part.inlineData?.data) {
      entries.push({
        type: 'image',
        content: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        order: order++,
      });
    }
  }

  if (!title) title = '박물관 다이어리';
  return { title, entries };
}

function generateShareToken(): string {
  return randomBytes(6).toString('base64url').slice(0, 8);
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = diaryRequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: formatZodErrors(parsed.error.issues),
            retryable: false,
          },
        },
        { status: 400 }
      );
    }
    const { visits } = parsed.data;

    // Gemini 2.5 Flash Image로 인터리브 다이어리 생성
    const ai = getGeminiClient();
    const prompt = buildDiaryPrompt(visits);

    const DIARY_TIMEOUT_MS = 60000;
    const response = await Promise.race([
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: [{ role: 'user' as const, parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT: diary generation exceeded 60s')), DIARY_TIMEOUT_MS),
      ),
    ]);

    const responseParts = response.candidates?.[0]?.content?.parts;
    if (!responseParts || responseParts.length === 0) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: 'GENERATION_FAILED',
            message: 'Gemini API returned empty response',
            retryable: true,
          },
        },
        { status: 500 }
      );
    }

    const parts = responseParts.map((p) => ({
      text: p.text ?? undefined,
      inlineData: p.inlineData
        ? { mimeType: p.inlineData.mimeType, data: p.inlineData.data }
        : undefined,
    }));
    const { title, entries } = parseInterleavedResponse(parts);

    // ID + 공유 토큰 생성 (Firestore 저장은 클라이언트에서 수행 — auth context 필요)
    const diaryId = generateId();
    const shareToken = generateShareToken();

    const diaryResponse: DiaryGenerateResponse = {
      success: true,
      diaryId,
      diary: {
        id: diaryId,
        title,
        entries,
        createdAt: Date.now(),
        shareToken,
      },
    };

    return NextResponse.json(diaryResponse);
  } catch (error) {
    console.error('Diary generation error:', error);
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: 'DIARY_GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Diary generation failed',
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
