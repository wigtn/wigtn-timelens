// ============================================================
// 파일: src/app/session/page.tsx
// 담당: Part 2
// 역할: 메인 화면 — 카메라 + 지식 패널 + 액션 바 통합
// 출처: part2-curator-ui.md §3.4
// ============================================================

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, BookOpen, ScanEye, Loader2 } from 'lucide-react';
import { cn } from '@web/lib/utils';
import type { PanelState, AgentType } from '@shared/types/common';
import type { AgentSwitchData } from '@shared/types/live-session';
import { useLiveSession } from '@web/hooks/use-live-session';
import CameraView, { type CameraViewRef } from '@web/components/CameraView';
import KnowledgePanel from '@web/components/KnowledgePanel';
import AgentIndicator from '@web/components/AgentIndicator';
import AudioVisualizer from '@web/components/AudioVisualizer';
import PermissionGate from '@web/components/PermissionGate';
import { RestorationResult } from '@web/components/RestorationResult';
import NearbySites from '@web/components/NearbySites';

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
    connect,
    toggleMic,
    requestTopicDetail,
    sendTextMessage,
    sendPhoto,
    currentArtifact,
    transcript,
    audioState,
    activeAgent,
    restorationState,
    discoverySites,
    diaryResult,
  } = useLiveSession();

  const router = useRouter();

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

  // [변경 7] Auto-expand panel when tool results arrive (fullscreen → expanded)
  useEffect(() => {
    if (restorationState.status === 'ready' || discoverySites.length > 0) {
      setPanelState('expanded');
    }
  }, [restorationState.status, discoverySites.length]);

  // Diary result → navigate to diary page
  useEffect(() => {
    if (diaryResult) {
      router.push(`/diary/${diaryResult.diaryId}`);
    }
  }, [diaryResult, router]);

  // Action handlers
  const handleMicToggle = useCallback(() => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    toggleMic(newState);
  }, [isMicOn, toggleMic]);

  // [변경 4] handleCapture: sendPhoto + auto-expand panel
  const handleCapture = useCallback(() => {
    const photo = cameraViewRef.current?.capturePhoto();
    if (photo) {
      sendPhoto(photo);
      if (panelState === 'mini') setPanelState('expanded');
    }
  }, [sendPhoto, panelState]);

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

  // Last transcript for subtitle overlay
  const lastChunk = transcript.length > 0 ? transcript[transcript.length - 1] : null;
  const showSubtitle = lastChunk && panelState !== 'expanded' && panelState !== 'fullscreen';

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

      {/* [변경 1] Connection overlay — fullscreen z-40 */}
      {!isConnected && permissionsGranted && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="flex flex-col items-center gap-4">
            <span className="text-3xl font-heading font-bold text-timelens-gold animate-pulse">
              TimeLens
            </span>
            <Loader2 className="w-8 h-8 text-timelens-gold animate-spin" />
            <span className="text-sm text-gray-400">AI 큐레이터에 연결 중...</span>
          </div>
        </div>
      )}

      {/* [변경 2] Real-time subtitle overlay — z-15 */}
      {showSubtitle && (
        <div className="absolute top-safe-top left-0 right-0 z-[15] px-4 pt-4 animate-in fade-in duration-300">
          <div className="bg-black/50 backdrop-blur-sm rounded-xl px-4 py-3 max-w-lg mx-auto">
            <p
              className={cn(
                'text-sm leading-relaxed line-clamp-2',
                lastChunk.role === 'user' ? 'text-blue-300' : 'text-white',
              )}
            >
              {lastChunk.text}
            </p>
          </div>
        </div>
      )}

      {/* [변경 3] Layer 1: Agent + Audio indicators — z-25, bottom-24 */}
      <div className="absolute left-0 right-0 bottom-24 z-[25]">
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
        audioState={audioState}
      >
        {/* Restoration Result */}
        {restorationState.status !== 'idle' && (
          <div className="mt-4">
            <RestorationResult state={restorationState} />
          </div>
        )}

        {/* Discovery Sites */}
        {discoverySites.length > 0 && (
          <div className="mt-4">
            <NearbySites sites={discoverySites} />
          </div>
        )}
      </KnowledgePanel>

      {/* Layer 4: Action bar */}
      <div className="absolute bottom-0 left-0 right-0 z-30 pb-safe-bottom">
        {/* [변경 5] Text input — always visible */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-4 py-3 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm
                       placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-timelens-gold/40
                       border border-white/10"
          />
          <button
            onClick={handleTextSubmit}
            className="px-5 py-3 bg-timelens-gold text-black rounded-full font-medium text-sm
                       active:scale-95 transition-transform"
          >
            전송
          </button>
        </div>

        <div className="flex items-center justify-around px-6 py-3 bg-gradient-to-t from-black/80 to-black/40 backdrop-blur-md">
          {/* Mic toggle */}
          <button
            onClick={handleMicToggle}
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200',
              isMicOn
                ? 'bg-white/15 text-white border border-white/20 hover:bg-white/25'
                : 'bg-red-500/90 text-white shadow-lg shadow-red-500/30',
            )}
            aria-label={isMicOn ? '마이크 끄기' : '마이크 켜기'}
          >
            {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>

          {/* [변경 4] Capture — ScanEye + brand gold + pulse-ring */}
          <button
            onClick={handleCapture}
            className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center
                       active:scale-95 transition-transform"
            aria-label="사진 캡처"
          >
            <div className="absolute inset-0 rounded-full border-[3px] border-timelens-gold/80 animate-pulse" />
            <div className="w-[58px] h-[58px] rounded-full bg-timelens-gold/20 hover:bg-timelens-gold/30
                            flex items-center justify-center transition-colors">
              <ScanEye className="w-7 h-7 text-timelens-gold" />
            </div>
          </button>

          {/* Diary */}
          <button
            onClick={() => sendTextMessage('다이어리 만들어줘')}
            className="w-14 h-14 rounded-full bg-white/15 border border-white/20 flex items-center justify-center
                       hover:bg-white/25 transition-colors"
            aria-label="다이어리"
          >
            <BookOpen className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
