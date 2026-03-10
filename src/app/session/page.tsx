// ============================================================
// 파일: src/app/session/page.tsx
// 담당: Part 2
// 역할: 메인 화면 — 대화 중심 UI + 온디맨드 카메라
// 피봇: "Curator Friend" — 대화가 중심, 카메라는 보조
// ============================================================

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, BookOpen, Camera, CameraOff, Loader2, Download } from 'lucide-react';
import { cn } from '@web/lib/utils';
import type { AgentType } from '@shared/types/common';
import type { AgentSwitchData } from '@shared/types/live-session';
import { useLiveSession } from '@web/hooks/use-live-session';
import CameraView, { type CameraViewRef } from '@web/components/CameraView';
import AgentIndicator from '@web/components/AgentIndicator';
import AudioVisualizer from '@web/components/AudioVisualizer';
import PermissionGate from '@web/components/PermissionGate';
import TranscriptChat from '@web/components/TranscriptChat';
import { RestorationOverlay } from '@web/components/RestorationOverlay';
import NearbySites from '@web/components/NearbySites';
import TopicChip from '@web/components/TopicChip';

function getAgentSwitchReason(agent: AgentType): string {
  switch (agent) {
    case 'restoration':
      return '시간여행을 시작합니다...';
    case 'discovery':
      return '주변 문화유산을 검색합니다';
    case 'diary':
      return '다이어리를 생성합니다';
    default:
      return '';
  }
}

