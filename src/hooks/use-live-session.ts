// ============================================================
// 파일: src/hooks/use-live-session.ts
// 담당: Part 1
// 역할: Part 2 UI가 소비하는 유일한 인터페이스.
//       LiveSession + AudioCapture + AudioPlayback + CameraCapture + ReconnectManager 통합.
// ============================================================
'use client';

import { useState, useCallback, useRef } from 'react';
import { LiveSession, type LiveSessionConfig } from '@/lib/gemini/live-api';
import { createAudioCapture, type AudioCapture } from '@/lib/audio/capture';
import { createAudioPlayback, type AudioPlayback } from '@/lib/audio/playback';
import { createCameraCapture, type CameraCapture } from '@/lib/camera/capture';
import { createReconnectManager, type ReconnectManager } from '@/lib/ws/manager';
import type {
  UseLiveSessionReturn,
  SessionConfig,
  SessionState,
  TranscriptChunk,
  LiveSessionEvents,
  ArtifactSummary,
} from '@/types/live-session';
import type { AudioState, AgentType } from '@/types/common';

const INITIAL_STATE: SessionState = {
  sessionId: null,
  status: 'disconnected',
  activeAgent: 'curator',
  audioState: 'idle',
  currentArtifact: null,
  visitCount: 0,
  isFallbackMode: false,
};

export function useLiveSession(): UseLiveSessionReturn {
  const [sessionState, setSessionState] = useState<SessionState>(INITIAL_STATE);
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
  const [currentArtifact, setCurrentArtifact] = useState<ArtifactSummary | null>(null);
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [activeAgent, setActiveAgent] = useState<AgentType>('curator');

  const liveSessionRef = useRef<LiveSession | null>(null);
  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const audioPlaybackRef = useRef<AudioPlayback | null>(null);
  const cameraCaptureRef = useRef<CameraCapture | null>(null);
  const reconnectRef = useRef<ReconnectManager | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const languageRef = useRef<string>('en');

  const connect = useCallback(async (config: SessionConfig) => {
    const language = config.language;
    languageRef.current = language;

    try {
      // 1. 서버에서 Ephemeral Token 획득
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to create session');
      }
      const { sessionId, wsUrl: token } = json.data;
      sessionIdRef.current = sessionId;

      // 2. LiveSessionEvents 콜백 정의
      const events: LiveSessionEvents = {
        onArtifactRecognized: (summary) => {
          setCurrentArtifact(summary);
          setSessionState(prev => ({
            ...prev,
            currentArtifact: summary,
            visitCount: prev.visitCount + 1,
          }));
        },
        onTranscript: (data) => {
          setTranscript(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant' && !last.sources) {
              // 마지막 assistant 청크에 텍스트 추가
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
                sources: data.sources,
              },
            ];
          });
        },
        onUserSpeech: (data) => {
          setTranscript(prev => [
            ...prev,
            {
              id: `u-${Date.now()}`,
              role: 'user',
              text: data.text,
              timestamp: Date.now(),
            },
          ]);
        },
        onAgentSwitch: (data) => {
          setActiveAgent(data.to);
          setSessionState(prev => ({ ...prev, activeAgent: data.to }));
        },
        onAudioStateChange: (state) => {
          setAudioState(state);
          setSessionState(prev => ({ ...prev, audioState: state }));
        },
        onSessionStatusChange: (status) => {
          setSessionState(prev => ({ ...prev, status }));

          if (status === 'disconnected' && reconnectRef.current) {
            reconnectRef.current.scheduleReconnect(async () => {
              const resumeRes = await fetch('/api/session/resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: sessionIdRef.current }),
              });
              const resumeJson = await resumeRes.json();
              if (!resumeJson.success) throw new Error('Resume failed');

              const resumeHandle = liveSessionRef.current?.getResumeHandle();
              await liveSessionRef.current?.connect({
                token: resumeJson.data.wsUrl,
                language: languageRef.current,
                sessionId: sessionIdRef.current!,
                resumeHandle: resumeHandle || undefined,
              });
            });
          }
        },
        onToolResult: () => {
          // Tool result는 LiveSession 내부에서 처리
          // UI는 onArtifactRecognized, transcript 등으로 결과를 수신
        },
        onTopicDetail: () => {
          // Topic detail은 transcript에 자동 추가됨
        },
        onError: (error) => {
          console.error('[useLiveSession] Error:', error);
          if (!error.recoverable) {
            setSessionState(prev => ({ ...prev, isFallbackMode: true }));
          }
        },
      };

      // 3. LiveSession 생성 + 연결
      const liveSession = new LiveSession(events);
      liveSessionRef.current = liveSession;

      // 4. AudioPlayback 생성
      const playback = createAudioPlayback();
      audioPlaybackRef.current = playback;
      liveSession.setAudioDataHandler(playback.enqueue);

      // 5. ReconnectManager 생성
      reconnectRef.current = createReconnectManager({
        maxAttempts: 3,
        baseDelayMs: 1000,
        maxDelayMs: 8000,
        onAttempt: (attempt, max) => {
          console.log(`[Reconnect] Attempt ${attempt}/${max}`);
          setSessionState(prev => ({ ...prev, status: 'reconnecting' }));
        },
        onSuccess: () => {
          console.log('[Reconnect] Success');
        },
        onFailure: () => {
          console.warn('[Reconnect] All attempts failed, switching to fallback');
          setSessionState(prev => ({ ...prev, isFallbackMode: true, status: 'disconnected' }));
        },
      });

      // LiveSession 연결
      const liveConfig: LiveSessionConfig = {
        token,
        language,
        sessionId,
        resumeHandle: config.sessionId ? undefined : undefined,
      };
      await liveSession.connect(liveConfig);

      // 6. AudioCapture 생성 + 시작
      const audioCapture = createAudioCapture({
        onChunk: (base64Pcm) => liveSessionRef.current?.sendAudio(base64Pcm),
        onLevelChange: () => {},
      });
      audioCaptureRef.current = audioCapture;
      await audioCapture.start();

      // 7. CameraCapture 생성 + 시작 + 프레임 루프
      const cameraCapture = createCameraCapture();
      cameraCaptureRef.current = cameraCapture;
      await cameraCapture.start();
      cameraCapture.startFrameLoop((base64Jpeg) => {
        liveSessionRef.current?.sendVideoFrame(base64Jpeg);
      });

      // 8. 상태 업데이트
      setSessionState(prev => ({
        ...prev,
        sessionId,
        status: 'connected',
      }));
    } catch (err) {
      console.error('[useLiveSession] Connect failed:', err);
      setSessionState(prev => ({
        ...prev,
        isFallbackMode: true,
        status: 'disconnected',
      }));
    }
  }, []);

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

  const toggleMic = useCallback((enabled: boolean) => {
    if (enabled) {
      audioCaptureRef.current?.unmute();
    } else {
      audioCaptureRef.current?.mute();
    }
  }, []);

  const toggleCamera = useCallback((enabled: boolean) => {
    if (enabled) {
      cameraCaptureRef.current?.startFrameLoop((base64Jpeg) => {
        liveSessionRef.current?.sendVideoFrame(base64Jpeg);
      });
    } else {
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
      {
        id: `u-${Date.now()}`,
        role: 'user',
        text,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const sendPhoto = useCallback((imageBase64: string) => {
    liveSessionRef.current?.sendPhoto(imageBase64);
  }, []);

  return {
    sessionState,
    isConnected: sessionState.status === 'connected',
    isFallbackMode: sessionState.isFallbackMode,
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
  };
}
