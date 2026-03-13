// ============================================================
// 파일: src/lib/gemini/live-api.ts
// 담당: Part 1
// 역할: 클라이언트 Live API 세션 관리 (Ephemeral Token 인증)
// ============================================================
'use client';

import { GoogleGenAI, Modality, type Session } from '@google/genai';
import type {
  LiveSessionEvents,
  ArtifactSummary,
  SessionState,
} from '@shared/types/live-session';
import type { DiaryVisitInput } from '@shared/types/diary';
import type { AudioState, SessionStatus, AgentType, AppError } from '@shared/types/common';
import { LIVE_API_TOOLS, getSystemInstruction } from '@shared/gemini/tools';

/**
 * 제어 문자 제거 — Gemini Live API가 function call 전환 시
 * 제어 문자(\x00-\x1F, \x7F 등)를 트랜스크립션에 포함시킬 수 있다.
 * 줄바꿈/탭은 유지.
 */
function sanitizeTranscript(text: string): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

export interface LiveSessionConfig {
  token: string;
  language: string;
  sessionId: string;
  resumeHandle?: string;
  museum?: { name: string; address: string };
}

const MODEL_ID = 'gemini-2.5-flash-native-audio-preview-12-2025';

export class LiveSession {
  private ai: GoogleGenAI | null = null;
  private session: Session | null = null;
  private events: LiveSessionEvents;
  private state: SessionState;
  private resumeHandle: string | null = null;
  private pendingToolCalls: Map<string, { name: string; startTime: number }> = new Map();
  private onAudioData: ((base64: string) => void) | null = null;
  private onCaptureFrame: (() => string | null) | null = null;
  private agentReturnTimer: ReturnType<typeof setTimeout> | null = null;
  private userId = '';
  private visits: DiaryVisitInput[] = [];
  private lastCameraFrame: string | null = null;
  private isInterrupted = false;

  constructor(events: LiveSessionEvents) {
    this.events = events;
    this.state = {
      sessionId: null,
      status: 'disconnected',
      activeAgent: 'curator',
      audioState: 'idle',
      currentArtifact: null,
      visitCount: 0,
      isFallbackMode: false,
      beforeImage: null,
    };
  }

  async connect(config: LiveSessionConfig): Promise<void> {
    this.updateStatus('connecting');
    this.state.sessionId = config.sessionId;

    this.ai = new GoogleGenAI({ apiKey: config.token, httpOptions: { apiVersion: 'v1alpha' } });

    const systemInstruction = getSystemInstruction(config.language, config.museum);

    const sessionConfig = {
      model: MODEL_ID,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction,
        tools: LIVE_API_TOOLS,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        contextWindowCompression: { slidingWindow: {} },
        ...(config.resumeHandle
          ? { sessionResumption: { handle: config.resumeHandle } }
          : {}),
      },
      callbacks: {
        onopen: () => this.handleOpen(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onmessage: (msg: any) => this.handleMessage(msg),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onerror: (e: any) => this.handleError(e),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onclose: (e: any) => this.handleClose(e),
      },
    };

    this.session = await this.ai.live.connect(sessionConfig);
  }

  disconnect(): void {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    this.ai = null;
    this.visits = [];
    this.lastCameraFrame = null;
    this.isInterrupted = false;
    this.updateStatus('disconnected');
  }

  sendAudio(base64Pcm: string): void {
    if (!this.session || this.state.status !== 'connected') {
      if (this.state.status !== 'connecting') {
        console.warn('[LiveSession] Audio chunk dropped — status:', this.state.status);
      }
      return;
    }
    this.session.sendRealtimeInput({
      media: { data: base64Pcm, mimeType: 'audio/pcm;rate=16000' },
    });
  }

  sendVideoFrame(base64Jpeg: string): void {
    if (!this.session || this.state.status !== 'connected') return;
    this.lastCameraFrame = base64Jpeg;
    this.session.sendRealtimeInput({
      media: { data: base64Jpeg, mimeType: 'image/jpeg' },
    });
  }

  sendText(text: string): void {
    if (!this.session || this.state.status !== 'connected') {
      console.warn('[LiveSession] sendText blocked — status:', this.state.status, 'session:', !!this.session);
      return;
    }
    this.session.sendClientContent({
      turns: [{ role: 'user', parts: [{ text }] }],
      turnComplete: true,
    });
  }