export default function MainPage() {
  const {
    isConnected,
    connect,
    toggleMic,
    toggleCamera,
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
    beforeImage,
  } = useLiveSession();

  const router = useRouter();

  // Local UI state
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [agentTransition, setAgentTransition] = useState<AgentSwitchData | null>(null);
  const [isAgentTransitioning, setIsAgentTransitioning] = useState(false);
  const [showSaved, setShowSaved] = useState<string | null>(null);

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

  // Diary result → navigate
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

  // 카메라 토글 (온디맨드)
  const handleCameraToggle = useCallback(() => {
    const newState = !isCameraOpen;
    setIsCameraOpen(newState);
    toggleCamera(newState);
  }, [isCameraOpen, toggleCamera]);

  // 사진 캡처 → AI 전송
  const handleCapture = useCallback(() => {
    const photo = cameraViewRef.current?.capturePhoto();
    if (!photo) return;
    sendPhoto(photo);
  }, [sendPhoto]);

  const handleTopicTap = useCallback(
    (topicId: string, topicLabel: string) => {
      requestTopicDetail(topicId, topicLabel);
    },
    [requestTopicDetail]
  );

  // 복원 이미지 다운로드
  const handleDownloadRestoration = useCallback(() => {
    if (restorationState.status !== 'ready') return;
    const url = restorationState.data.imageUrl;
    if (!url.startsWith('https://') && !url.startsWith('data:image/')) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `timelens-restored-${Date.now()}.jpg`;
    link.click();
    setShowSaved('복원 이미지 저장됨');
    setTimeout(() => setShowSaved(null), 2000);
  }, [restorationState]);

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
    <div className="relative flex flex-col w-full h-full bg-gray-950">
      {/* Connection overlay */}
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

      {/* === Top: Camera PIP (온디맨드, 접을 수 있음) === */}
      {isCameraOpen && (
        <div className="relative w-full shrink-0" style={{ height: '35dvh' }}>
          <CameraView
            ref={cameraViewRef}
            isScanning={false}
            isRecognized={!!currentArtifact}
            isBlurred={false}
            onCapturePhoto={() => cameraViewRef.current?.capturePhoto() ?? ''}
          />

          {/* Restoration overlay on camera */}
          <RestorationOverlay state={restorationState} beforeImage={beforeImage} />

          {/* 캡처 버튼 (카메라 위) */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10">
            <button
              onClick={handleCapture}
              className="px-6 py-2.5 bg-timelens-gold/90 text-black rounded-full font-medium text-sm
                         active:scale-95 transition-transform shadow-lg shadow-timelens-gold/30"
            >
              이거 봐봐
            </button>
          </div>
        </div>
      )}

      {/* === Middle: Conversation Area (메인) === */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Agent indicator */}
        <div className="shrink-0 px-4 pt-3">
          <AgentIndicator
            activeAgent={activeAgent}
            switchData={agentTransition ?? undefined}
            isTransitioning={isAgentTransitioning}
          />
          <AudioVisualizer state={audioState} />
        </div>

        {/* Artifact summary card (인식 시 표시) */}
        {currentArtifact && (
          <div className="shrink-0 mx-4 mt-2 p-3 bg-gray-900/80 rounded-2xl border border-white/[0.08]">
            <h3 className="text-lg font-heading font-bold text-white">{currentArtifact.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {currentArtifact.era} · {currentArtifact.civilization}
              {currentArtifact.architectureStyle && ` · ${currentArtifact.architectureStyle}`}
            </p>
            <p className="text-sm text-gray-200 mt-1.5">&ldquo;{currentArtifact.oneLiner}&rdquo;</p>

            {/* Topic chips */}
            <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
              {currentArtifact.topics.map((topic) => (
                <TopicChip
                  key={topic.id}
                  topic={topic}
                  onTap={() => handleTopicTap(topic.id, topic.label)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Restoration result (복원 완료 시) */}
        {restorationState.status === 'ready' && !isCameraOpen && (
          <div className="shrink-0 mx-4 mt-2 p-3 bg-gray-900/80 rounded-2xl border border-amber-500/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-amber-400 font-medium">복원 이미지 생성 완료</span>
              <button
                onClick={handleDownloadRestoration}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 rounded-full text-xs text-amber-300
                           active:scale-95 transition-transform"
              >
                <Download className="w-3.5 h-3.5" />
                저장
              </button>
            </div>
          </div>
        )}

        {/* Discovery sites */}
        {discoverySites.length > 0 && (
          <div className="shrink-0 mx-4 mt-2">
            <NearbySites sites={discoverySites} />
          </div>
        )}

        {/* Chat transcript (스크롤 영역) */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <TranscriptChat chunks={transcript} isStreaming={audioState === 'speaking'} />
        </div>
      </div>

      {/* === Bottom: Input bar === */}
      <div className="shrink-0 pb-safe-bottom bg-gray-950 border-t border-white/[0.06]">
        {/* Text input */}
        <div className="flex items-center gap-2 px-4 py-3">
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

        {/* Action buttons */}
        <div className="flex items-center justify-around px-4 pb-3">
          {/* Mic toggle */}
          <button
            onClick={handleMicToggle}
            className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200',
              isMicOn
                ? 'bg-white/15 text-white border border-white/20 hover:bg-white/25'
                : 'bg-red-500/90 text-white shadow-lg shadow-red-500/30',
            )}
            aria-label={isMicOn ? '마이크 끄기' : '마이크 켜기'}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Camera toggle (온디맨드) */}
          <button
            onClick={handleCameraToggle}
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200',
              isCameraOpen
                ? 'bg-timelens-gold/20 text-timelens-gold border-2 border-timelens-gold/60'
                : 'bg-white/15 text-white border border-white/20 hover:bg-white/25',
            )}
            aria-label={isCameraOpen ? '카메라 닫기' : '카메라 열기'}
          >
            {isCameraOpen ? <CameraOff className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
          </button>

          {/* Diary */}
          <button
            onClick={() => sendTextMessage('다이어리 만들어줘')}
            className="w-12 h-12 rounded-full bg-white/15 border border-white/20 flex items-center justify-center
                       hover:bg-white/25 transition-colors"
            aria-label="다이어리"
          >
            <BookOpen className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* 저장 피드백 토스트 */}
      {showSaved && (
        <div className="absolute top-20 left-0 right-0 z-40 flex justify-center pointer-events-none">
          <div className="bg-green-500/90 text-white text-sm font-medium px-4 py-2 rounded-full animate-fade-in">
            {showSaved}
          </div>
        </div>
      )}
    </div>
  );
}
