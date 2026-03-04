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
} from '@/types/live-session';
import type { AudioState, SessionStatus, AgentType, AppError } from '@/types/common';
import { LIVE_API_TOOLS, getSystemInstruction } from './tools';

export interface LiveSessionConfig {
  token: string;
  language: string;
  sessionId: string;
  resumeHandle?: string;
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
    };
  }

  async connect(config: LiveSessionConfig): Promise<void> {
    this.updateStatus('connecting');
    this.state.sessionId = config.sessionId;

    this.ai = new GoogleGenAI({ apiKey: config.token });

    const systemInstruction = getSystemInstruction(config.language);

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
        sessionResumption: config.resumeHandle
          ? { handle: config.resumeHandle }
          : {},
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
    this.updateStatus('disconnected');
  }

  sendAudio(base64Pcm: string): void {
    if (!this.session || this.state.status !== 'connected') return;
    this.session.sendRealtimeInput({
      media: { data: base64Pcm, mimeType: 'audio/pcm;rate=16000' },
    });
  }

  sendVideoFrame(base64Jpeg: string): void {
    if (!this.session || this.state.status !== 'connected') return;
    this.session.sendRealtimeInput({
      media: { data: base64Jpeg, mimeType: 'image/jpeg' },
    });
  }

  sendText(text: string): void {
    if (!this.session || this.state.status !== 'connected') return;
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
          { text: prompt || 'What is this artifact? Please identify it.' },
          { inlineData: { mimeType: 'image/jpeg', data: base64Jpeg } },
        ],
      }],
      turnComplete: true,
    });
  }

  requestTopicDetail(topicId: string, topicLabel: string): void {
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

    // 2. 오디오/텍스트 응답
    if (message.serverContent?.modelTurn?.parts) {
      for (const part of message.serverContent.modelTurn.parts) {
        if (part.inlineData) {
          this.handleAudioOutput(part.inlineData.data);
          if (this.state.audioState !== 'speaking') {
            this.updateAudioState('speaking');
          }
        }
        if (part.text) {
          this.events.onTranscript({
            text: part.text,
            delta: part.text,
            isFinal: false,
          });
        }
      }
    }

    // 3. 턴 완료
    if (message.serverContent?.turnComplete) {
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

    // 7. 입력 트랜스크립션 (사용자 STT)
    if (message.inputTranscription?.text) {
      this.events.onUserSpeech({
        text: message.inputTranscription.text,
        isFinal: true,
      });
      if (this.state.audioState !== 'listening') {
        this.updateAudioState('listening');
      }
    }

    // 8. 출력 트랜스크립션 (AI 음성 텍스트)
    if (message.outputTranscription?.text) {
      this.events.onTranscript({
        text: message.outputTranscription.text,
        delta: message.outputTranscription.text,
        isFinal: false,
      });
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

      if (result.success) {
        this.events.onToolResult({
          tool: 'generate_restoration',
          result: {
            type: 'restoration',
            imageUrl: result.imageUrl,
            description: result.description,
            artifactName: fc.args.artifact_name,
            era: fc.args.era,
          },
        });
        this.session?.sendToolResponse({
          functionResponses: [{
            id: fc.id, name: fc.name,
            response: { status: 'success', image_url: result.imageUrl, description: result.description },
          }],
        });
      } else {
        this.sendToolErrorResponse(fc.id, fc.name, result.error || 'Restoration failed');
        this.emitError('RESTORATION_FAILED', result.error || 'Failed', true, 'retry');
      }
    } catch {
      this.sendToolErrorResponse(fc.id, fc.name, 'Network error');
      this.emitError('NETWORK_ERROR', 'Failed to reach restoration service', true, 'retry');
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
        body: JSON.stringify({ sessionId: fc.args.session_id || this.state.sessionId }),
      });
      const result = await response.json();

      if (result.success) {
        this.events.onToolResult({
          tool: 'create_diary',
          result: {
            type: 'diary',
            diaryId: result.diaryId,
            title: result.diary?.title || 'Museum Diary',
            entryCount: result.diary?.entries?.length || 0,
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
    if (this.onAudioData) {
      this.onAudioData(base64);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleError(e: any): void {
    console.error('[LiveSession] Error:', e);
    this.emitError('SESSION_ERROR', e?.message || 'Connection error', true, 'retry');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleClose(e: any): void {
    if (e?.code === 1008) {
      this.updateStatus('expired');
      this.emitError('SESSION_EXPIRED', 'Session token expired or invalid', true, 'retry');
    } else {
      this.updateStatus('disconnected');
    }
    this.session = null;
    this.ai = null;
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
    setTimeout(() => {
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
