# TimeLens Part 4: Discovery + Diary -- 상세 설계 문서

> **파트**: Part 4 (Discovery + Diary)
> **버전**: 1.0
> **최종 수정**: 2026-03-04
> **목적**: Claude Code가 이 문서만 읽고 Part 4의 모든 파일을 독립적으로 구현할 수 있는 수준의 상세 명세
> **참조 문서**: `docs/contracts/shared-contract.md`, `docs/contracts/gemini-sdk-reference.md`, `docs/prd/timelens-prd-ko.md`, `docs/prd/timelens-ui-flow.md`, `docs/design/part1-core-pipeline.md`
>
> **Source of Truth**: env var / model ID → `docs/reference/gemini-sdk-reference.md` · 타입 / 파일 소유권 → `docs/contracts/shared-contract.md` · 충돌 시 위 문서가 우선

---

## 0. 아키텍처 결정 요약 (확정)

| 결정 | 내용 |
|---|---|
| **Discovery 데이터 소스** | Google Places API (New) — REST POST to `places.googleapis.com/v1/places:searchNearby` |
| **Discovery 설명 보강** | Gemini 2.5 Flash + Google Search Grounding으로 각 장소에 문화유산 맥락 설명 추가 |
| **Diary 생성 모델** | `gemini-2.5-flash-image-preview` — `responseModalities: [TEXT, IMAGE]` 인터리브 출력 |
| **Diary 저장** | Firestore `diaries/{diaryId}` 컬렉션, 이미지는 base64 data URL 또는 Cloud Storage |
| **Geolocation** | Browser Geolocation API — watchPosition + 권한 핸들링 |
| **Photo URL** | Places API 2단계 — searchNearby에서 `photos[].name` 획득 → Photo Media API로 실제 URL 조회 |
| **Field Mask 전략** | 과금 최적화: 기본 Basic SKU 필드 + `places.photos` (Preferred SKU) 포함. rating/openingHours는 Advanced SKU |

```
┌─────────────────────────────────────────────────────────────────┐
│  Part 4 데이터 흐름                                              │
│                                                                  │
│  Discovery 흐름:                                                 │
│  Live API ──tool_call: discover_nearby──► 클라이언트              │
│  클라이언트 ──GET /api/discover?lat=&lng=&radius=──► 서버        │
│  서버 ──POST──► Places API (searchNearby)                        │
│       ──GET──► Places Photo Media API (사진 URL)                 │
│       ──POST──► Gemini 2.5 Flash (Search Grounding 설명 보강)    │
│  서버 ──DiscoveryResponse──► 클라이언트                          │
│  클라이언트 ──sendToolResponse──► Live API                        │
│  클라이언트 ──NearbySites 렌더링──► UI                            │
│                                                                  │
│  Diary 흐름:                                                     │
│  Live API ──tool_call: create_diary──► 클라이언트                 │
│  클라이언트 ──POST /api/diary/generate──► 서버                    │
│  서버 ──Firestore 조회──► 방문 기록 (VisitDoc[])                  │
│       ──POST──► Gemini 2.5 Flash Image (인터리브 텍스트+이미지)   │
│       ──파싱──► DiaryEntry[] (text/image 분리)                    │
│       ──Firestore 저장──► DiaryDoc                                │
│  서버 ──DiaryGenerateResponse──► 클라이언트                       │
│  클라이언트 ──sendToolResponse──► Live API                        │
│  클라이언트 ──DiaryViewer 렌더링──► UI                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. 파일 소유권 맵

```
src/
├── app/
│   ├── api/
│   │   ├── discover/route.ts           ← Part 1 스캐폴드를 실제 구현으로 교체
│   │   ├── diary/generate/route.ts     ← Part 1 스캐폴드를 실제 구현으로 교체
│   │   └── diary/[id]/route.ts         ← Part 1 스캐폴드를 실제 구현으로 교체
│   └── diary/[id]/page.tsx             ← 다이어리 공유 페이지 (SSR)
├── agents/
│   ├── discovery.ts                    ← Discovery Agent 시스템 프롬프트 + 도구
│   └── diary.ts                        ← Diary Agent 시스템 프롬프트 + 도구
├── lib/
│   └── geo/
│       └── places.ts                   ← Google Places API (New) 호출 래퍼
├── components/
│   ├── NearbySites.tsx                 ← 주변 유적지 카드 리스트
│   ├── NearbyCard.tsx                  ← 개별 유적지 카드
│   └── DiaryViewer.tsx                 ← 다이어리 뷰어 (인터리브 텍스트+이미지)
├── hooks/
│   └── use-geolocation.ts             ← GPS 좌표 접근 훅
└── types/
    ├── discovery.ts                    ← Part 5가 shared-contract에서 생성
    └── diary.ts                        ← Part 5가 shared-contract에서 생성
```

> **참고**: `src/types/discovery.ts`와 `src/types/diary.ts`는 Part 5가 `shared-contract.md` §D의 타입을 그대로 옮겨 생성. Part 4는 이 타입들을 import해서 사용.

---

## 2. 파일별 상세 설계

---

### 2.1 `src/lib/geo/places.ts` — Google Places API (New) 호출 래퍼

**역할**: 서버사이드에서 Google Places API (New)에 REST 호출을 수행하는 유틸리티. Nearby Search, Photo URL 조회, 거리/도보시간 계산을 포함.

#### 함수 시그니처

```typescript
// ============================================================
// 파일: src/lib/geo/places.ts
// 서버 전용 (API Route에서만 import)
// ============================================================

import type { NearbyPlace } from '@/types/discovery';

// --- 내부 타입 (Places API 응답 매핑) ---
interface PlacesApiPlace {
  id: string;
  displayName: { text: string; languageCode: string };
  formattedAddress: string;
  shortFormattedAddress: string;
  location: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  types: string[];
  primaryType?: string;
  primaryTypeDisplayName?: { text: string; languageCode: string };
  regularOpeningHours?: {
    openNow: boolean;
    weekdayDescriptions: string[];
  };
  photos?: Array<{
    name: string;
    widthPx: number;
    heightPx: number;
  }>;
  editorialSummary?: { text: string; languageCode: string };
  websiteUri?: string;
  googleMapsUri: string;
}

interface PlacesApiResponse {
  places?: PlacesApiPlace[];
}

// --- 상수 ---
const PLACES_BASE_URL = 'https://places.googleapis.com/v1';

const CULTURAL_PLACE_TYPES: string[] = [
  'museum',
  'art_gallery',
  'tourist_attraction',
  'cultural_landmark',
  'historical_place',
  'monument',
  'church',
  'hindu_temple',
  'mosque',
  'synagogue',
  'library',
  'performing_arts_theater',
];

// Preferred SKU — photos 포함 시 가장 비싼 과금
// 과금 최적화: 필요한 필드만 명시적으로 요청
const FIELD_MASK: string = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.shortFormattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.regularOpeningHours',
  'places.photos',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.editorialSummary',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.types',
].join(',');

// --- 공개 함수 ---

/**
 * 주변 문화유산/박물관 검색.
 * Places API (New) searchNearby → 사진 URL 조회 → NearbyPlace[] 변환.
 */
export async function searchNearbyPlaces(params: {
  lat: number;
  lng: number;
  radiusMeters: number;
  languageCode?: string;
  maxResults?: number;
  interestFilter?: string;
}): Promise<NearbyPlace[]>;

/**
 * 특정 장소의 사진 URL을 조회 (2단계 Photo Media API).
 * photoName → photoUri 반환.
 */
export async function getPlacePhotoUrl(
  photoName: string,
  maxWidthPx?: number,
  maxHeightPx?: number,
): Promise<string | null>;

/**
 * 두 좌표 간 직선 거리 계산 (Haversine 공식, 미터 단위).
 */
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number;

/**
 * 거리(미터)를 도보 시간(분)으로 환산.
 * 평균 보행 속도: 5km/h = 83.3m/min
 */
export function estimateWalkingTime(distanceMeters: number): number;
```

#### 구현 상세

##### searchNearbyPlaces()

```
1. params 유효성 검사
   - lat: -90 ~ 90
   - lng: -180 ~ 180
   - radiusMeters: 100 ~ 50000 (기본 2000)
   - maxResults: 1 ~ 20 (기본 10)
   - languageCode: 기본 'ko'

2. includedTypes 결정
   - interestFilter가 있으면 필터 키워드에 매칭되는 타입으로 축소
     예: "art" → ['art_gallery', 'museum']
         "ancient" / "historical" → ['historical_place', 'monument', 'museum']
         "religious" → ['church', 'hindu_temple', 'mosque', 'synagogue']
   - interestFilter가 없으면 CULTURAL_PLACE_TYPES 전체 사용

