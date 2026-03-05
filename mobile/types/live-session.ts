import type { AgentType, AudioState, SessionStatus, ConnectionStage, AppError } from './common';

// --- Artifact Recognition ---
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

// --- Live Session Events ---
export interface LiveSessionEvents {
  onArtifactRecognized: (summary: ArtifactSummary) => void;
  onTranscript: (data: TranscriptData) => void;
  onUserSpeech: (data: UserSpeechData) => void;
  onAgentSwitch: (data: AgentSwitchData) => void;
  onAudioStateChange: (state: AudioState) => void;
  onSessionStatusChange: (status: SessionStatus) => void;
  onToolResult: (data: ToolResultData) => void;
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

// --- Tool Results ---
export interface RestorationResult {
  type: 'restoration';
  imageUrl: string;
  description: string;
  artifactName: string;
  era: string;
}

export interface DiscoveryResult {
  type: 'discovery';
  sites: NearbyPlace[];
  userLocation: { lat: number; lng: number };
}

export interface NearbyPlace {
  placeId: string;
  name: string;
  type: string;
  distance: number;
  rating?: number;
  photoUrl?: string;
  location: { lat: number; lng: number };
}

export interface DiaryResult {
  type: 'diary';
  diaryId: string;
  title: string;
  entryCount: number;
  entries?: DiaryEntry[];
  shareToken?: string;
}

export interface DiaryEntry {
  itemName: string;
  content: string;
  imageUrl?: string;
}

// --- Session State ---
export interface SessionConfig {
  language: string;
}

export interface SessionState {
  sessionId: string | null;
  status: SessionStatus;
  connectionStage: ConnectionStage;
  activeAgent: AgentType;
  audioState: AudioState;
  currentArtifact: ArtifactSummary | null;
  visitCount: number;
  isFallbackMode: boolean;
}

export interface TranscriptChunk {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
  sources?: string[];
}

// --- Hook Return ---
export interface UseLiveSessionReturn {
  sessionState: SessionState;
  isConnected: boolean;
  isFallbackMode: boolean;
  connect: (config: SessionConfig) => Promise<void>;
  disconnect: () => void;
  toggleMic: (enabled: boolean) => void;
  toggleCamera: (enabled: boolean) => void;
  interrupt: () => void;
  sendTextMessage: (text: string) => void;
  currentArtifact: ArtifactSummary | null;
  transcript: TranscriptChunk[];
  audioState: AudioState;
  activeAgent: AgentType;
  toolResult: ToolResultData | null;
  restorationState: RestorationUIState;
  discoverySites: NearbyPlace[];
  diaryResult: { diaryId: string; title: string } | null;
  clearToolResult: () => void;
}

export interface RestorationUIState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  progress?: number;
  data?: RestorationResult;
  artifactName?: string;
  era?: string;
  error?: string;
  retryable?: boolean;
}
