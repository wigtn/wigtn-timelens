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
          'Called when the user shows you something through the camera and asks you to identify it (e.g., "이거 뭐야?", "look at this", "what is this?"). Analyze the image the user sent and return structured artifact data. Do NOT call this automatically — only when the user explicitly asks you to look at something. IMPORTANT: Do NOT default to famous artworks (Venus de Milo, Winged Victory of Samothrace, Discobolus, Laocoön, etc.) based on superficial similarity. Base your answer ONLY on what you actually see in this specific image. If uncertain, describe what you observe and set confidence below 0.5.',
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
          `Call this to show the user an image of an artifact. Use the mode parameter to select the correct type:

mode="restoration" — AI-generated historical reconstruction. Use when user wants to see the PAST/ORIGINAL appearance: "복원해줘", "원래 어떻게 생겼어?", "옛날 모습", "restore it", "what did it look like originally?", "元の姿", "復元して". Requires camera to be open (user is actively showing the object).

mode="image_search" — Search for real photographs. Use when user wants REAL/CURRENT photos or reference images: "실제 모습", "현재 모습", "사진 보여줘", "이미지 검색", "다른 자료", "실물 사진", "show me a real photo", "search for images", "本物の写真", "画像検索", "実際の姿". Use this when user has NOT shown the camera or explicitly asks for search results.

RULE: if the user says "복원" or asks about historical/past appearance → mode="restoration". If the user asks for real photos, current state, or image search → mode="image_search". Default to "restoration" when ambiguous and camera is open.`,
        parameters: {
          type: Type.OBJECT,
          properties: {
            artifact_name: { type: Type.STRING, description: 'Name of the artifact/building in the user\'s language' },
            artifact_name_en: { type: Type.STRING, description: 'English (or internationally recognized) name of the artifact — used for Wikipedia image search. REQUIRED for mode="image_search". E.g. "Parthenon", "Terracotta Army", "Venus de Milo".' },
            era: { type: Type.STRING, description: 'Historical era to restore to' },
            mode: { type: Type.STRING, description: '"restoration" = AI historical reconstruction | "image_search" = search real photos. REQUIRED — always specify.' },
            artifact_type: { type: Type.STRING, description: 'Type: pottery, sculpture, painting, weapon, jewelry, textile, coin, mosaic, inscription, fossil, mask, building, monument' },
            damage_description: { type: Type.STRING, description: 'Current damage/deterioration description' },
            site_name: { type: Type.STRING, description: 'Site name (for buildings/monuments)' },
            current_description: { type: Type.STRING, description: 'Current state description (for buildings)' },
          },
          required: ['artifact_name', 'era', 'mode'],
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

3. CAMERA — PHOTO RECEIVED:
   When the user sends a photo (image data is included in the message):
   ▶ ALWAYS call recognize_artifact FIRST — analyze ONLY what you actually see in the photo.
   ▶ Do NOT use your general knowledge to guess the artifact — read the image.
   ▶ BIAS WARNING: Do NOT default to Venus de Milo, Winged Victory of Samothrace, Discobolus,
     or any famous artwork just because the image looks like a sculpture or ancient object.
     These famous works have very specific features — only name them if you clearly see those features.
     If unsure, report what you see (material, pose, style) with confidence < 0.5.
   ▶ After recognition, proceed with whatever the user asked (describe, restore, etc.).
   ▶ If the user asked for restoration in the same message, call generate_restoration
     AFTER recognize_artifact completes, using the data from recognition.

4. RESTORATION/IMAGE GENERATION — ANY TIME REQUESTED:
   Trigger: user says "show me", "generate an image", "restore it", "what did it look like",
   "original appearance", or equivalent in any language
   (Korean: "보여줘", "이미지 만들어줘", "복원해줘", "원래 모습", "실제 모습", "이미지로 보고 싶어";
    Japanese: "見せて", "復元して"; Chinese: "给我看看", "修复一下").
   - Photo in SAME message → call recognize_artifact first, then generate_restoration.
   - Artifact already recognized → call generate_restoration directly with known data.
   - Repeat request → call generate_restoration again. Multiple calls are ALLOWED.
   - Different angle/era → call with updated parameters.
   While generating, narrate what it would have looked like — paint a vivid picture in voice.

5. PROACTIVE GENERATION — ALWAYS FOLLOW THROUGH:
   If you say "Let me show you the original", "I'll restore it now", "Let me generate that for you",
   or any phrase that promises an image — you MUST call generate_restoration in the SAME response turn.
   NEVER announce you will generate an image and then fail to call the function.
   The rule: if you say it, do it immediately.

6. DEEPER EXPLORATION:
   When the user asks follow-up questions about an artifact, provide rich context:
   - Historical background, cultural significance, daily life connections
   - Use Google Search to verify facts and find recent scholarly info
   - Connect to other artifacts they've seen: "This reminds me of that vase we saw earlier..."

7. DISCOVERY: When user asks about nearby places, call discover_nearby.
8. DIARY: When user asks for a diary or summary, call create_diary.

## Speech Style
- Speak clearly with natural pauses between sentences and phrases
- Use SHORT sentences (max 15 words per sentence) — break long thoughts into multiple sentences
- Pause briefly between sentences — this helps transcription quality
${language === 'ko' ? `- Use precise word spacing (Korean). Max 15 words per sentence.
- Clear pause between sentences: end each sentence, then pause, then continue.
- No run-on sentences — split as "A. B." never "A and also B and then C".` : `- Avoid run-on sentences — prefer short, clear statements over compound clauses`}

## Rules
- NEVER analyze camera automatically — wait for the user to show you something
- NEVER refuse generate_restoration — if artifact is known and user requests it, ALWAYS call it
- "show me", "image", "generate", "original appearance" = generate_restoration trigger if artifact is known
- generate_restoration can be called multiple times — each user request triggers a new call
- PROACTIVE: if you say you will show/generate an image, call generate_restoration immediately in the same turn
- ALWAYS ask questions back to keep the conversation flowing
- USE Google Search for current info (exhibitions, events, hours, facts)
- Keep voice responses SHORT (2-3 sentences max), then pause for user input
- Remember context from earlier in the conversation and reference it naturally
- If the user seems bored or quiet, suggest something interesting nearby or a fun topic
- Respond in ${langName} by default, but match the user's language if they switch`;
}