3. Places API searchNearby 호출
   ```typescript
   const response = await fetch(`${PLACES_BASE_URL}/places:searchNearby`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY!,
       'X-Goog-FieldMask': FIELD_MASK,
     },
     body: JSON.stringify({
       includedTypes: selectedTypes,
       maxResultCount: params.maxResults ?? 10,
       rankPreference: 'DISTANCE',
       languageCode: params.languageCode ?? 'ko',
       locationRestriction: {
         circle: {
           center: {
             latitude: params.lat,
             longitude: params.lng,
           },
           radius: params.radiusMeters,
         },
       },
     }),
   });
   ```

4. 응답 파싱
   - response.ok가 아니면 throw
   - data.places가 없으면 빈 배열 반환

5. 각 place에 대해 병렬 처리:
   a. 거리 계산: calculateDistance(params.lat, params.lng, place.location.latitude, place.location.longitude)
   b. 도보 시간 계산: estimateWalkingTime(distance)
   c. 사진 URL 조회: place.photos?.[0]?.name이 있으면 getPlacePhotoUrl(photoName, 400, 300)
   d. NearbyPlace로 매핑:
      {
        id: place.id,
        name: place.displayName.text,
        type: place.primaryTypeDisplayName?.text ?? place.primaryType ?? 'museum',
        era: undefined,  // Search Grounding으로 나중에 보강
        description: place.editorialSummary?.text ?? '',
        distance: Math.round(distance),
        walkingTime: walkingTime,
        rating: place.rating,
        isOpen: place.regularOpeningHours?.openNow,
        openingHours: place.regularOpeningHours?.weekdayDescriptions?.join(', '),
        photoUrl: photoUrl ?? undefined,
        location: {
          lat: place.location.latitude,
          lng: place.location.longitude,
        },
      }

6. 거리순 정렬 (DISTANCE로 요청했지만 확인용)
7. NearbyPlace[] 반환
```

##### getPlacePhotoUrl()

```
1. photoName 파라미터 유효성 검사 (비어있으면 null 반환)

2. Photo Media API 호출
   ```typescript
   const url = `${PLACES_BASE_URL}/${photoName}/media?` +
     `maxWidthPx=${maxWidthPx ?? 400}&` +
     `maxHeightPx=${maxHeightPx ?? 300}&` +
     `key=${process.env.GOOGLE_PLACES_API_KEY!}&` +
     `skipHttpRedirect=true`;

   const response = await fetch(url);
   ```

3. 응답 파싱
   - response.ok가 아니면 null 반환 (사진 실패는 치명적이지 않음)
   - JSON 파싱하여 photoUri 추출

4. photoData.photoUri 반환
```

> **보안 주의**: `GOOGLE_PLACES_API_KEY`는 서버 전용. 클라이언트에 절대 노출하지 않는다. 사진 URL은 Google CDN URL이므로 클라이언트에서 직접 로드 가능.

##### calculateDistance() — Haversine 공식

```typescript
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000; // 지구 반지름 (미터)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
```

##### estimateWalkingTime()

```typescript
export function estimateWalkingTime(distanceMeters: number): number {
  const WALKING_SPEED_MPS = 83.3; // meters per minute (5 km/h)
  return Math.max(1, Math.round(distanceMeters / WALKING_SPEED_MPS));
}
```

#### Places API 요청/응답 플로우 다이어그램

```
┌──────────────┐          ┌────────────────────────────────────┐
│  GET /api/   │          │  Google Places API (New)            │
│  discover    │          │  places.googleapis.com/v1           │
│              │          │                                    │
│  ?lat=37.56  │   POST   │  /places:searchNearby              │
│  &lng=126.97 │─────────►│  Headers:                          │
│  &radius=2   │          │    X-Goog-Api-Key: ***             │
│              │          │    X-Goog-FieldMask: places.id,... │
│              │          │  Body:                              │
│              │          │    includedTypes: [museum, ...]     │
│              │          │    locationRestriction: {circle}    │
│              │◄─────────│  Response: { places: [...] }        │
│              │          └────────────────────────────────────┘
│              │
│              │          ┌────────────────────────────────────┐
│              │   GET    │  Photo Media API                    │
│   (반복)     │─────────►│  /v1/{photoName}/media              │
│              │          │  ?maxWidthPx=400                    │
│              │◄─────────│  Response: { photoUri: "https://.."}│
│              │          └────────────────────────────────────┘
│              │
│              │          ┌────────────────────────────────────┐
│              │   POST   │  Gemini 2.5 Flash                   │
│   (1회)      │─────────►│  Search Grounding 설명 보강         │
│              │◄─────────│  각 장소에 대한 문화유산 맥락 설명    │
└──────────────┘          └────────────────────────────────────┘
```

#### Field Mask 과금 최적화 설명

```
요청 Field Mask에 포함된 필드와 과금 티어:

┌────────────────────────────┬─────────────────┬──────────────┐
│ 필드                        │ SKU 티어        │ 비용/요청     │
├────────────────────────────┼─────────────────┼──────────────┤
│ places.id                  │ IDs Only        │ ~$0.00       │
│ places.location            │ Location        │ ~$0.005      │
│ places.formattedAddress    │ Location        │              │
│ places.displayName         │ Basic           │ ~$0.017      │
│ places.types               │ Basic           │              │
│ places.primaryType         │ Basic           │              │
│ places.websiteUri          │ Basic           │              │
│ places.googleMapsUri       │ Basic           │              │
│ places.rating              │ Advanced        │ ~$0.025      │
│ places.regularOpeningHours │ Advanced        │              │
│ places.editorialSummary    │ Advanced        │              │
│ places.photos              │ Preferred       │ ~$0.035      │
├────────────────────────────┼─────────────────┼──────────────┤
│ 최종 과금                   │ Preferred 적용  │ ~$0.035/요청  │
└────────────────────────────┴─────────────────┴──────────────┘

주의: photos를 포함하면 Preferred SKU가 적용됨.
사진이 필요 없는 경우 FIELD_MASK에서 places.photos를 제거하여 Advanced 수준으로 절감 가능.
```

#### 에러 처리

| 에러 상황 | 처리 |
|---|---|
| `GOOGLE_PLACES_API_KEY` 환경변수 누락 | `throw new Error('GOOGLE_PLACES_API_KEY is not set')` — fail-fast |
| Places API HTTP 에러 (4xx/5xx) | 에러 메시지 로깅, 빈 배열 반환 (or throw) |
| 사진 URL 조회 실패 | `null` 반환 — 사진 없이 계속 진행 |
| 네트워크 타임아웃 | fetch에 AbortController 사용, 10초 타임아웃 |
| 잘못된 좌표 | 400 에러 throw |

#### 의존성

- `process.env.GOOGLE_PLACES_API_KEY` (서버 전용)
- `@/types/discovery` (`NearbyPlace`)

---

### 2.2 `src/hooks/use-geolocation.ts` — GPS 좌표 접근 훅

**역할**: 브라우저 Geolocation API를 React 훅으로 래핑. GPS 좌표 획득, 권한 처리, 에러 상태 관리.

#### 함수 시그니처

```typescript
// ============================================================
// 파일: src/hooks/use-geolocation.ts
// 클라이언트 전용 ('use client')
// ============================================================

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UseGeolocationReturn {
  location: { lat: number; lng: number } | null;
  isLoading: boolean;
  error: string | null;
  permissionState: PermissionState | null; // 'granted' | 'denied' | 'prompt'
  refresh: () => void;
}

export function useGeolocation(options?: {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
}): UseGeolocationReturn;
```

#### 구현 상세

```
1. 상태 초기화
   - location: null
   - isLoading: true (마운트 시 즉시 시도)
   - error: null
   - permissionState: null

