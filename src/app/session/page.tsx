// ============================================================
// 파일: src/app/session/page.tsx
// 담당: Part 2
// 역할: 메인 화면 — 대화 중심 UI + 온디맨드 카메라
// 피봇: "Curator Friend" — 대화가 중심, 카메라는 보조
// ============================================================

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, BookOpen, Camera, CameraOff, Download } from 'lucide-react';
import { cn } from '@web/lib/utils';
import type { AgentType } from '@shared/types/common';
import type { AgentSwitchData, MuseumContext } from '@shared/types/live-session';
import { useLiveSession } from '@web/hooks/use-live-session';
import { useGeolocation } from '@web/hooks/use-geolocation';
import CameraView, { type CameraViewRef } from '@web/components/CameraView';
import AgentIndicator from '@web/components/AgentIndicator';
import AudioVisualizer from '@web/components/AudioVisualizer';
import PermissionGate from '@web/components/PermissionGate';
import MuseumSelector from '@web/components/MuseumSelector';
import OnboardingSplash from '@web/components/OnboardingSplash';
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
  const geo = useGeolocation();

  // Local UI state
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [museumSelected, setMuseumSelected] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [splashMuseum, setSplashMuseum] = useState<{ name?: string; photoUrl?: string }>({});
  const [textInput, setTextInput] = useState('');
  const [agentTransition, setAgentTransition] = useState<AgentSwitchData | null>(null);
  const [isAgentTransitioning, setIsAgentTransitioning] = useState(false);
  const [showSaved, setShowSaved] = useState<string | null>(null);

  const cameraViewRef = useRef<CameraViewRef>(null);
  const prevAgentRef = useRef(activeAgent);

  // Permission granted → show museum selector (don't connect yet)
  const handlePermissionsGranted = useCallback(() => {
    setPermissionsGranted(true);
  }, []);

  // Shared connect helper
  const connectWithContext = useCallback(async (museum?: MuseumContext) => {
    const userLoc = geo.latitude && geo.longitude
      ? { lat: geo.latitude, lng: geo.longitude }
      : undefined;
    await connect({
      language: navigator.language.split('-')[0] || 'en',
      museum,
      userLocation: userLoc,
    });
  }, [connect, geo.latitude, geo.longitude]);

  // Museum selected → connect with context
  const handleMuseumSelect = useCallback(async (museum: MuseumContext) => {
    setMuseumSelected(true);
    setSplashMuseum({ name: museum.name, photoUrl: museum.photoUrl });
    try {
      await connectWithContext(museum);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }, [connectWithContext]);

  // Skip museum → connect without context
  const handleMuseumSkip = useCallback(async () => {
    setMuseumSelected(true);
    try {
      await connectWithContext();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }, [connectWithContext]);

  // Retry connection from splash
  const handleRetry = useCallback(async () => {
    try {
      await connectWithContext();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  }, [connectWithContext]);

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

  // Museum selection gate
  if (!museumSelected) {
    const userLocation = geo.latitude && geo.longitude
      ? { lat: geo.latitude, lng: geo.longitude }
      : null;
    return (
      <MuseumSelector
        userLocation={userLocation}
        onSelect={handleMuseumSelect}
        onSkip={handleMuseumSkip}
      />
    );
  }

  return (
    <div className="relative flex flex-col w-full h-full bg-gray-950">
      {/* Onboarding splash — stays mounted during fade-out */}
      {museumSelected && !splashDone && (
        <OnboardingSplash
          museumName={splashMuseum.name}
          museumPhotoUrl={splashMuseum.photoUrl}
          isConnected={isConnected}
          onRetry={handleRetry}
          onDone={() => setSplashDone(true)}
        />
      )}

      {/* === Glass Header === */}
      <div className="shrink-0 relative z-10 px-4 pt-safe-top">
        <div className="glass-strong rounded-2xl px-4 py-3 mt-2">
          <div className="relative">
            <AgentIndicator
              activeAgent={activeAgent}
              switchData={agentTransition ?? undefined}
              isTransitioning={isAgentTransitioning}
            />
          </div>
          <AudioVisualizer state={audioState} />
        </div>
      </div>

      {/* === Main: Conversation + Inline cards === */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Artifact summary card (인식 시 표시) */}
        {currentArtifact && (
          <div className="shrink-0 mx-4 mt-3 p-3.5 glass rounded-2xl animate-discover-slide-up">
            <h3 className="text-base font-heading font-bold text-white">{currentArtifact.name}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {currentArtifact.era} · {currentArtifact.civilization}
              {currentArtifact.architectureStyle && ` · ${currentArtifact.architectureStyle}`}
            </p>
            <p className="text-sm text-gray-200 mt-1.5 italic">{currentArtifact.oneLiner}</p>

            {/* Topic chips */}
            <div className="flex gap-1.5 mt-2.5 overflow-x-auto scrollbar-hide">
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
          <div className="shrink-0 mx-4 mt-2 p-3 glass rounded-2xl border-timelens-gold/10">
            <div className="flex items-center justify-between">
              <span className="text-xs text-timelens-gold font-semibold tracking-wide uppercase">복원 완료</span>
              <button
                onClick={handleDownloadRestoration}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-timelens-gold/10 rounded-full text-xs text-timelens-gold
                           active:scale-95 transition-transform border border-timelens-gold/20"
              >
                <Download className="w-3 h-3" />
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

        {/* Chat transcript */}
        <div className="flex-1 overflow-hidden px-4 py-3">
          <TranscriptChat chunks={transcript} isStreaming={audioState === 'speaking'} />
        </div>
      </div>

      {/* === Camera PIP (compact, above input bar) === */}
      {isCameraOpen && (
        <div className="shrink-0 mx-4 mb-2 relative rounded-2xl overflow-hidden" style={{ height: '28dvh' }}>
          <CameraView
            ref={cameraViewRef}
            isScanning={false}
            isRecognized={!!currentArtifact}
            isBlurred={false}
            onCapturePhoto={() => cameraViewRef.current?.capturePhoto() ?? ''}
          />

          <RestorationOverlay state={restorationState} beforeImage={beforeImage} />

          {/* Capture button */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10">
            <button
              onClick={handleCapture}
              className="px-5 py-2 bg-timelens-gold/90 text-black rounded-full font-semibold text-xs
                         active:scale-95 transition-transform shadow-lg shadow-timelens-gold/30"
            >
              이거 봐봐
            </button>
          </div>
        </div>
      )}

      {/* === Bottom: Glass Input Bar === */}
      <div className="shrink-0 pb-safe-bottom glass-strong rounded-t-2xl">
        {/* Text input */}
        <div className="flex items-center gap-2 px-4 py-2.5">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleTextSubmit()}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-4 py-2.5 bg-white/[0.06] rounded-full text-white text-sm
                       placeholder:text-gray-500 outline-none focus:ring-1 focus:ring-timelens-gold/30
                       border border-white/[0.06]"
          />
          <button
            onClick={handleTextSubmit}
            className="px-4 py-2.5 bg-timelens-gold text-black rounded-full font-semibold text-xs
                       active:scale-95 transition-transform"
          >
            전송
          </button>
        </div>

        {/* Action buttons — mic center emphasis */}
        <div className="flex items-center justify-center gap-6 px-4 pb-3">
          {/* Camera toggle */}
          <button
            onClick={handleCameraToggle}
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200',
              isCameraOpen
                ? 'bg-timelens-gold/15 text-timelens-gold border border-timelens-gold/30'
                : 'bg-white/[0.06] text-gray-400 border border-white/[0.06] hover:bg-white/10',
            )}
            aria-label={isCameraOpen ? '카메라 닫기' : '카메라 열기'}
          >
            {isCameraOpen ? <CameraOff className="w-4.5 h-4.5" /> : <Camera className="w-4.5 h-4.5" />}
          </button>

          {/* Mic toggle — center, larger, with ripple */}
          <div className="relative">
            {isMicOn && audioState === 'listening' && (
              <>
                <span className="absolute inset-0 rounded-full border-2 border-timelens-gold/30 mic-ripple-ring" />
                <span className="absolute inset-0 rounded-full border-2 border-timelens-gold/20 mic-ripple-ring [animation-delay:0.5s]" />
              </>
            )}
            <button
              onClick={handleMicToggle}
              className={cn(
                'relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200',
                isMicOn
                  ? 'bg-timelens-gold/20 text-timelens-gold border-2 border-timelens-gold/40 shadow-lg shadow-timelens-gold/10'
                  : 'bg-red-500/90 text-white shadow-lg shadow-red-500/30',
              )}
              aria-label={isMicOn ? '마이크 끄기' : '마이크 켜기'}
            >
              {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>
          </div>

          {/* Diary */}
          <button
            onClick={() => sendTextMessage('다이어리 만들어줘')}
            className="w-11 h-11 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center
                       hover:bg-white/10 transition-colors"
            aria-label="다이어리"
          >
            <BookOpen className="w-4.5 h-4.5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Toast */}
      {showSaved && (
        <div className="absolute top-20 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="glass px-4 py-2 rounded-full animate-fade-in">
            <span className="text-xs text-timelens-gold font-medium">{showSaved}</span>
          </div>
        </div>
      )}
    </div>
  );
}
