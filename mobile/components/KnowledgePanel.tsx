// Knowledge Panel — swipeable bottom sheet for artifact info
import { useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PanelState } from '@shared/types/common';
import type { ArtifactSummary, TranscriptChunk } from '@shared/types/live-session';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const PANEL_HEIGHTS: Record<PanelState, number> = {
  closed: 0,
  mini: 140,
  expanded: SCREEN_HEIGHT * 0.55,
  fullscreen: SCREEN_HEIGHT * 0.85,
};

interface Props {
  state: PanelState;
  artifact: ArtifactSummary | null;
  transcript: TranscriptChunk[];
  onStateChange: (state: PanelState) => void;
}

export default function KnowledgePanel({ state, artifact, transcript, onStateChange }: Props) {
  // Use refs to avoid stale closures in PanResponder
  const stateRef = useRef(state);
  stateRef.current = state;
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > 10,
      onPanResponderRelease: (_, gesture) => {
        const currentState = stateRef.current;
        const changeState = onStateChangeRef.current;
        if (gesture.dy < -50) {
          // Swipe up
          if (currentState === 'closed') changeState('mini');
          else if (currentState === 'mini') changeState('expanded');
          else if (currentState === 'expanded') changeState('fullscreen');
        } else if (gesture.dy > 50) {
          // Swipe down
          if (currentState === 'fullscreen') changeState('expanded');
          else if (currentState === 'expanded') changeState('mini');
          else if (currentState === 'mini') changeState('closed');
        }
      },
    })
  ).current;

  const height = PANEL_HEIGHTS[state];

  if (state === 'closed') return null;

  return (
    <View style={[styles.container, { height }]} {...panResponder.panHandlers}>
      {/* Handle */}
      <View style={styles.handleBar}>
        <View style={styles.handle} />
      </View>

      {/* Mini: artifact summary */}
      {artifact && (
        <View style={styles.miniContent}>
          <Text style={styles.artifactName}>{artifact.name}</Text>
          <Text style={styles.artifactMeta}>
            {artifact.era} · {artifact.civilization}
          </Text>
          {state === 'mini' && (
            <Text style={styles.oneLiner} numberOfLines={2}>
              {artifact.oneLiner}
            </Text>
          )}
        </View>
      )}

      {/* Expanded/Fullscreen: transcript + topics */}
      {(state === 'expanded' || state === 'fullscreen') && (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Topics */}
          {artifact?.topics && (
            <View style={styles.topicsRow}>
              {artifact.topics.map(topic => (
                <TouchableOpacity key={topic.id} style={styles.topicChip}>
                  <Text style={styles.topicText}>{topic.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Transcript */}
          <View style={styles.transcriptSection}>
            <Text style={styles.sectionLabel}>Conversation</Text>
            {transcript.slice(-20).map(chunk => (
              <View
                key={chunk.id}
                style={[
                  styles.transcriptItem,
                  chunk.role === 'user' && styles.transcriptUser,
                ]}
              >
                <Ionicons
                  name={chunk.role === 'user' ? 'person' : 'sparkles'}
                  size={14}
                  color={chunk.role === 'user' ? '#60A5FA' : '#D4A574'}
                />
                <Text style={styles.transcriptText}>{chunk.text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: 'rgba(15, 15, 15, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  handleBar: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  miniContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  artifactName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  artifactMeta: {
    fontSize: 13,
    color: '#D4A574',
    marginTop: 2,
  },
  oneLiner: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
    lineHeight: 20,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  topicsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  topicChip: {
    backgroundColor: 'rgba(212, 165, 116, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.3)',
  },
  topicText: {
    fontSize: 13,
    color: '#D4A574',
    fontWeight: '500',
  },
  transcriptSection: {
    paddingBottom: 100,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  transcriptItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  transcriptUser: {
    opacity: 0.7,
  },
  transcriptText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
  },
});
