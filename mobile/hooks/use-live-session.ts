// Main session hook for React Native
// Manages LiveSession + AudioCapture + AudioPlayback + CameraCapture

import { useState, useCallback, useRef } from 'react';
import { CameraView } from 'expo-camera';
import { LiveSession, type LiveSessionConfig } from '@/lib/gemini/live-api';
import { createAudioCapture, type AudioCaptureHandle } from '@/lib/audio/capture';
import { createAudioPlayback, type AudioPlaybackHandle } from '@/lib/audio/playback';
import { createCameraCapture, type CameraCaptureHandle } from '@/lib/camera/capture';
import { API_BASE_URL } from '@/constants/config';
import type {
  UseLiveSessionReturn,
  SessionConfig,
  SessionState,
  TranscriptChunk,
  LiveSessionEvents,
  ArtifactSummary,
  ToolResultData,
  RestorationUIState,
  NearbyPlace,
} from '@/types/live-session';
import type { AudioState, AgentType, ConnectionStage } from '@/types/common';

const INITIAL_STATE: SessionState = {
  sessionId: null,
  status: 'disconnected',
  connectionStage: 'idle',
  activeAgent: 'curator',
  audioState: 'idle',
  currentArtifact: null,
  visitCount: 0,
  isFallbackMode: false,
};

