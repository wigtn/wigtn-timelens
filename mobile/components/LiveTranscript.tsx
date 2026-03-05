// Live transcript — subtitle-style overlay showing AI speech
import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import type { TranscriptChunk } from '@/types/live-session';

interface Props {
  chunks: TranscriptChunk[];
}

const MAX_CHARS = 100;
const FADE_TIMEOUT = 4000;

export default function LiveTranscript({ chunks }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [displayText, setDisplayText] = useState('');
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Find the last assistant chunk
    const lastAssistant = [...chunks].reverse().find(c => c.role === 'assistant');
    if (!lastAssistant) {
      setDisplayText('');
      return;
    }

    // Take last N chars
    const text = lastAssistant.text;
    const truncated = text.length > MAX_CHARS
      ? '...' + text.slice(-MAX_CHARS)
      : text;
    setDisplayText(truncated);

    // Show
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Auto-fade after timeout
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
    }
    fadeTimerRef.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, FADE_TIMEOUT);

    return () => {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
      }
    };
  }, [chunks, opacity]);

  if (!displayText) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{displayText}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 260,
    zIndex: 15,
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '90%',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
