# TimeLens Part 3: Restoration + UI -- 상세 설계 문서

> **파트**: Part 3 (Restoration + UI)
> **버전**: 1.0
> **최종 수정**: 2026-03-04
> **목적**: Claude Code가 이 문서만 읽고 Part 3의 모든 파일을 독립적으로 구현할 수 있는 수준의 상세 명세
> **참조 문서**: `docs/contracts/shared-contract.md`, `docs/contracts/gemini-sdk-reference.md`, `docs/prd/timelens-prd-ko.md`, `docs/prd/timelens-ui-flow.md`, `docs/design/part1-core-pipeline.md`

---

## 0. 아키텍처 결정 요약 (확정)

| 결정 | 내용 |
|---|---|
| **이미지 생성 모델** | `gemini-2.5-flash-image-preview` |
| **SDK** | `@google/genai` v1.43.0+ (`GoogleGenAI`, `Modality`) |
| **API 방식** | REST (`ai.models.generateContent()`) -- 서버사이드 전용 |
| **이미지 편집** | 참조 이미지(base64 inlineData) + 텍스트 프롬프트 조합 |
| **출력 형식** | PNG, 1024x1024px 기본 |
| **이미지 저장** | 해커톤 스코프: base64 data URL 반환 (Cloud Storage 불필요) |
| **프롬프트 전략** | 유물 6개 카테고리 + 건축물 1개 = 총 7개 특화 프롬프트 |
| **타임아웃** | 30초 (이미지 생성 평균 ~10-15초, 여유 포함) |

### 전체 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│  복원 이미지 생성 전체 흐름                                          │
│                                                                     │
│  Step 1: Live API Function Call (Part 1 → Part 3)                  │
│  ┌────────────────┐    ┌──────────────────┐                        │
│  │ Live API        │    │ handleToolCalls()│                        │
│  │ "복원해줘"      │───►│ generate_        │                        │
│  │                 │    │ restoration      │                        │
│  └────────────────┘    └───────┬──────────┘                        │
│                                │                                    │
│  Step 2: REST API (클라이언트 → 서버)                               │
│                                │ fetch('/api/restore', {             │
│                                │   artifactName, era,                │
│                                │   artifactType, damageDescription,  │
│                                │   referenceImage? (base64)          │
│                                │ })                                  │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────┐                   │
│  │ /api/restore/route.ts (Part 3)               │                   │
│  │  1. 요청 검증 (RestorationRequest)            │                   │
│  │  2. 카테고리별 프롬프트 생성                    │                   │
│  │  3. Gemini Flash Image 호출                   │                   │
│  │  4. 응답 파싱 (이미지 + 텍스트)                │                   │
│  │  5. RestorationResponse 반환                  │                   │
│  └──────────────────────┬──────────────────────┘                   │
│                         │                                           │
│  Step 3: Gemini Image Generation                                   │
│                         │ ai.models.generateContent({               │
│                         │   model: 'gemini-2.5-flash-image-preview',│
│                         │   contents: [prompt + referenceImage],     │
│                         │   config: { responseModalities:           │
│                         │     [Modality.TEXT, Modality.IMAGE] }      │
│                         │ })                                        │
│                         ▼                                           │
│  ┌─────────────────────────────────────────────┐                   │
│  │ Gemini 2.5 Flash Image                       │                   │
│  │  - 참조 이미지 분석                            │                   │
│  │  - 프롬프트 기반 복원 이미지 생성               │                   │
│  │  - PNG 1024x1024 + 설명 텍스트 반환            │                   │
│  └──────────────────────┬──────────────────────┘                   │
│                         │                                           │
│  Step 4: UI 결과 렌더링                                             │
│                         ▼                                           │
│  ┌─────────────────────────────────────────────┐                   │
│  │ Part 1: onToolResult → Part 3: UI 컴포넌트   │                   │
│  │  RestorationResult.tsx                        │                   │
│  │   └── BeforeAfterSlider.tsx                   │                   │
│  │        ├── 원본 사진 (Before)                  │                   │
│  │        ├── 복원 이미지 (After)                 │                   │
│  │        └── 터치 슬라이더                        │                   │
│  └─────────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. 파일 소유권 맵

```
src/
├── app/api/
│   └── restore/route.ts              ← REST API 엔드포인트 (Part 1 스캐폴드 → Part 3 실제 구현)
├── lib/gemini/
│   └── flash-image.ts                ← Gemini 2.5 Flash Image 호출 래퍼
├── components/
│   ├── BeforeAfterSlider.tsx          ← 터치 슬라이더 (인터랙티브 비교)
│   └── RestorationResult.tsx          ← 복원 결과 표시 컨테이너 (로딩 + 결과 + 에러)
└── types/
    └── restoration.ts                 ← Part 5가 shared-contract에서 생성 (Part 3은 import만)
```

### 타 파트 의존성

| 파트 | 내가 소비하는 것 | 내가 제공하는 것 |
|---|---|---|
| **Part 1** | `handleToolCalls()`가 `POST /api/restore` 호출, `capturePhoto()` 함수, `onToolResult` 이벤트 | `/api/restore` 실제 구현 (501 스캐폴드 교체) |
| **Part 2** | `KnowledgePanel`이 `RestorationResult`를 `children`으로 렌더링 | `RestorationResult`, `BeforeAfterSlider` 컴포넌트 |
| **Part 5** | `getGeminiClient()` 싱글턴 (`src/lib/gemini/client.ts`), `restoration.ts` 타입 | 없음 |

---

## 2. 파일별 상세 설계

### 2.1 `src/lib/gemini/flash-image.ts` -- Gemini 2.5 Flash Image 호출 래퍼

**역할**: 서버사이드에서 Gemini 2.5 Flash Image Generation API를 호출하여 복원 이미지를 생성. 참조 이미지(선택)와 프롬프트를 입력으로 받아 PNG 이미지 Buffer + 설명 텍스트를 반환.

```typescript
import { GoogleGenAI, Modality } from '@google/genai';

// --- 생성 결과 ---
export interface ImageGenerationResult {
  imageBase64: string;       // base64 PNG 이미지 데이터
  mimeType: string;          // 'image/png'
  description: string;       // AI가 생성한 복원 설명 텍스트
}

// --- 생성 옵션 ---
export interface ImageGenerationOptions {
  prompt: string;                    // 복원 프롬프트 전문
  referenceImage?: {                 // 참조 이미지 (카메라 캡처)
    data: string;                    // base64
    mimeType: string;                // 'image/jpeg' | 'image/png'
  };
  timeoutMs?: number;                // 기본 30000
}

// --- 메인 함수 ---
export async function generateRestorationImage(
  client: GoogleGenAI,
  options: ImageGenerationOptions
): Promise<ImageGenerationResult>;

// --- 프롬프트 빌더 (내부 헬퍼, export for testing) ---
export function buildRestorationPrompt(params: {
  artifactName: string;
  era: string;
  artifactType?: string;
  damageDescription?: string;
  isArchitecture: boolean;
  siteName?: string;
  currentDescription?: string;
}): string;
```

