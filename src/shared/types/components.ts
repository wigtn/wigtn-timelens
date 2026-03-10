// ============================================================
// 파일: src/types/components.ts
// 담당: Part 2 (Curator + UI)
// 역할: 컴포넌트 Props 타입 정의
// 출처: shared-contract.md, part2-curator-ui.md
// ============================================================

import type { PanelState, AudioState, AgentType } from './common';
import type {
  ArtifactSummary,
  TranscriptChunk,
  AgentSwitchData,
} from './live-session';
import type { Locale } from '@shared/i18n';

// --- CameraView ---
export interface CameraViewProps {
  isScanning: boolean;
  isRecognized: boolean;
  isBlurred: boolean;
  onCapturePhoto: () => string;
}

// --- KnowledgePanel ---
export interface KnowledgePanelProps {
  state: PanelState;
  artifact: ArtifactSummary | null;
  transcript: TranscriptChunk[];
  onStateChange: (state: PanelState) => void;
  onTopicTap: (topicId: string, topicLabel: string) => void;
  audioState?: AudioState;
  children?: React.ReactNode;
}

// --- AudioVisualizer ---
export interface AudioVisualizerProps {
  state: AudioState;
  audioLevel?: number;
}

// --- AgentIndicator ---
export interface AgentIndicatorProps {
  activeAgent: AgentType;
  switchData?: AgentSwitchData;
  isTransitioning: boolean;
  locale?: Locale;
}

// --- TranscriptChat ---
export interface TranscriptProps {
  chunks: TranscriptChunk[];
  isStreaming: boolean;
  locale?: Locale;
}

// --- BeforeAfterSlider (Part 3) ---
export interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  artifactName: string;
  era: string;
  description?: string;
  onSave: () => void;
  onShare: () => void;
}
