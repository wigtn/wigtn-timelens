// ============================================================
// GET /api/museums/nearby — 근처 박물관 검색 (서버 프록시)
// Places API 키를 클라이언트에 노출하지 않음
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { searchNearbyPlaces } from '@back/lib/geo/places';
import type { ApiResponse } from '@shared/types/api';
import type { NearbyPlace } from '@shared/types/discovery';

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(100).max(50000).default(2000),
});

type MuseumsData = { museums: NearbyPlace[] };

export async function GET(request: NextRequest) {
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    const res: ApiResponse<MuseumsData> = {
      success: false,
      error: { code: 'NOT_CONFIGURED', message: 'Museum search requires GOOGLE_PLACES_API_KEY', retryable: false },
    };
    return NextResponse.json(res, { status: 501 });
  }

  const { searchParams } = request.nextUrl;
  const parsed = QuerySchema.safeParse({
    lat: searchParams.get('lat'),
    lng: searchParams.get('lng'),
    radius: searchParams.get('radius') ?? undefined,
  });

  if (!parsed.success) {
    const res: ApiResponse<MuseumsData> = {
      success: false,
      error: { code: 'INVALID_PARAMS', message: 'Valid lat and lng are required', retryable: false },
    };
    return NextResponse.json(res, { status: 400 });
  }

  const { lat, lng, radius } = parsed.data;

  try {
    const museums = await searchNearbyPlaces(lat, lng, radius);
    const res: ApiResponse<MuseumsData> = { success: true, data: { museums } };
    return NextResponse.json(res);
  } catch (err) {
    console.error('[/api/museums/nearby] Error:', err);
    const res: ApiResponse<MuseumsData> = {
      success: false,
      error: { code: 'SEARCH_FAILED', message: 'Failed to search nearby museums', retryable: true },
    };
    return NextResponse.json(res, { status: 500 });
  }
}