#### 구현 상세: `generateRestorationImage()`

1. **입력 검증**: `options.prompt`가 비어있으면 `throw new Error('Prompt is required')`
2. **contents 구성**:
   - 참조 이미지가 있는 경우 (이미지 편집 모드):
     ```typescript
     const contents = [
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
     ];
     ```
   - 참조 이미지가 없는 경우 (순수 생성 모드):
     ```typescript
     const contents = options.prompt;
     ```
3. **API 호출**:
   ```typescript
   const response = await client.models.generateContent({
     model: 'gemini-2.5-flash-image-preview',
     contents: contents,
     config: {
       responseModalities: [Modality.TEXT, Modality.IMAGE],
     },
   });
   ```
4. **타임아웃 처리**: `AbortController`와 `setTimeout`으로 래핑
   ```typescript
   const controller = new AbortController();
   const timeoutId = setTimeout(
     () => controller.abort(),
     options.timeoutMs ?? 30000
   );
   // AbortController는 fetch 기반이 아닌 SDK 호출이므로,
   // Promise.race로 타임아웃 구현:
   const result = await Promise.race([
     client.models.generateContent({ ... }),
     new Promise<never>((_, reject) =>
       setTimeout(() => reject(new Error('TIMEOUT')), options.timeoutMs ?? 30000)
     ),
   ]);
   ```
5. **응답 파싱** (SDK reference 3.5 패턴):
   ```typescript
   const parts = response.candidates?.[0]?.content?.parts;
   if (!parts || parts.length === 0) {
     throw new Error('GENERATION_FAILED: No parts in response');
   }

   let imageBase64 = '';
   let mimeType = 'image/png';
   let description = '';

   for (const part of parts) {
     if (part.inlineData?.mimeType?.startsWith('image/')) {
       imageBase64 = part.inlineData.data!;
       mimeType = part.inlineData.mimeType;
     }
     if (part.text) {
       description += part.text;
     }
   }

   if (!imageBase64) {
     throw new Error('GENERATION_FAILED: No image in response');
   }
   ```
6. **반환**: `{ imageBase64, mimeType, description }`

#### 구현 상세: `buildRestorationPrompt()`

프롬프트는 `isArchitecture` 플래그에 따라 두 가지 기본 템플릿으로 분기하며, `artifactType`에 따라 카테고리별 추가 지시사항이 삽입된다.

**로직**:

1. `isArchitecture === true`이면 건축물 프롬프트 템플릿 사용
2. `isArchitecture === false`이면 유물 프롬프트 템플릿 사용
3. `artifactType`이 `CATEGORY_PROMPTS` 맵에 있으면 카테고리별 세부 지시사항 추가
4. 모든 프롬프트 끝에 공통 품질 지시사항 추가

**에러 처리**:

| 에러 | 코드 | retryable | 대응 |
|---|---|---|---|
| API 호출 실패 | `GENERATION_FAILED` | true | 재시도 가능 |
| 30초 타임아웃 | `TIMEOUT` | true | 재시도 가능 |
| 안전 필터 차단 | `CONTENT_FILTERED` | false | 프롬프트 수정 필요 |
| RPM 초과 | `RATE_LIMITED` | true | 2초 후 재시도 |
| 응답에 이미지 없음 | `GENERATION_FAILED` | true | 재시도 가능 |

**의존성**: `@google/genai` (GoogleGenAI, Modality)

---

### 2.2 프롬프트 템플릿 상세

#### 2.2.1 유물 기본 템플릿

```
Create a photorealistic museum-quality image of {artifact_name} as it would have appeared when newly created in {era}.

Artifact type: {artifact_type}
Current condition: {damage_description}

Requirements:
- Historically accurate restoration based on archaeological records
- Same viewing angle as the reference photo
- Show the artifact in pristine, newly-made condition
- Vivid original colors and material textures
- Fine details of craftsmanship, carving, and painting
- Museum lighting, clean neutral background
- Do NOT add any text, labels, or watermarks to the image

{category_specific_instructions}
```

#### 2.2.2 건축물 기본 템플릿

```
Create a photorealistic image of {site_name} as it appeared in {era}, showing the complete original structure.

Current state: {current_description}

Requirements:
- Architecturally accurate reconstruction based on historical records
- Same viewing angle as the reference photo
- Original paint, materials, and surface finishes
- Period-appropriate surrounding environment (people, vegetation, sky)
- Natural daylight with realistic shadows
- Do NOT add any text, labels, or watermarks to the image
- Grand scale showing the full majesty of the structure
```

#### 2.2.3 카테고리별 세부 지시사항 (`CATEGORY_PROMPTS`)

아래 테이블의 내용이 기본 템플릿의 `{category_specific_instructions}` 위치에 삽입된다.

| 카테고리 | `artifactType` 값 | 세부 지시사항 |
|---|---|---|
| **도자기/도예** | `pottery` | `Show intact vessel with no cracks or chips. Restore original painted decorations with vivid red-figure or black-figure technique. Show smooth, polished ceramic surface with original glaze. If handles are missing, reconstruct them in period-appropriate style. The clay should show its original warm terracotta color.` |
| **조각상** | `sculpture` | `Restore to complete figure with all limbs, head, and features intact. IMPORTANT: Ancient Greek and Roman marble statues were originally painted in vivid polychrome colors (red, blue, gold, flesh tones) — show the original polychrome painting. Restore smooth marble surface without weathering or staining. Show fine details of hair, drapery folds, and facial features.` |
| **회화/프레스코** | `painting` | `Restore colors to their original vibrancy and saturation — remove all fading, yellowing, and darkening from age. Fix any flaking, cracking, or missing sections of paint. Restore sharp details and clean brush strokes. Show the painting as the artist intended, with original color palette. If fresco, show the vivid wet-plaster colors.` |
| **금속** | `weapon`, `jewelry`, `coin` | `Remove all corrosion, patina, rust, and verdigris. Show the original metallic surface — polished bronze should gleam warmly, gold should shine brilliantly, iron should show dark forged finish. Restore any missing decorative elements (engravings, inlays, gemstones). Show the original surface treatment and finish.` |
| **모자이크** | `mosaic` | `Complete the full mosaic pattern, filling in all missing tesserae. Show vivid original stone and glass colors — rich reds, blues, golds, whites, and blacks. Clean grout lines between tesserae. The overall composition should be complete and symmetrical where appropriate. Show the mosaic as freshly laid with bright, unworn surfaces.` |
| **건축물** | `building`, `monument`, `inscription` | (건축물 기본 템플릿 사용 -- 추가 지시사항 없음) |
| **기타** | `textile`, `mask`, `fossil` 등 | `Restore to pristine original condition with vivid colors and intact structure. Show fine details of craftsmanship and material texture. Remove all signs of age, wear, and deterioration.` |

