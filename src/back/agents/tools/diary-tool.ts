// ============================================================
// 파일: src/back/agents/tools/diary-tool.ts
// 담당: ADK Integration
// 역할: ADK FunctionTool — 박물관 방문 다이어리 생성
// 래핑: Gemini interleaved 호출 (텍스트 + 수채화 삽화)
// ============================================================

import { FunctionTool } from '@google/adk';
import { Type, Modality, type Schema, type GoogleGenAI } from '@google/genai';

const DIARY_TIMEOUT_MS = 60_000;

const diarySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    visits: {
      type: Type.ARRAY,
      description: 'List of artifacts visited during the session',
      items: {
        type: Type.OBJECT,
        properties: {
          itemName: { type: Type.STRING, description: 'Name of the artifact or exhibit' },
          venueName: { type: Type.STRING, description: 'Name of the museum or venue' },
          era: { type: Type.STRING, description: 'Historical era' },
          civilization: { type: Type.STRING, description: 'Civilization or culture' },
          conversationSummary: {
            type: Type.STRING,
            description: 'Summary of the conversation about this artifact',
          },
        },
        required: ['itemName', 'conversationSummary'],
      },
    },
  },
  required: ['visits'],
};

interface VisitInput {
  itemName: string;
  venueName?: string;
  era?: string;
  civilization?: string;
  conversationSummary: string;
}

interface DiaryInput {
  visits: VisitInput[];
}

/** LLM이 잘못된 타입을 전달할 수 있으므로 런타임 검증 */
function validateDiaryInput(args: unknown): DiaryInput {
  const input = args as Record<string, unknown>;
  if (!Array.isArray(input.visits) || input.visits.length === 0) {
    throw new Error('visits must be a non-empty array');
  }
  const visits: VisitInput[] = input.visits.map((v: unknown, i: number) => {
    const visit = v as Record<string, unknown>;
    if (typeof visit.itemName !== 'string' || !visit.itemName) {
      throw new Error(`visits[${i}].itemName is required`);
    }
    if (typeof visit.conversationSummary !== 'string' || !visit.conversationSummary) {
      throw new Error(`visits[${i}].conversationSummary is required`);
    }
    return {
      itemName: visit.itemName,
      venueName: typeof visit.venueName === 'string' ? visit.venueName : undefined,
      era: typeof visit.era === 'string' ? visit.era : undefined,
      civilization: typeof visit.civilization === 'string' ? visit.civilization : undefined,
      conversationSummary: visit.conversationSummary,
    };
  });
  return { visits };
}

function buildDiaryPrompt(visits: VisitInput[]): string {
  const visitDescriptions = visits
    .map(
      (v, i) =>
        `${i + 1}. ${v.itemName} (${v.venueName ?? '알 수 없는 장소'})
   시대: ${v.era ?? '미상'}
   문명: ${v.civilization ?? '미상'}
   감상: ${v.conversationSummary}`,
    )
    .join('\n\n');

  return `당신은 박물관 방문 다이어리 작가입니다.
아래 방문 기록을 바탕으로 감성적이고 교육적인 박물관 다이어리를 작성해주세요.

## 요구사항
- 시적이고 서정적인 제목을 지어주세요
- 1인칭 시점으로 작성
- 각 유물에 대해 2-3문장의 개인적 감상 + 역사적 통찰을 포함
- 각 유물 설명 후에 수채화/스케치 스타일의 삽화를 하나씩 생성해주세요
- 여행 일기장에 그린 것 같은 따뜻한 느낌의 삽화 (사실적이지 않게)
- 한국어로 작성
- 서두(장면 설정)와 결말(방문 소감)을 포함

## 방문 기록

${visitDescriptions}

다이어리를 시작하세요. 텍스트와 삽화를 번갈아 출력해주세요.`;
}

/**
 * Diary FunctionTool 팩토리.
 * @param client Gemini API 클라이언트 (DI — 테스트 시 mock 주입 가능)
 */
export function createDiaryTool(client: GoogleGenAI) {
  return new FunctionTool({
    name: 'generate_diary',
    description:
      'Generate a beautifully written museum visit diary with watercolor-style illustrations, based on visited artifacts.',
    parameters: diarySchema,
    async execute(args) {
      const input = validateDiaryInput(args);
      const prompt = buildDiaryPrompt(input.visits);

      const response = await Promise.race([
        client.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: [{ role: 'user' as const, parts: [{ text: prompt }] }],
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE],
          },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`TIMEOUT: diary generation exceeded ${DIARY_TIMEOUT_MS}ms`)),
            DIARY_TIMEOUT_MS,
          ),
        ),
      ]);

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      let title = '';
      let textCount = 0;
      let imageCount = 0;

      for (const part of parts) {
        if (part.text) {
          textCount++;
          if (!title) {
            const firstLine = part.text.trim().split('\n')[0].replace(/^#+\s*/, '').trim();
            if (firstLine) title = firstLine;
          }
        } else if (part.inlineData?.mimeType?.startsWith('image/')) {
          imageCount++;
        }
      }

      // NOTE: ADK 데모 범위에서는 다이어리 메타데이터만 반환.
      // 프로덕션에서는 전체 entries를 반환하거나 Firestore에 저장 후 ID를 반환해야 함.
      return {
        success: true,
        title: title || '박물관 다이어리',
        textSections: textCount,
        illustrations: imageCount,
        totalParts: parts.length,
      };
    },
  });
}