2. useEffect (마운트 시)
   a. navigator.geolocation 지원 여부 확인
      - 미지원 → error: '이 브라우저는 위치 서비스를 지원하지 않습니다'
      - 지원 → 다음 단계

   b. 권한 상태 조회 (navigator.permissions.query)
      ```typescript
      try {
        const permStatus = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionState(permStatus.state);

        // 권한 변경 감지
        permStatus.onchange = () => {
          setPermissionState(permStatus.state);
          if (permStatus.state === 'granted') {
            fetchLocation();
          }
        };
      } catch {
        // permissions API 미지원 시 무시 (Safari 일부 버전)
      }
      ```

   c. 현재 위치 획득 시도 (fetchLocation)
      ```typescript
      function fetchLocation() {
        setIsLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            setIsLoading(false);
            setError(null);
          },
          (err) => {
            setIsLoading(false);
            switch (err.code) {
              case err.PERMISSION_DENIED:
                setError('위치 권한이 거부되었습니다. 설정에서 허용해주세요.');
                setPermissionState('denied');
                break;
              case err.POSITION_UNAVAILABLE:
                setError('위치 정보를 사용할 수 없습니다.');
                break;
              case err.TIMEOUT:
                setError('위치 정보 요청이 시간 초과되었습니다.');
                break;
              default:
                setError('알 수 없는 위치 오류가 발생했습니다.');
            }
          },
          {
            enableHighAccuracy: options?.enableHighAccuracy ?? true,
            maximumAge: options?.maximumAge ?? 60000,     // 1분 캐시
            timeout: options?.timeout ?? 10000,            // 10초 타임아웃
          },
        );
      }
      ```

3. refresh() 함수
   - fetchLocation() 재호출
   - 사용자가 수동으로 위치 새로고침할 때 사용

4. cleanup (useEffect 반환)
   - watchPosition 사용 시 clearWatch
   - (현재는 getCurrentPosition 사용이므로 cleanup 불필요)
```

#### 에러 처리

| 에러 상황 | error 메시지 |
|---|---|
| Geolocation API 미지원 | '이 브라우저는 위치 서비스를 지원하지 않습니다' |
| 권한 거부 (PERMISSION_DENIED) | '위치 권한이 거부되었습니다. 설정에서 허용해주세요.' |
| 위치 불가 (POSITION_UNAVAILABLE) | '위치 정보를 사용할 수 없습니다.' |
| 타임아웃 (TIMEOUT) | '위치 정보 요청이 시간 초과되었습니다.' |
| Permissions API 미지원 | 무시 (비치명적) |

#### 의존성

- React (`useState`, `useEffect`, `useCallback`)
- Browser Geolocation API
- Browser Permissions API (optional)

---

### 2.3 `src/app/api/discover/route.ts` — Discovery REST API

**역할**: Part 1 스캐폴드(`501 Not Implemented`)를 교체하여 실제 Discovery 기능 구현. GPS 좌표를 받아 Places API로 주변 문화유산 검색 → Search Grounding으로 설명 보강 → `DiscoveryResponse` 반환.

#### 함수 시그니처

```typescript
// ============================================================
// 파일: src/app/api/discover/route.ts
// Part 1 스캐폴드를 교체
// ============================================================

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest): Promise<Response>;
```

#### 구현 상세

```
1. 쿼리 파라미터 추출
   ```typescript
   const { searchParams } = new URL(request.url);
   const lat = parseFloat(searchParams.get('lat') ?? '');
   const lng = parseFloat(searchParams.get('lng') ?? '');
   const radius = parseFloat(searchParams.get('radius') ?? '2'); // km, 기본 2
   const type = searchParams.get('type') ?? undefined;           // interest filter
   ```

2. 파라미터 유효성 검사
   - lat: NaN 체크, -90 ~ 90 범위
   - lng: NaN 체크, -180 ~ 180 범위
   - radius: 0.1 ~ 50 (km)
   - 유효하지 않으면 400 에러

3. Places API 호출
   ```typescript
   const radiusMeters = Math.min(radius * 1000, 50000);
   const sites = await searchNearbyPlaces({
     lat,
     lng,
     radiusMeters,
     languageCode: 'ko',
     maxResults: 10,
     interestFilter: type,
   });
   ```

4. Search Grounding으로 설명 보강 (선택적 — 장소가 있을 때만)
   - 설명이 비어있는 장소들에 대해 Gemini로 문화유산 맥락 설명 생성
   - 배치로 한 번에 처리하여 API 호출 최소화

   ```typescript
   if (sites.length > 0) {
     const enriched = await enrichWithSearchGrounding(sites);
     // enriched 결과를 sites에 머지
   }
   ```

5. 응답 반환
   ```typescript
   return Response.json({
     success: true,
     sites,
     searchRadius: radius,
   } satisfies DiscoveryResponse);
   ```
```

##### enrichWithSearchGrounding() 내부 함수

```typescript
/**
 * editorialSummary가 비어있는 장소들에 대해
 * Gemini 2.5 Flash + Google Search Grounding으로 설명을 보강.
 *
 * 모든 장소를 하나의 프롬프트로 처리하여 API 호출 1회로 제한.
 */
