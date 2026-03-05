// ============================================================
// 파일: src/app/api/health/route.ts
// 담당: Part 5
// 역할: 서비스 헬스 체크
// 출처: shared-contract.md §F (GET /api/health)
// ============================================================

import { NextResponse } from 'next/server';
import type { ApiResponse, HealthResponse } from '@shared/types/api';

const startTime = Date.now();

export async function GET(): Promise<NextResponse<ApiResponse<HealthResponse>>> {
  const services = {
    liveApi: !!process.env.GOOGLE_GENAI_API_KEY,
    imageGen: !!process.env.GOOGLE_GENAI_API_KEY,
    firestore: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    placesApi: !!process.env.GOOGLE_PLACES_API_KEY,
  };

  const allHealthy = Object.values(services).every(Boolean);

  const healthData: HealthResponse = {
    status: allHealthy ? 'ok' : 'degraded',
    version: process.env.npm_package_version || '0.1.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    services,
  };

  const response: ApiResponse<HealthResponse> = {
    success: true,
    data: healthData,
  };

  return NextResponse.json(response, {
    status: allHealthy ? 200 : 503,
  });
}