#### 2.2.4 프롬프트 빌드 구현 코드

```typescript
const CATEGORY_PROMPTS: Record<string, string> = {
  pottery: 'Show intact vessel with no cracks or chips. Restore original painted decorations with vivid red-figure or black-figure technique. Show smooth, polished ceramic surface with original glaze. If handles are missing, reconstruct them in period-appropriate style. The clay should show its original warm terracotta color.',

  sculpture: 'Restore to complete figure with all limbs, head, and features intact. IMPORTANT: Ancient Greek and Roman marble statues were originally painted in vivid polychrome colors (red, blue, gold, flesh tones) — show the original polychrome painting. Restore smooth marble surface without weathering or staining. Show fine details of hair, drapery folds, and facial features.',

  painting: 'Restore colors to their original vibrancy and saturation — remove all fading, yellowing, and darkening from age. Fix any flaking, cracking, or missing sections of paint. Restore sharp details and clean brush strokes. Show the painting as the artist intended, with original color palette. If fresco, show the vivid wet-plaster colors.',

  weapon: 'Remove all corrosion, patina, rust, and verdigris. Show the original metallic surface — polished bronze should gleam warmly, gold should shine brilliantly, iron should show dark forged finish. Restore any missing decorative elements (engravings, inlays, gemstones). Show the original surface treatment and finish.',

  jewelry: 'Remove all corrosion, patina, rust, and verdigris. Show the original metallic surface — polished bronze should gleam warmly, gold should shine brilliantly, iron should show dark forged finish. Restore any missing decorative elements (engravings, inlays, gemstones). Show the original surface treatment and finish.',

  coin: 'Remove all corrosion, patina, rust, and verdigris. Show the original metallic surface — polished bronze should gleam warmly, gold should shine brilliantly, iron should show dark forged finish. Restore any missing decorative elements (engravings, inlays, gemstones). Show the original surface treatment and finish.',

  mosaic: 'Complete the full mosaic pattern, filling in all missing tesserae. Show vivid original stone and glass colors — rich reds, blues, golds, whites, and blacks. Clean grout lines between tesserae. The overall composition should be complete and symmetrical where appropriate. Show the mosaic as freshly laid with bright, unworn surfaces.',

  // 건축물 유형은 별도 기본 템플릿 사용
  building: '',
  monument: '',
  inscription: '',
};

// 기타 (textile, mask, fossil 등) 기본 폴백
const DEFAULT_CATEGORY_PROMPT = 'Restore to pristine original condition with vivid colors and intact structure. Show fine details of craftsmanship and material texture. Remove all signs of age, wear, and deterioration.';

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
    artifactName, era, artifactType,
    damageDescription, isArchitecture,
    siteName, currentDescription,
  } = params;

  // --- 건축물 ---
  if (isArchitecture) {
    return [
      `Create a photorealistic image of ${siteName || artifactName} as it appeared in ${era}, showing the complete original structure.`,
      '',
      currentDescription
        ? `Current state: ${currentDescription}`
        : '',
      '',
      'Requirements:',
      '- Architecturally accurate reconstruction based on historical records',
      '- Same viewing angle as the reference photo',
      '- Original paint, materials, and surface finishes',
      '- Period-appropriate surrounding environment (people, vegetation, sky)',
      '- Natural daylight with realistic shadows',
      '- Do NOT add any text, labels, or watermarks to the image',
      '- Grand scale showing the full majesty of the structure',
    ].filter(Boolean).join('\n');
  }

  // --- 유물 ---
  const categoryInstructions =
    (artifactType && CATEGORY_PROMPTS[artifactType] !== undefined)
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
  ].filter(Boolean).join('\n');
}
```

---

### 2.3 `src/app/api/restore/route.ts` -- 복원 REST API 엔드포인트

**역할**: Part 1이 생성한 501 스캐폴드를 실제 구현으로 교체. `POST /api/restore` 요청을 받아 Gemini 2.5 Flash Image로 복원 이미지를 생성하고 결과를 반환.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import type { RestorationRequest, RestorationResponse, RestorationErrorResponse } from '@/types/restoration';

