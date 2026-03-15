// ============================================================
// 파일: src/lib/gemini/client.ts
// 담당: Part 1
// 역할: 서버사이드 GoogleGenAI 싱글턴 인스턴스
// ============================================================

import { GoogleGenAI } from '@google/genai';

let _instance: GoogleGenAI | null = null;

/**
 * 서버 전용 GoogleGenAI 인스턴스 (싱글턴).
 * API Route에서 Ephemeral Token 생성, 이미지 생성 등에 사용.
 */
export function getGeminiClient(): GoogleGenAI {
  if (!_instance) {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GENAI_API_KEY is not set');
    }
    _instance = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1alpha' } });
  }
  return _instance;
}
