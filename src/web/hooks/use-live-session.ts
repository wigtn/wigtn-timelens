// ============================================================
// 파일: src/hooks/use-live-session.ts
// 담당: Part 1
// 역할: Part 2 UI가 소비하는 유일한 인터페이스.
//       LiveSession + AudioCapture + AudioPlayback + CameraCapture + ReconnectManager 통합.
// ============================================================
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { LiveSession, type LiveSessionConfig } from '@web/lib/gemini/live-api';
import { createAudioCapture, type AudioCapture } from '@web/lib/audio/capture';
import { createAudioPlayback, type AudioPlayback } from '@web/lib/audio/playback';
import { createCameraCapture, type CameraCapture } from '@web/lib/camera/capture';
import { createReconnectManager, type ReconnectManager } from '@web/lib/ws/manager';
import { signInAnonymous } from '@back/lib/firebase/auth';
import { createSession, addVisit, createDiary, generateId, createGeoPoint } from '@back/lib/firebase/firestore';
import type {
  UseLiveSessionReturn,
  SessionConfig,
  SessionState,
  TranscriptChunk,
  LiveSessionEvents,
  ArtifactSummary,
  ToolResultData,
} from '@shared/types/live-session';
import type { RestorationUIState } from '@shared/types/restoration';
import type { NearbyPlace } from '@shared/types/discovery';
import type { AudioState, AgentType, Civilization } from '@shared/types/common';

// ── 유틸리티 ────────────────────────────────────────────────

/**
 * STT 출력의 불필요한 공백을 정리한다.
 * - 구두점 앞 공백 제거 (예: "괜찮 ." → "괜찮.")
 * - 한글 뒤 공백 + 1음절 한글 패턴 병합 (예: "큐레 이터" → "큐레이터")
 * - 연속 공백 축소
 */
