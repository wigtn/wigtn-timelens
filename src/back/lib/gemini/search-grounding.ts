// ============================================================
// 파일: src/lib/gemini/search-grounding.ts
// 담당: Part 1
// 역할: AI 응답에서 검색 그라운딩 소스 추출
// ============================================================

export interface GroundingSource {
  title: string;
  url: string;
  snippet?: string;
}

/**
 * AI 응답 메시지에서 grounding metadata를 추출.
 * Live API의 serverContent에 groundingMetadata가 포함될 수 있음.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractGroundingSources(message: any): GroundingSource[] {
  const sources: GroundingSource[] = [];
  const seenUrls = new Set<string>();

  const groundingMetadata =
    message?.serverContent?.groundingMetadata ??
    message?.groundingMetadata;

  if (!groundingMetadata) return sources;

  // groundingChunks에서 소스 추출
  const chunks = groundingMetadata.groundingChunks;
  if (Array.isArray(chunks)) {
    for (const chunk of chunks) {
      const web = chunk?.web;
      if (web?.uri && !seenUrls.has(web.uri)) {
        seenUrls.add(web.uri);
        sources.push({
          title: web.title || 'Source',
          url: web.uri,
          snippet: undefined,
        });
      }
    }
  }

  // searchEntryPoint에서 snippet 추출
  const rendered = groundingMetadata.searchEntryPoint?.renderedContent;
  if (rendered && sources.length > 0) {
    sources[0].snippet = typeof rendered === 'string'
      ? rendered.slice(0, 200)
      : undefined;
  }

  return sources;
}

/**
 * 소스 목록을 마크다운 형식으로 변환 (다이어리/트랜스크립트용).
 */
export function formatSourcesAsMarkdown(sources: GroundingSource[]): string {
  if (sources.length === 0) return '';
  return sources
    .map((s, i) => `${i + 1}. [${s.title}](${s.url})`)
    .join('\n');
}