async function enrichWithSearchGrounding(
  sites: NearbyPlace[],
): Promise<NearbyPlace[]> {
  const ai = getGeminiClient();

  // 설명이 없는 장소 목록 생성
  const needsEnrichment = sites.filter(s => !s.description || s.description.length < 20);
  if (needsEnrichment.length === 0) return sites;

  const placeList = needsEnrichment.map((s, i) =>
    `${i + 1}. ${s.name} (${s.type})`
  ).join('\n');

  const prompt = `다음 장소들에 대해 각각 1-2문장으로 문화적/역사적 의미를 설명해주세요.
JSON 배열로 응답하세요: [{"index": 1, "description": "설명"}, ...]

${placeList}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    // JSON 파싱하여 각 장소에 description 머지
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const descriptions = JSON.parse(jsonMatch[0]) as Array<{
        index: number;
        description: string;
      }>;
      for (const desc of descriptions) {
        const idx = desc.index - 1;
        if (idx >= 0 && idx < needsEnrichment.length) {
          needsEnrichment[idx].description = desc.description;
        }
      }
    }
  } catch (err) {
    // Search Grounding 실패는 치명적이지 않음 — 원본 유지
    console.warn('[Discovery] Search Grounding enrichment failed:', err);
  }

  return sites;
}
```

> **주의**: Search Grounding 실패 시 원본 editorialSummary를 그대로 유지. 보강은 best-effort.

#### 에러 처리

| 에러 상황 | HTTP 상태 | 응답 |
|---|---|---|
| 좌표 누락/유효하지 않음 | 400 | `{ success: false, error: { code: 'INVALID_PARAMS', message: 'Invalid coordinates', retryable: false } }` |
| `GOOGLE_PLACES_API_KEY` 누락 | 500 | `{ success: false, error: { code: 'CONFIG_ERROR', message: 'Places API key not configured', retryable: false } }` |
| Places API 호출 실패 | 502 | `{ success: false, error: { code: 'PLACES_API_ERROR', message: '...', retryable: true } }` |
| 내부 오류 | 500 | `{ success: false, error: { code: 'INTERNAL_ERROR', message: '...', retryable: true } }` |

#### 의존성

- `@/lib/geo/places` (`searchNearbyPlaces`)
- `@/lib/gemini/client` (`getGeminiClient`) — Search Grounding 보강용
- `@/types/discovery` (`DiscoveryResponse`, `NearbyPlace`)
- `@/types/api` (`ApiErrorResponse`)

---

### 2.4 `src/app/api/diary/generate/route.ts` — Diary 생성 REST API

**역할**: Part 1 스캐폴드를 교체하여 실제 Diary 생성 구현. 세션의 방문 기록(VisitDoc[])을 조회 → Gemini 2.5 Flash Image로 인터리브 텍스트+이미지 생성 → DiaryDoc 저장 → 응답.

#### 함수 시그니처

```typescript
// ============================================================
// 파일: src/app/api/diary/generate/route.ts
// Part 1 스캐폴드를 교체
// ============================================================

import { NextRequest } from 'next/server';

export async function POST(request: NextRequest): Promise<Response>;
```

#### 구현 상세

```
1. 요청 바디 파싱
   ```typescript
   const body = await request.json() as DiaryGenerateRequest;
   const { sessionId } = body;
   ```

2. 유효성 검사
   - sessionId 누락 → 400

3. Firestore에서 방문 기록 조회
   ```typescript
   const visitsRef = collection(db, 'sessions', sessionId, 'visits');
   const visitsSnap = await getDocs(query(visitsRef, orderBy('recognizedAt', 'asc')));
   const visits: VisitDoc[] = visitsSnap.docs.map(doc => ({
     id: doc.id,
     ...doc.data(),
   })) as VisitDoc[];
   ```

4. 방문 기록이 없으면 에러 반환
   - visits.length === 0 → 400 'No visits found for this session'

5. Diary 생성 프롬프트 구성
   ```typescript
   const visitSummaries = visits.map((v, i) =>
     `${i + 1}. ${v.itemName} (${v.metadata.era ?? '시대 미상'}, ${v.metadata.civilization ?? '문명 미상'})
        설명: ${v.conversationSummary}
        ${v.restorationImageUrl ? '복원 이미지 있음' : ''}`
   ).join('\n\n');

   const prompt = `당신은 박물관 방문 다이어리 작가입니다.
아래 방문 기록을 바탕으로 아름다운 박물관 방문 다이어리를 작성해주세요.

## 방문 기록
${visitSummaries}

## 작성 규칙
- 서정적이면서도 교육적인 문체로 작성
- 각 유물에 대해 2-3문장의 감상 + 역사적 맥락 기술
- 유물 사이의 자연스러운 전환 문장 포함
- 각 유물에 대해 수채화 스타일의 삽화를 생성
- 다이어리 제목을 첫 줄에 포함
- 마크다운 형식으로 텍스트를 작성`;
   ```

6. Gemini 2.5 Flash Image 호출 (인터리브 출력)
   ```typescript
   const ai = getGeminiClient();
   const response = await ai.models.generateContent({
     model: 'gemini-2.5-flash-image-preview',
     contents: prompt,
     config: {
       responseModalities: [Modality.TEXT, Modality.IMAGE],
     },
   });
   ```

7. 인터리브 응답 파싱 → DiaryEntry[] 변환
   ```typescript
   const entries = parseInterleavedResponse(response);
   ```

8. 제목 추출
   - 첫 번째 텍스트 entry에서 제목 추출 (첫 줄 또는 # 이후)

9. DiaryDoc 구성 + Firestore 저장
   ```typescript
   const diaryId = crypto.randomUUID();
   const shareToken = generateShareToken(); // 공유용 짧은 토큰

   const diaryDoc: DiaryDoc = {
     id: diaryId,
     sessionId,
     userId: '', // TODO: Firebase Auth에서 추출
     title,
     entries,
     createdAt: Timestamp.now(),
     shareToken,
   };

   await setDoc(doc(db, 'diaries', diaryId), diaryDoc);
   ```

10. 응답 반환
    ```typescript
    const diaryData: DiaryData = {
      id: diaryId,
      title,
      entries,
      createdAt: Date.now(),
      shareToken,
    };

    return Response.json({
      success: true,
      diaryId,
      diary: diaryData,
    } satisfies DiaryGenerateResponse);
    ```
```

#### Diary 생성 파이프라인 다이어그램

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────────────┐
│ POST /api/   │     │  Firestore        │     │  Gemini 2.5 Flash Image  │
│ diary/       │     │  sessions/{id}/   │     │  (인터리브 출력)          │
│ generate     │     │  visits           │     │                          │
│              │     │                   │     │                          │
│  sessionId   │────►│  query            │     │                          │
│              │◄────│  VisitDoc[]       │     │                          │
│              │     └───────────────────┘     │                          │
│              │                               │                          │
│  프롬프트    │──────────────────────────────►│  generateContent()       │
│  구성        │                               │  responseModalities:     │
│              │                               │    [TEXT, IMAGE]         │
│              │◄──────────────────────────────│  parts: [               │
│              │                               │    {text: "..."},       │
│              │                               │    {inlineData: {...}}, │
│              │                               │    {text: "..."},       │
│              │     ┌───────────────────┐     │    {inlineData: {...}}, │
│              │     │  Firestore        │     │    ...                  │
│  DiaryDoc    │────►│  diaries/{id}     │     │  ]                      │
│  저장        │     │                   │     │                          │
│              │     └───────────────────┘     └──────────────────────────┘
│              │
│  response    │
│  DiaryData   │
└──────────────┘
```

#### 인터리브 출력 파싱 로직 (parseInterleavedResponse)

```typescript
/**
 * Gemini 인터리브 응답을 DiaryEntry[] 로 변환.
 *
 * 응답 구조:
 * response.candidates[0].content.parts = [
 *   { text: "다이어리 제목\n\n첫 번째 유물 감상..." },
 *   { inlineData: { mimeType: 'image/png', data: 'base64...' } },
 *   { text: "두 번째 유물로 이동하면서..." },
 *   { inlineData: { mimeType: 'image/png', data: 'base64...' } },
 *   ...
 * ]
 *
 * 파싱 규칙:
 * 1. parts 배열을 순회
 * 2. part.text → DiaryEntry { type: 'text', content: text, order: n }
 * 3. part.inlineData → base64를 data URL로 변환 → DiaryEntry { type: 'image', content: dataUrl, order: n }
 * 4. 텍스트 파트에서 유물명 추출 시도 → siteName 매핑
 */
function parseInterleavedResponse(response: any): DiaryEntry[] {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  const entries: DiaryEntry[] = [];
  let order = 0;

  for (const part of parts) {
    if (part.text) {
      entries.push({
        type: 'text',
        content: part.text.trim(),
        order: order++,
      });
    }

    if (part.inlineData) {
      const mimeType = part.inlineData.mimeType ?? 'image/png';
      const base64 = part.inlineData.data;
      // data URL 형식으로 변환 (클라이언트에서 <img src>로 직접 사용 가능)
      const dataUrl = `data:${mimeType};base64,${base64}`;

      entries.push({
        type: 'image',
        content: dataUrl,
        order: order++,
      });
    }
  }

  return entries;
}
```

> **이미지 저장 전략**: MVP에서는 base64 data URL을 DiaryEntry.content에 직접 저장. Firestore 문서 크기 제한(1MB)을 초과할 수 있으므로, 프로덕션에서는 Cloud Storage에 업로드 후 URL로 교체 필요. 해커톤 데모에서는 data URL 방식으로 충분.

#### shareToken 생성

```typescript
function generateShareToken(): string {
  // 8자리 영숫자 랜덤 토큰
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  for (let i = 0; i < 8; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}
```

#### 에러 처리

| 에러 상황 | HTTP 상태 | 응답 |
|---|---|---|
| sessionId 누락 | 400 | `{ success: false, error: { code: 'MISSING_SESSION_ID', ... } }` |
| 방문 기록 없음 | 400 | `{ success: false, error: { code: 'NO_VISITS', message: 'No visits found for this session', ... } }` |
| Gemini API 실패 | 502 | `{ success: false, error: { code: 'GENERATION_FAILED', ... } }` |
| 인터리브 응답 파싱 실패 | 500 | `{ success: false, error: { code: 'PARSE_ERROR', ... } }` |
| Firestore 저장 실패 | 500 | `{ success: false, error: { code: 'STORAGE_ERROR', ... } }` |
| 요청 바디 파싱 실패 | 400 | `{ success: false, error: { code: 'INVALID_BODY', ... } }` |

#### 의존성

- `@google/genai` (`Modality`)
- `@/lib/gemini/client` (`getGeminiClient`)
- `@/lib/firebase/firestore` (Firestore 클라이언트)
- `@/types/diary` (`DiaryGenerateRequest`, `DiaryGenerateResponse`, `DiaryData`, `DiaryEntry`)
- `@/types/models` (`VisitDoc`, `DiaryDoc`)

---

### 2.5 `src/app/api/diary/[id]/route.ts` — Diary 조회 REST API

**역할**: Diary ID 또는 shareToken으로 저장된 다이어리를 조회.

#### 함수 시그니처

```typescript
// ============================================================
// 파일: src/app/api/diary/[id]/route.ts
// ============================================================

import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response>;
```

#### 구현 상세

```
1. params에서 diary ID 추출
   ```typescript
   const { id } = params;
   ```

2. shareToken 쿼리 파라미터 확인
   ```typescript
   const shareToken = new URL(request.url).searchParams.get('token');
   ```

3. Firestore에서 DiaryDoc 조회
   ```typescript
   const diaryRef = doc(db, 'diaries', id);
   const diarySnap = await getDoc(diaryRef);

   if (!diarySnap.exists()) {
     return Response.json({
       success: false,
       error: { code: 'NOT_FOUND', message: 'Diary not found', retryable: false },
     }, { status: 404 });
   }
   ```

4. 접근 권한 확인
   - shareToken이 일치하면 공개 접근 허용
   - 또는 userId가 요청자와 일치하면 허용
   - (해커톤 MVP: shareToken 매칭 또는 모두 허용)

   ```typescript
   const diary = diarySnap.data() as DiaryDoc;

   // shareToken 검증 (있으면)
   if (shareToken && diary.shareToken !== shareToken) {
     return Response.json({
       success: false,
       error: { code: 'UNAUTHORIZED', message: 'Invalid share token', retryable: false },
     }, { status: 403 });
   }
   ```

5. DiaryData 구성 후 응답
   ```typescript
   const diaryData: DiaryData = {
     id: diary.id,
     title: diary.title,
     entries: diary.entries,
     createdAt: diary.createdAt.toMillis(),
     shareToken: diary.shareToken,
   };

   return Response.json({ success: true, data: diaryData });
   ```
```

#### 에러 처리

| 에러 상황 | HTTP 상태 | 응답 |
|---|---|---|
| Diary ID 누락 | 400 | `INVALID_ID` |
| Diary 없음 | 404 | `NOT_FOUND` |
| shareToken 불일치 | 403 | `UNAUTHORIZED` |
| Firestore 조회 실패 | 500 | `INTERNAL_ERROR` |

#### 의존성

- `@/lib/firebase/firestore`
- `@/types/diary` (`DiaryData`)
- `@/types/models` (`DiaryDoc`)

---

### 2.6 `src/app/diary/[id]/page.tsx` — 다이어리 공유 페이지

**역할**: 공유 링크(`/diary/{id}?token=xxx`)로 접근 시 SSR로 다이어리를 렌더링하는 페이지.

#### 함수 시그니처

```typescript
// ============================================================
// 파일: src/app/diary/[id]/page.tsx
// 서버 컴포넌트 (Next.js App Router)
// ============================================================

interface DiaryPageProps {
  params: { id: string };
  searchParams: { token?: string };
}

export default async function DiaryPage({ params, searchParams }: DiaryPageProps): Promise<JSX.Element>;

// 메타데이터 생성 (OG 태그 등)
export async function generateMetadata({ params }: DiaryPageProps): Promise<Metadata>;
```

#### 구현 상세

```
1. 서버사이드에서 diary 조회
   ```typescript
   const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/diary/${params.id}?token=${searchParams.token ?? ''}`, {
     cache: 'no-store',
   });
   const data = await res.json();
   ```

2. 조회 실패 시 에러 페이지
   - notFound() 호출 (Next.js 404)

3. DiaryViewer 컴포넌트로 렌더링
   ```tsx
   return (
     <div className="min-h-screen bg-stone-50">
       <DiaryViewer
         diary={data.data}
         onShare={async () => ''}  // 공유 페이지에서는 이미 공유 중
         onClose={() => {}}         // 공유 페이지에서는 닫기 불필요
       />
     </div>
   );
   ```

4. OG 메타데이터 설정 (SNS 공유용)
   ```typescript
   export async function generateMetadata({ params }: DiaryPageProps): Promise<Metadata> {
     // diary 제목 조회
     return {
       title: `TimeLens Diary — ${title}`,
       description: '박물관 방문 다이어리 by TimeLens',
       openGraph: {
         title: `TimeLens Diary — ${title}`,
         description: 'AI가 생성한 박물관 방문 다이어리',
         type: 'article',
       },
     };
   }
   ```
```

#### 의존성

- `@/components/DiaryViewer`
- Next.js App Router (서버 컴포넌트, `Metadata`)

---

### 2.7 `src/agents/discovery.ts` — Discovery Agent 정의

**역할**: Discovery Agent의 시스템 프롬프트와 도구 정의. ADK `LlmAgent`로 구성 가능하나, 현재 아키텍처에서는 Live API의 Function Calling으로 오케스트레이션하므로, 이 파일은 REST API 엔드포인트에서 Search Grounding에 사용할 프롬프트/설정을 정의.

#### 함수 시그니처

```typescript
// ============================================================
// 파일: src/agents/discovery.ts
// ============================================================

/**
 * Discovery Agent의 시스템 프롬프트.
 * Search Grounding으로 장소 설명을 보강할 때 사용.
 */
export const DISCOVERY_SYSTEM_PROMPT: string;

/**
 * 장소 목록에 대한 문화유산 맥락 보강 프롬프트를 생성.
 */
export function getEnrichmentPrompt(placeNames: string[]): string;

/**
 * 현재 ADK REST Agent로 구현. Search Grounding으로 장소 설명을 보강.
 */
export function createDiscoveryAgent(): LlmAgent;
```

#### 구현 상세

```typescript
export const DISCOVERY_SYSTEM_PROMPT = `You are TimeLens Discovery Agent, an expert cultural heritage navigator.

## Core Behaviors
1. NEARBY SEARCH: When given GPS coordinates, search for nearby museums, historical sites,
   monuments, and cultural landmarks using Google Places API.
2. ENRICHMENT: For each discovered place, provide:
   - Brief cultural/historical significance (1-2 sentences)
   - Notable collections or features
   - Practical info (distance, walking time, opening hours)
3. GROUNDING: Base all descriptions on verified search results.
4. PERSONALIZATION: If the user has expressed interest in specific eras or cultures,
   prioritize relevant sites.

## Response Style
- Concise but informative
- Practical (distance, walking time, opening status)
- Enthusiastic about cultural discoveries
- Respond in the user's language`;

export function getEnrichmentPrompt(placeNames: string[]): string {
  const list = placeNames.map((name, i) => `${i + 1}. ${name}`).join('\n');
  return `다음 장소들에 대해 각각 1-2문장으로 문화적/역사적 의미를 설명해주세요.
각 장소의 주요 볼거리나 소장품도 언급해주세요.
JSON 배열로 응답하세요: [{"index": 1, "description": "설명", "era": "시대 (알 수 있다면)"}]

${list}`;
}
```

#### 의존성

- 없음 (순수 문자열/함수 정의)
- 현재 ADK REST Agent: `@google/adk` (`LlmAgent`, `GOOGLE_SEARCH`)

---

### 2.8 `src/agents/diary.ts` — Diary Agent 정의

**역할**: Diary Agent의 시스템 프롬프트 및 인터리브 다이어리 생성 프롬프트 템플릿 정의.

#### 함수 시그니처

```typescript
// ============================================================
// 파일: src/agents/diary.ts
// ============================================================

import type { VisitDoc } from '@/types/models';

/**
 * Diary Agent의 시스템 프롬프트.
 */
export const DIARY_SYSTEM_PROMPT: string;

/**
 * 방문 기록을 기반으로 다이어리 생성 프롬프트를 구성.
 */
export function getDiaryGenerationPrompt(visits: VisitDoc[]): string;

/**
 * 현재 ADK REST Agent로 구현. Interleaved Output으로 다이어리 생성.
 */
export function createDiaryAgent(): LlmAgent;
```

#### 구현 상세

```typescript
export const DIARY_SYSTEM_PROMPT = `You are TimeLens Diary Agent, a gifted museum visit journal writer.

## Core Behaviors
1. NARRATIVE: Transform dry visit records into an engaging, personal travel diary.
2. INTERLEAVED OUTPUT: Alternate between descriptive text and watercolor-style illustrations.
3. FLOW: Create natural transitions between different artifacts/sites visited.
4. ILLUSTRATION STYLE: Generate warm, artistic watercolor/sketch illustrations for each artifact.
   NOT photorealistic — think travel journal sketches.
5. EMOTIONAL: Capture the wonder and discovery of the museum experience.

## Diary Structure
- Title (evocative, poetic)
- Opening paragraph (setting the scene — museum, weather, mood)
- For each visited artifact:
  - Transition sentence
  - 2-3 sentences of personal reflection + historical insight
  - One illustration (watercolor style)
- Closing paragraph (reflection on the visit)

## Language
- Write in Korean by default
- Lyrical yet educational tone
- First person perspective ("나는...", "눈앞에...")`;

export function getDiaryGenerationPrompt(visits: VisitDoc[]): string {
  const visitSummaries = visits.map((v, i) => {
    const meta = v.metadata;
    return `### 유물 ${i + 1}: ${v.itemName}
- 시대: ${meta.era ?? '미상'}
- 문명: ${meta.civilization ?? '미상'}
- 카테고리: ${meta.category ?? '미상'}
- 대화 요약: ${v.conversationSummary}
- 복원 이미지: ${v.restorationImageUrl ? '있음' : '없음'}
- 장소: ${v.venueName ?? '미상'}`;
  }).join('\n\n');

  return `${DIARY_SYSTEM_PROMPT}

## 오늘의 방문 기록
${visitSummaries}

## 작성 지침
1. 제목을 첫 줄에 작성해주세요 (예: "대영박물관에서의 아침")
2. 각 유물에 대해 감상문 + 수채화 스타일 삽화를 생성해주세요
3. 유물 간 자연스러운 전환 문장을 포함해주세요
4. 마지막에 방문 전체를 되돌아보는 마무리 문단을 작성해주세요
5. 전체 ${visits.length}개의 유물에 대해 각각 삽화를 포함해주세요

지금 다이어리를 작성해주세요:`;
}
```

#### 의존성

- `@/types/models` (`VisitDoc`)
- 현재 ADK REST Agent: `@google/adk` (`LlmAgent`)

---

### 2.9 `src/components/NearbyCard.tsx` — 개별 유적지 카드

**역할**: 주변 발견 결과의 개별 장소를 카드 형태로 렌더링. 사진, 이름, 타입, 거리, 도보 시간, 평점, 운영 상태를 표시.

#### 함수 시그니처

```typescript
// ============================================================
// 파일: src/components/NearbyCard.tsx
// 클라이언트 컴포넌트
// ============================================================

'use client';

import type { NearbyPlace } from '@/types/discovery';

export interface NearbyCardProps {
  site: NearbyPlace;
  onSelect: (site: NearbyPlace) => void;
  onOpenMaps: (site: NearbyPlace) => void;
}

export default function NearbyCard({ site, onSelect, onOpenMaps }: NearbyCardProps): JSX.Element;
```

#### 구현 상세

```
카드 레이아웃 (UI Flow 문서 §3.6 참조):

┌────────────────────────────────────────────────┐
│ ┌──────────┐                                   │
│ │          │  박물관/유적지 이름                 │
│ │  사진    │  시대 · 타입                       │
│ │  (80x80) │  📏 800m · 🚶 10분                │
│ │          │  ⭐ 4.8 · 현재 개방 중              │
│ └──────────┘                                   │
│                                                │
│  간략 설명 (2줄 말줄임)                          │
│                                                │
│  [🗺️ 지도]                    [자세히 →]       │
└────────────────────────────────────────────────┘

구현 단계:

1. 카드 컨테이너
   - rounded-xl border shadow-sm
   - 호버: shadow-md 트랜지션
   - 탭/클릭 → onSelect(site) 호출

2. 상단 영역 (flex row)
   a. 왼쪽: 사진 (80x80, rounded-lg, object-cover)
      - site.photoUrl이 있으면 <img> 렌더링
      - 없으면 카테고리별 플레이스홀더 아이콘 (🏛️)
      - 이미지 로드 실패 시 onError → 플레이스홀더로 폴백

   b. 오른쪽: 정보
      - 이름: text-base font-semibold, 1줄 말줄임
      - 시대 · 타입: text-sm text-muted-foreground
      - 거리/시간: text-sm
        - 📏 {formatDistance(site.distance)} · 🚶 {site.walkingTime}분
      - 평점/상태: text-sm
        - ⭐ {site.rating?.toFixed(1)} (있을 때만)
        - 초록 점: 개방 중 / 빨간 점: 마감

3. 설명 영역
   - text-sm text-muted-foreground
   - 2줄 말줄임 (line-clamp-2)

4. 하단 액션 영역 (flex row, justify-between)
   a. "🗺️ 지도" 버튼
      - onClick → onOpenMaps(site)
      - 실제 동작: 외부 지도 앱 열기
   b. "자세히 →" 버튼
      - onClick → onSelect(site)
```

#### 거리 포맷 유틸

```typescript
function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
```

#### 에러 처리

- 이미지 로드 실패 → `onError`에서 placeholder 표시
- site.rating이 undefined → 평점 영역 숨김
- site.isOpen이 undefined → 운영 상태 숨김

#### 의존성

- React
- `@/types/discovery` (`NearbyPlace`)
- Tailwind CSS 클래스

---

### 2.10 `src/components/NearbySites.tsx` — 주변 유적지 카드 리스트

**역할**: NearbyCard를 리스트로 렌더링. 로딩 상태, 빈 상태, 에러 상태 처리 포함.

#### 함수 시그니처

```typescript
// ============================================================
// 파일: src/components/NearbySites.tsx
// 클라이언트 컴포넌트
// ============================================================

'use client';

import type { NearbyPlace } from '@/types/discovery';

export interface NearbySitesProps {
  sites: NearbyPlace[];
  userLocation: { lat: number; lng: number };
  isLoading: boolean;
  onSiteSelect: (site: NearbyPlace) => void;
  onOpenMaps: (site: NearbyPlace) => void;
}

export default function NearbySites({
  sites, userLocation, isLoading, onSiteSelect, onOpenMaps,
}: NearbySitesProps): JSX.Element;
```

#### 구현 상세

```
전체 레이아웃 (UI Flow §3.6 참조):

┌──────────────────────────────────────┐
│  📍 주변 문화유산 ({radius}km)        │ ← 타이틀 바
│  ─────────────────────────────────── │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  NearbyCard 1                 │  │ ← 카드 리스트 (스크롤 가능)
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  NearbyCard 2                 │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │  NearbyCard 3                 │  │
│  └────────────────────────────────┘  │
│                                      │
│           ▼ 더보기 (n)               │ ← 5개 이상일 때
└──────────────────────────────────────┘

구현 단계:

1. 로딩 상태 (isLoading === true)
   - 스켈레톤 카드 3개 표시
   - 각 스켈레톤: animate-pulse 배경

2. 빈 상태 (sites.length === 0 && !isLoading)
   - "주변에 문화유산을 찾지 못했습니다" 메시지
   - "반경을 넓혀보세요" 안내

3. 카드 리스트
   a. 타이틀 바
      - "📍 주변 문화유산 (2km)"
      - 결과 수 표시

   b. 카드 렌더링
      - 초기 표시: 최대 5개
      - "더보기" 버튼으로 나머지 확장
      - 카드 진입 애니메이션: stagger 100ms 페이드인

   c. 각 카드에 대해:
      ```tsx
      {displayedSites.map((site, index) => (
        <div
          key={site.id}
          style={{ animationDelay: `${index * 100}ms` }}
          className="animate-fadeIn"
        >
          <NearbyCard
            site={site}
            onSelect={onSiteSelect}
            onOpenMaps={onOpenMaps}
          />
        </div>
      ))}
      ```

4. onOpenMaps 처리
   - Google Maps 딥링크 생성:
     ```typescript
     function handleOpenMaps(site: NearbyPlace) {
       const url = `https://www.google.com/maps/dir/?api=1&` +
         `origin=${userLocation.lat},${userLocation.lng}&` +
         `destination=${site.location.lat},${site.location.lng}&` +
         `destination_place_id=${site.id}&` +
         `travelmode=walking`;
       window.open(url, '_blank');
     }
     ```
   - onOpenMaps 콜백 호출 (부모에서 추가 처리 가능)
```

