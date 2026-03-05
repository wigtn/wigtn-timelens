// ============================================================
// 파일: src/app/api/diary/[id]/route.ts
// 담당: Part 4
// 역할: Diary 조회 API
// 출처: part4-discovery-diary.md §2.5
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDiary } from '@back/lib/firebase/firestore';
import { toDiaryData } from '@back/lib/diary-utils';
import type { DiaryData } from '@shared/types/diary';
import type { ApiResponse, ApiSuccessResponse } from '@shared/types/api';

// Firestore auto-ID: 20 alphanumeric chars
const DIARY_ID_RE = /^[a-zA-Z0-9]{1,40}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !DIARY_ID_RE.test(id)) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'Diary ID is required and must be alphanumeric',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    const diaryDoc = await getDiary(id);
    if (!diaryDoc) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '다이어리를 찾을 수 없습니다',
            retryable: false,
          },
        },
        { status: 404 }
      );
    }

    const diary: DiaryData = toDiaryData(diaryDoc);

    return NextResponse.json<ApiSuccessResponse<DiaryData>>({
      success: true,
      data: diary,
    });
  } catch (error) {
    console.error('Diary fetch error:', error);
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: 'DIARY_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch diary',
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
