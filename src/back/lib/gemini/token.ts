// ============================================================
// 파일: src/back/lib/gemini/token.ts
// 역할: Ephemeral Token 생성 공유 헬퍼
// ============================================================

import type { GoogleGenAI } from '@google/genai';

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface EphemeralToken {
  name: string;
  expiresAt: number;
}

/**
 * Gemini Live API용 Ephemeral Token을 생성한다.
 * @throws Error if token creation fails or token.name is empty
 */
export async function createEphemeralToken(ai: GoogleGenAI): Promise<EphemeralToken> {
  const token = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
      httpOptions: { apiVersion: 'v1alpha' },
    },
  });

  if (!token.name) {
    throw new Error('Ephemeral token name is empty');
  }

  return {
    name: token.name,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  };
}
