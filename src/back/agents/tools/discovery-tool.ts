// ============================================================
// 파일: src/back/agents/tools/discovery-tool.ts
// 담당: ADK Integration
// 역할: ADK FunctionTool — 주변 박물관/유적지 검색
// 래핑: places.ts의 searchNearbyPlaces
// ============================================================

import { FunctionTool } from '@google/adk';
import { Type, type Schema } from '@google/genai';
import { searchNearbyPlaces } from '@back/lib/geo/places';

const discoverySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    latitude: { type: Type.NUMBER, description: 'User latitude (-90 to 90)' },
    longitude: { type: Type.NUMBER, description: 'User longitude (-180 to 180)' },
    radiusKm: { type: Type.NUMBER, description: 'Search radius in kilometers (default 2, max 50)' },
    type: { type: Type.STRING, description: 'Specific place type (e.g. "museum", "art_gallery")' },
  },
  required: ['latitude', 'longitude'],
};

interface DiscoveryInput {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  type?: string;
}

/** LLM이 잘못된 타입을 전달할 수 있으므로 런타임 검증 */
function validateDiscoveryInput(args: unknown): DiscoveryInput {
  const input = args as Record<string, unknown>;
  const lat = Number(input.latitude);
  const lng = Number(input.longitude);
  if (isNaN(lat) || lat < -90 || lat > 90) {
    throw new Error('latitude must be a number between -90 and 90');
  }
  if (isNaN(lng) || lng < -180 || lng > 180) {
    throw new Error('longitude must be a number between -180 and 180');
  }
  return {
    latitude: lat,
    longitude: lng,
    radiusKm: typeof input.radiusKm === 'number' ? input.radiusKm : undefined,
    type: typeof input.type === 'string' ? input.type : undefined,
  };
}

export const searchNearbyTool = new FunctionTool({
  name: 'search_nearby_places',
  description:
    'Search for nearby museums, art galleries, historical sites, and cultural landmarks using GPS coordinates.',
  parameters: discoverySchema,
  async execute(args) {
    const input = validateDiscoveryInput(args);
    const radiusKm = Math.min(Math.max(input.radiusKm ?? 2, 0.1), 50);
    const radiusMeters = radiusKm * 1000;
    const sites = await searchNearbyPlaces(
      input.latitude,
      input.longitude,
      radiusMeters,
      input.type,
    );

    return {
      success: true,
      count: sites.length,
      searchRadiusKm: radiusKm,
      sites: sites.map((s) => ({
        name: s.name,
        type: s.type,
        distance: s.distance,
        walkingTime: s.walkingTime,
        rating: s.rating,
        isOpen: s.isOpen,
      })),
    };
  },
});
