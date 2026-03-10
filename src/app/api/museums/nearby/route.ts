// ============================================================
// GET /api/museums/nearby — 근처 박물관 검색 (서버 프록시)
// Places API 키를 클라이언트에 노출하지 않음
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { searchNearbyPlaces } from '@back/lib/geo/places';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));
  const radius = Number(searchParams.get('radius')) || 2000;

  if (!lat || !lng || Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(
      { success: false, error: 'lat and lng are required' },
      { status: 400 },
    );
  }

  try {
    const museums = await searchNearbyPlaces(lat, lng, radius);
    return NextResponse.json({ success: true, museums });
  } catch (err) {
    console.error('[/api/museums/nearby] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to search nearby museums' },
      { status: 500 },
    );
  }
}
