// ============================================================
// 파일: src/app/session/page.tsx
// 역할: 메인 화면 — 대화 중심 UI + 온디맨드 카메라
// ============================================================

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mic, MicOff, BookOpen, Camera, CameraOff, ArrowLeft, Square } from 'lucide-react';
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
import { BeforeAfterSlider } from '@web/components/BeforeAfterSlider';
import NearbySites from '@web/components/NearbySites';

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
    sendPhotoMessage,
    sendGreeting,
    currentArtifact,
    transcript,
    audioState,
    activeAgent,
    restorationState,
    discoverySites,
    diaryResult,
    beforeImage,
    isRecognizing,
    capturePhotoRef,
    onCaptureFlashRef,
    openCameraAndCaptureRef,
    onCameraCompactRef,
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
  const [uiMounted, setUiMounted] = useState(false);
  const [artifactToastVisible, setArtifactToastVisible] = useState(false);
  const [showRestorationModal, setShowRestorationModal] = useState(false);
  const [modalSheetMounted, setModalSheetMounted] = useState(false);
  const [modalIsClosing, setModalIsClosing] = useState(false);
  const [showRestorationBadge, setShowRestorationBadge] = useState(false);
  /** 헤더 상태 메시지 — 에러/알림 통합 */
  const [headerMsg, setHeaderMsg] = useState<{ type: 'error' | 'info' | 'warn'; text: string } | null>(null);
  const headerMsgTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const cameraViewRef = useRef<CameraViewRef>(null);
  const [cameraCompact, setCameraCompact] = useState(false);
  const greetingSentRef = useRef(false);
  const prevAgentRef = useRef(activeAgent);
  /** 음성 트리거로 카메라 열릴 때 보낼 프롬프트 (캡처 대기용) */
  const pendingCapturePromptRef = useRef<string | null>(null);

  // 모달 드래그-투-디스미스 refs
  const modalSheetRef = useRef<HTMLDivElement>(null);
  const modalBackdropRef = useRef<HTMLDivElement>(null);
  const modalStartYRef = useRef(0);
  const modalDragYRef = useRef(0);
  const modalIsDraggingRef = useRef(false);

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
      setCameraCompact(false); // 음성 트리거 오픈 시에도 compact 리셋
      setIsCameraOpen(true);
      toggleCamera(true);
    };
    return () => { openCameraAndCaptureRef.current = null; };
  }, [openCameraAndCaptureRef, toggleCamera]);

  // 음성 자동 캡처 후 카메라 compact 모드 전환
  useEffect(() => {
    onCameraCompactRef.current = () => setCameraCompact(true);
    return () => { onCameraCompactRef.current = null; };
  }, [onCameraCompactRef]);

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

  // 유물 인식 토스트 — 8초 자동 해제
  useEffect(() => {
    if (currentArtifact) {
      setArtifactToastVisible(true);
      const timer = setTimeout(() => setArtifactToastVisible(false), 8000);
      return () => clearTimeout(timer);
    } else {
      setArtifactToastVisible(false);
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

  // 복원 상태 전환 처리
  useEffect(() => {
    if (restorationState.status === 'ready') {
      // 항상 false → true 전환을 보장해 슬라이드업 애니메이션이 재실행됨
      setShowRestorationModal(false);
      setModalIsClosing(false);
      const id = requestAnimationFrame(() => {
        setShowRestorationModal(true);
        setShowRestorationBadge(true);
      });
      const timer = setTimeout(() => setShowRestorationBadge(false), 8000);
      return () => { cancelAnimationFrame(id); clearTimeout(timer); };
    }
    if (restorationState.status === 'loading') {
      // 새 복원 시작 — 이전 모달 즉시 닫기 (이전 이미지 노출 방지)
      setShowRestorationModal(false);
    }
    if (restorationState.status === 'idle') {
      setShowRestorationModal(false);
      setShowRestorationBadge(false);
    }
  }, [restorationState.status]);

  // 모달 시트 마운트 → 다음 프레임에 translateY(0)으로 전환 (슬라이드업 애니메이션)
  useEffect(() => {
    if (!showRestorationModal) { setModalSheetMounted(false); return; }
    const id = requestAnimationFrame(() => setModalSheetMounted(true));
    return () => cancelAnimationFrame(id);
  }, [showRestorationModal]);

  // 복원 완료 시 카메라 닫기 + compact 리셋 (다음 오픈 시 정상 크기로)
  useEffect(() => {
    if (restorationState.status === 'ready') {
      setIsCameraOpen(false);
      toggleCamera(false);
      setCameraCompact(false); // 다음 카메라 오픈 시 full size로
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restorationState.status]);

  // ── Mount animation ─────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setUiMounted(true), 80);
    return () => clearTimeout(timer);
  }, []);

  // 세션 연결 완료 시 AI 첫 인사 트리거 (1회)
  useEffect(() => {
    if (isConnected && splashDone && !greetingSentRef.current) {
      greetingSentRef.current = true;
      const timer = setTimeout(() => sendGreeting(), 800);
      return () => clearTimeout(timer);
    }
  }, [isConnected, splashDone, sendGreeting]);

  // ── Header message helper ────────────────────────────────
  const showHeaderMsg = useCallback((type: 'error' | 'info' | 'warn', text: string, durationMs = 5000) => {
    setHeaderMsg({ type, text });
    if (headerMsgTimerRef.current) clearTimeout(headerMsgTimerRef.current);
    headerMsgTimerRef.current = setTimeout(() => setHeaderMsg(null), durationMs);
  }, []);

  // 에러 상태 감지 → 헤더 메시지 표시
  useEffect(() => {
    if (restorationState.status === 'error') {
      showHeaderMsg('error', restorationState.error || t('restoration.failed'));
    }
  }, [restorationState.status, restorationState, showHeaderMsg, t]);

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
    if (newState) setCameraCompact(false); // 카메라 열 때 compact 리셋
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

  const dismissModal = useCallback(() => {
    const sheet = modalSheetRef.current;
    const backdrop = modalBackdropRef.current;
    if (sheet) {
      sheet.style.transition = 'transform 0.32s cubic-bezier(0.16,1,0.3,1)';
      sheet.style.transform = 'translateY(110%)';
    }
    if (backdrop) {
      backdrop.style.transition = 'opacity 0.32s ease';
      backdrop.style.opacity = '0';
    }
    setModalIsClosing(true);
    setTimeout(() => setShowRestorationModal(false), 320);
  }, []);

  const handleModalPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (modalIsClosing) return;
    if ((e.target as HTMLElement).closest('button')) return;
    // 핸들 + 헤더 영역(상단 ~90px)에서 시작된 드래그만 허용
    // 슬라이더 영역에서 시작된 드래그는 무시
    const sheetEl = modalSheetRef.current;
    if (!sheetEl) return;
    const sheetTop = sheetEl.getBoundingClientRect().top;
    if (e.clientY - sheetTop > 90) return;
    modalStartYRef.current = e.clientY;
    modalDragYRef.current = 0;
    modalIsDraggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    sheetEl.style.transition = 'none';
    if (modalBackdropRef.current) modalBackdropRef.current.style.transition = 'none';
  }, [modalIsClosing]);

  const handleModalPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!modalIsDraggingRef.current) return;
    const raw = Math.max(0, e.clientY - modalStartYRef.current);
    // rubber-band: 많이 당길수록 저항감이 생겨 실제 이동량이 줄어듦
    const sheetH = modalSheetRef.current?.offsetHeight ?? 600;
    const rubberDelta = sheetH * (1 - Math.exp(-raw / sheetH));
    modalDragYRef.current = raw; // 임계값 판단은 raw 값으로
    if (modalSheetRef.current) modalSheetRef.current.style.transform = `translateY(${rubberDelta}px)`;
    if (modalBackdropRef.current) {
      modalBackdropRef.current.style.opacity = String(Math.max(0, 0.65 * (1 - raw / (sheetH * 1.2))));
    }
  }, []);

  const handleModalPointerUp = useCallback(() => {
    if (!modalIsDraggingRef.current) return;
    modalIsDraggingRef.current = false;
    const sheetH = modalSheetRef.current?.offsetHeight ?? 600;
    // 시트 높이의 65% 이상 드래그해야 닫힘
    if (modalDragYRef.current > sheetH * 0.65) {
      dismissModal();
    } else {
      if (modalSheetRef.current) {
        modalSheetRef.current.style.transition = 'transform 0.32s cubic-bezier(0.16,1,0.3,1)';
        modalSheetRef.current.style.transform = 'translateY(0)';
      }
      if (modalBackdropRef.current) {
        modalBackdropRef.current.style.transition = 'opacity 0.32s ease';
        modalBackdropRef.current.style.opacity = '0.65';
      }
      modalDragYRef.current = 0;
    }
  }, [dismissModal]);

  const handleTextSubmit = useCallback(() => {
    const text = textInput.trim();
    if (!text) return;
    setTextInput('');
    if (isCameraOpen) {
      // 카메라 열려있으면 현재 프레임 첨부해서 전송
      const photo = cameraViewRef.current?.capturePhoto();
      if (photo) {
        triggerCaptureFlash();
        sendPhotoMessage(photo, text);
        setCameraCompact(true);
        return;
      }
    }
    sendTextMessage(text);
  }, [textInput, isCameraOpen, sendPhotoMessage, sendTextMessage, triggerCaptureFlash]);

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

  const fromTop = (delay: number): React.CSSProperties => ({
    opacity: uiMounted ? 1 : 0,
    transform: uiMounted ? 'translateY(0)' : 'translateY(-24px)',
    transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  const fromBottom = (delay: number): React.CSSProperties => ({
    opacity: uiMounted ? 1 : 0,
    transform: uiMounted ? 'translateY(0)' : 'translateY(40px)',
    transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.6s cubic-bezier(0.34,1.4,0.64,1) ${delay}ms`,
  });

  const fromBottomBar = (delay: number): React.CSSProperties => ({
    opacity: uiMounted ? 1 : 0,
    transform: uiMounted ? 'translateY(0)' : 'translateY(60px)',
    transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
  });

  // ── Main session UI ─────────────────────────────────────

  return (
    <div className="relative flex flex-col w-full max-w-sm mx-auto h-full">

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

      {/* === Header === */}
      <div
        className="shrink-0 relative z-10 px-4 pb-2"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)',
          ...fromTop(0),
        }}
      >
        {/* 헤더 카드: Dynamic Island — 외부: 스프링 트랜지션 / 내부: 앰비언트 애니메이션 */}
        {/* 외부 래퍼: 상태 전환 시 스프링 바운스 */}
        <div style={{
          transform: audioState === 'speaking' ? 'scale(1.016)'
            : audioState === 'listening' ? 'scale(1.008)'
            : audioState === 'generating' ? 'scale(1.010)'
            : 'scale(1)',
          transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
        {/* 내부 카드: 앰비언트 애니메이션 (transform 충돌 없음) */}
        <div
          className={cn(
            'rounded-2xl px-3 py-2.5',
            audioState === 'speaking'  && 'animate-[di-speak-inner_2.2s_ease-in-out_infinite]',
            audioState === 'listening' && 'animate-[di-listen-inner_2.8s_ease-in-out_infinite]',
            audioState === 'generating' && 'animate-[di-generate-glow_1.8s_ease-in-out_infinite]',
          )}
          style={{
            background: audioState === 'speaking'
              ? 'rgba(155,114,203,0.07)'
              : 'rgba(212,165,116,0.06)',
            border: audioState === 'listening'
              ? '1px solid rgba(212,165,116,0.42)'
              : audioState === 'speaking'
              ? '1px solid rgba(155,114,203,0.42)'
              : audioState === 'generating'
              ? '1px solid rgba(212,165,116,0.28)'
              : '1px solid rgba(212,165,116,0.18)',
            boxShadow: audioState === 'listening'
              ? '0 0 24px rgba(212,165,116,0.14)'
              : audioState === 'speaking'
              ? '0 0 28px rgba(155,114,203,0.18)'
              : 'none',
            transition: 'background 0.45s ease, border-color 0.45s ease, box-shadow 0.45s ease',
          }}
        >
            {/* 단일 행: [←] [Gemini · Agent · LIVE] [■/공백] */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handleExit}
              className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.06]
                         flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
              aria-label={t('session.exit')}
            >
              <ArrowLeft className="w-3 h-3 text-gray-400" />
            </button>

            <div className="flex-1">
              <AgentIndicator
                activeAgent={activeAgent}
                switchData={agentTransition ?? undefined}
                isTransitioning={isAgentTransitioning}
                locale={locale}
              />
            </div>

            <div className="w-7 h-7 shrink-0" />
          </div>

          {/* 오디오 파형 */}
          <AudioVisualizer
            state={audioState}
            generatingLabel={
              restorationState.status === 'loading'
                ? restorationState.mode === 'image_search'
                  ? t('audio.searching')
                  : t('audio.restoring')
                : undefined
            }
          />

          {/* 헤더 상태 메시지 — 에러/알림 통합 표시, 자동 소멸 */}
          <div
            style={{
              maxHeight: headerMsg ? 36 : 0,
              opacity: headerMsg ? 1 : 0,
              marginTop: headerMsg ? 6 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease, margin-top 0.3s ease',
            }}
          >
            {headerMsg && (
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
                style={{
                  background: headerMsg.type === 'error'
                    ? 'rgba(239,68,68,0.10)'
                    : headerMsg.type === 'warn'
                    ? 'rgba(251,191,36,0.10)'
                    : 'rgba(212,165,116,0.08)',
                  border: `1px solid ${headerMsg.type === 'error' ? 'rgba(239,68,68,0.25)' : headerMsg.type === 'warn' ? 'rgba(251,191,36,0.25)' : 'rgba(212,165,116,0.20)'}`,
                }}
              >
                {/* 상태 점 */}
                <span
                  className="shrink-0 w-1.5 h-1.5 rounded-full"
                  style={{
                    background: headerMsg.type === 'error' ? '#f87171' : headerMsg.type === 'warn' ? '#fbbf24' : '#D4A574',
                  }}
                />
                <span
                  className="text-[11px] truncate flex-1"
                  style={{
                    color: headerMsg.type === 'error' ? '#fca5a5' : headerMsg.type === 'warn' ? '#fde68a' : 'rgba(212,165,116,0.85)',
                  }}
                >
                  {headerMsg.text}
                </span>
                <button
                  onClick={() => { setHeaderMsg(null); if (headerMsgTimerRef.current) clearTimeout(headerMsgTimerRef.current); }}
                  className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full opacity-50 hover:opacity-100"
                  style={{ color: headerMsg.type === 'error' ? '#f87171' : '#D4A574' }}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

        </div>{/* /내부 카드 */}
        </div>{/* /외부 스프링 래퍼 */}
      </div>

      {/* === Main: 대화 영역 + 카메라 배경 === */}
      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden" style={fromBottom(80)}>

        {/* ── 카메라 배경 레이어 (카메라 켜지면 채팅 뒤에 깔림) ── */}
        {isCameraOpen && (
          <div className="absolute inset-0 z-0">
            <CameraView
              ref={cameraViewRef}
              isScanning={isRecognizing && restorationState.status === 'idle'}
              isRecognized={showRecognizedBadge && restorationState.status === 'idle'}
              isBlurred={false}
              onCapturePhoto={() => cameraViewRef.current?.capturePhoto() ?? ''}
            />
            {restorationState.status !== 'ready' && (
              <RestorationOverlay state={restorationState} beforeImage={beforeImage} locale={locale} />
            )}
            {showCaptureFlash && (
              <div className="absolute inset-0 bg-white/80 z-20 animate-[fadeOut_0.2s_ease-out_forwards]" />
            )}
            {/* 가독성 스크림: 상단·하단 어두워서 텍스트 잘 보임 */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                zIndex: 6,
                background: 'linear-gradient(to bottom, rgba(5,3,10,0.55) 0%, rgba(5,3,10,0.05) 30%, rgba(5,3,10,0.05) 55%, rgba(5,3,10,0.75) 80%, rgba(5,3,10,0.92) 100%)',
              }}
            />
          </div>
        )}

        {/* ── UI 컨텐츠 레이어 ── */}
        <div className="relative z-10 flex flex-col flex-1 min-h-0">

          {/* 유물 인식 배지 — 카메라 ON + 인식 후 상단 고정 */}
          {isCameraOpen && currentArtifact && restorationState.status === 'idle' && (
            <div className="shrink-0 flex justify-center pt-3 px-4 pointer-events-none">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-2xl"
                style={{
                  background: 'rgba(5,3,10,0.88)',
                  border: '1.5px solid rgba(212,165,116,0.55)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  boxShadow: '0 0 24px rgba(212,165,116,0.2), 0 4px 20px rgba(0,0,0,0.5)',
                  animation: 'recog-badge-drop 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 28 28" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <defs>
                    <linearGradient id="gem-cam2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#4285F4" />
                      <stop offset="55%" stopColor="#9B72CB" />
                      <stop offset="100%" stopColor="#D4A574" />
                    </linearGradient>
                  </defs>
                  <path d="M14 2C14 2 14 14 2 14C14 14 14 26 14 26C14 26 14 14 26 14C14 14 14 2 14 2Z" fill="url(#gem-cam2)" />
                </svg>
                <span className="text-[13px] font-semibold text-white truncate max-w-[160px]">{currentArtifact.name}</span>
                <div className="w-px h-3 shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }} />
                <span className="text-[11px] shrink-0" style={{ color: 'rgba(212,165,116,0.85)' }}>{currentArtifact.era}</span>
              </div>
            </div>
          )}

          {/* 유물 인식 토스트 — 카메라 OFF 시만 */}
          {!isCameraOpen && artifactToastVisible && currentArtifact && (
            <div className="shrink-0 mx-4 mt-2 animate-discover-slide-up">
              <div
                className="flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-full"
                style={{
                  background: 'rgba(15,11,7,0.88)',
                  border: '1px solid rgba(212,165,116,0.22)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}
              >
                <span className="text-sm shrink-0">🏛</span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-white truncate block">{currentArtifact.name}</span>
                  <span className="text-[10px] text-gray-500 truncate block">{currentArtifact.era} · {currentArtifact.civilization}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  {currentArtifact.topics.slice(0, 2).map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => handleTopicTap(topic.id, topic.label)}
                      className="text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{
                        background: 'rgba(212,165,116,0.10)',
                        border: '1px solid rgba(212,165,116,0.18)',
                        color: 'rgba(212,165,116,0.75)',
                      }}
                    >
                      {topic.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setArtifactToastVisible(false)}
                  className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-gray-600 hover:text-gray-400"
                  aria-label="close"
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* 복원 완료 뱃지 */}
          {restorationState.status === 'ready' && showRestorationBadge && !showRestorationModal && (
            <div className="shrink-0 mx-4 mt-2" style={{ animation: 'fadeInUp 0.35s cubic-bezier(0.16,1,0.3,1) both' }}>
              <button
                onClick={() => { setShowRestorationModal(true); setModalSheetMounted(false); setModalIsClosing(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(212,165,116,0.08)', border: '1px solid rgba(212,165,116,0.2)' }}
              >
                <span className="text-sm">🕰️</span>
                <span className="text-xs text-white/70 truncate flex-1">{restorationState.data.artifactName}</span>
                <span className="text-[10px] shrink-0 px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(212,165,116,0.12)', border: '1px solid rgba(212,165,116,0.25)', color: '#D4A574' }}>
                  {t('restoration.restored')}
                </span>
              </button>
            </div>
          )}

          {discoverySites.length > 0 && (
            <div className="shrink-0 mx-4 mt-2">
              <NearbySites sites={discoverySites} locale={locale} />
            </div>
          )}

          {/* 트랜스크립트 */}
          <div className="flex-1 overflow-hidden px-4 py-3">
            <TranscriptChat
              chunks={transcript}
              isStreaming={audioState === 'speaking'}
              locale={locale}
              onScrollUp={() => setArtifactToastVisible(false)}
            />
          </div>

          {/* 셔터 버튼 — 카메라 배경일 때 하단에 */}
          {isCameraOpen && restorationState.status !== 'loading' && (
            <div className="shrink-0 pb-4 flex justify-center">
              <button
                onClick={handleCapture}
                className="w-14 h-14 rounded-full border-[3px] border-white/90 bg-white/15
                           backdrop-blur-sm flex items-center justify-center
                           active:scale-90 transition-transform shadow-xl shadow-black/40"
                aria-label={t('session.capture')}
              >
                <div className="w-10 h-10 rounded-full bg-white/85" />
              </button>
            </div>
          )}

        </div>
      </div>

      {/* === Bottom bar === */}
      <div className="shrink-0 pb-safe-bottom glass-strong rounded-t-2xl" style={fromBottomBar(160)}>
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
          {audioState === 'speaking' ? (
            <button
              onClick={interrupt}
              className="p-2.5 rounded-full active:scale-95 transition-all"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}
              aria-label={t('session.stop')}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleTextSubmit}
              className="px-4 py-2.5 bg-timelens-gold text-black rounded-full font-semibold text-xs
                         active:scale-95 transition-transform"
            >
              {t('session.send')}
            </button>
          )}
        </div>

        {/* 구분선 */}
        <div className="mx-4 mb-2 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

        <div className="flex items-end justify-center gap-6 px-4 pb-3">
          {/* 카메라 */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleCameraToggle}
              className={cn(
                'w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-90',
                isCameraOpen
                  ? 'bg-timelens-gold/15 text-timelens-gold border border-timelens-gold/30'
                  : 'bg-white/[0.06] text-gray-400 border border-white/[0.06] hover:bg-white/10',
              )}
              aria-label={isCameraOpen ? t('session.cameraClose') : t('session.cameraOpen')}
            >
              {isCameraOpen ? <CameraOff className="w-4.5 h-4.5" /> : <Camera className="w-4.5 h-4.5" />}
            </button>
            <span className="text-[9px] text-gray-600 tracking-wide">
              {isCameraOpen ? t('session.cameraClose') : t('session.cameraOpen')}
            </span>
          </div>

          {/* 마이크 — 메인 액션 */}
          <div className="flex flex-col items-center gap-1">
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
                  'relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90',
                  isMicOn
                    ? 'bg-timelens-gold/20 text-timelens-gold border-2 border-timelens-gold/40'
                    : 'bg-red-500/90 text-white',
                )}
                style={isMicOn ? {
                  boxShadow: '0 0 28px rgba(212,165,116,0.25), 0 4px 16px rgba(212,165,116,0.15)',
                } : {
                  boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
                }}
                aria-label={isMicOn ? t('session.micOff') : t('session.micOn')}
              >
                {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>
            </div>
            <span className="text-[9px] tracking-wide" style={{ color: isMicOn ? 'rgba(212,165,116,0.6)' : 'rgba(239,68,68,0.7)' }}>
              {isMicOn ? t('session.micOff') : t('session.micOn')}
            </span>
          </div>

          {/* 다이어리 */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => sendTextMessage(t('session.diaryPrompt'))}
              className="w-11 h-11 rounded-2xl bg-white/[0.06] border border-white/[0.06]
                         flex items-center justify-center hover:bg-white/10 transition-colors active:scale-90"
              aria-label={t('session.diary')}
            >
              <BookOpen className="w-4.5 h-4.5 text-gray-400" />
            </button>
            <span className="text-[9px] text-gray-600 tracking-wide">{t('session.diary')}</span>
          </div>
        </div>
      </div>

      {/* === 유물 인식 오버레이 — z-50, 모든 레이어 위 === */}
      {isCameraOpen && showRecognizedBadge && currentArtifact && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 50 }}>

          {/* 화면 테두리 플래시 */}
          <div
            style={{
              position: 'absolute', inset: 0,
              border: '2px solid rgba(212,165,116,0.85)',
              boxShadow: 'inset 0 0 80px rgba(212,165,116,0.12), 0 0 40px rgba(212,165,116,0.15)',
              animation: 'recog-border 0.9s ease-out both',
            }}
          />

          {/* 코너 브래킷 × 4 */}
          {([
            { s: { top: 24, left: 24, borderTop: '2.5px solid rgba(212,165,116,0.95)', borderLeft: '2.5px solid rgba(212,165,116,0.95)', borderTopLeftRadius: 5 }, d: '0s' },
            { s: { top: 24, right: 24, borderTop: '2.5px solid rgba(212,165,116,0.95)', borderRight: '2.5px solid rgba(212,165,116,0.95)', borderTopRightRadius: 5 }, d: '0.07s' },
            { s: { bottom: 24, left: 24, borderBottom: '2.5px solid rgba(212,165,116,0.95)', borderLeft: '2.5px solid rgba(212,165,116,0.95)', borderBottomLeftRadius: 5 }, d: '0.14s' },
            { s: { bottom: 24, right: 24, borderBottom: '2.5px solid rgba(212,165,116,0.95)', borderRight: '2.5px solid rgba(212,165,116,0.95)', borderBottomRightRadius: 5 }, d: '0.21s' },
          ] as const).map((c, i) => (
            <div
              key={i}
              style={{
                position: 'absolute', width: 32, height: 32,
                boxShadow: '0 0 16px rgba(212,165,116,0.6), 0 0 6px rgba(212,165,116,0.4)',
                animation: `recog-corner 0.45s cubic-bezier(0.34,1.56,0.64,1) ${c.d} both`,
                ...c.s,
              }}
            />
          ))}

          {/* 확장 링 × 2 */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -48, marginTop: -48, width: 96, height: 96, borderRadius: '50%', border: '1.5px solid rgba(212,165,116,0.75)', animation: 'recog-ring-expand 0.7s ease-out both' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -48, marginTop: -48, width: 96, height: 96, borderRadius: '50%', border: '1px solid rgba(212,165,116,0.45)', animation: 'recog-ring-expand 0.7s ease-out 0.15s both' }} />
          </div>

          {/* 중앙 인식 카드 */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 'calc(100% - 64px)', maxWidth: 280 }}>
            <div style={{ animation: 'recog-card-lifecycle 3s ease-in-out both' }}>
              <div
                style={{
                  background: 'rgba(5,3,10,0.92)',
                  border: '1.5px solid rgba(212,165,116,0.7)',
                  borderRadius: 20,
                  padding: '20px 24px',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  boxShadow: '0 0 60px rgba(212,165,116,0.22), 0 0 16px rgba(212,165,116,0.1), 0 20px 56px rgba(0,0,0,0.7)',
                  textAlign: 'center' as const,
                }}
              >
                {/* Gemini 아이콘 */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(212,165,116,0.08)', border: '1.5px solid rgba(212,165,116,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(212,165,116,0.25)' }}>
                    <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                      <defs>
                        <linearGradient id="gem-recog-ov" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#4285F4" />
                          <stop offset="55%" stopColor="#9B72CB" />
                          <stop offset="100%" stopColor="#D4A574" />
                        </linearGradient>
                      </defs>
                      <path d="M14 2C14 2 14 14 2 14C14 14 14 26 14 26C14 26 14 14 26 14C14 14 14 2 14 2Z" fill="url(#gem-recog-ov)" />
                    </svg>
                  </div>
                </div>

                {/* 인식 상태 라벨 */}
                <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(212,165,116,0.75)', marginBottom: 8, fontWeight: 600 }}>
                  Recognized
                </div>

                {/* 유물 이름 */}
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6, lineHeight: 1.25 }}>
                  {currentArtifact.name}
                </div>

                {/* era · civilization */}
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: currentArtifact.oneLiner ? 10 : 0 }}>
                  {currentArtifact.era}
                  {currentArtifact.civilization && currentArtifact.civilization !== 'Other'
                    ? ` · ${currentArtifact.civilization}`
                    : ''}
                </div>

                {/* 한 줄 설명 */}
                {currentArtifact.oneLiner && (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', lineHeight: 1.55, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10 }}>
                    {currentArtifact.oneLiner}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* === 복원 결과 모달 — MuseumSelector 패턴 === */}
      {showRestorationModal && restorationState.status === 'ready' && (
        <div
          className="absolute inset-0 z-40 flex items-end justify-center"
          onClick={modalIsClosing ? undefined : dismissModal}
        >
          {/* 딤 배경 */}
          <div
            ref={modalBackdropRef}
            className="absolute inset-0 bg-black"
            style={{ opacity: 0.65, transition: 'opacity 0.32s ease' }}
          />

          {/* 시트 */}
          <div
            ref={modalSheetRef}
            className="relative w-full flex flex-col touch-none"
            style={{
              height: '88%',
              background: 'rgba(13,10,7,0.98)',
              borderRadius: '20px 20px 0 0',
              border: '1px solid rgba(212,165,116,0.15)',
              borderBottom: 'none',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
              transform: modalSheetMounted ? 'translateY(0)' : 'translateY(110%)',
              transition: 'transform 0.32s cubic-bezier(0.16,1,0.3,1)',
              willChange: 'transform',
            }}
            onPointerDown={handleModalPointerDown}
            onPointerMove={handleModalPointerMove}
            onPointerUp={handleModalPointerUp}
            onPointerCancel={handleModalPointerUp}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 드래그 핸들 */}
            <div className="shrink-0 flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing select-none">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.22)' }} />
            </div>

            {/* 헤더 */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white truncate">{restorationState.data.artifactName}</h2>
                <p className="text-[11px] mt-0.5" style={{ color: '#D4A574' }}>{restorationState.data.era}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  onClick={handleDownloadRestoration}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(212,165,116,0.12)', border: '1px solid rgba(212,165,116,0.28)', color: '#D4A574' }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  {t('session.save')}
                </button>
                <button
                  onClick={dismissModal}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
                  aria-label="Close"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 복원 모드: BeforeAfter 슬라이더 / 이미지 검색 모드: 단일 이미지 */}
            <div className="flex-1 flex flex-col min-h-0 px-4 pb-6">
              {restorationState.data.mode === 'image_search' ? (
                /* Wikipedia 이미지 — 단일 표시 */
                <div className="flex flex-col gap-3 h-full animate-[restorationReveal_0.55s_cubic-bezier(0.16,1,0.3,1)_forwards] opacity-0">
                  <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden"
                    style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,165,116,0.12)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={restorationState.data.imageUrl}
                      alt={restorationState.data.artifactName}
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                    <div className="absolute top-3 right-3 z-10 pointer-events-none">
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full"
                        style={{ background: 'rgba(15,11,7,0.7)', backdropFilter: 'blur(6px)', color: '#D4A574', border: '1px solid rgba(212,165,116,0.3)' }}>
                        {restorationState.data.era}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full"
                        style={{ background: 'rgba(15,11,7,0.55)', backdropFilter: 'blur(6px)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        Wikipedia
                      </span>
                    </div>
                  </div>
                  {restorationState.data.description && (
                    <p className="text-[12px] leading-relaxed px-1 line-clamp-2 shrink-0"
                      style={{ color: 'rgba(255,255,255,0.45)' }}>
                      {restorationState.data.description}
                    </p>
                  )}
                </div>
              ) : (
                /* AI 복원 — BeforeAfter 슬라이더 */
                <BeforeAfterSlider
                  beforeImage={beforeImage ?? ''}
                  afterImage={restorationState.data.imageUrl}
                  artifactName={restorationState.data.artifactName}
                  era={restorationState.data.era}
                  description={restorationState.data.description}
                  onSave={handleDownloadRestoration}
                  hideSaveButton
                  fillContainer
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {showSaved && (
        <div className="absolute bottom-28 left-0 right-0 z-50 flex justify-center pointer-events-none animate-[fadeInUp_0.3s_ease-out_forwards]">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: 'rgba(15,11,7,0.92)', border: '1px solid rgba(212,165,116,0.35)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D4A574" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-xs font-medium" style={{ color: '#D4A574' }}>{showSaved}</span>
          </div>
        </div>
      )}
    </div>
  );
}
