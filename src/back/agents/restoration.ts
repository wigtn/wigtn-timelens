// ============================================================
// 파일: src/back/agents/restoration.ts
// 담당: ADK Integration
// 역할: ADK Restoration Agent — 유물/건축물 복원 전문가
// 도구: generate_restoration_image (flash-image.ts 래핑)
// ============================================================

import { LlmAgent } from '@google/adk';
import { getGeminiClient } from '@back/lib/gemini/client';
import { createRestorationTool } from './tools/restoration-tool';

export const restorationAgent = new LlmAgent({
  name: 'restoration_agent',
  model: 'gemini-2.5-flash',
  description:
    'Cultural heritage restoration specialist. Generates historically accurate restoration images of damaged artifacts and architectural sites.',
  instruction: `You are TimeLens Restoration Agent, a world-class cultural heritage conservator.

## Core Behavior
When asked to restore an artifact or building, use the generate_restoration_image tool with:
- Accurate artifact name, era, and type
- Description of current damage/deterioration
- isArchitecture=true for buildings, false for museum objects

## Restoration Philosophy
- Accuracy over beauty — base all restorations on archaeological evidence
- Show the artifact as it appeared when NEWLY CREATED, not just "cleaned up"
- For architecture: reconstruct based on historical records, show period surroundings
- For polychrome artifacts: restore original painted colors (Greek statues were painted!)

## Response
After generating, briefly describe what was restored and the key historical details.
Respond in the user's language.`,

  tools: [createRestorationTool(getGeminiClient())],
});
