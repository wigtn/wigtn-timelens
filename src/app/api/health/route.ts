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
    firebase: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    placesApi: !!process.env.GOOGLE_PLACES_API_KEY,
  };

  // Core health depends only on Gemini API key (required).
  // Firebase and Places are optional — their absence is "degraded" not "unhealthy".
  const coreHealthy = services.liveApi && services.imageGen;

  const allConfigured = Object.values(services).every(Boolean);
  const healthStatus: HealthResponse['status'] = coreHealthy ? (allConfigured ? 'ok' : 'degraded') : 'degraded';

  const healthData: HealthResponse = {
    status: healthStatus,
    version: process.env.npm_package_version || '0.1.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    services,
  };

  const response: ApiResponse<HealthResponse> = {
    success: true,
    data: healthData,
  };

  // Return 200 as long as core (Gemini) is configured; 503 only if Gemini is missing
  return NextResponse.json(response, {
    status: coreHealthy ? 200 : 503,
  });
}
