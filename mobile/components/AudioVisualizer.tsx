// Audio visualizer — breathing idle animation + waveform when speaking
import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import type { AudioState } from '@shared/types/common';

interface Props {
  state: AudioState;
  onTap?: () => void;
}

const BAR_COUNT = 20;

export default function AudioVisualizer({ state, onTap }: Props) {
  const barAnims = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(2))
  ).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (animRef.current) {
      animRef.current.stop();
    }

    if (state === 'speaking' || state === 'listening') {
      // Animated waveform
      const animations = barAnims.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 4 + Math.random() * 20,
              duration: 150 + Math.random() * 200,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 2 + Math.random() * 4,
              duration: 150 + Math.random() * 200,
              useNativeDriver: false,
            }),
          ])
        )
      );
      animRef.current = Animated.parallel(animations);
      animRef.current.start();
    } else if (state === 'idle') {
      // Breathing animation
      const animations = barAnims.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 2 + 1.5 * Math.sin(i * 0.3),
              duration: 1200,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 2,
              duration: 1200,
              useNativeDriver: false,
            }),
          ])
        )
      );
      animRef.current = Animated.parallel(animations);
      animRef.current.start();
    } else if (state === 'generating') {
      // Pulsing animation
      const animations = barAnims.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 8,
              duration: 400 + i * 30,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 2,
              duration: 400 + i * 30,
              useNativeDriver: false,
            }),
          ])
        )
      );
      animRef.current = Animated.parallel(animations);
      animRef.current.start();
    }

    return () => {
      animRef.current?.stop();
    };
  }, [state, barAnims]);

  const barColor =
    state === 'speaking' ? '#D4A574' :
    state === 'listening' ? '#60A5FA' :
    state === 'generating' ? '#A78BFA' :
    'rgba(212, 165, 116, 0.4)';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onTap}
      activeOpacity={0.8}
      disabled={state !== 'speaking'}
    >
      <View style={styles.bars}>
        {barAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              { height: anim, backgroundColor: barColor },
            ]}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 32,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
    minHeight: 2,
  },
});
