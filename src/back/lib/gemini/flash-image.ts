// ============================================================
// 파일: src/lib/gemini/flash-image.ts
// 담당: Part 3
// 역할: Gemini 2.5 Flash Image Generation API 래퍼
//       복원 프롬프트 빌드 + 이미지 생성 호출
// ============================================================

import { type GoogleGenAI, Modality } from '@google/genai';

// --- 생성 결과 ---
export interface ImageGenerationResult {
  imageBase64: string;
  mimeType: string;
  description: string;
}

// --- 생성 옵션 ---
export interface ImageGenerationOptions {
  prompt: string;
  referenceImage?: {
    data: string;
    mimeType: string;
  };
  timeoutMs?: number;
}

// --- 카테고리별 프롬프트 ---
const CATEGORY_PROMPTS: Record<string, string> = {
  pottery:
    'Show intact vessel with no cracks or chips. Restore original painted decorations with vivid red-figure or black-figure technique. Show smooth, polished ceramic surface with original glaze. If handles are missing, reconstruct them in period-appropriate style. The clay should show its original warm terracotta color.',

  sculpture:
    'Restore to complete figure with all limbs, head, and features intact. IMPORTANT: Ancient Greek and Roman marble statues were originally painted in vivid polychrome colors (red, blue, gold, flesh tones) — show the original polychrome painting. Restore smooth marble surface without weathering or staining. Show fine details of hair, drapery folds, and facial features.',

  painting:
    'Restore colors to their original vibrancy and saturation — remove all fading, yellowing, and darkening from age. Fix any flaking, cracking, or missing sections of paint. Restore sharp details and clean brush strokes. Show the painting as the artist intended, with original color palette. If fresco, show the vivid wet-plaster colors.',

  weapon:
    'Remove all corrosion, patina, rust, and verdigris. Show the original metallic surface — polished bronze should gleam warmly, gold should shine brilliantly, iron should show dark forged finish. Restore any missing decorative elements (engravings, inlays, gemstones). Show the original surface treatment and finish.',

  jewelry:
    'Remove all corrosion, patina, rust, and verdigris. Show the original metallic surface — polished bronze should gleam warmly, gold should shine brilliantly, iron should show dark forged finish. Restore any missing decorative elements (engravings, inlays, gemstones). Show the original surface treatment and finish.',

  coin: 'Remove all corrosion, patina, rust, and verdigris. Show the original metallic surface — polished bronze should gleam warmly, gold should shine brilliantly, iron should show dark forged finish. Restore any missing decorative elements (engravings, inlays, gemstones). Show the original surface treatment and finish.',

  mosaic:
    'Complete the full mosaic pattern, filling in all missing tesserae. Show vivid original stone and glass colors — rich reds, blues, golds, whites, and blacks. Clean grout lines between tesserae. The overall composition should be complete and symmetrical where appropriate. Show the mosaic as freshly laid with bright, unworn surfaces.',

  // 건축물 유형은 별도 기본 템플릿 사용
  building: '',
  monument: '',
  inscription: '',
};

const DEFAULT_CATEGORY_PROMPT =
  'Restore to pristine original condition with vivid colors and intact structure. Show fine details of craftsmanship and material texture. Remove all signs of age, wear, and deterioration.';

/**
 * 유물/건축물 유형별 복원 프롬프트를 생성한다.
 */
export function buildRestorationPrompt(params: {
  artifactName: string;
  era: string;
  artifactType?: string;
  damageDescription?: string;
  isArchitecture: boolean;
  siteName?: string;
  currentDescription?: string;
}): string {
  const {
    artifactName,
    era,
    artifactType,
    damageDescription,
    isArchitecture,
    siteName,
    currentDescription,
  } = params;

  // --- 건축물 ---
  if (isArchitecture) {
    return [
      `Create a photorealistic image of ${siteName || artifactName} as it appeared in ${era}, showing the complete original structure.`,
      '',
      currentDescription ? `Current state: ${currentDescription}` : '',
      '',
      'Requirements:',
      '- Architecturally accurate reconstruction based on historical records',
      '- Same viewing angle as the reference photo',
      '- Original paint, materials, and surface finishes',
      '- Period-appropriate surrounding environment (people, vegetation, sky)',
      '- Natural daylight with realistic shadows',
      '- Do NOT add any text, labels, or watermarks to the image',
      '- Grand scale showing the full majesty of the structure',
    ]
      .filter(Boolean)
      .join('\n');
  }

  // --- 유물 ---
  const categoryInstructions =
    artifactType && CATEGORY_PROMPTS[artifactType] !== undefined
      ? CATEGORY_PROMPTS[artifactType]
      : DEFAULT_CATEGORY_PROMPT;

  return [
    `Create a photorealistic museum-quality image of ${artifactName} as it would have appeared when newly created in ${era}.`,
    '',
    artifactType ? `Artifact type: ${artifactType}` : '',
    damageDescription ? `Current condition: ${damageDescription}` : '',
    '',
    'Requirements:',
    '- Historically accurate restoration based on archaeological records',
    '- Same viewing angle as the reference photo',
    '- Show the artifact in pristine, newly-made condition',
    '- Vivid original colors and material textures',
    '- Fine details of craftsmanship, carving, and painting',
    '- Museum lighting, clean neutral background',
    '- Do NOT add any text, labels, or watermarks to the image',
    '',
    categoryInstructions,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Gemini 2.5 Flash Image Generation API를 호출하여 복원 이미지를 생성한다.
 */
export async function generateRestorationImage(
  client: GoogleGenAI,
  options: ImageGenerationOptions,
): Promise<ImageGenerationResult> {
  if (!options.prompt) {
    throw new Error('Prompt is required');
  }

  const timeoutMs = options.timeoutMs ?? 90000;

  // contents 구성: 참조 이미지 유무에 따라 분기
  const contents = options.referenceImage
    ? [
        {
          role: 'user' as const,
          parts: [
            { text: options.prompt },
            {
              inlineData: {
                mimeType: options.referenceImage.mimeType,
                data: options.referenceImage.data,
              },
            },
          ],
        },
      ]
    : options.prompt;

  // Promise.race로 타임아웃 구현
  const response = await Promise.race([
    client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs),
    ),
  ]);

  // 안전 필터 / 빈 응답 체크
  const candidate = response.candidates?.[0];
  const finishReason = candidate?.finishReason;

  if (finishReason === 'SAFETY') {
    throw new Error('CONTENT_FILTERED: blocked by safety filters');
  }

  if (response.promptFeedback?.blockReason) {
    throw new Error(`CONTENT_FILTERED: ${response.promptFeedback.blockReason}`);
  }

  const parts = candidate?.content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error('GENERATION_FAILED: No parts in response');
  }

  let imageBase64 = '';
  let mimeType = 'image/png';
  let description = '';

  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith('image/')) {
      const data = part.inlineData.data ?? '';
      if (!data) continue; // skip empty image data
      imageBase64 = data;
      mimeType = part.inlineData.mimeType;
    }
    if (part.text) {
      description += part.text;
    }
  }

  if (!imageBase64) {
    throw new Error('GENERATION_FAILED: No image in response');
  }

  return { imageBase64, mimeType, description };
}
