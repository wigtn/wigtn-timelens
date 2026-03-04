// ============================================================
// 파일: src/types/ws-messages.ts
// Part 1이 구현. Part 2는 직접 사용하지 않음 (Hook을 통해 추상화)
// 출처: shared-contract.md §E
// ============================================================

import type { SessionStatus, AppError } from './common';
import type {
  ArtifactSummary,
  AgentSwitchData,
  TopicDetailData,
} from './live-session';
import type { RestorationResult } from './restoration';
import type { DiscoveryResult } from './discovery';
import type { DiaryResult } from './diary';

// === Client -> Server ===

export type ClientMessage =
  | ClientSessionConfig
  | ClientAudioInput
  | ClientVideoFrame
  | ClientInterrupt
  | ClientTextMessage;

export interface ClientSessionConfig {
  type: 'session.config';
  payload: {
    language: string;
    sessionId?: string;
  };
}

export interface ClientAudioInput {
  type: 'audio.input';
  payload: {
    data: string;
    timestamp: number;
  };
}

export interface ClientVideoFrame {
  type: 'video.frame';
  payload: {
    data: string;
    timestamp: number;
  };
}

export interface ClientInterrupt {
  type: 'audio.interrupt';
}

export interface ClientTextMessage {
  type: 'text.input';
  payload: {
    text: string;
    image?: string;
  };
}

// === Server -> Client ===

export type ServerMessage =
  | ServerAudioOutput
  | ServerTranscript
  | ServerArtifactRecognized
  | ServerToolCall
  | ServerToolResult
  | ServerAgentSwitch
  | ServerSessionStatus
  | ServerTopicDetail
  | ServerError;

export interface ServerAudioOutput {
  type: 'audio.output';
  payload: {
    data: string;
  };
}

export interface ServerTranscript {
  type: 'transcript';
  payload: {
    text: string;
    delta: string;
    isFinal: boolean;
    sources?: string[];
  };
}

export interface ServerArtifactRecognized {
  type: 'artifact.recognized';
  payload: ArtifactSummary;
}

export interface ServerToolCall {
  type: 'tool.call';
  payload: {
    callId: string;
    tool: 'generate_restoration' | 'discover_nearby' | 'create_diary';
    params: Record<string, unknown>;
  };
}

export interface ServerToolResult {
  type: 'tool.result';
  payload: {
    callId: string;
    tool: 'generate_restoration' | 'discover_nearby' | 'create_diary';
    result: RestorationResult | DiscoveryResult | DiaryResult;
  };
}

export interface ServerAgentSwitch {
  type: 'agent.switch';
  payload: AgentSwitchData;
}

export interface ServerSessionStatus {
  type: 'session.status';
  payload: {
    status: SessionStatus;
    sessionId: string;
    expiresAt?: number;
  };
}

export interface ServerTopicDetail {
  type: 'topic.detail';
  payload: TopicDetailData;
}

export interface ServerError {
  type: 'error';
  payload: AppError;
}