export async function POST(request: NextRequest): Promise<NextResponse>;
```

#### 구현 상세

1. **요청 파싱 & 검증**:
   ```typescript
   const body: RestorationRequest = await request.json();

   // 필수 필드 검증
   if (!body.artifactName || !body.era) {
     return NextResponse.json(
       {
         success: false,
         error: 'artifactName and era are required',
         code: 'GENERATION_FAILED',
         retryable: false,
       } satisfies RestorationErrorResponse,
       { status: 400 }
     );
   }
   ```

2. **Gemini 클라이언트 획득**:
   ```typescript
   import { getGeminiClient } from '@/lib/gemini/client';
   const client = getGeminiClient();
   ```

3. **프롬프트 생성**:
   ```typescript
   import { buildRestorationPrompt, generateRestorationImage } from '@/lib/gemini/flash-image';

   const prompt = buildRestorationPrompt({
     artifactName: body.artifactName,
     era: body.era,
     artifactType: body.artifactType,
     damageDescription: body.damageDescription,
     isArchitecture: body.isArchitecture,
     siteName: body.siteName,
     currentDescription: body.currentDescription,
   });
   ```

4. **이미지 생성 호출**:
   ```typescript
   const startTime = Date.now();

   const result = await generateRestorationImage(client, {
     prompt,
     referenceImage: body.referenceImage
       ? { data: body.referenceImage, mimeType: 'image/jpeg' }
       : undefined,
     timeoutMs: 30000,
   });

   const generationTimeMs = Date.now() - startTime;
   ```

5. **성공 응답** (해커톤 스코프 -- base64 data URL 반환):
   ```typescript
   const imageUrl = `data:${result.mimeType};base64,${result.imageBase64}`;

   return NextResponse.json({
     success: true,
     imageUrl,
     description: result.description,
     era: body.era,
     generationTimeMs,
   } satisfies RestorationResponse);
   ```

6. **에러 핸들링** (catch 블록):
   ```typescript
   catch (error) {
     const message = error instanceof Error ? error.message : 'Unknown error';

     // 에러 유형 분류
     let code: RestorationErrorResponse['code'] = 'GENERATION_FAILED';
     let retryable = true;
     let status = 500;

     if (message.includes('TIMEOUT')) {
       code = 'TIMEOUT';
       retryable = true;
       status = 504;
     } else if (message.includes('SAFETY') || message.includes('blocked') || message.includes('filtered')) {
       code = 'CONTENT_FILTERED';
       retryable = false;
       status = 422;
     } else if (message.includes('429') || message.includes('RATE') || message.includes('quota')) {
       code = 'RATE_LIMITED';
       retryable = true;
       status = 429;
     }

     return NextResponse.json(
       {
         success: false,
         error: message,
         code,
         retryable,
       } satisfies RestorationErrorResponse,
       { status }
     );
   }
   ```

#### 요청/응답 타입 (shared-contract.md 섹션 C에서 정의)

**요청** -- `RestorationRequest`:
```typescript
{
  artifactName: string;          // "Athenian red-figure krater"
  era: string;                   // "460 BC"
  artifactType?: ArtifactCategory; // "pottery"
  damageDescription?: string;    // "cracks, faded paint, missing handle"
  referenceImage?: string;       // base64 JPEG (카메라 캡처)
  isArchitecture: boolean;       // 건축물 복원 여부
  siteName?: string;             // "Pantheon"
  currentDescription?: string;   // "exposed concrete, weathered walls"
}
```

**성공 응답** -- `RestorationResponse`:
```typescript
{
  success: true;
  imageUrl: string;              // data:image/png;base64,...
  description: string;           // "복원 설명 텍스트"
  era: string;                   // "460 BC"
  generationTimeMs: number;      // 12345
}
```

**에러 응답** -- `RestorationErrorResponse`:
```typescript
{
  success: false;
  error: string;
  code: 'GENERATION_FAILED' | 'TIMEOUT' | 'CONTENT_FILTERED' | 'RATE_LIMITED';
  retryable: boolean;
}
```

**의존성**:
- `next/server` (NextRequest, NextResponse)
- `@/lib/gemini/client` (getGeminiClient)
- `@/lib/gemini/flash-image` (buildRestorationPrompt, generateRestorationImage)
- `@/types/restoration` (RestorationRequest, RestorationResponse, RestorationErrorResponse)

---

### 2.4 `src/components/RestorationResult.tsx` -- 복원 결과 표시 컨테이너

**역할**: 복원 UI의 상태 머신을 관리하는 컨테이너 컴포넌트. 4가지 상태 (idle, loading, ready, error)에 따라 적절한 UI를 렌더링.

```typescript
'use client';

import type { RestorationUIState, RestorationResult as RestorationResultData } from '@/types/restoration';

export interface RestorationResultProps {
  state: RestorationUIState;
  onRetry?: () => void;
  onSave?: () => void;
  onShare?: () => void;
}

export function RestorationResult(props: RestorationResultProps): React.ReactElement | null;
```

#### 상태 머신

```
idle ──────► loading ──────► ready
               │                │
               │                └──► idle (패널 닫힘)
               │
               └──────► error ──► loading (재시도)
                          │
                          └──► idle (닫기)
```

#### 구현 상세

**1. idle 상태**: `return null` (아무것도 렌더링하지 않음)

**2. loading 상태**:
```
┌──────────────────────────────┐
│                              │
│    ┌──────────────────────┐  │
│    │                      │  │
│    │  ✦ ✦ ✦               │  │  ← 펄스 점 3개 (shimmer animation)
│    │                      │  │
│    │  {era}으로 복원 중...  │  │  ← 복원 시대 표시
│    │                      │  │
│    │  ████████░░░░ {n}%   │  │  ← 프로그레스 바 (시뮬레이션)
│    │                      │  │
│    └──────────────────────┘  │
│                              │
│  {artifactName}              │  ← 유물/건축물 이름
│                              │
└──────────────────────────────┘
```

로딩 프로그레스는 **시뮬레이션**: 실제 생성 진행률을 알 수 없으므로 시간 기반으로 가짜 프로그레스를 표시.

```typescript
// 로딩 프로그레스 시뮬레이션 로직
const [simulatedProgress, setSimulatedProgress] = useState(0);

useEffect(() => {
  if (state.status !== 'loading') return;

  // 0→80%: 빠르게 (0-5초)
  // 80→95%: 느리게 (5-15초)
  // 95%에서 멈춤 (실제 완료까지 대기)
  const interval = setInterval(() => {
    setSimulatedProgress((prev) => {
      if (prev < 80) return prev + 4;     // 20 ticks * 250ms = 5초
      if (prev < 95) return prev + 0.75;  // 20 ticks * 250ms = 5초 (추가)
      return prev;                         // 95에서 멈춤
    });
  }, 250);

  return () => {
    clearInterval(interval);
    setSimulatedProgress(0);
  };
}, [state.status]);
```

**로딩 애니메이션 CSS** (Tailwind + CSS keyframes):

```typescript
// shimmer 점 3개
<div className="flex gap-2 justify-center mb-4">
  <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '0ms' }} />
  <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '200ms' }} />
  <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" style={{ animationDelay: '400ms' }} />
</div>

// 프로그레스 바
<div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
  <div
    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300 ease-out"
    style={{ width: `${simulatedProgress}%` }}
  />
