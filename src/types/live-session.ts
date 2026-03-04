// ============================================================
// 파일: src/types/live-session.ts
// Part 1이 구현, Part 2가 소비
// 출처: shared-contract.md §B
// ============================================================

import type {
  AgentType,
  AudioState,
  SessionStatus,
  AppError,
} from './common';
import type { RestorationResult } from './restoration';
import type { DiscoveryResult } from './discovery';
import type { DiaryResult } from './diary';

export type { RestorationResult, DiscoveryResult, DiaryResult };

// --- 유물 인식 결과 (Live API Vision -> UI) ---
export interface ArtifactSummary {
  name: string;
  era: string;
  civilization: string;
  oneLiner: string;
  topics: TopicChip[];
  confidence: number;
  isOutdoor: boolean;
  architectureStyle?: string;
}

export interface TopicChip {
  id: string;
  label: string;
}

// --- Live Session이 UI에 보내는 이벤트 ---
export interface LiveSessionEvents {
  onArtifactRecognized: (summary: ArtifactSummary) => void;
  onTranscript: (data: TranscriptData) => void;
  onUserSpeech: (data: UserSpeechData) => void;
  onAgentSwitch: (data: AgentSwitchData) => void;
  onAudioStateChange: (state: AudioState) => void;
  onSessionStatusChange: (status: SessionStatus) => void;
  onToolResult: (data: ToolResultData) => void;
  onTopicDetail: (data: TopicDetailData) => void;
  onError: (error: AppError) => void;
}

export interface TranscriptData {
  text: string;
  delta: string;
  isFinal: boolean;
  sources?: string[];
}

export interface UserSpeechData {
  text: string;
  isFinal: boolean;
}

export interface AgentSwitchData {
  from: AgentType;
  to: AgentType;
  reason: string;
}

export interface ToolResultData {
  tool: 'generate_restoration' | 'discover_nearby' | 'create_diary';
  result: RestorationResult | DiscoveryResult | DiaryResult;
}

export interface TopicDetailData {
  topicId: string;
  topicLabel: string;
  content: string;
  sources?: string[];
}

// --- UI가 Live Session에 보내는 명령 ---
export interface LiveSessionControls {
  connect: (config: SessionConfig) => Promise<void>;
  disconnect: () => void;
  toggleMic: (enabled: boolean) => void;
  toggleCamera: (enabled: boolean) => void;
  interrupt: () => void;
  requestTopicDetail: (topicId: string, topicLabel: string) => void;
  sendTextMessage: (text: string) => void;
  sendPhoto: (imageBase64: string) => void;
  getSessionState: () => SessionState;
}

export interface SessionConfig {
  language: string;
  sessionId?: string;
}

export interface SessionState {
  sessionId: string | null;
  status: SessionStatus;
  activeAgent: AgentType;
  audioState: AudioState;
  currentArtifact: ArtifactSummary | null;
  visitCount: number;
  isFallbackMode: boolean;
}

// --- useLiveSession Hook 반환 타입 ---
export interface UseLiveSessionReturn {
  sessionState: SessionState;
  isConnected: boolean;
  isFallbackMode: boolean;
  connect: (config: SessionConfig) => Promise<void>;
  disconnect: () => void;
  toggleMic: (enabled: boolean) => void;
  toggleCamera: (enabled: boolean) => void;
  interrupt: () => void;
  requestTopicDetail: (topicId: string, topicLabel: string) => void;
  sendTextMessage: (text: string) => void;
  sendPhoto: (imageBase64: string) => void;
  currentArtifact: ArtifactSummary | null;
  transcript: TranscriptChunk[];
  audioState: AudioState;
  activeAgent: AgentType;
}

export interface TranscriptChunk {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  sources?: string[];
}

// --- Part 1: use-camera.ts ---
export interface UseCameraReturn {
  stream: MediaStream | null;
  isActive: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => string | null;     // base64 JPEG
  capturePhoto: () => string | null;     // 고해상도 base64 JPEG
}

// --- Part 1: use-microphone.ts ---
export interface UseMicrophoneReturn {
  isActive: boolean;
  isPermissionGranted: boolean;
  error: string | null;
  startMic: () => Promise<void>;
  stopMic: () => void;
  audioLevel: number;                    // 0-1 실시간 볼륨
}
