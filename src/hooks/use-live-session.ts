// ============================================================
// 파일: src/hooks/use-live-session.ts
// 담당: Part 1 (코어 파이프라인)
// 역할: Live API 세션 관리 훅 — Part 1 구현 전 stub
// 출처: shared-contract.md §B
// ============================================================
// TODO: Part 1이 실제 구현체로 교체 예정
// 현재는 Part 2 UI 개발을 위한 mock stub

'use client';

import { useState, useCallback } from 'react';
import type {
  UseLiveSessionReturn,
  SessionState,
  SessionConfig,
  TranscriptChunk,
} from '@/types/live-session';
import type { AudioState, AgentType } from '@/types/common';

const INITIAL_STATE: SessionState = {
  sessionId: null,
  status: 'disconnected',
  activeAgent: 'curator',
  audioState: 'idle',
  currentArtifact: null,
  visitCount: 0,
  isFallbackMode: false,
};

export function useLiveSession(): UseLiveSessionReturn {
  const [sessionState, setSessionState] = useState<SessionState>(INITIAL_STATE);
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);

  const connect = useCallback(async (_config: SessionConfig) => {
    setSessionState((prev) => ({ ...prev, status: 'connecting' }));
    // Stub: 즉시 connected로 전환
    setSessionState((prev) => ({
      ...prev,
      status: 'connected',
      sessionId: `stub-${Date.now()}`,
    }));
  }, []);

  const disconnect = useCallback(() => {
    setSessionState(INITIAL_STATE);
    setTranscript([]);
  }, []);

  const toggleMic = useCallback((_enabled: boolean) => { /* stub */ }, []);

  const toggleCamera = useCallback((_enabled: boolean) => { /* stub */ }, []);

  const interrupt = useCallback(() => { /* stub */ }, []);

  const requestTopicDetail = useCallback((_topicId: string, _topicLabel: string) => { /* stub */ }, []);

  const sendTextMessage = useCallback((_text: string) => { /* stub */ }, []);

  const sendPhoto = useCallback((_imageBase64: string) => { /* stub */ }, []);

  return {
    sessionState,
    isConnected: sessionState.status === 'connected',
    isFallbackMode: sessionState.isFallbackMode,
    connect,
    disconnect,
    toggleMic,
    toggleCamera,
    interrupt,
    requestTopicDetail,
    sendTextMessage,
    sendPhoto,
    currentArtifact: sessionState.currentArtifact,
    transcript,
    audioState: sessionState.audioState as AudioState,
    activeAgent: sessionState.activeAgent as AgentType,
  };
}