function cleanSttText(text: string): string {
  return text
    // 구두점 앞 공백 제거
    .replace(/\s+([.,!?])/g, '$1')
    // 한글 + 공백 + 한글 1음절 + 한글 (분리된 음절 병합)
    .replace(/([\uAC00-\uD7AF])\s([\uAC00-\uD7AF])([\uAC00-\uD7AF])/g, '$1$2$3')
    // 연속 공백 축소
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const VALID_CIVILIZATIONS: ReadonlySet<string> = new Set<Civilization>([
  'Greek', 'Roman', 'Egyptian', 'Mesopotamian', 'Chinese',
  'Japanese', 'Korean', 'Indian', 'Persian', 'Mayan', 'Other',
]);

function toCivilization(value: string): Civilization {
  return VALID_CIVILIZATIONS.has(value) ? (value as Civilization) : 'Other';
}

/**
 * "이건 뭐야?" 계열 키워드 감지.
 * 카메라 열린 상태에서 이 패턴이 감지되면 자동 캡처 트리거.
 */
const WHAT_IS_THIS_PATTERNS = [
  // Korean: "이거/이건/이게" + "뭐야/뭐지/뭔지/뭘까"
  /이(?:거|건|게)\s*뭐/,
  /뭐(?:야|지)\s*이(?:거|건|게)/,
  /이(?:거|건|게)\s*(?:뭔|뭘)/,
  // English
  /what(?:'s| is) this/i,
  /what(?:'s| is) that/i,
  // Japanese: "これは何" "これ何"
  /これ(?:は)?(?:何|なに|なん)/,
  // Chinese: "这是什么" "这个是什么"
  /这(?:个)?是什么/,
  // Hindi: "यह क्या है" "ये क्या है"
  /(?:यह|ये)\s*क्या/,
];

function isWhatIsThisQuery(text: string): boolean {
  return WHAT_IS_THIS_PATTERNS.some((pattern) => pattern.test(text));
}

// ── 이벤트 핸들러 팩토리 ────────────────────────────────────

interface SessionRefs {
  liveSession: React.RefObject<LiveSession | null>;
  sessionId: React.RefObject<string | null>;
  userId: React.RefObject<string>;
  language: React.RefObject<string>;
  currentArtifact: React.RefObject<ArtifactSummary | null>;
  reconnect: React.RefObject<ReconnectManager | null>;
  geoCoords: React.RefObject<{ lat: number; lng: number }>;
  capturePhoto: React.RefObject<(() => string | null) | null>;
  onCaptureFlash: React.RefObject<(() => void) | null>;
  isCameraOpen: React.RefObject<boolean>;
  lastAutoCaptureTime: React.RefObject<number>;
}

interface SessionSetters {
  setSessionState: React.Dispatch<React.SetStateAction<SessionState>>;
  setTranscript: React.Dispatch<React.SetStateAction<TranscriptChunk[]>>;
  setCurrentArtifact: React.Dispatch<React.SetStateAction<ArtifactSummary | null>>;
  setAudioState: React.Dispatch<React.SetStateAction<AudioState>>;
  setActiveAgent: React.Dispatch<React.SetStateAction<AgentType>>;
  setToolResult: React.Dispatch<React.SetStateAction<ToolResultData | null>>;
  setRestorationState: React.Dispatch<React.SetStateAction<RestorationUIState>>;
  setDiscoverySites: React.Dispatch<React.SetStateAction<NearbyPlace[]>>;
  setDiaryResult: React.Dispatch<React.SetStateAction<{ diaryId: string; title: string } | null>>;
  setBeforeImage: React.Dispatch<React.SetStateAction<string | null>>;
}

function createSessionEvents(refs: SessionRefs, setters: SessionSetters): LiveSessionEvents {
  return {
    onArtifactRecognized: (summary) => {
      setters.setCurrentArtifact(summary);
      refs.currentArtifact.current = summary;
      setters.setSessionState(prev => ({
        ...prev,
        currentArtifact: summary,
        visitCount: prev.visitCount + 1,
      }));

      // LiveSession에 경량 visit 추가 (다이어리 생성용)
      const visitInput = {
        itemName: summary.name,
        era: summary.era,
        civilization: summary.civilization,
        conversationSummary: summary.oneLiner,
      };
      refs.liveSession.current?.addVisit(visitInput);

      // Firestore에 방문 기록 저장
      if (refs.sessionId.current) {
        const visitId = generateId();
        const coords = refs.geoCoords.current;
        addVisit(refs.sessionId.current, visitId, {
          itemName: summary.name,
          location: createGeoPoint(coords.lat, coords.lng),
          conversationSummary: summary.oneLiner,
          metadata: {
            era: summary.era,
            category: summary.isOutdoor ? 'monument' : 'artifact',
            civilization: toCivilization(summary.civilization),
          },
        }).catch((err) => console.warn('[useLiveSession] addVisit failed:', err));
      }
    },

    onTranscript: (data) => {
      setters.setTranscript(prev => {
        // isFinal=true + sources: 소스 첨부 후 턴 종료
        if (data.isFinal && data.sources?.length) {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...last, sources: data.sources },
            ];
          }
          return prev;
        }
        // isFinal=true (소스 없음): 현재 턴 종료 마커 (다음 delta는 새 메시지로)
        if (data.isFinal) {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...last, id: `${last.id}-final` },
            ];
          }
          return prev;
        }
        // delta 추가: 마지막 assistant 메시지에 이어붙이기
        if (data.delta) {
          const last = prev[prev.length - 1];
          if (last && last.role === 'assistant' && !last.id.endsWith('-final') && !last.sources) {
            return [
              ...prev.slice(0, -1),
              { ...last, text: last.text + data.delta },
            ];
          }
          return [
            ...prev,
            {
              id: `t-${Date.now()}`,
              role: 'assistant',
              text: data.delta,
              timestamp: Date.now(),
            },
          ];
        }
        return prev;
      });
    },

    onUserSpeech: (data) => {
      const cleaned = cleanSttText(data.text);
      if (!cleaned) return;

      // "이건 뭐야?" 감지 → 카메라 열려있으면 자동 캡처 (5초 쿨다운)
      if (
        refs.isCameraOpen.current &&
        isWhatIsThisQuery(cleaned) &&
        Date.now() - refs.lastAutoCaptureTime.current > 5000
      ) {
        const photo = refs.capturePhoto.current?.();
        if (photo) {
          refs.lastAutoCaptureTime.current = Date.now();
          refs.onCaptureFlash.current?.();
          refs.liveSession.current?.sendPhoto(photo, cleaned);
        }
      }

      setters.setTranscript(prev => {
        const last = prev[prev.length - 1];
        // 같은 유저 턴이면 이어붙이기 (3초 내)
        if (last && last.role === 'user' && Date.now() - last.timestamp < 3000) {
          // 서브스트링이면 교체 (더 긴 버전으로 업데이트)
          if (cleaned.includes(last.text)) {
            return [
              ...prev.slice(0, -1),
              { ...last, text: cleaned, timestamp: Date.now() },
            ];
          }
          // 완전히 다른 텍스트면 이어붙이기
          if (!last.text.includes(cleaned)) {
            return [
              ...prev.slice(0, -1),
              { ...last, text: last.text + ' ' + cleaned, timestamp: Date.now() },
            ];
          }
          return prev;
        }
        // 새 유저 턴
        return [
          ...prev,
          {
            id: `u-${Date.now()}`,
            role: 'user',
            text: cleaned,
            timestamp: Date.now(),
          },
        ];
      });
    },

    onAgentSwitch: (data) => {
      setters.setActiveAgent(data.to);
      setters.setSessionState(prev => ({ ...prev, activeAgent: data.to }));

      if (data.to === 'restoration') {
        setters.setRestorationState({
          status: 'loading',
          progress: 0,
          artifactName: refs.currentArtifact.current?.name ?? '',
          era: refs.currentArtifact.current?.era ?? '',
        });
      }
    },

    onAudioStateChange: (state) => {
      setters.setAudioState(state);
      setters.setSessionState(prev => ({ ...prev, audioState: state }));
    },

    onSessionStatusChange: (status) => {
      setters.setSessionState(prev => ({ ...prev, status }));

      if (status === 'disconnected' && refs.reconnect.current) {
        refs.reconnect.current.scheduleReconnect(async () => {
          const resumeRes = await fetch('/api/session/resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: refs.sessionId.current }),
          });
          const resumeJson = await resumeRes.json();
          if (!resumeJson.success) throw new Error('Resume failed');

          const resumeHandle = refs.liveSession.current?.getResumeHandle();
          await refs.liveSession.current?.connect({
            token: resumeJson.data.wsUrl,
            language: refs.language.current,
            sessionId: refs.sessionId.current!,
            resumeHandle: resumeHandle || undefined,
          });
        });
      }
    },

    onToolResult: (data) => {
      setters.setToolResult(data);

      switch (data.tool) {
        case 'generate_restoration':
          if (data.result.type === 'restoration') {
            setters.setRestorationState({ status: 'ready', data: data.result });
            setters.setBeforeImage(data.result.referenceImageUrl ?? null);
          }
          break;
        case 'discover_nearby':
          if (data.result.type === 'discovery') {
            setters.setDiscoverySites(data.result.sites);
          }
          break;
        case 'create_diary':
          if (data.result.type === 'diary') {
            // 클라이언트에서 Firestore에 다이어리 저장 (auth 컨텍스트 활용)
            if (data.result.entries && refs.sessionId.current) {
              createDiary(data.result.diaryId, {
                sessionId: refs.sessionId.current,
                userId: refs.userId.current,
                title: data.result.title,
                entries: data.result.entries,
                shareToken: data.result.shareToken,
              }).catch((err) => console.warn('[useLiveSession] createDiary failed:', err));
            }
            setters.setDiaryResult({ diaryId: data.result.diaryId, title: data.result.title });
          }
          break;
      }
    },

    onTopicDetail: () => {
      // Topic detail은 transcript에 자동 추가됨
    },

    onError: (error) => {
      console.error('[useLiveSession] Error:', error);
      if (error.code === 'RESTORATION_FAILED') {
        setters.setRestorationState({
          status: 'error',
          error: error.message,
          retryable: error.action === 'retry',
        });
      }
      if (!error.recoverable) {
        setters.setSessionState(prev => ({ ...prev, isFallbackMode: true }));
      }
    },
  };
}

