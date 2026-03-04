// ============================================================
// 파일: src/types/env.d.ts
// Part 5가 .env.example과 함께 정의
// 출처: shared-contract.md §J
// ============================================================

declare namespace NodeJS {
  interface ProcessEnv {
    // Gemini API + ADK 공용 (서버 전용)
    GOOGLE_GENAI_API_KEY: string;
    GOOGLE_CLOUD_PROJECT: string;
    GOOGLE_GENAI_USE_VERTEXAI?: string;

    // Firebase (클라이언트)
    NEXT_PUBLIC_FIREBASE_API_KEY: string;
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;

    // Firebase (서버 전용)
    FIREBASE_SERVICE_ACCOUNT_KEY: string;

    // Google Maps / Places
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: string;
    GOOGLE_PLACES_API_KEY: string;

    // App
    NEXT_PUBLIC_APP_URL: string;
    NEXT_PUBLIC_WS_URL: string;

    // Node
    NODE_ENV: 'development' | 'production' | 'test';
  }
}
