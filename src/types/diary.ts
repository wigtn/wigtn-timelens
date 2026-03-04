// ============================================================
// 파일: src/types/diary.ts
// Part 1이 Tool Call 이벤트 전달, Part 4가 REST API + UI 구현
// 출처: shared-contract.md §D (Diary)
// ============================================================

// --- Live API Tool Call ---
export interface DiaryToolCall {
  tool: 'create_diary';
  params: {
    session_id: string;
  };
}

// --- REST API: POST /api/diary/generate ---
export interface DiaryGenerateRequest {
  sessionId: string;
}

export interface DiaryGenerateResponse {
  success: true;
  diaryId: string;
  diary: DiaryData;
}

export interface DiaryData {
  id: string;
  title: string;
  entries: DiaryEntry[];
  createdAt: number;
  shareToken?: string;
}

export interface DiaryEntry {
  type: 'text' | 'image';
  content: string;
  siteName?: string;
  order: number;
}

// --- Tool Result ---
export interface DiaryResult {
  type: 'diary';
  diaryId: string;
  title: string;
  entryCount: number;
}

// --- Diary UI 상태 ---
export type DiaryUIState =
  | { status: 'idle' }
  | { status: 'generating'; progress: number }
  | { status: 'ready'; diary: DiaryData }
  | { status: 'error'; error: string };