#### 에러 처리

- sites 배열이 null/undefined → 빈 배열 처리
- userLocation이 null → 거리/도보시간 표시 생략

#### 의존성

- React, `useState`
- `@/components/NearbyCard`
- `@/types/discovery` (`NearbyPlace`)
- Tailwind CSS

---

### 2.11 `src/components/DiaryViewer.tsx` — 다이어리 뷰어

**역할**: 인터리브된 텍스트+이미지 다이어리를 스크롤 가능한 뷰어로 렌더링. 공유 기능 포함.

#### 함수 시그니처

```typescript
// ============================================================
// 파일: src/components/DiaryViewer.tsx
// 클라이언트 컴포넌트
// ============================================================

'use client';

import type { DiaryData, DiaryEntry } from '@/types/diary';

export interface DiaryViewerProps {
  diary: DiaryData;
  onShare: () => Promise<string>;  // 공유 링크 반환
  onClose: () => void;
}

export default function DiaryViewer({
  diary, onShare, onClose,
}: DiaryViewerProps): JSX.Element;
```

#### 구현 상세

```
다이어리 뷰어 레이아웃:

┌──────────────────────────────────────────┐
│  ← 닫기           🔗 공유               │ ← 헤더 바
├──────────────────────────────────────────┤
│                                          │
│  📖 대영박물관에서의 아침                 │ ← 제목 (큰 폰트, 세리프)
│  2026년 3월 4일                          │ ← 날짜
│                                          │
│  ─────────────────────────────────────── │
│                                          │
│  아침 빛이 대영박물관의 거대한 열주를     │ ← 텍스트 블록 (마크다운)
│  비추고 있었다. 4전시실로 향하는 발걸음   │
│  이 기대감으로 가벼웠다...               │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │                                  │   │ ← 삽화 이미지
│  │     [수채화 스타일 삽화]          │   │    (rounded, shadow)
│  │                                  │   │
│  └──────────────────────────────────┘   │
│                                          │
│  로제타 스톤은 유리 뒤에 서 있었다.      │ ← 다음 텍스트 블록
│  예상보다 작지만 무한히 더 중요한...      │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │     [로제타 스톤 복원 삽화]       │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ...                                     │ ← 반복
│                                          │
│  ─────────────────────────────────────── │
│                                          │
│  [🔗 공유하기]     [📥 저장하기]         │ ← 하단 액션 바
└──────────────────────────────────────────┘

구현 단계:

1. 헤더 바
   - 닫기 버튼 (← 아이콘) → onClose()
   - 공유 버튼 (🔗 아이콘) → handleShare()

2. 제목 영역
   - diary.title: text-2xl font-serif font-bold
   - 날짜: new Date(diary.createdAt).toLocaleDateString('ko-KR', { ... })
   - 구분선

3. 엔트리 렌더링 (diary.entries를 order 순으로)
   ```typescript
   const sortedEntries = [...diary.entries].sort((a, b) => a.order - b.order);
   ```

   각 entry에 대해:

   a. type === 'text':
      - 마크다운 렌더링 (간단한 파서 또는 직접 처리)
      - # 제목 → <h2>
      - **볼드** → <strong>
      - 일반 텍스트 → <p>
      - 문단 간격: mb-4
      - 폰트: text-base leading-relaxed
      - 색상: text-stone-700 (따뜻한 톤)

   b. type === 'image':
      - <img> 태그
      - src={entry.content} (data URL 또는 외부 URL)
      - className: w-full rounded-xl shadow-md my-6
      - alt: entry.siteName ?? '삽화'
      - loading="lazy"
      - 이미지 로드 에러 → 숨김 처리

4. 하단 액션 바
   a. 공유 버튼 → handleShare()
   b. (선택) 저장 버튼 (브라우저 저장)

5. handleShare() 구현
   ```typescript
   async function handleShare() {
     setIsSharing(true);
     try {
       const shareUrl = await onShare();

       // Web Share API 지원 시 네이티브 공유
       if (navigator.share) {
         await navigator.share({
           title: diary.title,
           text: `TimeLens 박물관 다이어리: ${diary.title}`,
           url: shareUrl,
         });
       } else {
         // 폴백: 클립보드 복사
         await navigator.clipboard.writeText(shareUrl);
         setShareCopied(true);
         setTimeout(() => setShareCopied(false), 2000);
       }
     } catch (err) {
       console.error('Share failed:', err);
     } finally {
       setIsSharing(false);
     }
   }
   ```

6. 스크롤 동작
   - overflow-y-auto
   - smooth scroll
   - 최상단/최하단에서 바운스 효과 (overscroll-behavior)
```

