// ============================================================
// GET /api/museums/search — 박물관 텍스트 검색 (서버 프록시)
// Places API 키를 클라이언트에 노출하지 않음
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type { ApiResponse } from '@shared/types/api';

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

const FETCH_TIMEOUT_MS = 8000;

const QuerySchema = z.object({
  q: z.string().min(2, 'Query must be at least 2 characters'),
  lang: z.string().length(2).default('ko'),
});

/** Places Text Search API 응답의 개별 장소 구조 */
interface TextSearchPlaceResult {
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

interface MuseumSearchItem {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  distanceMeters: number;
  rating?: number;
  openNow?: boolean;
  type: string;
}

type MuseumsData = { museums: MuseumSearchItem[] };

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const parsed = QuerySchema.safeParse({
    q: searchParams.get('q'),
    lang: searchParams.get('lang') ?? undefined,
  });

  if (!parsed.success) {
    const res: ApiResponse<MuseumsData> = {
      success: false,
      error: { code: 'INVALID_PARAMS', message: parsed.error.issues[0]?.message ?? 'Invalid query', retryable: false },
    };
    return NextResponse.json(res, { status: 400 });
  }

  const { q: query, lang } = parsed.data;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    const res: ApiResponse<MuseumsData> = {
      success: false,
      error: { code: 'CONFIG_ERROR', message: 'Places API not configured', retryable: false },
    };
    return NextResponse.json(res, { status: 500 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

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
        languageCode: lang,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Places Text Search error: ${response.status} — ${error}`);
    }

    const data = await response.json();
    const places: TextSearchPlaceResult[] = data.places ?? [];

    const museums: MuseumSearchItem[] = places.map((place) => ({
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

    const res: ApiResponse<MuseumsData> = { success: true, data: { museums } };
    return NextResponse.json(res);
  } catch (err) {
    console.error('[/api/museums/search] Error:', err);
    const res: ApiResponse<MuseumsData> = {
      success: false,
      error: { code: 'SEARCH_FAILED', message: 'Failed to search museums', retryable: true },
    };
    return NextResponse.json(res, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}
