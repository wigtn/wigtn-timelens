// ============================================================
// 파일: src/lib/geo/places.ts
// 담당: Part 4
// 역할: Google Places API (New) 래퍼
// 출처: part4-discovery-diary.md §2.1
// ============================================================

import type { NearbyPlace } from '@/types/discovery';

const NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.regularOpeningHours',
  'places.photos',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.editorialSummary',
  'places.types',
].join(',');

const INCLUDED_TYPES = [
  'museum',
  'art_gallery',
  'tourist_attraction',
  'historical_place',
  'cultural_landmark',
  'monument',
];

interface PlaceResult {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  regularOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
  photos?: Array<{ name: string; widthPx: number; heightPx: number }>;
  primaryType?: string;
  primaryTypeDisplayName?: { text: string };
  editorialSummary?: { text: string };
  types?: string[];
}

const FETCH_TIMEOUT_MS = 8000;

/**
 * Google Places API (New) — 주변 장소 검색
 */
export async function searchNearbyPlaces(
  lat: number,
  lng: number,
  radiusMeters: number,
  type?: string
): Promise<NearbyPlace[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not configured');

  const includedTypes = type ? [type] : INCLUDED_TYPES;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(NEARBY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes,
        maxResultCount: 10,
        rankPreference: 'DISTANCE',
        languageCode: 'ko',
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters,
          },
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Places API error: ${response.status} — ${error}`);
    }

    const data = await response.json();
    const places: PlaceResult[] = data.places ?? [];

    // 사진 URL을 병렬로 조회 (개별 실패는 무시)
    const settled = await Promise.allSettled(
      places.map(async (place): Promise<NearbyPlace> => {
        const placeLat = place.location?.latitude ?? 0;
        const placeLng = place.location?.longitude ?? 0;
        const dist = calculateDistance(lat, lng, placeLat, placeLng);

        let photoUrl: string | undefined;
        if (place.photos?.[0]?.name) {
          photoUrl = await getPlacePhotoUrl(place.photos[0].name, 400);
        }

        return {
          id: place.id,
          name: place.displayName?.text ?? 'Unknown',
          type: place.primaryTypeDisplayName?.text ?? place.primaryType ?? '',
          description: place.editorialSummary?.text ?? '',
          distance: Math.round(dist),
          walkingTime: estimateWalkingTime(dist),
          rating: place.rating,
          isOpen: place.regularOpeningHours?.openNow,
          openingHours: place.regularOpeningHours?.weekdayDescriptions?.join('; '),
          photoUrl,
          location: { lat: placeLat, lng: placeLng },
        };
      })
    );

    return settled
      .filter((r): r is PromiseFulfilledResult<NearbyPlace> => r.status === 'fulfilled')
      .map((r) => r.value);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Photo Media API — 사진 URL 조회
 * skipHttpRedirect=true 로 photoUri를 JSON으로 받음
 */
export async function getPlacePhotoUrl(
  photoName: string,
  maxWidth: number = 400
): Promise<string | undefined> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return undefined;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const url = `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${apiKey}&skipHttpRedirect=true`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return undefined;
    const data = await response.json();
    return data.photoUri ?? undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Haversine 공식 — 두 좌표 사이 거리 (미터)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * 도보 시간 추정 (분)
 * 평균 보행속도 5km/h = 83.3m/min
 */
export function estimateWalkingTime(distanceMeters: number): number {
  return Math.ceil(distanceMeters / 83.3);
}

/**
 * 거리 포맷
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