</div>
```

**3. ready 상태**: `BeforeAfterSlider` 컴포넌트를 렌더링

```typescript
if (state.status === 'ready') {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h3 className="text-lg font-bold text-white">{state.data.artifactName}</h3>
        <p className="text-sm text-gray-300">복원: {state.data.era}</p>
      </div>
      <BeforeAfterSlider
        beforeImage={state.data.referenceImageUrl || ''}
        afterImage={state.data.imageUrl}
        artifactName={state.data.artifactName}
        era={state.data.era}
        description={state.data.description}
        onSave={onSave ?? (() => {})}
        onShare={onShare ?? (() => {})}
      />
    </div>
  );
}
```

**4. error 상태**:
```
┌──────────────────────────────┐
│  ⚠ 복원 이미지 생성 실패      │
│  ─────────────────────────── │
│  {error message}             │
│  ─────────────────────────── │
│  [재시도]   (retryable일 때)  │
└──────────────────────────────┘
```

```typescript
if (state.status === 'error') {
  return (
    <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-6 text-center">
      <p className="text-red-400 font-semibold mb-2">복원 이미지 생성 실패</p>
      <p className="text-sm text-gray-400 mb-4">{state.error}</p>
      {state.retryable && onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
```

**의존성**:
- `react` (useState, useEffect)
- `@/types/restoration` (RestorationUIState, RestorationResult)
- `@/components/BeforeAfterSlider`

---

### 2.5 `src/components/BeforeAfterSlider.tsx` -- 인터랙티브 Before/After 슬라이더

**역할**: 원본 사진(Before)과 복원 이미지(After)를 좌우로 비교하는 터치 슬라이더. 모바일 퍼스트, 터치 드래그 지원, 부드러운 60fps 애니메이션.

```typescript
'use client';

import type { BeforeAfterSliderProps } from '@/types/components';

export function BeforeAfterSlider(props: BeforeAfterSliderProps): React.ReactElement;
```

#### Props (shared-contract.md 섹션 H)

```typescript
interface BeforeAfterSliderProps {
  beforeImage: string;     // 현재 상태 이미지 URL 또는 base64
  afterImage: string;      // 복원된 이미지 URL
  artifactName: string;
  era: string;
  description?: string;
  onSave: () => void;      // 다이어리에 저장
  onShare: () => void;     // 공유 링크 생성
}
```

#### 슬라이더 레이아웃 구조

```
┌────────────────────────────────────────────────┐
│ ┌──────────────────────────────────────────────┐│
│ │                                              ││
│ │   Before (현재 상태)   │  After (복원)       ││
│ │   ─────────────────   │  ───────────────    ││
│ │                       │                     ││
│ │   (원본 이미지가       │  (복원 이미지가     ││
│ │    clip-path로         │   전체 표시)        ││
│ │    잘려서 표시)         │                     ││
│ │                       │                     ││
│ │                    ┌──┤──┐                   ││
│ │                    │◄►│  │ ← 드래그 핸들     ││
│ │                    └──┤──┘   (세로선 + 원형) ││
│ │                       │                     ││
│ └──────────────────────────────────────────────┘│
│                                                 │
│  "선명한 붉은 인물을 주목하세요..."              │ ← description
│                                                 │
│  [저장]                 [공유]                  │ ← 액션 버튼
└────────────────────────────────────────────────┘
```

#### 구현 상세

**1. 핵심 상태**:

```typescript
const containerRef = useRef<HTMLDivElement>(null);
const [sliderPosition, setSliderPosition] = useState(50);  // 0-100 (%)
const [isDragging, setIsDragging] = useState(false);
const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
```

**2. 이미지 레이어 구조** (핵심 -- `clip-path` 방식):

```html
<div ref={containerRef} className="relative w-full aspect-square overflow-hidden rounded-xl">
  {/* Layer 1: After 이미지 (전체) -- 아래 레이어 */}
  <img
    src={afterImage}
    alt={`${artifactName} - 복원`}
    className="absolute inset-0 w-full h-full object-cover"
    draggable={false}
  />

  {/* Layer 2: Before 이미지 (clip으로 잘림) -- 위 레이어 */}
  <img
    src={beforeImage}
    alt={`${artifactName} - 현재`}
    className="absolute inset-0 w-full h-full object-cover"
    style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
    draggable={false}
  />

  {/* Layer 3: 슬라이더 라인 + 핸들 */}
  <div
    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
    style={{ left: `${sliderPosition}%` }}
  >
    {/* 핸들 원형 */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing">
      <span className="text-gray-800 text-sm font-bold select-none">◄►</span>
    </div>
  </div>

  {/* 라벨 */}
  <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded z-20">
    현재
  </div>
  <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded z-20">
    {era}
  </div>

  {/* 터치/마우스 이벤트 캡처 레이어 */}
  <div
    className="absolute inset-0 z-30 cursor-grab active:cursor-grabbing"
    onMouseDown={handleDragStart}
    onTouchStart={handleDragStart}
  />
</div>
```

**3. 터치/마우스 이벤트 핸들링** (60fps 성능):

```typescript
const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
  e.preventDefault();
  setIsDragging(true);
  if (containerRef.current) {
    setContainerRect(containerRef.current.getBoundingClientRect());
  }
}, []);

const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
  if (!isDragging || !containerRect) return;

  // 이벤트에서 X 좌표 추출
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;

  // 컨테이너 내 상대 위치 계산 (0-100%)
  const relativeX = clientX - containerRect.left;
  const percentage = Math.max(0, Math.min(100, (relativeX / containerRect.width) * 100));

  // requestAnimationFrame으로 60fps 보장
  requestAnimationFrame(() => {
    setSliderPosition(percentage);
  });
}, [isDragging, containerRect]);

const handleDragEnd = useCallback(() => {
  setIsDragging(false);
}, []);

// 글로벌 이벤트 리스너 등록/해제
useEffect(() => {
  if (isDragging) {
    window.addEventListener('mousemove', handleDragMove, { passive: false });
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
  }

  return () => {
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
    window.removeEventListener('touchmove', handleDragMove);
    window.removeEventListener('touchend', handleDragEnd);
  };
}, [isDragging, handleDragMove, handleDragEnd]);
```

**4. 입장 애니메이션** (처음 표시될 때):

```typescript
// 슬라이더가 처음 렌더링되면 50% → 80% → 50%로 "살짝 보여주기" 애니메이션
const [isInitialAnimation, setIsInitialAnimation] = useState(true);

useEffect(() => {
  if (!isInitialAnimation) return;

  const timeline = [
    { position: 30, delay: 0 },       // 시작: Before 쪽으로
    { position: 70, delay: 600 },      // After 쪽으로
    { position: 50, delay: 1200 },     // 중앙으로 돌아옴
  ];

  const timeouts: NodeJS.Timeout[] = [];
  for (const step of timeline) {
    timeouts.push(
      setTimeout(() => setSliderPosition(step.position), step.delay)
    );
  }
  timeouts.push(
    setTimeout(() => setIsInitialAnimation(false), 1500)
  );

  return () => timeouts.forEach(clearTimeout);
}, [isInitialAnimation]);
```

CSS transition은 입장 애니메이션 중에만 적용:

```typescript
// 슬라이더 라인의 style에 transition 조건부 추가
style={{
  left: `${sliderPosition}%`,
  transition: isInitialAnimation ? 'left 0.4s ease-in-out' : 'none',
}}
```

**5. 하단 설명 + 액션 버튼**:

```typescript
{/* 복원 설명 */}
{description && (
  <p className="text-sm text-gray-300 mt-3 px-1 line-clamp-3">
    {description}
  </p>
)}

