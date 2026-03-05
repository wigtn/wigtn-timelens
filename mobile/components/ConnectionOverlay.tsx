// Full-screen connection stage overlay
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ConnectionStage } from '@shared/types/common';

interface Props {
  stage: ConnectionStage;
}

const STAGE_INFO: Record<ConnectionStage, { icon: string; label: string }> = {
  idle: { icon: 'hourglass-outline', label: 'Preparing...' },
  auth: { icon: 'key-outline', label: 'Authenticating...' },
  token: { icon: 'shield-checkmark-outline', label: 'Creating session...' },
  websocket: { icon: 'flash-outline', label: 'Connecting to AI...' },
  audio: { icon: 'mic-outline', label: 'Setting up microphone...' },
  camera: { icon: 'camera-outline', label: 'Activating camera...' },
  ready: { icon: 'checkmark-circle-outline', label: 'Ready!' },
};

export default function ConnectionOverlay({ stage }: Props) {
  const info = STAGE_INFO[stage];
  const stageOrder: ConnectionStage[] = ['token', 'websocket', 'audio', 'camera', 'ready'];
  const currentIndex = stageOrder.indexOf(stage);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoCircle}>
          <Ionicons name="time-outline" size={40} color="#D4A574" />
        </View>

        <Text style={styles.title}>TimeLens</Text>

        {/* Progress steps */}
        <View style={styles.steps}>
          {stageOrder.map((s, i) => {
            const stepInfo = STAGE_INFO[s];
            const isDone = i < currentIndex;
            const isCurrent = i === currentIndex;

            return (
              <View key={s} style={styles.stepRow}>
                <View style={[
                  styles.stepDot,
                  isDone && styles.stepDotDone,
                  isCurrent && styles.stepDotCurrent,
                ]}>
                  {isDone ? (
                    <Ionicons name="checkmark" size={12} color="#0A0A0A" />
                  ) : isCurrent ? (
                    <ActivityIndicator size="small" color="#D4A574" />
                  ) : null}
                </View>
                <Text style={[
                  styles.stepLabel,
                  isDone && styles.stepLabelDone,
                  isCurrent && styles.stepLabelCurrent,
                ]}>
                  {stepInfo.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212, 165, 116, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(212, 165, 116, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 48,
  },
  steps: {
    width: '100%',
    gap: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotDone: {
    backgroundColor: '#D4A574',
    borderColor: '#D4A574',
  },
  stepDotCurrent: {
    borderColor: '#D4A574',
    backgroundColor: 'rgba(212, 165, 116, 0.15)',
  },
  stepLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.3)',
  },
  stepLabelDone: {
    color: 'rgba(255,255,255,0.6)',
  },
  stepLabelCurrent: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
});
