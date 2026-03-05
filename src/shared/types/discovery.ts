// ============================================================
// 파일: src/types/discovery.ts
// Part 1이 Tool Call 이벤트 전달, Part 4가 REST API + UI 구현
// 출처: shared-contract.md §D (Discovery)
// ============================================================

// --- Live API Tool Call ---
export interface DiscoveryToolCall {
  tool: 'discover_nearby';
  params: {
    lat: number;
    lng: number;
    radius_km: number;
    interest_filter?: string;
  };
}

// --- REST API: GET /api/discover ---
export interface DiscoveryQueryParams {
  lat: number;
  lng: number;
  radius: number;
  type?: string;
}

export interface DiscoveryResponse {
  success: true;
  sites: NearbyPlace[];
  searchRadius: number;
}

export interface NearbyPlace {
  id: string;
  name: string;
  type: string;
  era?: string;
  description: string;
  distance: number;
  walkingTime: number;
  rating?: number;
  isOpen?: boolean;
  openingHours?: string;
  photoUrl?: string;
  location: { lat: number; lng: number };
}

// --- Tool Result ---
export interface DiscoveryResult {
  type: 'discovery';
  sites: NearbyPlace[];
  userLocation: { lat: number; lng: number };
}
