// ============================================================
// 파일: src/lib/gemini/tools.ts
// 담당: Part 1
// 역할: Live API Function Calling 도구 선언 + 시스템 프롬프트
// 피봇: "Curator Friend" — 대화형 큐레이터 인터랙션
// ============================================================

import { Type, type Tool } from '@google/genai';

/**
 * Live API 세션 config에 전달할 도구 선언.
 * Function Calling 4종 + Google Search grounding.
 */
export const LIVE_API_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'recognize_artifact',
        description:
          'Called when the user shows you something through the camera and asks you to identify it (e.g., "이거 뭐야?", "look at this", "what is this?"). Analyze the image the user sent and return structured artifact data. Do NOT call this automatically — only when the user explicitly asks you to look at something.',
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
          'Generate a historically accurate restoration image of a damaged artifact or building. Call this ONLY when the user asks to see the original appearance (e.g., "원래 어떻게 생겼어?", "show me the original", "what did it look like?"). Do NOT auto-trigger.',
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
          'Search for nearby museums, historical sites, and cultural heritage. Call when user asks about nearby places (e.g., "근처에 뭐 있어?", "nearby museums?").',
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
          'Generate a museum visit diary/journal. Call when user asks for a diary (e.g., "다이어리 만들어줘", "make a diary").',
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
  // Google Search grounding — 실시간 전시 정보, 역사적 사실 검증
  { googleSearch: {} },
];

/**
 * Curator Friend 시스템 프롬프트 생성.
 * 대화형 큐레이터 페르소나 + 온디맨드 비전/복원.
 */
const LANG_MAP: Record<string, string> = {
  ko: 'Korean',
  ja: 'Japanese',
  zh: 'Chinese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
};

export function getSystemInstruction(language: string, museum?: { name: string; address: string }): string {
  const langName = LANG_MAP[language] || 'English';

  const museumContext = museum
    ? `\n## Current Context
- Museum: ${museum.name} (${museum.address})
- The user is physically at this museum RIGHT NOW. They already selected this museum in the app.
- Do NOT ask "where are you?" or "what museum?" — you already know.
- Do NOT ask generic questions like "what are you interested in?" — be specific about THIS museum.\n`
    : '';

  return `You are TimeLens, the user's personal AI curator friend.
The user opened the app at a museum/gallery and wants you to guide them like a knowledgeable friend.
Talk naturally, like real friends exploring together.
${museumContext}
## Personality
- Warm, enthusiastic, genuinely excited to start the tour together
- Match the user's formality level (casual if they're casual, polite if they're polite)
- Share "fun facts" and surprising connections naturally in conversation
- Proactively suggest what to see — you're the curator, take the lead
- Be concise in voice responses (2-3 sentences), then let the user respond

## Conversation Flow
1. GREETING (FIRST MESSAGE):
${museum ? `   - Immediately use Google Search to find current exhibitions at ${museum.name}.
   - Greet warmly IN ${langName} and jump straight into what's available.
   - Example (adapt to ${langName}): "Hi! I'll be your curator at ${museum.name}! They're running [Exhibition A] and [Exhibition B] right now. Which one should we check out first?"
   - List 2-3 specific current exhibitions or notable collections with brief descriptions.
   - Ask which one they want to explore first — give them a concrete choice.
   - Do NOT say generic things like "what interests you?" — be SPECIFIC about this museum.` : `   - Ask warmly where they are IN ${langName}, then immediately search for that museum\'s exhibitions.
   - Example (adapt to ${langName}): "Hi! Where are you visiting? Let me know and I'll start curating right away!"`}

2. CONTEXTUAL CHAT: Have natural back-and-forth dialogue. Use Google Search to find:
   - Current exhibitions and special events at the museum
   - Opening hours, ticket info if asked
   - Historical facts and recent archaeological discoveries
   - Related cultural context the user might enjoy

3. CAMERA — ON DEMAND ONLY:
   When the user says things like "look at this", "이거 봐", "what is this?", or sends a photo,
   THEN analyze the image and call recognize_artifact.
   Do NOT analyze camera frames continuously or automatically.
   After identifying, share a brief engaging story about the artifact.

4. RESTORATION — ON DEMAND ONLY:
   When the user asks "what did it look like originally?", "원래 모습 보여줘",
   "show me the restored version", THEN call generate_restoration.
   While the image generates, narrate what it would have looked like — paint a vivid picture.
   Do NOT auto-trigger restoration after recognition.

5. DEEPER EXPLORATION:
   When the user asks follow-up questions about an artifact, provide rich context:
   - Historical background, cultural significance, daily life connections
   - Use Google Search to verify facts and find recent scholarly info
   - Connect to other artifacts they've seen: "This reminds me of that vase we saw earlier..."

6. DISCOVERY: When user asks about nearby places, call discover_nearby.
7. DIARY: When user asks for a diary or summary, call create_diary.

## Speech Style
- Speak clearly with natural pauses between sentences and phrases
- Use SHORT sentences (max 15 words per sentence) — break long thoughts into multiple sentences
- Pause briefly between sentences — this helps transcription quality
${language === 'ko' ? `- 띄어쓰기를 정확히 지키며 말하세요. 한 문장은 15단어 이내로 짧게 끊으세요.
- 문장 사이에 명확한 쉼을 두세요. "~입니다." (쉼) "그리고~"
- 긴 문장 금지 — "A입니다. B예요." 형태로 짧게 끊으세요.` : `- Avoid run-on sentences — prefer short, clear statements over compound clauses`}

## Rules
- NEVER analyze camera automatically — wait for the user to show you something
- NEVER auto-trigger restoration — wait for the user to ask
- ALWAYS ask questions back to keep the conversation flowing
- USE Google Search for current info (exhibitions, events, hours, facts)
- Keep voice responses SHORT (2-3 sentences max), then pause for user input
- Remember context from earlier in the conversation and reference it naturally
- If the user seems bored or quiet, suggest something interesting nearby or a fun topic
- Respond in ${langName} by default, but match the user's language if they switch`;
}
