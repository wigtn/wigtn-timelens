// ============================================================
// 파일: src/types/live-session.ts
// Part 1이 구현, Part 2가 소비
// 출처: shared-contract.md §B
// ============================================================

import type {
  AgentType,
  AudioState,
  ConnectionStage,
  SessionStatus,
  AppError,
} from './common';
import type { RestorationResult, RestorationUIState } from './restoration';
import type { DiscoveryResult, NearbyPlace } from './discovery';
import type { DiaryResult } from './diary';

export type { RestorationResult, RestorationUIState, DiscoveryResult, NearbyPlace, DiaryResult };

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

/** 박물관 선택 정보 (온보딩에서 수집) */
export interface MuseumContext {
  name: string;
  placeId: string;
  address: string;
  location: { lat: number; lng: number };
  photoUrl?: string;
  rating?: number;
  openNow?: boolean;
}

export interface SessionConfig {
  language: string;
  sessionId?: string;
  museum?: MuseumContext;
  userLocation?: { lat: number; lng: number };
}

export interface SessionState {
  sessionId: string | null;
  status: SessionStatus;
  connectionStage?: ConnectionStage;
  activeAgent: AgentType;
  audioState: AudioState;
  currentArtifact: ArtifactSummary | null;
  visitCount: number;
  isFallbackMode: boolean;
  /** 인식 시점 카메라 프레임 (data:image/jpeg;base64,...) */
  beforeImage?: string | null;
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
  // Tool result UI 연결
  toolResult: ToolResultData | null;
  restorationState: RestorationUIState;
  discoverySites: NearbyPlace[];
  diaryResult: { diaryId: string; title: string } | null;
  clearToolResult: () => void;
  /** 인식 시점 카메라 캡처 (data:image/jpeg;base64,...) */
  beforeImage: string | null;
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