#### 마크다운 간이 렌더러

```typescript
/**
 * 간단한 마크다운 텍스트를 JSX로 변환.
 * 전체 마크다운 파서 대신 경량 구현.
 */
function renderMarkdownText(text: string): JSX.Element[] {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={i} className="text-xl font-serif font-bold text-stone-800 mt-6 mb-3">
          {line.slice(2)}
        </h2>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="text-lg font-serif font-semibold text-stone-700 mt-4 mb-2">
          {line.slice(3)}
        </h3>
      );
    } else {
      // 인라인 볼드 처리
      const rendered = line.replace(
        /\*\*(.*?)\*\*/g,
        '<strong>$1</strong>'
      );
      elements.push(
        <p
          key={i}
          className="text-base leading-relaxed text-stone-700 mb-3"
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      );
    }
  }

  return elements;
}
```

#### 에러 처리

- diary.entries 빈 배열 → "다이어리 내용이 없습니다" 표시
- 이미지 로드 실패 → `onError`에서 해당 이미지 영역 숨김
- Web Share API 미지원 → 클립보드 복사 폴백
- onShare 실패 → 에러 토스트

#### 의존성

- React (`useState`, `useCallback`)
- `@/types/diary` (`DiaryData`, `DiaryEntry`)
- Tailwind CSS