const DEBUG = process.env.NODE_ENV === 'development';
function dbg(...args: unknown[]) { if (DEBUG) console.log(...args); }

// ── 초기 상태 ───────────────────────────────────────────────

const INITIAL_STATE: SessionState = {
  sessionId: null,
  status: 'disconnected',
  activeAgent: 'curator',
  audioState: 'idle',
  currentArtifact: null,
  visitCount: 0,
  isFallbackMode: false,
};

// ── 메인 훅 ─────────────────────────────────────────────────

export function useLiveSession(): UseLiveSessionReturn {
  // React 상태
  const [sessionState, setSessionState] = useState<SessionState>(INITIAL_STATE);
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
  const [currentArtifact, setCurrentArtifact] = useState<ArtifactSummary | null>(null);
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [activeAgent, setActiveAgent] = useState<AgentType>('curator');
  const [toolResult, setToolResult] = useState<ToolResultData | null>(null);
  const [restorationState, setRestorationState] = useState<RestorationUIState>({ status: 'idle' });
  const [discoverySites, setDiscoverySites] = useState<NearbyPlace[]>([]);
  const [diaryResult, setDiaryResult] = useState<{ diaryId: string; title: string } | null>(null);
  const [beforeImage, setBeforeImage] = useState<string | null>(null);

  // Refs
  const liveSessionRef = useRef<LiveSession | null>(null);
  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const audioPlaybackRef = useRef<AudioPlayback | null>(null);
  const cameraCaptureRef = useRef<CameraCapture | null>(null);
  const reconnectRef = useRef<ReconnectManager | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const languageRef = useRef<string>('en');
  const currentArtifactRef = useRef<ArtifactSummary | null>(null);
  const userIdRef = useRef<string>('');
  const geoCoordsRef = useRef<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const isCameraOpenRef = useRef(false);
  const lastAutoCaptureTimeRef = useRef(0);
  const capturePhotoRef = useRef<(() => string | null) | null>(null);
  const onCaptureFlashRef = useRef<(() => void) | null>(null);

  // 브라우저 Geolocation으로 좌표 추적
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        geoCoordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      },
      () => { /* 위치 실패 시 기본값(0,0) 유지 */ },
      { enableHighAccuracy: true, maximumAge: 60000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ── connect ───────────────────────────────────────────────

  const connect = useCallback(async (config: SessionConfig) => {
    const language = config.language;
    languageRef.current = language;
    dbg('[connect] START language:', language);

    try {
      // 1. Firebase 익명 인증 (5초 타임아웃, 실패 시 건너뜀)
      dbg('[connect] 1. Firebase auth...');
      try {
        const user = await Promise.race([
          signInAnonymous(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Firebase auth timeout')), 5000)
          ),
        ]);
        userIdRef.current = user.uid;
        dbg('[connect] 1. Auth OK uid:', user.uid.slice(0, 8));
      } catch (authErr) {
        console.warn('[connect] 1. Auth skipped:', authErr);
        userIdRef.current = `anon-${Date.now()}`;
      }

      // 2. 서버에서 Ephemeral Token 획득
      dbg('[connect] 2. Fetching /api/session...');
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      const json = await res.json();
      dbg('[connect] 2. Session response:', json.success, json.data?.sessionId?.slice(0, 8));
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to create session');
      }
      const { sessionId, wsUrl: token } = json.data;
      sessionIdRef.current = sessionId;

      // 3. Firestore에 세션 문서 생성 (5초 타임아웃, 실패 시 건너뜀)
      dbg('[connect] 3. Firestore session...');
      try {
        await Promise.race([
          createSession(sessionId, { userId: userIdRef.current, language }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Firestore createSession timeout')), 5000)
          ),
        ]);
        dbg('[connect] 3. Firestore OK');
      } catch (fsErr) {
        console.warn('[connect] 3. Firestore skipped:', fsErr);
      }

      dbg('[connect] 4. Creating LiveSession...');
      // 4. 이벤트 핸들러 + LiveSession 생성
      const refs: SessionRefs = {
        liveSession: liveSessionRef,
        sessionId: sessionIdRef,
        userId: userIdRef,
        language: languageRef,
        currentArtifact: currentArtifactRef,
        reconnect: reconnectRef,
        geoCoords: geoCoordsRef,
        capturePhoto: capturePhotoRef,
        onCaptureFlash: onCaptureFlashRef,
        isCameraOpen: isCameraOpenRef,
        lastAutoCaptureTime: lastAutoCaptureTimeRef,
      };
      const setters: SessionSetters = {
        setSessionState, setTranscript, setCurrentArtifact,
        setAudioState, setActiveAgent, setToolResult,
        setRestorationState, setDiscoverySites, setDiaryResult, setBeforeImage,
      };
      const events = createSessionEvents(refs, setters);

      const liveSession = new LiveSession(events);
      liveSession.setUserId(userIdRef.current);
      liveSessionRef.current = liveSession;

      // 5. AudioPlayback
      const playback = createAudioPlayback();
      audioPlaybackRef.current = playback;
      liveSession.setAudioDataHandler(playback.enqueue);

      // 6. ReconnectManager
      reconnectRef.current = createReconnectManager({
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 8000,
        onAttempt: (attempt, max) => {
          console.log(`[Reconnect] Attempt ${attempt}/${max}`);
          setSessionState(prev => ({ ...prev, status: 'reconnecting' }));
        },
        onSuccess: () => console.log('[Reconnect] Success'),
        onFailure: () => {
          console.warn('[Reconnect] All attempts failed, switching to fallback');
          setSessionState(prev => ({ ...prev, isFallbackMode: true, status: 'disconnected' }));
        },
      });

      // 7. LiveSession 연결
      dbg('[connect] 7. Connecting LiveSession...');
      const liveConfig: LiveSessionConfig = {
        token, language, sessionId,
        museum: config.museum ? { name: config.museum.name, address: config.museum.address } : undefined,
      };
      await liveSession.connect(liveConfig);
      dbg('[connect] 7. LiveSession connected!');

      // 8. AudioCapture
      dbg('[connect] 8. Starting audio capture...');
      const audioCapture = createAudioCapture({
        onChunk: (base64Pcm) => liveSessionRef.current?.sendAudio(base64Pcm),
        onLevelChange: () => {},
      });
      audioCaptureRef.current = audioCapture;
      await audioCapture.start();

      // 9. CameraCapture (프리뷰만 — 프레임 상시 전송 안 함, 온디맨드)
      dbg('[connect] 9. Starting camera...');
      const cameraCapture = createCameraCapture();
      cameraCaptureRef.current = cameraCapture;
      try {
        await cameraCapture.start();
        dbg('[connect] 9. Camera OK');
      } catch (cameraErr) {
        console.warn('[connect] 9. Camera skipped:', cameraErr);
      }

      // 9b. Frame capture handler for restoration before-image
      liveSession.setFrameCaptureHandler(() => cameraCapture.captureFrame());

      // 10. 상태 업데이트
      dbg('[connect] 10. DONE — setting connected');
      setSessionState(prev => ({ ...prev, sessionId, status: 'connected' }));
    } catch (err) {
      console.error('[connect] FAILED:', err);
      setSessionState(prev => ({ ...prev, isFallbackMode: true, status: 'disconnected' }));
    }
  }, []);

  // ── disconnect ────────────────────────────────────────────

  const disconnect = useCallback(() => {
    reconnectRef.current?.cancel();
    cameraCaptureRef.current?.stop();
    audioCaptureRef.current?.stop();
    audioPlaybackRef.current?.stop();
    liveSessionRef.current?.disconnect();

    cameraCaptureRef.current = null;
    audioCaptureRef.current = null;
    audioPlaybackRef.current = null;
    liveSessionRef.current = null;

    setSessionState(INITIAL_STATE);
    setAudioState('idle');
    setActiveAgent('curator');
  }, []);

  // ── 컨트롤 ───────────────────────────────────────────────

  const toggleMic = useCallback((enabled: boolean) => {
    if (enabled) audioCaptureRef.current?.unmute();
    else audioCaptureRef.current?.mute();
  }, []);

  const toggleCamera = useCallback((enabled: boolean) => {
    isCameraOpenRef.current = enabled;
    // 카메라 ON/OFF는 프리뷰만 제어 — 인식은 캡처 버튼(sendPhoto)으로만 트리거
    if (!enabled) {
      cameraCaptureRef.current?.stopFrameLoop();
    }
  }, []);

  const interrupt = useCallback(() => {
    audioPlaybackRef.current?.flush();
    liveSessionRef.current?.interrupt();
  }, []);

  const requestTopicDetail = useCallback((topicId: string, topicLabel: string) => {
    liveSessionRef.current?.requestTopicDetail(topicId, topicLabel);
  }, []);

  const sendTextMessage = useCallback((text: string) => {
    liveSessionRef.current?.sendText(text);
    setTranscript(prev => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text, timestamp: Date.now() },
    ]);
  }, []);

  const sendPhoto = useCallback((imageBase64: string) => {
    liveSessionRef.current?.sendPhoto(imageBase64);
  }, []);

  const clearToolResult = useCallback(() => {
    setToolResult(null);
    setRestorationState({ status: 'idle' });
    setDiscoverySites([]);
    setDiaryResult(null);
  }, []);

  // ── unmount cleanup ──────────────────────────────────────
  useEffect(() => {
    return () => {
      reconnectRef.current?.cancel();
      cameraCaptureRef.current?.stop();
      audioCaptureRef.current?.stop();
      audioPlaybackRef.current?.stop();
      liveSessionRef.current?.disconnect();
    };
  }, []);

  // ── 반환 ──────────────────────────────────────────────────

  return {
    sessionState,
    isConnected: sessionState.status === 'connected',
    isFallbackMode: sessionState.isFallbackMode,
    connect, disconnect,
    toggleMic, toggleCamera, interrupt,
    requestTopicDetail, sendTextMessage, sendPhoto,
    currentArtifact, transcript, audioState, activeAgent,
    toolResult, restorationState, discoverySites, diaryResult, clearToolResult,
    beforeImage,
    capturePhotoRef,
    onCaptureFlashRef,
  };
}
