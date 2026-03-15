// ============================================================
// 파일: src/back/agents/tools/restoration-tool.ts
// 담당: ADK Integration
// 역할: ADK FunctionTool — 유물 복원 이미지 생성
// 래핑: flash-image.ts의 buildRestorationPrompt + generateRestorationImage
// ============================================================

import { FunctionTool } from '@google/adk';
import { Type, type Schema, type GoogleGenAI } from '@google/genai';
import {
  buildRestorationPrompt,
  generateRestorationImage,
} from '@back/lib/gemini/flash-image';

const restorationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    artifactName: { type: Type.STRING, description: 'Name of the artifact to restore' },
    era: { type: Type.STRING, description: 'Historical era or date (e.g. "500 BC")' },
    artifactType: {
      type: Type.STRING,
      description: 'Category: pottery, sculpture, painting, weapon, jewelry, coin, mosaic, building',
    },
    damageDescription: { type: Type.STRING, description: 'Current damage or deterioration details' },
    isArchitecture: {
      type: Type.BOOLEAN,
      description: 'True if the artifact is a building or architectural site',
    },
    siteName: { type: Type.STRING, description: 'Name of the architectural site (if architecture)' },
    currentDescription: { type: Type.STRING, description: 'Description of current state' },
  },
  required: ['artifactName', 'era', 'isArchitecture'],
};

interface RestorationInput {
  artifactName: string;
  era: string;
  artifactType?: string;
  damageDescription?: string;
  isArchitecture: boolean;
  siteName?: string;
  currentDescription?: string;
}

/** LLM이 잘못된 타입을 전달할 수 있으므로 런타임 검증 */
function validateRestorationInput(args: unknown): RestorationInput {
  const input = args as Record<string, unknown>;
  if (typeof input.artifactName !== 'string' || !input.artifactName) {
    throw new Error('artifactName is required and must be a string');
  }
  if (typeof input.era !== 'string' || !input.era) {
    throw new Error('era is required and must be a string');
  }
  if (typeof input.isArchitecture !== 'boolean') {
    throw new Error('isArchitecture is required and must be a boolean');
  }
  return {
    artifactName: input.artifactName,
    era: input.era,
    artifactType: typeof input.artifactType === 'string' ? input.artifactType : undefined,
    damageDescription: typeof input.damageDescription === 'string' ? input.damageDescription : undefined,
    isArchitecture: input.isArchitecture,
    siteName: typeof input.siteName === 'string' ? input.siteName : undefined,
    currentDescription: typeof input.currentDescription === 'string' ? input.currentDescription : undefined,
  };
}

/**
 * Restoration FunctionTool 팩토리.
 * @param client Gemini API 클라이언트 (DI — 테스트 시 mock 주입 가능)
 */
export function createRestorationTool(client: GoogleGenAI) {
  return new FunctionTool({
    name: 'generate_restoration_image',
    description:
      'Generate a historically accurate photorealistic restoration image of a damaged or deteriorated artifact, showing how it looked when newly created.',
    parameters: restorationSchema,
    async execute(args) {
      const input = validateRestorationInput(args);
      const prompt = buildRestorationPrompt(input);

      const result = await generateRestorationImage(client, {
        prompt,
        timeoutMs: 60000,
      });

      // NOTE: ADK 데모 범위에서는 이미지 메타데이터만 반환.
      // 프로덕션에서는 Cloud Storage에 업로드 후 URL을 반환해야 함.
      return {
        success: true,
        imageBase64Length: result.imageBase64.length,
        mimeType: result.mimeType,
        description: result.description,
      };
    },
  });
}
