// Landing / Permission screen
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCameraPermissions } from 'expo-camera';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LandingScreen() {
  const router = useRouter();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Request camera permission
      if (!cameraPermission?.granted) {
        const camResult = await requestCameraPermission();
        if (!camResult.granted) {
          setError('Camera permission is required');
          setLoading(false);
          return;
        }
      }

      // Request microphone permission
      const { granted: micGranted } = await requestRecordingPermissionsAsync();
      if (!micGranted) {
        setError('Microphone permission is required');
        setLoading(false);
        return;
      }

      // Navigate to session
      router.replace('/session');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Permission request failed');
      setLoading(false);
    }
  }, [cameraPermission, requestCameraPermission, router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo / Title */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Ionicons name="time-outline" size={48} color="#D4A574" />
          </View>
          <Text style={styles.title}>TimeLens</Text>
          <Text style={styles.subtitle}>AI Cultural Heritage Companion</Text>
        </View>

        {/* Description */}
        <View style={styles.features}>
          <FeatureItem icon="camera" text="Point your camera at any artifact" />
          <FeatureItem icon="mic" text="Talk naturally with your AI curator" />
          <FeatureItem icon="eye" text="AI watches and narrates in real-time" />
          <FeatureItem icon="sparkles" text="See historical restorations" />
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Start Button */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStart}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#0A0A0A" />
          ) : (
            <>
              <Ionicons name="play" size={24} color="#0A0A0A" />
              <Text style={styles.startText}>Start Exploring</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon as 'camera'} size={20} color="#D4A574" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
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
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(212, 165, 116, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(212, 165, 116, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
    letterSpacing: 1,
  },
  features: {
    marginBottom: 48,
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#D4A574',
    borderRadius: 16,
    paddingVertical: 16,
  },
  startText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A0A0A',
  },
});