{/* 액션 버튼 */}
<div className="flex gap-3 mt-4">
  <button
    onClick={onSave}
    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors"
  >
    <span>💾</span>
    <span>저장</span>
  </button>
  <button
    onClick={onShare}
    className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors"
  >
    <span>🔗</span>
    <span>공유</span>
  </button>
</div>
```

#### 성능 최적화

| 항목 | 기법 |
|---|---|
| 드래그 60fps | `requestAnimationFrame()` 내에서 `setSliderPosition` 호출 |
| 이벤트 리스너 | `{ passive: false }` 터치 이벤트 (스크롤 방지) |
| 이미지 렌더링 | `clip-path: inset()` -- GPU 가속, reflow 없음 |
| 리렌더 최소화 | `useCallback` 메모이제이션, `useRef` 컨테이너 |
| 이미지 로딩 | `<img>` 에 `draggable={false}` -- 브라우저 기본 드래그 방지 |
| 터치 정밀도 | 핸들 크기 40px (터치 타겟 최소 44px 가이드라인 근접) |

#### 접근성

- 키보드 지원: 핸들에 `tabIndex={0}`, 좌우 화살표 키로 위치 조절 (5% 단위)
- ARIA: `role="slider"`, `aria-valuemin={0}`, `aria-valuemax={100}`, `aria-valuenow={sliderPosition}`, `aria-label="Before/After 비교 슬라이더"`
- 이미지 alt 텍스트: 유물 이름 + 상태 (현재/복원)

```typescript
// 키보드 이벤트 핸들러
const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    setSliderPosition((prev) => Math.max(0, prev - 5));
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    setSliderPosition((prev) => Math.min(100, prev + 5));
  }
}, []);
```

**의존성**:
- `react` (useState, useEffect, useRef, useCallback)
- `@/types/components` (BeforeAfterSliderProps)

---

## 3. Part 1과의 연동 상세

### 3.1 Part 1이 호출하는 흐름

Part 1의 `handleToolCalls()`에서 `generate_restoration` 케이스가 `/api/restore`를 호출한다. Part 3은 이 엔드포인트의 실제 구현을 제공한다.

```
Part 1: Live API toolCall 이벤트 수신
  │
  ├─ onAgentSwitch('restoration')    ← UI에 에이전트 전환 알림
  ├─ audioState = 'generating'       ← 오디오 상태 변경
  │
  ├─ fetch('/api/restore', {         ← Part 3 엔드포인트 호출
  │    artifactName, era,
  │    artifactType, damageDescription,
  │    referenceImage?,              ← Part 1의 capturePhoto()로 획득
  │    isArchitecture,
  │    siteName?, currentDescription?
  │  })
  │
  ├─ (10-15초 대기 -- AI가 복원 배경 설명 음성 제공)
  │
  └─ 응답 수신
      ├─ success: true
      │   ├─ onToolResult({ type: 'restoration', imageUrl, description, ... })
      │   └─ sendToolResponse() → Live API에 결과 반환
      └─ success: false
          ├─ onToolResult 에러
          └─ sendToolResponse({ error: ... })
```

### 3.2 참조 이미지 (referenceImage)

Part 1의 `useLiveSession` 훅이 제공하는 `capturePhoto()` 함수로 현재 카메라 프레임을 캡처한다. Part 1이 `handleToolCalls()`에서 `generate_restoration`을 처리할 때 `capturePhoto()`를 호출하여 base64 JPEG를 얻고, 이를 `/api/restore`의 `referenceImage` 필드로 전달한다.

```typescript
// Part 1 코드 (참고용 -- Part 3이 구현하지 않음)
case 'generate_restoration': {
  // 현재 카메라 프레임 캡처
  const referenceImage = this.capturePhoto?.() || undefined;

  const response = await fetch('/api/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      artifactName: fc.args.artifact_name,
      era: fc.args.era,
      artifactType: fc.args.artifact_type,
      damageDescription: fc.args.damage_description,
      referenceImage,                    // base64 JPEG
      isArchitecture: fc.args.site_name ? true : false,
      siteName: fc.args.site_name,
      currentDescription: fc.args.current_description,
    }),
  });
  // ...
}
```

### 3.3 Part 2와의 연동 (UI 렌더링)

Part 2의 `KnowledgePanel`이 `children` prop으로 `RestorationResult` 컴포넌트를 렌더링한다. 패널은 복원 결과가 있을 때 `fullscreen` 상태로 전환된다.

```typescript
// Part 2 코드 (참고용 -- Part 3이 구현하지 않음)
<KnowledgePanel state={panelState} ...>
  {restorationState.status !== 'idle' && (
    <RestorationResult
      state={restorationState}
      onRetry={handleRetry}
      onSave={handleSaveToDiary}
      onShare={handleShare}
    />
  )}
</KnowledgePanel>
```

---

## 4. Gemini Image Generation API 상세 레퍼런스

### 4.1 SDK Import 패턴

```typescript
import { GoogleGenAI, Modality } from '@google/genai';
```

### 4.2 이미지 편집 호출 패턴 (참조 이미지 있음)

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash-image-preview',
  contents: [
    {
      role: 'user',
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64ImageString,     // base64 (data: prefix 없이)
          },
        },
      ],
    },
  ],
  config: {
    responseModalities: [Modality.TEXT, Modality.IMAGE],
  },
});
```

### 4.3 텍스트-투-이미지 호출 패턴 (참조 이미지 없음)

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash-image-preview',
  contents: promptString,
  config: {
    responseModalities: [Modality.TEXT, Modality.IMAGE],
  },
});
```

### 4.4 응답 파싱 패턴

```typescript
// 응답에서 이미지와 텍스트 추출
const parts = response.candidates?.[0]?.content?.parts;

if (!parts || parts.length === 0) {
  throw new Error('No parts in response');
}

// 이미지 파트 찾기
const imagePart = parts.find(
  (p) => p.inlineData?.mimeType?.startsWith('image/')
);

// 텍스트 파트 찾기
const textPart = parts.find((p) => p.text);

if (!imagePart?.inlineData?.data) {
  throw new Error('No image in response');
}

