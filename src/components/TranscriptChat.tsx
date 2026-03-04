// ============================================================
// 파일: src/components/TranscriptChat.tsx
// 담당: Part 2
// 역할: 채팅형 트랜스크립트 표시 (자동 스크롤, 사용자/AI 구분)
// 출처: part2-curator-ui.md §3.7
// ============================================================

'use client';

import { memo, useRef, useState, useEffect, useCallback } from 'react';
import type { TranscriptProps } from '@/types/components';
import type { TranscriptChunk } from '@/types/live-session';
import { cn } from '@/lib/utils';

const ChatBubble = memo(function ChatBubble({ chunk }: { chunk: TranscriptChunk }) {
  const isUser = chunk.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-blue-500/20 text-blue-100 rounded-br-md'
            : 'bg-gray-800/80 text-gray-100 rounded-bl-md',
        )}
      >
        <span
          className={cn(
            'text-xs font-medium block mb-1',
            isUser ? 'text-blue-300' : 'text-purple-300',
          )}
        >
          {isUser ? '나' : 'TimeLens'}
        </span>

        <p className="whitespace-pre-wrap">{chunk.text}</p>

        {chunk.sources && chunk.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-700/30">
            <span className="text-xs text-gray-500">출처: Google Search</span>
          </div>
        )}
      </div>
    </div>
  );
});

export default function TranscriptChat({ chunks, isStreaming }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chunks, isAutoScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setIsAutoScroll(isAtBottom);
  }, []);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="space-y-3 max-h-[40dvh] overflow-y-auto overscroll-contain
                 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
    >
      {chunks.map((chunk) => (
        <ChatBubble key={chunk.id} chunk={chunk} />
      ))}

      {isStreaming && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.1s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
          </div>
        </div>
      )}
    </div>
  );
}
