// ============================================================
// 파일: src/components/KnowledgePanel.tsx
// 담당: Part 2
// 역할: 4-state 슬라이드업 지식 패널 (closed/mini/expanded/fullscreen)
// 출처: part2-curator-ui.md §3.6
// ============================================================

'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import type { KnowledgePanelProps } from '@shared/types/components';
import type { PanelState } from '@shared/types/common';
import type { ArtifactSummary } from '@shared/types/live-session';
import TopicChip from './TopicChip';
import TranscriptChat from './TranscriptChat';

function getPanelHeight(state: PanelState): string {
  switch (state) {
    case 'closed':
      return '0px';
    case 'mini':
      return '140px';
    case 'expanded':
      return '60dvh';
    case 'fullscreen':
      return '90dvh';
  }
}

function ArtifactSummaryCard({ artifact }: { artifact: ArtifactSummary }) {
  return (
    <div>
      <h2 className="text-xl font-heading font-bold text-white">{artifact.name}</h2>
      <p className="text-sm text-gray-400 mt-1">
        {artifact.era} · {artifact.civilization}
        {artifact.architectureStyle && ` · ${artifact.architectureStyle}`}
      </p>
      <div className="mt-2 h-px bg-gray-700/50" />
      <p className="text-base text-gray-200 mt-2 leading-relaxed">
        &ldquo;{artifact.oneLiner}&rdquo;
      </p>
    </div>
  );
}

const NEXT_STATE_UP: Record<string, PanelState> = {
  mini: 'expanded',
  expanded: 'fullscreen',
};

const NEXT_STATE_DOWN: Record<string, PanelState> = {
  fullscreen: 'expanded',
  expanded: 'mini',
};

export default function KnowledgePanel({
  state,
  artifact,
  transcript,
  onStateChange,
  onTopicTap,
  audioState,
  children,
}: KnowledgePanelProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    e.preventDefault();
    const delta = touchStart - e.touches[0].clientY;
    setTouchDelta(delta);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (touchStart === null) return;

    const SWIPE_UP = 50;
    const SWIPE_DOWN = 50;
    const SWIPE_DOWN_FULL = 80;

    if (touchDelta > SWIPE_UP) {
      if (state === 'mini') onStateChange('expanded');
      else if (state === 'expanded') onStateChange('fullscreen');
    } else if (touchDelta < -SWIPE_DOWN) {
      if (state === 'mini') onStateChange('closed');
      else if (state === 'expanded') onStateChange('mini');
      else if (state === 'fullscreen' && touchDelta < -SWIPE_DOWN_FULL) {
        onStateChange('expanded');
      }
    }

    setTouchStart(null);
    setTouchDelta(0);
  };

  // Desktop click: cycle mini → expanded → fullscreen
  const handleExpandClick = () => {
    const next = NEXT_STATE_UP[state];
    if (next) onStateChange(next);
  };

  const handleCollapseClick = () => {
    const next = NEXT_STATE_DOWN[state];
    if (next) onStateChange(next);
  };

  // Last transcript preview for mini state
  const lastTranscript = transcript.length > 0 ? transcript[transcript.length - 1] : null;

  return (
    <div
      className="absolute left-0 right-0 bottom-0 z-20"
      style={{ paddingBottom: '80px' }}
    >
      <div
        className={`bg-gray-900/95 backdrop-blur-xl rounded-t-3xl overflow-hidden border-t border-white/[0.08]
          shadow-[0_-4px_40px_rgba(0,0,0,0.5)]
          transition-all ${isDragging ? 'duration-0' : 'duration-300 ease-out'}`}
        style={{
          height: isDragging
            ? `calc(${getPanelHeight(state)} + ${touchDelta}px)`
            : getPanelHeight(state),
          maxHeight: '90dvh',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle + Desktop expand/collapse buttons */}
        <div className="flex items-center justify-center gap-2 py-3 relative">
          <div className="w-9 h-1 rounded-full bg-gray-500/60" />

          {state !== 'closed' && (
            <div className="absolute right-3 flex items-center gap-1">
              {NEXT_STATE_UP[state] && (
                <button
                  onClick={handleExpandClick}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center
                             hover:bg-white/20 transition-colors"
                  aria-label="패널 확장"
                >
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                </button>
              )}
              {NEXT_STATE_DOWN[state] && (
                <button
                  onClick={handleCollapseClick}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center
                             hover:bg-white/20 transition-colors"
                  aria-label="패널 축소"
                >
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          )}

          {/* Fullscreen close button */}
          {state === 'fullscreen' && (
            <button
              onClick={() => onStateChange('expanded')}
              className="absolute right-3 top-2 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center
                         hover:bg-white/20 transition-colors"
              aria-label="전체화면 닫기"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {state !== 'closed' && (
          <div className="px-4 overflow-y-auto" style={{ maxHeight: 'calc(100% - 16px)' }}>
            {artifact && <ArtifactSummaryCard artifact={artifact} />}

            {artifact && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
                {artifact.topics.map((topic) => (
                  <TopicChip
                    key={topic.id}
                    topic={topic}
                    onTap={() => onTopicTap(topic.id, topic.label)}
                  />
                ))}
              </div>
            )}

            {/* Mini: last transcript preview */}
            {state === 'mini' && lastTranscript && (
              <p className="text-xs text-gray-400 mt-2 truncate">
                {lastTranscript.role === 'user' ? '나: ' : 'AI: '}
                {lastTranscript.text}
              </p>
            )}

            {(state === 'expanded' || state === 'fullscreen') && (
              <div className="mt-3 border-t border-gray-700/50 pt-3">
                <TranscriptChat chunks={transcript} isStreaming={audioState === 'speaking'} />
              </div>
            )}

            {(state === 'expanded' || state === 'fullscreen') && children}
          </div>
        )}
      </div>
    </div>
  );
}