const imageBase64: string = imagePart.inlineData.data;
const mimeType: string = imagePart.inlineData.mimeType;  // 'image/png'
const description: string = textPart?.text || '';
```

### 4.5 제한사항 (구현 시 주의)

| 항목 | 값 |
|---|---|
| 기본 출력 해상도 | 1024 x 1024 px |
| 출력 형식 | PNG |
| 입력 이미지 형식 | PNG, JPEG, WebP, HEIC, HEIF |
| 입력 이미지 최대 크기 | 7 MB |
| 요청 최대 크기 | 20 MB (텍스트 + 이미지 합계) |
| Free tier RPM | 5 RPM |
| Paid tier RPM | 500 RPM |
| 인물 생성 제한 | 특정 인물, 미성년자, 인종/성별 지정 불가 |
| 워터마크 | SynthID 불가시 워터마크 (항상 포함, 제거 불가) |
| `responseModalities` | `[Modality.TEXT, Modality.IMAGE]` 필수 -- `IMAGE`만 단독 불가 |

---

## 5. Before/After 슬라이더 상세 인터랙션 스펙

### 5.1 터치 이벤트 흐름도

```
┌─────────────────────────────────────────────────────┐
│ 터치/마우스 이벤트 처리 흐름                           │
│                                                     │
│ touchstart/mousedown                                │
│   │                                                 │
│   ├─ isDragging = true                              │
│   ├─ containerRect 캐시                              │
│   └─ preventDefault() (스크롤 방지)                   │
│                                                     │
│ touchmove/mousemove (드래그 중)                       │
│   │                                                 │
│   ├─ clientX 추출 (touch: e.touches[0], mouse: e)    │
│   ├─ relativeX = clientX - containerRect.left        │
│   ├─ percentage = clamp(0, 100, relativeX / width)   │
│   └─ requestAnimationFrame(() => setPosition(pct))   │
│                                                     │
│ touchend/mouseup                                    │
│   │                                                 │
│   └─ isDragging = false                              │
│                                                     │
│ ArrowLeft key                                       │
│   └─ position = max(0, position - 5)                 │
│                                                     │
│ ArrowRight key                                      │
│   └─ position = min(100, position + 5)               │
└─────────────────────────────────────────────────────┘
```

### 5.2 입장 애니메이션 타임라인

```
시간(ms)  0     200    400    600    800    1000   1200   1400   1500
위치(%)   50 ─── 40 ─── 30 ── 30 ─── 50 ─── 70 ─── 70 ─── 50 ─── 50
                                                                  │
                                                          애니메이션 종료
                                                    isInitialAnimation=false
```

이 애니메이션의 목적: 사용자에게 "이 영역을 드래그하면 비교할 수 있다"는 어포던스를 시각적으로 알려줌.

### 5.3 성능 요구사항

| 항목 | 목표 |
|---|---|
| 드래그 프레임레이트 | 60fps |
| 이미지 전환 지연 | < 1 프레임 (16ms) |
| 터치 반응 시간 | < 50ms |
| GPU 가속 | `clip-path` 사용 (paint만 발생, layout/reflow 없음) |

---

## 6. 로딩 UX 상세

### 6.1 로딩 시간 분배

복원 이미지 생성은 약 10-15초 소요. 이 대기 시간을 매력적으로 만들기 위해:

| 시간 | 이벤트 | UI |
|---|---|---|
| 0초 | 에이전트 전환 | 에이전트 인디케이터: "Curator -> Restoration" |
| 0-1초 | 로딩 시작 | RestorationResult loading 상태 렌더링, 프로그레스 0% |
| 0-5초 | 빠른 프로그레스 | 0% -> 80% (사용자가 "빠르게 진행되고 있다" 느끼도록) |
| 5-15초 | 느린 프로그레스 | 80% -> 95% (조금 더 기다려야 함을 암시) |
| 10-15초 | 생성 완료 | 프로그레스 100% -> BeforeAfterSlider 크로스페이드 |

### 6.2 크로스페이드 전환 (loading -> ready)

```typescript
// loading → ready 전환 시 크로스페이드 (400ms)
const [isTransitioning, setIsTransitioning] = useState(false);

useEffect(() => {
  if (state.status === 'ready') {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 400);
    return () => clearTimeout(timer);
  }
}, [state.status]);