  sendPhoto(base64Jpeg: string, prompt?: string): void {
    if (!this.session || this.state.status !== 'connected') return;
    this.session.sendClientContent({
      turns: [{
        role: 'user',
        parts: [
          { text: prompt || 'I want to show you this — take a look and tell me about it!' },
          { inlineData: { mimeType: 'image/jpeg', data: base64Jpeg } },
        ],
      }],
      turnComplete: true,
    });
  }

  requestTopicDetail(_topicId: string, topicLabel: string): void {
    if (!this.session || this.state.status !== 'connected') return;
    const artifactName = this.state.currentArtifact?.name || 'the current artifact';
    this.session.sendClientContent({
      turns: [{
        role: 'user',
        parts: [{ text: `Tell me more about the "${topicLabel}" aspect of ${artifactName}. Provide detailed, focused information.` }],
      }],
      turnComplete: true,
    });
  }

  interrupt(): void {
    this.isInterrupted = true;
    if (this.state.audioState === 'speaking') {
      this.updateAudioState('idle');
    }
  }

  getState(): SessionState {
    return { ...this.state };
  }

  getResumeHandle(): string | null {
    return this.resumeHandle;
  }

  setAudioDataHandler(handler: (base64: string) => void): void {
    this.onAudioData = handler;
  }

  setFrameCaptureHandler(handler: () => string | null): void {
    this.onCaptureFrame = handler;
  }

  setUserId(uid: string): void {
    this.userId = uid;
  }

  addVisit(visit: DiaryVisitInput): void {
    this.visits.push(visit);
  }

  // --- Private handlers ---

