// ============================================================
// 파일: src/app/session/page.tsx
// 담당: Part 2
// 역할: 메인 화면 — 카메라 + 지식 패널 + 액션 바 통합
// 출처: part2-curator-ui.md §3.4
// ============================================================

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Mic, MicOff, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PanelState, AgentType } from '@/types/common';
import type { AgentSwitchData } from '@/types/live-session';
import { useLiveSession } from '@/hooks/use-live-session';
import CameraView, { type CameraViewRef } from '@/components/CameraView';
import KnowledgePanel from '@/components/KnowledgePanel';
import AgentIndicator from '@/components/AgentIndicator';
import AudioVisualizer from '@/components/AudioVisualizer';
import PermissionGate from '@/components/PermissionGate';

function getAgentSwitchReason(agent: AgentType): string {
  switch (agent) {
    case 'restoration':
      return '복원 이미지를 생성합니다';
    case 'discovery':
      return '주변 문화유산을 검색합니다';
    case 'diary':
      return '다이어리를 생성합니다';
    default:
      return '';
  }
}

export default function MainPage() {
  // Part 1 hook
  const {
    isConnected,
    isFallbackMode,
    connect,
    toggleMic,
    requestTopicDetail,
    sendTextMessage,
    sendPhoto,
    currentArtifact,
    transcript,
    audioState,
    activeAgent,
  } = useLiveSession();

  // Local UI state
  const [panelState, setPanelState] = useState<PanelState>('closed');
  const [isMicOn, setIsMicOn] = useState(true);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [agentTransition, setAgentTransition] = useState<AgentSwitchData | null>(null);
  const [isAgentTransitioning, setIsAgentTransitioning] = useState(false);

  const cameraViewRef = useRef<CameraViewRef>(null);
  const prevAgentRef = useRef(activeAgent);

  // Permission → session connect
  const handlePermissionsGranted = useCallback(async () => {
    setPermissionsGranted(true);
    try {
      await connect({ language: navigator.language.split('-')[0] || 'en' });
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }, [connect]);

  // Artifact recognized → auto-open panel
  useEffect(() => {
    if (currentArtifact && panelState === 'closed') {
      setPanelState('mini');
    }
  }, [currentArtifact, panelState]);

  // Agent switch detection
  useEffect(() => {
    if (prevAgentRef.current !== activeAgent) {
      setIsAgentTransitioning(true);
      setAgentTransition({
        from: prevAgentRef.current,
        to: activeAgent,
        reason: getAgentSwitchReason(activeAgent),
      });
      prevAgentRef.current = activeAgent;
      const timer = setTimeout(() => setIsAgentTransitioning(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [activeAgent]);

  // Action handlers
  const handleMicToggle = useCallback(() => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    toggleMic(newState);
  }, [isMicOn, toggleMic]);

  const handleCapture = useCallback(() => {
    const photo = cameraViewRef.current?.capturePhoto();
    if (photo) sendPhoto(photo);
  }, [sendPhoto]);

  const handleTopicTap = useCallback(
    (topicId: string, topicLabel: string) => {
      requestTopicDetail(topicId, topicLabel);
      if (panelState === 'mini') setPanelState('expanded');
    },
    [requestTopicDetail, panelState]
  );

  const handleTextSubmit = useCallback(() => {
    if (textInput.trim()) {
      sendTextMessage(textInput.trim());
      setTextInput('');
    }
  }, [textInput, sendTextMessage]);

  // Permission gate
  if (!permissionsGranted) {
    return <PermissionGate onGranted={handlePermissionsGranted} />;
  }

  return (
    <div className="relative w-full h-full">
      {/* Layer 0: Camera background */}
      <CameraView
        ref={cameraViewRef}
        isScanning={isConnected && !currentArtifact}
        isRecognized={!!currentArtifact}
        isBlurred={panelState === 'expanded' || panelState === 'fullscreen'}
        onCapturePhoto={() => cameraViewRef.current?.capturePhoto() ?? ''}
      />

      {/* Layer 1: Agent + Audio indicators */}
      <div className="absolute left-0 right-0 z-10" style={{ bottom: 200 }}>
        <AgentIndicator
          activeAgent={activeAgent}
          switchData={agentTransition ?? undefined}
          isTransitioning={isAgentTransitioning}
        />
        <AudioVisualizer state={audioState} />
      </div>

      {/* Layer 2: Knowledge Panel */}
      <KnowledgePanel
        state={panelState}
        artifact={currentArtifact}
        transcript={transcript}
        onStateChange={setPanelState}
        onTopicTap={handleTopicTap}
      />

      {/* Layer 3: Action bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pb-safe-bottom">
        <div className="flex items-center justify-around px-6 py-3 bg-black/60 backdrop-blur-md">
          {/* Mic toggle */}
          <button
            onClick={handleMicToggle}
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center transition-colors',
              isMicOn ? 'bg-white text-black' : 'bg-red-500 text-white',
            )}
            aria-label={isMicOn ? '마이크 끄기' : '마이크 켜기'}
          >
            {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>

          {/* Capture */}
          <button
            onClick={handleCapture}
            className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center
                       active:scale-95 transition-transform"
            aria-label="사진 캡처"
          >
            <div className="w-12 h-12 rounded-full bg-white" />
          </button>

          {/* Diary */}
          <button
            onClick={() => sendTextMessage('다이어리 만들어줘')}
            className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center"
            aria-label="다이어리"
          >
            <BookOpen className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Fallback text input */}
        {isFallbackMode && (
          <div className="flex items-center gap-2 px-4 pb-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-4 py-3 bg-white/10 rounded-full text-white
                         placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-white/30"
            />
            <button
              onClick={handleTextSubmit}
              className="px-4 py-3 bg-white text-black rounded-full font-medium"
            >
              전송
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
