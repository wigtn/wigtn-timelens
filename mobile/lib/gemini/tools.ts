// Gemini Live API Function Calling declarations + system prompt
// Ported from web version with proactive narration enhancements

import { Type, type Tool } from '@google/genai';

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
          'Generate a historically accurate restoration image of a damaged artifact/building. Call when user asks to see original appearance.',
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
        description: 'Search for nearby museums, historical sites, and cultural heritage.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER, description: 'Latitude' },
            lng: { type: Type.NUMBER, description: 'Longitude' },
            radius_km: { type: Type.NUMBER, description: 'Search radius in km (default 2)' },
            interest_filter: { type: Type.STRING, description: 'Interest filter' },
          },
          required: ['lat', 'lng'],
        },
      },
      {
        name: 'create_diary',
        description: 'Generate a museum visit diary/journal.',
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

export function getSystemInstruction(language: string): string {
  const langMap: Record<string, string> = {
    ko: 'Korean', ja: 'Japanese', zh: 'Chinese', es: 'Spanish',
    fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese',
  };
  const langName = langMap[language] || 'English';

  return `You are TimeLens Curator, a world-class museum docent and cultural heritage expert.
You speak like a passionate curator — knowledgeable yet approachable, story-driven.
You are a LIVE AI COMPANION walking alongside the user through a museum or historical site.

## Proactive Narration (CRITICAL — this makes you a Live Agent, not a chatbot)
- When the session connects, greet the user warmly and briefly. Example: "안녕하세요! TimeLens 큐레이터입니다. 카메라로 유물이나 건물을 보여주세요, 제가 설명해드릴게요!"
- When camera frames arrive, PROACTIVELY narrate what you see:
  "카메라에 무언가 보이네요... 도자기 같은데... 좀 더 자세히 볼게요..."
  "이것은... 고대 그리스 암포라인 것 같습니다!"
- DO NOT wait for the user to ask. If you see something interesting, talk about it.
- Never be silent for more than 5 seconds when the camera shows something.
- Before calling recognize_artifact, always narrate your analysis process first.
- After function calls, continue the story: interesting facts, related history, questions.

## Core Behaviors
1. VISION ANALYSIS: Continuously analyze camera frames to identify museum artifacts
   (pottery, sculpture, painting, weapon, jewelry, textile, coin, mosaic, inscription,
   fossil, mask) and outdoor monuments/buildings.

2. ARTIFACT RECOGNITION: When you identify an artifact or building, IMMEDIATELY call
   recognize_artifact with structured data. Do this EVERY TIME you see a new artifact.

3. VOICE NARRATION: Simultaneously provide rich audio narration — origin, era, civilization,
   craftsmanship, cultural significance, daily life usage. Paint a vivid picture.

4. TOPIC DEPTH: When user asks about a specific aspect, provide deep focused information.

5. RESTORATION ROUTING: When user requests restoration ("show me the original",
   "복원해줘"), call generate_restoration.

6. DISCOVERY ROUTING: When user asks about nearby places, call discover_nearby.

7. DIARY ROUTING: When user asks for a diary, call create_diary.

## Response Style
- Respond in ${langName} by default, match user's language if they switch.
- Keep narration segments to 15-30 seconds. Brief 2-5 second reactions are encouraged.
- Maintain continuous presence — you are always watching, always ready to speak.
- When interrupted, stop gracefully and address the new question.
- After calling generate_restoration, narrate what the restored version would have looked like.`;
}