  private handleOpen(): void {
    this.updateStatus('connected');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleMessage(message: any): void {
    // 1. 세션 초기화 완료
    if (message.setupComplete) {
      this.updateStatus('connected');
      return;
    }

    // 2. 오디오 응답 (modelTurn.parts)
    // NOTE: text parts는 모델의 내부 사고 과정(영어)이므로 표시하지 않음.
    //       실제 음성 텍스트는 outputTranscription에서만 가져옴.
    if (message.serverContent?.modelTurn?.parts) {
      for (const part of message.serverContent.modelTurn.parts) {
        if (part.inlineData) {
          this.handleAudioOutput(part.inlineData.data);
          if (this.state.audioState !== 'speaking') {
            this.updateAudioState('speaking');
          }
        }
      }
    }

    // 3. 턴 완료 — 현재 트랜스크립트를 확정(isFinal)
    if (message.serverContent?.turnComplete) {
      this.isInterrupted = false; // 인터럽트 플래그 리셋
      this.events.onTranscript({ text: '', delta: '', isFinal: true });
      this.updateAudioState('idle');
    }

    // 4. 인터럽션
    if (message.serverContent?.interrupted) {
      this.updateAudioState('listening');
    }

    // 5. 함수 호출
    if (message.toolCall) {
      this.handleToolCalls(message.toolCall.functionCalls);
    }

    // 6. 함수 호출 취소
    if (message.toolCallCancellation) {
      const ids = message.toolCallCancellation.ids;
      if (Array.isArray(ids)) {
        for (const id of ids) {
          this.pendingToolCalls.delete(id);
        }
      }
    }

    // 7. 입력 트랜스크립션 (사용자 STT) — serverContent 하위
    const inputTx = message.serverContent?.inputTranscription;
    if (inputTx?.text) {
      const cleaned = sanitizeTranscript(inputTx.text);
      if (cleaned) {
        this.events.onUserSpeech({
          text: cleaned,
          isFinal: true,
        });
        if (this.state.audioState !== 'listening') {
          this.updateAudioState('listening');
        }
      }
    }

    // 8. 출력 트랜스크립션 (AI 음성 텍스트) — serverContent 하위
    const outputTx = message.serverContent?.outputTranscription;
    if (outputTx?.text) {
      const cleaned = sanitizeTranscript(outputTx.text);
      if (cleaned) {
        this.events.onTranscript({
          text: cleaned,
          delta: cleaned,
          isFinal: false,
        });
      }
    }

    // 8b. 검색 그라운딩 소스 — 마지막 트랜스크립트에 소스 첨부
    const groundingMeta =
      message?.serverContent?.groundingMetadata ?? message?.groundingMetadata;
    if (groundingMeta?.groundingChunks) {
      const sources: string[] = [];
      for (const chunk of groundingMeta.groundingChunks) {
        if (chunk?.web?.uri) sources.push(chunk.web.uri);
      }
      if (sources.length > 0) {
        // isFinal=true로 현재 트랜스크립트 종료 + 소스 첨부
        this.events.onTranscript({
          text: '',
          delta: '',
          isFinal: true,
          sources,
        });
      }
    }

    // 9. 세션 재접속 핸들 갱신
    if (message.sessionResumptionUpdate?.newHandle) {
      this.resumeHandle = message.sessionResumptionUpdate.newHandle;
    }

    // 10. GoAway
    if (message.goAway) {
      console.warn('[LiveSession] GoAway received, session ending soon');
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleToolCalls(functionCalls: any[]): Promise<void> {
    if (!functionCalls || !Array.isArray(functionCalls)) return;

    for (const fc of functionCalls) {
      this.pendingToolCalls.set(fc.id, { name: fc.name, startTime: Date.now() });

      switch (fc.name) {
        case 'recognize_artifact':
          this.handleRecognizeArtifact(fc);
          break;
        case 'generate_restoration':
          await this.handleRestoration(fc);
          break;
        case 'discover_nearby':
          await this.handleDiscovery(fc);
          break;
        case 'create_diary':
          await this.handleDiary(fc);
          break;
        default:
          this.sendToolErrorResponse(fc.id, fc.name, `Unknown tool: ${fc.name}`);
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleRecognizeArtifact(fc: any): void {
    const args = fc.args;
    const summary: ArtifactSummary = {
      name: args.name,
      era: args.era,
      civilization: args.civilization,
      oneLiner: args.one_liner,
      topics: [
        { id: args.topic_1_id, label: args.topic_1_label },
        { id: args.topic_2_id, label: args.topic_2_label },
        { id: args.topic_3_id, label: args.topic_3_label },
      ],
      confidence: args.confidence,
      isOutdoor: args.is_outdoor,
      architectureStyle: args.architecture_style,
    };

    this.state.currentArtifact = summary;
    this.state.visitCount += 1;
    // 인식 시점의 카메라 프레임을 beforeImage로 저장
    this.state.beforeImage = this.lastCameraFrame
      ? `data:image/jpeg;base64,${this.lastCameraFrame}`
      : null;
    this.events.onArtifactRecognized(summary);

    this.session?.sendToolResponse({
      functionResponses: [{
        id: fc.id,
        name: fc.name,
        response: { status: 'recognized', artifact_name: summary.name },
      }],
    });
    this.pendingToolCalls.delete(fc.id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleRestoration(fc: any): Promise<void> {
    this.switchAgent('restoration', '복원 이미지를 생성합니다');
    this.updateAudioState('generating');

    // Capture current camera frame as before-image
    const beforeFrame = this.onCaptureFrame?.();
    const referenceImageUrl = beforeFrame
      ? `data:image/jpeg;base64,${beforeFrame}`
      : undefined;

    try {
      const response = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artifactName: fc.args.artifact_name,
          era: fc.args.era,
          artifactType: fc.args.artifact_type,
          damageDescription: fc.args.damage_description,
          isArchitecture: ['building', 'monument'].includes(fc.args.artifact_type),
          siteName: fc.args.site_name,
          currentDescription: fc.args.current_description,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errMsg = result.error || `HTTP ${response.status}`;
        const errCode = result.code || 'RESTORATION_FAILED';
        const retryable = result.retryable !== false;
        this.sendToolErrorResponse(fc.id, fc.name, errMsg);
        this.emitError(errCode, errMsg, retryable, retryable ? 'retry' : 'manual');
        return;
      }

      this.events.onToolResult({
        tool: 'generate_restoration',
        result: {
          type: 'restoration',
          imageUrl: result.imageUrl,
          description: result.description,
          artifactName: fc.args.artifact_name,
          era: fc.args.era,
          referenceImageUrl,
        },
      });
      this.session?.sendToolResponse({
        functionResponses: [{
          id: fc.id, name: fc.name,
          response: { status: 'success', description: result.description },
        }],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      this.sendToolErrorResponse(fc.id, fc.name, msg);
      this.emitError('NETWORK_ERROR', msg, true, 'retry');
    } finally {
      this.pendingToolCalls.delete(fc.id);
      this.scheduleAgentReturn();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleDiscovery(fc: any): Promise<void> {
    this.switchAgent('discovery', '주변 문화유산을 검색합니다');
    this.updateAudioState('generating');

    try {
      const params = new URLSearchParams({
        lat: String(fc.args.lat),
        lng: String(fc.args.lng),
        radius: String(fc.args.radius_km || 2),
      });
      if (fc.args.interest_filter) params.set('type', fc.args.interest_filter);

      const response = await fetch(`/api/discover?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();

      if (result.success) {
        this.events.onToolResult({
          tool: 'discover_nearby',
          result: {
            type: 'discovery',
            sites: result.sites,
            userLocation: { lat: fc.args.lat, lng: fc.args.lng },
          },
        });
        this.session?.sendToolResponse({
          functionResponses: [{
            id: fc.id, name: fc.name,
            response: { status: 'success', site_count: result.sites?.length || 0 },
          }],
        });
      } else {
        this.sendToolErrorResponse(fc.id, fc.name, result.error || 'Discovery failed');
        this.emitError('DISCOVERY_FAILED', result.error || 'Failed', true, 'retry');
      }
    } catch {
      this.sendToolErrorResponse(fc.id, fc.name, 'Network error');
      this.emitError('NETWORK_ERROR', 'Failed to reach discovery service', true, 'retry');
    } finally {
      this.pendingToolCalls.delete(fc.id);
      this.scheduleAgentReturn();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handleDiary(fc: any): Promise<void> {
    this.switchAgent('diary', '다이어리를 생성합니다');
    this.updateAudioState('generating');

    try {
      const response = await fetch('/api/diary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: fc.args.session_id || this.state.sessionId,
          userId: this.userId,
          visits: this.visits,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();

      if (result.success) {
        this.events.onToolResult({
          tool: 'create_diary',
          result: {
            type: 'diary',
            diaryId: result.diaryId,
            title: result.diary?.title || 'Museum Diary',
            entryCount: result.diary?.entries?.length || 0,
            entries: result.diary?.entries,
            shareToken: result.diary?.shareToken,
          },
        });
        this.session?.sendToolResponse({
          functionResponses: [{
            id: fc.id, name: fc.name,
            response: { status: 'success', diary_id: result.diaryId },
          }],
        });
      } else {
        this.sendToolErrorResponse(fc.id, fc.name, result.error || 'Diary generation failed');
        this.emitError('DIARY_FAILED', result.error || 'Failed', true, 'retry');
      }
    } catch {
      this.sendToolErrorResponse(fc.id, fc.name, 'Network error');
      this.emitError('NETWORK_ERROR', 'Failed to reach diary service', true, 'retry');
    } finally {
      this.pendingToolCalls.delete(fc.id);
      this.scheduleAgentReturn();
    }
  }

  // --- Helpers ---

  private handleAudioOutput(base64: string): void {
    if (this.isInterrupted) return; // 인터럽트 중 — 오디오 드롭
    if (this.onAudioData) {
      this.onAudioData(base64);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleError(e: any): void {
    console.error('[LiveSession] Error:', e?.message ?? e, e?.code, e?.reason);
    this.emitError('SESSION_ERROR', e?.message || 'Connection error', true, 'retry');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleClose(e: any): void {
    const code = e?.code;
    const reason = e?.reason ?? '';
    console.warn('[LiveSession] WebSocket closed:', code, reason);
    this.session = null;
    this.ai = null;

    this.updateStatus('disconnected');

    if (code === 1008) {
      // 1008 can mean token expired OR unsupported operation
      this.emitError('SESSION_EXPIRED', reason || 'Session closed by server', true, 'retry');
    } else if (code !== 1000) {
      // Unexpected close — trigger reconnect
      this.emitError('SESSION_ERROR', reason || `WebSocket closed: ${code}`, true, 'retry');
    }
  }

  private updateStatus(status: SessionStatus): void {
    this.state.status = status;
    this.events.onSessionStatusChange(status);
  }

  private updateAudioState(audioState: AudioState): void {
    this.state.audioState = audioState;
    this.events.onAudioStateChange(audioState);
  }

  private switchAgent(to: AgentType, reason: string): void {
    const from = this.state.activeAgent;
    this.state.activeAgent = to;
    this.events.onAgentSwitch({ from, to, reason });
  }

  private scheduleAgentReturn(): void {
    if (this.agentReturnTimer) clearTimeout(this.agentReturnTimer);
    this.agentReturnTimer = setTimeout(() => {
      this.agentReturnTimer = null;
      if (this.state.activeAgent !== 'curator') {
        const from = this.state.activeAgent;
        this.state.activeAgent = 'curator';
        this.events.onAgentSwitch({ from, to: 'curator', reason: '' });
      }
    }, 5000);
  }

  private sendToolErrorResponse(id: string, name: string, error: string): void {
    this.session?.sendToolResponse({
      functionResponses: [{
        id, name,
        response: { status: 'error', error },
      }],
    });
  }

  private emitError(code: string, message: string, recoverable: boolean, action: AppError['action']): void {
    this.events.onError({ code, message, recoverable, action });
  }
}