// 렌더링에서:
<div className={`transition-opacity duration-[400ms] ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
  {state.status === 'ready' && <BeforeAfterSlider ... />}
</div>
```

### 6.3 에이전트 음성 활용

Part 1의 시스템 프롬프트에 이미 지시가 포함되어 있음:
> "After calling generate_restoration, narrate what the restored version would have looked like while the image generates (fill the waiting time)."

즉, 이미지 생성 중에 AI가 복원 배경을 음성으로 설명한다. UI는 이 음성과 함께 로딩 프로그레스를 표시. Part 3은 이 음성을 직접 제어하지 않음 (Part 1/2 담당).

---

## 7. 에러 처리 종합

### 7.1 에러 시나리오 매트릭스

| 시나리오 | 감지 위치 | 에러 코드 | HTTP 상태 | retryable | 사용자 메시지 |
|---|---|---|---|---|---|
| API Key 누락 | `getGeminiClient()` | - | - | - | 서버 시작 실패 (fail-fast) |
| 필수 필드 누락 | `route.ts` 검증 | `GENERATION_FAILED` | 400 | false | "필수 정보가 누락되었습니다" |
| 이미지 생성 실패 | `generateRestorationImage()` | `GENERATION_FAILED` | 500 | true | "복원 이미지를 생성하지 못했습니다" |
| 30초 타임아웃 | `Promise.race` | `TIMEOUT` | 504 | true | "시간이 초과되었습니다. 다시 시도해주세요" |
| 안전 필터 차단 | Gemini 응답 | `CONTENT_FILTERED` | 422 | false | "안전 정책에 의해 차단되었습니다" |
| RPM 초과 | Gemini 429 | `RATE_LIMITED` | 429 | true | "잠시 후 다시 시도해주세요" |
| 참조 이미지 7MB 초과 | `route.ts` 검증 | `GENERATION_FAILED` | 400 | false | "이미지 크기가 초과되었습니다" |
| 응답에 이미지 없음 | 응답 파싱 | `GENERATION_FAILED` | 500 | true | "이미지를 생성하지 못했습니다" |

### 7.2 참조 이미지 크기 검증

```typescript
// /api/restore/route.ts에서 referenceImage 크기 검증
if (body.referenceImage) {
  // base64 문자열 길이 → 바이트 크기 변환 (4 base64 chars ≈ 3 bytes)
  const approximateBytes = (body.referenceImage.length * 3) / 4;
  const MAX_IMAGE_SIZE = 7 * 1024 * 1024; // 7MB

  if (approximateBytes > MAX_IMAGE_SIZE) {
    return NextResponse.json(
      {
        success: false,
        error: 'Reference image exceeds 7MB limit',
        code: 'GENERATION_FAILED' as const,
        retryable: false,
      },
      { status: 400 }
    );
  }
}
```

### 7.3 UI 에러 → 재시도 플로우

```
에러 발생
  │
  ├─ retryable: true
  │    └─ "다시 시도" 버튼 표시
  │         └─ 탭 → onRetry()
  │              └─ RestorationUIState → { status: 'loading', ... }
  │                   └─ 동일 파라미터로 /api/restore 재호출
  │
  └─ retryable: false
       └─ 에러 메시지만 표시, 재시도 버튼 없음
            └─ 사용자가 패널을 닫고 다시 요청해야 함
```

---

## 8. 이미지 저장 전략

### 8.1 해커톤 스코프 (현재 구현)

데모 기간 중에는 **base64 data URL**을 그대로 사용한다:

- `/api/restore`가 `data:image/png;base64,...` 형태의 URL을 반환
- 클라이언트가 이를 `<img src={...}>` 에 직접 렌더링
- Firestore `VisitDoc.restorationImageUrl`에도 data URL 저장

**장점**: Cloud Storage 설정 불필요, 빠른 구현
**단점**: Firestore 문서 크기 제한 (1MB -- base64 PNG 1024x1024 ≈ ~1.5MB이므로 초과 가능)

### 8.2 Firestore 크기 문제 해결

base64 PNG가 1MB를 초과할 수 있으므로, Firestore 저장 시 다음 전략 사용:

1. **JPEG 변환**: PNG를 JPEG quality 0.85로 재인코딩 (서버사이드)
   ```typescript
   // Sharp 라이브러리 사용 (옵션 -- 해커톤 스코프에서는 생략 가능)
   // const jpegBuffer = await sharp(pngBuffer).jpeg({ quality: 85 }).toBuffer();
   ```

2. **UI에는 원본 base64 사용**: 복원 이미지의 품질 유지
3. **Firestore에는 저장하지 않음**: 해커톤 스코프에서는 `restorationImageUrl`을 빈 문자열로 두거나, 다이어리 기능 구현 시 별도 처리

### 8.3 프로덕션 전략 (미래)

```
클라이언트 ← data URL (즉시 렌더링)
                     │
                     └─► Cloud Storage에 비동기 업로드
                         └─► Firestore에 Cloud Storage URL 저장
```

---

## 9. 통합 시나리오 검증

### 9.1 시나리오: 깨진 도자기 복원

```
1. 사용자: "복원해줘"
2. Part 1: Live API가 generate_restoration tool call 발생
   - artifact_name: "Athenian red-figure krater"
   - era: "460 BC"
   - artifact_type: "pottery"
   - damage_description: "cracks, faded paint, missing handle"
3. Part 1: capturePhoto() → base64 JPEG 획득
4. Part 1: onAgentSwitch({ from: 'curator', to: 'restoration' })
5. Part 1: POST /api/restore 호출
6. Part 3 (route.ts):
   a. 요청 검증 → OK
   b. buildRestorationPrompt → pottery 카테고리 프롬프트
   c. generateRestorationImage(client, { prompt, referenceImage }) 호출
   d. Gemini 2.5 Flash Image가 ~12초 후 이미지 반환
   e. 응답 파싱 → imageBase64 + description 추출
   f. RestorationResponse { success: true, imageUrl: 'data:image/png;base64,...', description, era, generationTimeMs: 12340 } 반환
7. Part 1: onToolResult({ type: 'restoration', imageUrl, description, artifactName, era })
8. Part 2: RestorationUIState → { status: 'ready', data: { ... } }
9. Part 3 (RestorationResult.tsx): BeforeAfterSlider 렌더링
10. Part 2: KnowledgePanel → fullscreen 전환
```

### 9.2 시나리오: 건축물 시간 복원

```
1. 사용자: "원래 모습 보여줘"
2. Part 1: Live API가 generate_restoration tool call 발생
   - artifact_name: "Pantheon"
   - era: "125 AD"
   - site_name: "Pantheon"
   - current_description: "Exposed concrete walls, missing marble cladding"
3. Part 1: POST /api/restore 호출 (isArchitecture: true)
4. Part 3 (route.ts):
   a. buildRestorationPrompt → 건축물 템플릿 사용
   b. generateRestorationImage → ~14초 후 이미지 반환
   c. 성공 응답
5. 이후 동일 흐름
```

### 9.3 시나리오: 이미지 생성 실패 → 재시도

```
1. Part 1: POST /api/restore 호출
2. Part 3 (route.ts): Gemini API 500 에러 발생
3. Part 3: { success: false, error: '...', code: 'GENERATION_FAILED', retryable: true } 반환
4. Part 1: onToolResult 에러 데이터 전달, sendToolResponse에 에러 포함
5. Part 2: RestorationUIState → { status: 'error', error: '...', retryable: true }
6. Part 3 (RestorationResult.tsx): 에러 UI + "다시 시도" 버튼 표시
7. 사용자: "다시 시도" 탭
8. Part 2: onRetry() → 동일 파라미터로 /api/restore 재호출
9. Part 3: 이번에 성공 → ready 상태로 전환
```

---

## 10. 체크리스트

### 구현 순서 (권장)

1. `src/lib/gemini/flash-image.ts` -- 핵심 이미지 생성 로직
2. `src/app/api/restore/route.ts` -- REST API (Part 1 스캐폴드 교체)
3. `src/components/BeforeAfterSlider.tsx` -- 슬라이더 UI
4. `src/components/RestorationResult.tsx` -- 컨테이너 (로딩/결과/에러)

### Part 3 체크리스트 (shared-contract.md 섹션 M 기반)

- [x] Contract 문서의 관련 타입을 모두 참조 (§C RestorationToolCall, RestorationRequest, RestorationResponse, §H BeforeAfterSliderProps)
- [x] 담당 파일 목록이 소유권 매트릭스와 일치 (§L)
- [x] 다른 파트에서 호출하는 함수/이벤트의 시그니처가 명확
- [x] 에러 핸들링 시나리오가 정의 (7개 시나리오)
- [x] Claude Code가 혼자 구현할 수 있을 만큼 상세

### Part 3 전용 체크리스트

- [x] Gemini 2.5 Flash Image Gen API 호출 코드 예시 (§4)
- [x] 복원 프롬프트 7종 상세 정의 (pottery, sculpture, painting, metal, mosaic, architecture, default) (§2.2)
- [x] Before/After 슬라이더 터치 이벤트 핸들링 상세 (§5)
- [x] 이미지 저장/캐싱 전략 (§8)
