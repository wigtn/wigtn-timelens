// ============================================================
// 파일: src/app/session/page.tsx
// 역할: 메인 화면 — 대화 중심 UI + 온디맨드 카메라
// ============================================================

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mic, MicOff, BookOpen, Camera, CameraOff, LogOut, Square } from 'lucide-react';
import { cn } from '@web/lib/utils';
import { useT } from '@web/lib/i18n';
import type { Locale } from '@shared/i18n';
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
import { RestorationResult } from '@web/components/RestorationResult';
import NearbySites from '@web/components/NearbySites';
import TopicChip from '@web/components/TopicChip';
import LanguageSelector from '@web/components/LanguageSelector';

/** 카메라 자동 오픈 후 스트림 안정화 대기 시간 (ms) */
const CAMERA_STABILIZATION_MS = 500;

export default function MainPage() {
  const {
    isConnected,
    connect,
    disconnect,
    toggleMic,
    toggleCamera,
    interrupt,
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
    clearToolResult,
    capturePhotoRef,
    onCaptureFlashRef,
    openCameraAndCaptureRef,
  } = useLiveSession();

  const router = useRouter();
  const searchParams = useSearchParams();
  const geo = useGeolocation();
  const { locale, setLocale, t } = useT();

  // 랜딩 페이지에서 언어 전달 시 자동 적용
  const langParam = searchParams.get('lang') as Locale | null;

  // Onboarding flow state
  const [languageSelected, setLanguageSelected] = useState(() => {
    return langParam != null && ['ko', 'en', 'ja', 'zh', 'hi'].includes(langParam);
  });
  // localStorage 캐시로 이전에 허용한 경우 즉시 스킵
  const [permissionsGranted, setPermissionsGranted] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('timelens_perms') === '1'
  );
  const [museumSelected, setMuseumSelected] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [splashMuseum, setSplashMuseum] = useState<{ name?: string; photoUrl?: string }>({});

  // Session UI state
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [agentTransition, setAgentTransition] = useState<AgentSwitchData | null>(null);
  const [isAgentTransitioning, setIsAgentTransitioning] = useState(false);
  const [showSaved, setShowSaved] = useState<string | null>(null);
  const [showRecognizedBadge, setShowRecognizedBadge] = useState(false);
  const [showCaptureFlash, setShowCaptureFlash] = useState(false);

  const cameraViewRef = useRef<CameraViewRef>(null);
  const prevAgentRef = useRef(activeAgent);
  /** 음성 트리거로 카메라 열릴 때 보낼 프롬프트 (캡처 대기용) */
  const pendingCapturePromptRef = useRef<string | null>(null);

  // 랜딩에서 전달된 언어 파라미터 적용
  useEffect(() => {
    if (langParam && ['ko', 'en', 'ja', 'zh', 'hi'].includes(langParam)) {
      setLocale(langParam);
    }
  // 마운트 1회만
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CameraView의 capturePhoto를 useLiveSession에 연결 (음성 자동 캡처용)
  useEffect(() => {
    capturePhotoRef.current = () => cameraViewRef.current?.capturePhoto() ?? null;
    return () => { capturePhotoRef.current = null; };
  }, [capturePhotoRef]);

  // 셔터 플래시 트리거 (수동 캡처 + 음성 자동 캡처 공용)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const triggerCaptureFlash = useCallback(() => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setShowCaptureFlash(true);
    flashTimerRef.current = setTimeout(() => setShowCaptureFlash(false), 200);
  }, []);

  // 음성 자동 캡처 시 플래시 콜백 연결 + 언마운트 cleanup
  useEffect(() => {
    onCaptureFlashRef.current = triggerCaptureFlash;
    return () => {
      onCaptureFlashRef.current = null;
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [onCaptureFlashRef, triggerCaptureFlash]);

  // 음성 트리거로 카메라 자동 오픈 + 캡처 콜백 연결
  useEffect(() => {
    openCameraAndCaptureRef.current = (prompt: string) => {
      pendingCapturePromptRef.current = prompt;
      setIsCameraOpen(true);
      toggleCamera(true);
    };
    return () => { openCameraAndCaptureRef.current = null; };
  }, [openCameraAndCaptureRef, toggleCamera]);

  // 카메라가 열리고 pendingCapture가 있으면 → 안정화 후 자동 캡처
  // Note: sendPhoto/triggerCaptureFlash는 useCallback으로 안정적이므로 재트리거하지 않음
  useEffect(() => {
    if (!isCameraOpen || !pendingCapturePromptRef.current) return;
    const prompt = pendingCapturePromptRef.current;
    pendingCapturePromptRef.current = null;
    const timer = setTimeout(() => {
      const photo = cameraViewRef.current?.capturePhoto();
      if (photo) {
        triggerCaptureFlash();
        sendPhoto(photo, prompt);
      }
    }, CAMERA_STABILIZATION_MS);
    return () => clearTimeout(timer);
  }, [isCameraOpen, sendPhoto, triggerCaptureFlash]);

  // 인식 배지 3초 후 자동 해제
  useEffect(() => {
    if (currentArtifact) {
      setShowRecognizedBadge(true);
      const timer = setTimeout(() => setShowRecognizedBadge(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowRecognizedBadge(false);
    }
  }, [currentArtifact]);

  // ── Onboarding handlers ─────────────────────────────────

  const handleLanguageSelect = useCallback((selected: Locale) => {
    setLocale(selected);
    setLanguageSelected(true);
  }, [setLocale]);

  const handlePermissionsGranted = useCallback(() => {
    localStorage.setItem('timelens_perms', '1');
    setPermissionsGranted(true);
  }, []);

  const connectWithContext = useCallback(async (museum?: MuseumContext) => {
    console.log('[page] connectWithContext called, museum:', museum?.name, 'locale:', locale);
    const userLoc = geo.latitude && geo.longitude
      ? { lat: geo.latitude, lng: geo.longitude }
      : undefined;
    await connect({
      language: locale,
      museum,
      userLocation: userLoc,
    });
    console.log('[page] connectWithContext done');
  }, [connect, geo.latitude, geo.longitude, locale]);

  const handleMuseumSelect = useCallback(async (museum: MuseumContext) => {
    console.log('[page] handleMuseumSelect:', museum.name);
    setMuseumSelected(true);
    setSplashMuseum({ name: museum.name, photoUrl: museum.photoUrl });
    try {
      await connectWithContext(museum);
    } catch (error) {
      console.error('[page] Failed to connect:', error);
    }
  }, [connectWithContext]);

  const handleMuseumSkip = useCallback(async () => {
    setMuseumSelected(true);
    try {
      await connectWithContext();
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }, [connectWithContext]);

  const handleRetry = useCallback(async () => {
    try {
      await connectWithContext();
    } catch (error) {
      console.error('Retry failed:', error);
    }
  }, [connectWithContext]);

  // ── Navigation handlers ─────────────────────────────────

  const handleBack = useCallback(() => {
    if (museumSelected) {
      // 세션 중 → 박물관 선택 화면으로
      setMuseumSelected(false);
      setSplashDone(false);
      disconnect?.();
    } else {
      // 온보딩 중 어느 단계든 → 랜딩 페이지로
      router.push('/');
    }
  }, [museumSelected, disconnect, router]);

  const handleExit = useCallback(() => {
    disconnect?.();
    router.push('/');
  }, [disconnect, router]);

  // ── Session effects ─────────────────────────────────────

  useEffect(() => {
    if (prevAgentRef.current !== activeAgent) {
      setIsAgentTransitioning(true);
      const reasons: Record<string, string> = {
        restoration: t('agent.switch.restoration'),
        discovery: t('agent.switch.discovery'),
        diary: t('agent.switch.diary'),
      };
      setAgentTransition({
        from: prevAgentRef.current,
        to: activeAgent,
        reason: reasons[activeAgent] ?? '',
      });
      prevAgentRef.current = activeAgent;
      const timer = setTimeout(() => setIsAgentTransitioning(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [activeAgent, t]);

  useEffect(() => {
    if (diaryResult) {
      router.push(`/diary/${diaryResult.diaryId}`);
    }
  }, [diaryResult, router]);

  // 복원 완료 시에만 카메라 닫기
  useEffect(() => {
    if (restorationState.status === 'ready' && isCameraOpen) {
      setIsCameraOpen(false);
      toggleCamera(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restorationState.status]);

  // ── Action handlers ─────────────────────────────────────

  const handleMicToggle = useCallback(() => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    toggleMic(newState);
  }, [isMicOn, toggleMic]);

  const handleCameraToggle = useCallback(() => {
    const newState = !isCameraOpen;
    setIsCameraOpen(newState);
    toggleCamera(newState);
  }, [isCameraOpen, toggleCamera]);

  const handleCapture = useCallback(() => {
    const photo = cameraViewRef.current?.capturePhoto();
    if (!photo) return;
    triggerCaptureFlash();
    sendPhoto(photo);
  }, [sendPhoto, triggerCaptureFlash]);

  const handleTopicTap = useCallback(
    (topicId: string, topicLabel: string) => {
      requestTopicDetail(topicId, topicLabel);
    },
    [requestTopicDetail]
  );

  const handleDownloadRestoration = useCallback(() => {
    if (restorationState.status !== 'ready') return;
    const url = restorationState.data.imageUrl;
    if (!url.startsWith('https://') && !url.startsWith('data:image/')) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `timelens-restored-${Date.now()}.jpg`;
    link.click();
    setShowSaved(t('session.saved'));
    setTimeout(() => setShowSaved(null), 2000);
  }, [restorationState, t]);

  const handleTextSubmit = useCallback(() => {
    if (textInput.trim()) {
      sendTextMessage(textInput.trim());
      setTextInput('');
    }
  }, [textInput, sendTextMessage]);

  // ── Onboarding gates ────────────────────────────────────

  // Step 1: Language selection
  if (!languageSelected) {
    return <LanguageSelector onSelect={handleLanguageSelect} />;
  }

  // Step 2: Permission gate
  if (!permissionsGranted) {
    return <PermissionGate onGranted={handlePermissionsGranted} onBack={handleBack} locale={locale} />;
  }

  // Step 3: Museum selection
  if (!museumSelected) {
    const userLocation = geo.latitude && geo.longitude
      ? { lat: geo.latitude, lng: geo.longitude }
      : null;
    return (
      <MuseumSelector
        userLocation={userLocation}
        isLoadingLocation={geo.isLoading}
        locationDenied={!geo.isLoading && !userLocation && !!geo.error}
        onSelect={handleMuseumSelect}
        onSkip={handleMuseumSkip}
        onBack={handleBack}
        locale={locale}
      />
    );
  }

  // ── Main session UI ─────────────────────────────────────

  return (
    <div className="relative flex flex-col w-full max-w-sm mx-auto h-full bg-gray-950">
      {/* Onboarding splash */}
      {museumSelected && !splashDone && (
        <OnboardingSplash
          museumName={splashMuseum.name}
          museumPhotoUrl={splashMuseum.photoUrl}
          isConnected={isConnected}
          onRetry={handleRetry}
          onDone={() => setSplashDone(true)}
          locale={locale}
        />
      )}

      {/* === Glass Header === */}
      <div className="shrink-0 relative z-10 px-4 pt-safe-top">
        <div className="glass-strong rounded-2xl px-4 py-3 mt-2">
          <div className="flex items-center gap-2">
            {/* Exit button */}
            <button
              onClick={handleExit}
              className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.06]
                         flex items-center justify-center hover:bg-white/10 transition-colors"
              aria-label={t('session.exit')}
            >
              <LogOut className="w-3.5 h-3.5 text-gray-400" />
            </button>
            <div className="flex-1 relative">
              <AgentIndicator
                activeAgent={activeAgent}
                switchData={agentTransition ?? undefined}
                isTransitioning={isAgentTransitioning}
                locale={locale}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <AudioVisualizer state={audioState} />
            </div>
            {audioState === 'speaking' && (
              <button
                onClick={interrupt}
                className="w-7 h-7 rounded-full bg-red-500/20 border border-red-500/30
                           flex items-center justify-center hover:bg-red-500/30 transition-colors
                           animate-fade-in shrink-0"
                aria-label={t('session.stop')}
              >
                <Square className="w-3 h-3 text-red-400 fill-red-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* === Main: Conversation + Inline cards === */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Artifact summary card */}
        {currentArtifact && (
          <div className="shrink-0 mx-4 mt-3 p-3.5 glass rounded-2xl animate-discover-slide-up">
            <h3 className="text-base font-heading font-bold text-white">{currentArtifact.name}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {currentArtifact.era} · {currentArtifact.civilization}
              {currentArtifact.architectureStyle && ` · ${currentArtifact.architectureStyle}`}
            </p>
            <p className="text-sm text-gray-200 mt-1.5 italic">{currentArtifact.oneLiner}</p>
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

        {/* Restoration result */}
        {!isCameraOpen && restorationState.status !== 'idle' && (
          <div className="shrink-0 mx-4 mt-2 max-h-[60vh] overflow-y-auto">
            <RestorationResult
              state={restorationState}
              onSave={handleDownloadRestoration}
              onClose={clearToolResult}
            />
          </div>
        )}

        {/* Discovery sites */}
        {discoverySites.length > 0 && (
          <div className="shrink-0 mx-4 mt-2">
            <NearbySites sites={discoverySites} locale={locale} />
          </div>
        )}

        {/* Chat transcript */}
        <div className="flex-1 overflow-hidden px-4 py-3">
          <TranscriptChat chunks={transcript} isStreaming={audioState === 'speaking'} locale={locale} />
        </div>
      </div>

      {/* === Camera PIP === */}
      {isCameraOpen && (
        <div className="shrink-0 mx-4 mb-2 relative rounded-2xl overflow-hidden" style={{ height: '28vh' }}>
          <CameraView
            ref={cameraViewRef}
            isScanning={false}
            isRecognized={showRecognizedBadge}
            isBlurred={false}
            onCapturePhoto={() => cameraViewRef.current?.capturePhoto() ?? ''}
          />
          <RestorationOverlay state={restorationState} beforeImage={beforeImage} locale={locale} />
          {/* 셔터 플래시 */}
          {showCaptureFlash && (
            <div className="absolute inset-0 bg-white/80 z-20 animate-[fadeOut_0.2s_ease-out_forwards]" />
          )}
          {/* 카메라 셔터 버튼 */}
          {restorationState.status === 'idle' && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10">
              <button
                onClick={handleCapture}
                className="w-14 h-14 rounded-full border-[3px] border-white/90 bg-white/20
                           backdrop-blur-sm flex items-center justify-center
                           active:scale-90 transition-transform shadow-lg shadow-black/30"
                aria-label={t('session.capture')}
              >
                <div className="w-10 h-10 rounded-full bg-white/90" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* === Bottom: Glass Input Bar === */}
      <div className="shrink-0 pb-safe-bottom glass-strong rounded-t-2xl">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleTextSubmit()}
            placeholder={t('session.inputPlaceholder')}
            className="flex-1 px-4 py-2.5 bg-white/[0.06] rounded-full text-white text-sm
                       placeholder:text-gray-500 outline-none focus:ring-1 focus:ring-timelens-gold/30
                       border border-white/[0.06]"
          />
          <button
            onClick={handleTextSubmit}
            className="px-4 py-2.5 bg-timelens-gold text-black rounded-full font-semibold text-xs
                       active:scale-95 transition-transform"
          >
            {t('session.send')}
          </button>
        </div>

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
            aria-label={isCameraOpen ? t('session.cameraClose') : t('session.cameraOpen')}
          >
            {isCameraOpen ? <CameraOff className="w-4.5 h-4.5" /> : <Camera className="w-4.5 h-4.5" />}
          </button>

          {/* Mic toggle */}
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
              aria-label={isMicOn ? t('session.micOff') : t('session.micOn')}
            >
              {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>
          </div>

          {/* Diary */}
          <button
            onClick={() => sendTextMessage(t('session.diaryPrompt'))}
            className="w-11 h-11 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center justify-center
                       hover:bg-white/10 transition-colors"
            aria-label={t('session.diary')}
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
