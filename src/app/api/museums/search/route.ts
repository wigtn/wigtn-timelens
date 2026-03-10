// ============================================================
// GET /api/museums/search — 박물관 텍스트 검색 (서버 프록시)
// Places API 키를 클라이언트에 노출하지 않음
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';

const TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.regularOpeningHours',
  'places.photos',
  'places.primaryTypeDisplayName',
  'places.types',
].join(',');

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q');

  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { success: false, error: 'Query must be at least 2 characters' },
      { status: 400 },
    );
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'Places API not configured' },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(TEXT_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: `${query} museum OR gallery OR heritage`,
        maxResultCount: 10,
        languageCode: 'ko',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Places Text Search error: ${response.status} — ${error}`);
    }

    const data = await response.json();
    interface PlaceResult {
      id: string;
      displayName?: { text: string };
      formattedAddress?: string;
      location?: { latitude: number; longitude: number };
      rating?: number;
      regularOpeningHours?: { openNow?: boolean };
      photos?: Array<{ name: string }>;
      primaryTypeDisplayName?: { text: string };
      types?: string[];
    }
    const places: PlaceResult[] = data.places ?? [];

    const museums = places.map((place) => ({
      id: place.id,
      name: place.displayName?.text ?? 'Unknown',
      address: place.formattedAddress ?? '',
      location: {
        lat: place.location?.latitude ?? 0,
        lng: place.location?.longitude ?? 0,
      },
      distanceMeters: 0,
      rating: place.rating,
      openNow: place.regularOpeningHours?.openNow,
      type: place.primaryTypeDisplayName?.text ?? '',
    }));

    return NextResponse.json({ success: true, museums });
  } catch (err) {
    console.error('[/api/museums/search] Error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to search museums' },
      { status: 500 },
    );
  }
}
