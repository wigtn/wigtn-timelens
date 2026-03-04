// ============================================================
// 파일: src/lib/gemini/tools.ts
// 담당: Part 1
// 역할: Live API Function Calling 도구 선언 + 시스템 프롬프트
// ============================================================

import { Type, type Tool } from '@google/genai';

/**
 * Live API 세션 config에 전달할 Function Calling 도구 선언.
 * 4개 도구: recognize_artifact, generate_restoration, discover_nearby, create_diary
 */
export const LIVE_API_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'recognize_artifact',
        description:
          'Called when the AI identifies a museum artifact, monument, or historical building from the camera view. Returns structured artifact summary data for the Knowledge Panel UI. Call this EVERY TIME you identify or re-identify an artifact/building.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'Name of the artifact/building (in user language)' },
            era: { type: Type.STRING, description: 'Historical era or date (e.g., "460 BC", "125 AD")' },
            civilization: { type: Type.STRING, description: 'Civilization or culture (e.g., "Ancient Greece")' },
            one_liner: { type: Type.STRING, description: 'One sentence summary (in user language)' },
            topic_1_id: { type: Type.STRING, description: 'First topic ID (e.g., "usage")' },
            topic_1_label: { type: Type.STRING, description: 'First topic display label (in user language)' },
            topic_2_id: { type: Type.STRING, description: 'Second topic ID (e.g., "technique")' },
            topic_2_label: { type: Type.STRING, description: 'Second topic display label' },
            topic_3_id: { type: Type.STRING, description: 'Third topic ID (e.g., "mythology")' },
            topic_3_label: { type: Type.STRING, description: 'Third topic display label' },
            confidence: { type: Type.NUMBER, description: 'Recognition confidence 0-1' },
            is_outdoor: { type: Type.BOOLEAN, description: 'True if outdoor monument/building' },
            architecture_style: { type: Type.STRING, description: 'Architecture style if applicable' },
          },
          required: [
            'name', 'era', 'civilization', 'one_liner',
            'topic_1_id', 'topic_1_label', 'topic_2_id', 'topic_2_label',
            'topic_3_id', 'topic_3_label', 'confidence', 'is_outdoor',
          ],
        },
      },
      {
        name: 'generate_restoration',
        description:
          'Generate a historically accurate restoration image of a damaged artifact/building. Call when user asks to see original appearance ("show me what it looked like", "복원해줘").',
        parameters: {
          type: Type.OBJECT,
          properties: {
            artifact_name: { type: Type.STRING, description: 'Name of the artifact/building' },
            era: { type: Type.STRING, description: 'Historical era to restore to' },
            artifact_type: { type: Type.STRING, description: 'Type: pottery, sculpture, painting, weapon, jewelry, textile, coin, mosaic, inscription, fossil, mask, building, monument' },
            damage_description: { type: Type.STRING, description: 'Current damage/deterioration description' },
            site_name: { type: Type.STRING, description: 'Site name (for buildings/monuments)' },
            current_description: { type: Type.STRING, description: 'Current state description (for buildings)' },
          },
          required: ['artifact_name', 'era'],
        },
      },
      {
        name: 'discover_nearby',
        description:
          'Search for nearby museums, historical sites, and cultural heritage. Call when user asks about nearby places.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER, description: 'Latitude' },
            lng: { type: Type.NUMBER, description: 'Longitude' },
            radius_km: { type: Type.NUMBER, description: 'Search radius in km (default 2)' },
            interest_filter: { type: Type.STRING, description: 'Interest filter (e.g., "ancient Egyptian")' },
          },
          required: ['lat', 'lng'],
        },
      },
      {
        name: 'create_diary',
        description:
          'Generate a museum visit diary/journal. Call when user asks for a diary ("다이어리 만들어줘").',
        parameters: {
          type: Type.OBJECT,
          properties: {
            session_id: { type: Type.STRING, description: 'Current session ID' },
          },
          required: ['session_id'],
        },
      },
    ],
  },
];

/**
 * Curator Agent 시스템 프롬프트 생성.
 * Live API 시스템 프롬프트가 Orchestrator 역할 수행.
 */
export function getSystemInstruction(language: string): string {
  const langMap: Record<string, string> = {
    ko: 'Korean',
    ja: 'Japanese',
    zh: 'Chinese',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
  };
  const langName = langMap[language] || 'English';

  return `You are TimeLens Curator, a world-class museum docent and cultural heritage expert.
You speak like a passionate curator — knowledgeable yet approachable, story-driven.

## Core Behaviors
1. VISION ANALYSIS: Continuously analyze camera frames to identify museum artifacts
   (pottery, sculpture, painting, weapon, jewelry, textile, coin, mosaic, inscription,
   fossil, mask) and outdoor monuments/buildings.

2. ARTIFACT RECOGNITION: When you identify an artifact or building, IMMEDIATELY call
   the recognize_artifact function with structured data. This triggers the Knowledge
   Panel summary card in the UI. Do this EVERY TIME you see a new artifact.

3. VOICE NARRATION: Simultaneously provide rich audio narration about the artifact —
   origin, era, civilization, craftsmanship, cultural significance, daily life usage.
   Paint a vivid picture of the world it belonged to.

4. TOPIC DEPTH: When a user taps a topic chip or asks about a specific aspect,
   provide deep focused information on that topic. The three topics you provide in
   recognize_artifact should be the most interesting/relevant aspects.

5. SEARCH GROUNDING: Base all factual claims on verified information.

6. RESTORATION ROUTING: When user requests restoration ("show me the original",
   "복원해줘", "새것이었을 때 어떤 모습이었는지 보여줘"), call generate_restoration with detailed damage description.

7. DISCOVERY ROUTING: When user asks about nearby places ("nearby museums?",
   "근처에 박물관 있어?"), call discover_nearby.

8. DIARY ROUTING: When user asks for a diary ("다이어리 만들어줘"),
   call create_diary with the session ID.

## Response Style
- Respond in ${langName} by default, but match the user's language if they switch.
- Keep initial voice narration to 30-60 seconds. Don't over-talk.
- When interrupted, stop gracefully and address the new question.
- After calling generate_restoration, narrate what the restored version would have
  looked like while the image generates (fill the waiting time).`;
}