---

## 3. 에이전트 프롬프트 전문

### 3.1 Discovery Agent 시스템 프롬프트

```
You are TimeLens Discovery Agent, an expert cultural heritage navigator.

## Core Behaviors
1. NEARBY SEARCH: When given GPS coordinates, search for nearby museums, historical sites,
   monuments, and cultural landmarks using Google Places API.
2. ENRICHMENT: For each discovered place, provide:
   - Brief cultural/historical significance (1-2 sentences)
   - Notable collections or features
   - Practical info (distance, walking time, opening hours)
3. GROUNDING: Base all descriptions on verified search results.
4. PERSONALIZATION: If the user has expressed interest in specific eras or cultures,
   prioritize relevant sites.

## Response Style
- Concise but informative
- Practical (distance, walking time, opening status)
- Enthusiastic about cultural discoveries
- Respond in the user's language
```

### 3.2 Diary Agent 시스템 프롬프트

```
You are TimeLens Diary Agent, a gifted museum visit journal writer.

## Core Behaviors
1. NARRATIVE: Transform dry visit records into an engaging, personal travel diary.
2. INTERLEAVED OUTPUT: Alternate between descriptive text and watercolor-style illustrations.
3. FLOW: Create natural transitions between different artifacts/sites visited.
4. ILLUSTRATION STYLE: Generate warm, artistic watercolor/sketch illustrations for each
   artifact. NOT photorealistic — think travel journal sketches.
5. EMOTIONAL: Capture the wonder and discovery of the museum experience.

## Diary Structure
- Title (evocative, poetic)
- Opening paragraph (setting the scene — museum, weather, mood)
- For each visited artifact:
  - Transition sentence
  - 2-3 sentences of personal reflection + historical insight
  - One illustration (watercolor style)
- Closing paragraph (reflection on the visit)

## Language
- Write in Korean by default
- Lyrical yet educational tone
- First person perspective
```

---

## 4. 통합 시나리오 (Part 1 ↔ Part 4)

### 4.1 시나리오: "근처에 박물관?" → Discovery 카드 표시

```
시간선  │ 컴포넌트                    │ 동작
────────┼────────────────────────────┼──────────────────────────────────
T+0     │ 사용자 (음성)              │ "근처에 다른 볼거리 있어?"
T+0.5   │ Live API                   │ 사용자 음성 인식
T+1     │ Live API → 클라이언트      │ toolCall: discover_nearby
        │                            │ { lat: 41.8902, lng: 12.4922,
        │                            │   radius_km: 2 }
T+1     │ Part 1 (handleToolCalls)   │ events.onAgentSwitch
        │                            │   { from: 'curator', to: 'discovery',
        │                            │     reason: '주변 문화유산을 검색합니다' }
T+1     │ Part 2 (AgentIndicator)    │ "🧭 Discovery Agent" 표시
T+1     │ Part 1 (handleToolCalls)   │ fetch('GET /api/discover?lat=41.89&lng=12.49&radius=2')
T+1.5   │ Part 4 (route.ts)         │ searchNearbyPlaces() → Places API
T+3     │ Part 4 (route.ts)         │ getPlacePhotoUrl() × N (병렬)
T+4     │ Part 4 (route.ts)         │ enrichWithSearchGrounding() (선택적)
T+5     │ Part 4 (route.ts)         │ DiscoveryResponse 반환
T+5     │ Part 1 (handleToolCalls)   │ events.onToolResult({
        │                            │   tool: 'discover_nearby',
        │                            │   result: { type: 'discovery',
        │                            │     sites: [...], userLocation: {...} }
        │                            │ })
T+5     │ Part 1                     │ session.sendToolResponse({
        │                            │   id, name: 'discover_nearby',
        │                            │   response: { status: 'success',
        │                            │     sites_count: 5 }
        │                            │ })
T+5     │ Part 2 (KnowledgePanel)   │ fullscreen 전환
T+5.1   │ Part 4 (NearbySites)      │ 카드 순차 페이드인 (stagger 100ms)
T+6     │ Live API → 오디오         │ "주변에 5곳의 문화유산을 찾았습니다.
        │                            │  가장 가까운 곳은 콜로세움으로..."
```

### 4.2 시나리오: "다이어리 만들어줘" → 다이어리 생성 + 표시

