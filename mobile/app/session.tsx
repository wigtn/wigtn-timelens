// Main session screen — camera + AI companion overlay
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CameraView, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLiveSession } from '@/hooks/use-live-session';
import AudioVisualizer from '@/components/AudioVisualizer';
import LiveTranscript from '@/components/LiveTranscript';
import KnowledgePanel from '@/components/KnowledgePanel';
import ConnectionOverlay from '@/components/ConnectionOverlay';
import type { PanelState } from '@shared/types/common';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SessionScreen() {
  const {
    sessionState,
    isConnected,
    isFallbackMode,
    connect,
    disconnect,
    toggleMic,
    interrupt,
    sendTextMessage,
    currentArtifact,
    transcript,
    audioState,
    activeAgent,
    restorationState,
    discoverySites,
    cameraRef,
  } = useLiveSession();

  const [panelState, setPanelState] = useState<PanelState>('closed');
  const [isMicOn, setIsMicOn] = useState(true);
  const [facing, setFacing] = useState<CameraType>('back');
  const [textInput, setTextInput] = useState('');
  const hasConnected = useRef(false);

  // Connect on mount
  useEffect(() => {
    if (hasConnected.current) return;
    hasConnected.current = true;

    activateKeepAwakeAsync();
    const lang = 'en'; // TODO: detect from device locale
    connect({ language: lang });

    return () => {
      deactivateKeepAwake();
      disconnect();
    };
  }, [connect, disconnect]);

  // Auto-open panel when artifact recognized
  useEffect(() => {
    if (currentArtifact && panelState === 'closed') {
      setPanelState('mini');
    }
  }, [currentArtifact, panelState]);

  // Auto-open mini panel when AI speaks (Live Agent presence)
  useEffect(() => {
    if (audioState === 'speaking' && panelState === 'closed') {
      setPanelState('mini');
    }
  }, [audioState, panelState]);

  // Auto-expand for tool results
  useEffect(() => {
    if (restorationState.status === 'ready' || discoverySites.length > 0) {
      setPanelState('expanded');
    }
  }, [restorationState.status, discoverySites.length]);

  const handleMicToggle = useCallback(() => {
    const newState = !isMicOn;
    setIsMicOn(newState);
    toggleMic(newState);
  }, [isMicOn, toggleMic]);

  const handleFlipCamera = useCallback(() => {
    setFacing(prev => prev === 'back' ? 'front' : 'back');
  }, []);

  const handleTextSubmit = useCallback(() => {
    if (textInput.trim()) {
      sendTextMessage(textInput.trim());
      setTextInput('');
    }
  }, [textInput, sendTextMessage]);

  const handleInterrupt = useCallback(() => {
    interrupt();
  }, [interrupt]);

  // Connection overlay
  if (!isConnected && sessionState.connectionStage !== 'ready') {
    return (
      <ConnectionOverlay stage={sessionState.connectionStage ?? 'idle'} />
    );
  }

  return (
    <View style={styles.container}>
      {/* Layer 0: Camera */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        animateShutter={false}
      >
        {/* Scan line overlay */}
        {isConnected && (
          <View style={styles.scanLineContainer}>
            <ScanLine />
          </View>
        )}
      </CameraView>

      {/* Layer 1: Audio Visualizer + Agent indicator */}
      <SafeAreaView style={styles.overlayContainer} edges={['top']}>
        {/* Agent indicator */}
        <View style={styles.agentBar}>
          <View style={[styles.agentDot, isConnected && styles.agentDotActive]} />
          <Text style={styles.agentLabel}>
            {activeAgent === 'curator' ? 'TimeLens Curator' :
             activeAgent === 'restoration' ? 'Restoring...' :
             activeAgent === 'discovery' ? 'Discovering...' : 'Creating Diary...'}
          </Text>
        </View>
      </SafeAreaView>

      {/* Layer 2: Live Transcript (subtitle style) */}
      {(panelState === 'closed' || panelState === 'mini') && (
        <LiveTranscript chunks={transcript} />
      )}

      {/* Layer 3: Audio Visualizer */}
      <View style={styles.visualizerContainer}>
        <AudioVisualizer state={audioState} onTap={handleInterrupt} />
      </View>

      {/* Layer 4: Knowledge Panel */}
      <KnowledgePanel
        state={panelState}
        artifact={currentArtifact}
        transcript={transcript}
        onStateChange={setPanelState}
      />

      {/* Layer 5: Action Bar */}
      <SafeAreaView style={styles.actionBarSafe} edges={['bottom']}>
        {/* Text input (fallback mode) */}
        {isFallbackMode && (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.textInputRow}>
              <TextInput
                style={styles.textInput}
                value={textInput}
                onChangeText={setTextInput}
                onSubmitEditing={handleTextSubmit}
                placeholder="Type a message..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                returnKeyType="send"
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleTextSubmit}>
                <Ionicons name="send" size={20} color="#0A0A0A" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}

        <View style={styles.actionBar}>
          {/* Mic toggle */}
          <TouchableOpacity
            style={[styles.actionBtn, !isMicOn && styles.actionBtnDanger]}
            onPress={handleMicToggle}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isMicOn ? 'mic' : 'mic-off'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Flip camera */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleFlipCamera}
            activeOpacity={0.7}
          >
            <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Diary */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => sendTextMessage('다이어리 만들어줘')}
            activeOpacity={0.7}
          >
            <Ionicons name="book-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

// Scan line sub-component
function ScanLine() {
  return (
    <View style={scanStyles.line} />
  );
}

const scanStyles = StyleSheet.create({
  line: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    top: '50%',
    backgroundColor: 'rgba(212, 165, 116, 0.3)',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  scanLineContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  agentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  agentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  agentDotActive: {
    backgroundColor: '#22C55E',
  },
  agentLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  visualizerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 200,
    zIndex: 10,
    alignItems: 'center',
  },
  actionBarSafe: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 30,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 48,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  actionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D4A574',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
