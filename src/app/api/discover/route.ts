// ============================================================
// 파일: src/app/api/discover/route.ts
// 담당: Part 4
// 역할: Discovery REST API — Places + Search Grounding
// 출처: part4-discovery-diary.md §2.3
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { searchNearbyPlaces } from '@back/lib/geo/places';
import type { DiscoveryResponse } from '@shared/types/discovery';
import type { ApiResponse } from '@shared/types/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const lat = parseFloat(searchParams.get('lat') ?? '');
    const lng = parseFloat(searchParams.get('lng') ?? '');
    const radius = parseFloat(searchParams.get('radius') ?? '2');
    const type = searchParams.get('type') ?? undefined;

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMS',
            message: 'lat (-90~90) and lng (-180~180) are required numeric parameters',
            retryable: false,
          },
        },
        { status: 400 }
      );
    }

    // Clamp radius: 0.1 ~ 50 km
    const clampedRadius = Math.min(Math.max(isNaN(radius) ? 2 : radius, 0.1), 50);
    const radiusMeters = clampedRadius * 1000;
    const sites = await searchNearbyPlaces(lat, lng, radiusMeters, type);

    const response: DiscoveryResponse = {
      success: true,
      sites,
      searchRadius: clampedRadius,
    };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (error) {
    console.error('Discovery API error:', error);
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: 'DISCOVERY_FAILED',
          message: error instanceof Error ? error.message : 'Discovery search failed',
          retryable: true,
        },
      },
      { status: 500 }
    );
  }
}