```
시간선  │ 컴포넌트                    │ 동작
────────┼────────────────────────────┼──────────────────────────────────
T+0     │ 사용자 (음성)              │ "내 박물관 다이어리 만들어줘"
T+0.5   │ Live API                   │ 사용자 음성 인식
T+1     │ Live API → 클라이언트      │ toolCall: create_diary
        │                            │ { session_id: "abc123" }
T+1     │ Part 1 (handleToolCalls)   │ events.onAgentSwitch
        │                            │   { from: 'curator', to: 'diary',
        │                            │     reason: '다이어리를 생성합니다' }
T+1     │ Part 2 (AgentIndicator)    │ "📖 Diary Agent" 표시
T+1     │ Part 2 (AudioVisualizer)   │ 'generating' 상태 (스피너)
T+1     │ Part 1 (handleToolCalls)   │ fetch('POST /api/diary/generate',
        │                            │   { sessionId: "abc123" })
T+2     │ Part 4 (route.ts)         │ Firestore 조회 → VisitDoc[] (3건)
T+3     │ Part 4 (route.ts)         │ getDiaryGenerationPrompt(visits)
T+3     │ Part 4 (route.ts)         │ Gemini 2.5 Flash Image 호출
        │                            │ responseModalities: [TEXT, IMAGE]
T+15    │ Part 4 (route.ts)         │ parseInterleavedResponse()
        │                            │ → DiaryEntry[] (텍스트 4개 + 이미지 3개)
T+15.5  │ Part 4 (route.ts)         │ Firestore 저장 → DiaryDoc
T+16    │ Part 4 (route.ts)         │ DiaryGenerateResponse 반환
T+16    │ Part 1 (handleToolCalls)   │ events.onToolResult({
        │                            │   tool: 'create_diary',
        │                            │   result: { type: 'diary',
        │                            │     diaryId: "xyz789",
        │                            │     title: "대영박물관에서의 아침",
        │                            │     entryCount: 7 }
        │                            │ })
T+16    │ Part 1                     │ session.sendToolResponse({...})
T+16    │ Part 2 (KnowledgePanel)   │ fullscreen 전환
T+16.1  │ Part 4 (DiaryViewer)      │ 인터리브 텍스트+이미지 렌더링
T+17    │ Live API → 오디오         │ "다이어리가 완성되었습니다!
        │                            │  '대영박물관에서의 아침'이라는 제목으로
        │                            │  3개의 유물에 대한 감상과 삽화가..."
```

---

## 5. 상태 관리

### 5.1 Discovery UI 상태

```typescript
// Part 2의 KnowledgePanel 또는 상위 컴포넌트에서 관리
type DiscoveryUIState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; sites: NearbyPlace[]; userLocation: { lat: number; lng: number } }
  | { status: 'error'; error: string };

// 상태 전이:
// idle → loading: discover_nearby tool call 수신 시
// loading → ready: /api/discover 응답 수신 시
// loading → error: API 실패 시
// ready → idle: 패널 닫기 시
// error → loading: 재시도 시
```

### 5.2 Diary UI 상태

```typescript
// shared-contract.md §D에 정의됨
type DiaryUIState =
  | { status: 'idle' }
  | { status: 'generating'; progress: number }
  | { status: 'ready'; diary: DiaryData }
  | { status: 'error'; error: string };

// 상태 전이:
// idle → generating: create_diary tool call 수신 시
// generating → ready: /api/diary/generate 응답 수신 시
// generating → error: API 실패 시
// ready → idle: 뷰어 닫기 시
// error → generating: 재시도 시
```

---

## 6. 외부 서비스 의존성

| 서비스 | 용도 | 환경변수 | 과금 |
|---|---|---|---|
| Google Places API (New) | 주변 장소 검색 + 사진 | `GOOGLE_PLACES_API_KEY` | ~$0.035/요청 (Preferred SKU) |
| Gemini 2.5 Flash | Search Grounding 설명 보강 | `GOOGLE_GENAI_API_KEY` | 표준 Flash 과금 |
| Gemini 2.5 Flash Image | 다이어리 인터리브 출력 | `GOOGLE_GENAI_API_KEY` | ~$0.039/이미지 |
| Firestore | VisitDoc 조회, DiaryDoc 저장 | `FIREBASE_SERVICE_ACCOUNT_KEY` | 읽기/쓰기 과금 |
| Browser Geolocation API | GPS 좌표 | 없음 (브라우저 API) | 무료 |

---

## 7. 보안 고려사항

| 항목 | 대책 |
|---|---|
| Places API Key 보호 | `GOOGLE_PLACES_API_KEY`는 서버 전용 (`process.env`). 클라이언트 코드에서 절대 import하지 않음 |
| Photo URL 보안 | Photo Media API 응답의 `photoUri`는 Google CDN URL — 클라이언트에서 직접 로드 가능 (키 미노출) |
| Diary 접근 제어 | shareToken 기반 공개 접근. userId 매칭으로 소유자 확인 |
| Geolocation 프라이버시 | GPS 좌표는 서버에 저장하지 않음 (요청 시에만 사용) |
| 다이어리 이미지 | base64 data URL — 외부 URL 없이 인라인 저장. XSS 위험 없음 |

---

## 8. 성능 최적화

| 최적화 | 세부 |
|---|---|
| Places API 병렬 사진 조회 | `Promise.all()`로 모든 장소의 사진 URL을 동시 조회 |
| Search Grounding 배치 | 모든 장소를 하나의 프롬프트로 처리 (API 호출 1회) |
| 이미지 lazy loading | DiaryViewer에서 `loading="lazy"` 사용 |
| Discovery 카드 stagger | 카드를 한꺼번에 렌더링하지 않고 순차 페이드인 |
| Diary 생성 타임아웃 | Gemini API 호출에 60초 타임아웃 (이미지 생성 포함) |
| Geolocation 캐시 | `maximumAge: 60000` (1분간 위치 캐시) |
| Field Mask 최소화 | 불필요한 필드 제거로 과금 티어 최적화 가능 |

---

## 9. 테스트 전략

### 9.1 단위 테스트

| 대상 | 테스트 항목 |
|---|---|
| `calculateDistance()` | 알려진 좌표 쌍에 대한 정확도 검증 (서울-부산: ~325km) |
| `estimateWalkingTime()` | 1000m → 12분, 500m → 6분 |
| `parseInterleavedResponse()` | 텍스트만, 이미지만, 텍스트+이미지 혼합 케이스 |
| `generateShareToken()` | 8자리 영숫자, 중복 확률 검증 |
| `formatDistance()` | 500 → "500m", 1500 → "1.5km" |

### 9.2 통합 테스트

| 시나리오 | 검증 |
|---|---|
| Discovery 전체 플로우 | 좌표 → Places API → 사진 조회 → 응답 반환 |
| Diary 전체 플로우 | sessionId → 방문 기록 → Gemini 호출 → 파싱 → 저장 → 반환 |
| Diary 공유 링크 | diaryId + shareToken → 공유 페이지 접근 |
| Geolocation 권한 거부 | 적절한 에러 메시지 표시 |

### 9.3 수동 테스트 (해커톤 데모용)

- 실제 박물관 GPS 좌표로 Discovery 테스트 (예: 국립중앙박물관 37.5240, 126.9804)
- 실제 방문 기록 3건으로 Diary 생성 테스트
- 모바일 Chrome/Safari에서 Geolocation 권한 플로우 확인

---

## 10. 설계 체크리스트 (shared-contract §M 기준)

- [x] shared-contract 관련 타입 모두 참조 (§D: Discovery & Diary Contract)
- [x] 담당 파일 목록이 소유권 매트릭스(§L)와 일치
- [x] 다른 파트에서 호출하는 함수/이벤트의 시그니처 명확
  - Part 1 → `GET /api/discover` (DiscoveryQueryParams → DiscoveryResponse)
  - Part 1 → `POST /api/diary/generate` (DiaryGenerateRequest → DiaryGenerateResponse)
  - Part 1 → `GET /api/diary/:id` (→ DiaryData)
- [x] 에러 핸들링 시나리오 정의 (각 파일별)
- [x] Claude Code가 혼자 구현할 수 있을 만큼 상세

### Part 4 전용 체크리스트

- [x] Google Places API 호출 파라미터 전체 (§2.1)
- [x] Geolocation API 권한 핸들링 플로우 (§2.2)
- [x] Diary 인터리브 출력 파싱 로직 (§2.4 — parseInterleavedResponse)
- [x] 다이어리 공유 링크 생성 로직 (§2.4 — generateShareToken, §2.5 — shareToken 검증)
- [x] Field Mask 과금 최적화 설명 (§2.1)
- [x] Places API 요청/응답 플로우 다이어그램 (§2.1)
- [x] Diary 생성 파이프라인 다이어그램 (§2.4)