export function useLiveSession(): UseLiveSessionReturn & {
  cameraRef: React.RefObject<CameraView | null>;
} {
  // React state
  const [sessionState, setSessionState] = useState<SessionState>(INITIAL_STATE);
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
  const [currentArtifact, setCurrentArtifact] = useState<ArtifactSummary | null>(null);
  const [audioState, setAudioState] = useState<AudioState>('idle');
  const [activeAgent, setActiveAgent] = useState<AgentType>('curator');
  const [toolResult, setToolResult] = useState<ToolResultData | null>(null);
  const [restorationState, setRestorationState] = useState<RestorationUIState>({ status: 'idle' });
  const [discoverySites, setDiscoverySites] = useState<NearbyPlace[]>([]);
  const [diaryResult, setDiaryResult] = useState<{ diaryId: string; title: string } | null>(null);

  // Refs
  const liveSessionRef = useRef<LiveSession | null>(null);
  const audioCaptureRef = useRef<AudioCaptureHandle | null>(null);
  const audioPlaybackRef = useRef<AudioPlaybackHandle | null>(null);
  const cameraCaptureRef = useRef<CameraCaptureHandle | null>(null);
  const cameraRef = useRef<CameraView | null>(null);
  const currentArtifactRef = useRef<ArtifactSummary | null>(null);

  const updateStage = useCallback((stage: ConnectionStage) => {
    setSessionState(prev => ({ ...prev, connectionStage: stage }));
  }, []);

  // --- connect ---
  const connect = useCallback(async (config: SessionConfig) => {
    const language = config.language;

    try {
      // 1. Request ephemeral token
      updateStage('token');
      const res = await fetch(`${API_BASE_URL}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error?.message || 'Failed to create session');
      }
      const { sessionId, wsUrl: token } = json.data;

      // 2. Create event handlers
      const events: LiveSessionEvents = {
        onArtifactRecognized: (summary) => {
          setCurrentArtifact(summary);
          currentArtifactRef.current = summary;
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
          if (data.to === 'restoration') {
            const artifact = currentArtifactRef.current;
            setRestorationState({
              status: 'loading',
              progress: 0,
              artifactName: artifact?.name ?? '',
              era: artifact?.era ?? '',
            });
          }
        },
        onAudioStateChange: (state) => {
          setAudioState(state);
          setSessionState(prev => ({ ...prev, audioState: state }));
        },
        onSessionStatusChange: (status) => {
          setSessionState(prev => ({ ...prev, status }));
        },
        onToolResult: (data) => {
          setToolResult(data);
          switch (data.tool) {
            case 'generate_restoration':
              if (data.result.type === 'restoration') {
                setRestorationState({ status: 'ready', data: data.result });
              }
              break;
            case 'discover_nearby':
              if (data.result.type === 'discovery') {
                setDiscoverySites(data.result.sites);
              }
              break;
            case 'create_diary':
              if (data.result.type === 'diary') {
                setDiaryResult({ diaryId: data.result.diaryId, title: data.result.title });
              }
              break;
          }
        },
        onError: (error) => {
          console.error('[useLiveSession] Error:', error);
          if (!error.recoverable) {
            setSessionState(prev => ({ ...prev, isFallbackMode: true }));
          }
        },
      };

      // 3. Create and connect LiveSession
      updateStage('websocket');
      const liveSession = new LiveSession(events);
      liveSessionRef.current = liveSession;

      const liveConfig: LiveSessionConfig = { token, language, sessionId };
      await liveSession.connect(liveConfig);

      // 4. Audio playback
      const playback = createAudioPlayback();
      audioPlaybackRef.current = playback;
      liveSession.setAudioDataHandler(playback.enqueue);

      // 5. Audio capture
      updateStage('audio');
      const audioCapture = createAudioCapture({
        onChunk: (base64Pcm) => liveSessionRef.current?.sendAudio(base64Pcm),
        onLevelChange: () => {},
      });
      audioCaptureRef.current = audioCapture;
      await audioCapture.start();

      // 6. Camera capture
      updateStage('camera');
      const cameraCapture = createCameraCapture((base64Jpeg) => {
        liveSessionRef.current?.sendVideoFrame(base64Jpeg);
      });
      cameraCaptureRef.current = cameraCapture;
      cameraCapture.startFrameLoop(cameraRef);

      // 7. Done
      updateStage('ready');
      setSessionState(prev => ({
        ...prev,
        sessionId,
        status: 'connected',
        connectionStage: 'ready',
      }));
    } catch (err) {
      console.error('[useLiveSession] Connect failed:', err);
      setSessionState(prev => ({
        ...prev,
        isFallbackMode: true,
        status: 'disconnected',
        connectionStage: 'idle',
      }));
    }
  }, [updateStage]);

  // --- disconnect ---
  const disconnect = useCallback(async () => {
    cameraCaptureRef.current?.stopFrameLoop();
    await audioCaptureRef.current?.stop();
    await audioPlaybackRef.current?.stop();
    liveSessionRef.current?.disconnect();

    cameraCaptureRef.current = null;
    audioCaptureRef.current = null;
    audioPlaybackRef.current = null;
    liveSessionRef.current = null;

    setSessionState(INITIAL_STATE);
    setAudioState('idle');
    setActiveAgent('curator');
  }, []);

  // --- controls ---
  const toggleMic = useCallback((enabled: boolean) => {
    if (enabled) audioCaptureRef.current?.unmute();
    else audioCaptureRef.current?.mute();
  }, []);

  const toggleCamera = useCallback((enabled: boolean) => {
    if (enabled) {
      cameraCaptureRef.current?.startFrameLoop(cameraRef);
    } else {
      cameraCaptureRef.current?.stopFrameLoop();
    }
  }, []);

  const interrupt = useCallback(() => {
    audioPlaybackRef.current?.flush();
    liveSessionRef.current?.interrupt();
  }, []);

  const sendTextMessage = useCallback((text: string) => {
    liveSessionRef.current?.sendText(text);
    setTranscript(prev => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text, timestamp: Date.now() },
    ]);
  }, []);

  const clearToolResult = useCallback(() => {
    setToolResult(null);
    setRestorationState({ status: 'idle' });
    setDiscoverySites([]);
    setDiaryResult(null);
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
    sendTextMessage,
    currentArtifact,
    transcript,
    audioState,
    activeAgent,
    toolResult,
    restorationState,
    discoverySites,
    diaryResult,
    clearToolResult,
    cameraRef,
  };
}
