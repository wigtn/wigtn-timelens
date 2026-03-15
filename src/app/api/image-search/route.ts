// ============================================================
// 파일: src/app/api/image-search/route.ts
// 역할: GET /api/image-search — 유물 이미지 검색
//       1순위: Wikidata P18 (구조화된 이미지 데이터)
//       2순위: Wikimedia Commons (대용량 문화유산 이미지)
//       3순위: Wikipedia thumbnail
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  artifactName: z.string().min(1),
  era: z.string().optional(),
});

const WIKI_UA = 'TimeLens/1.0 (cultural-heritage-companion; https://github.com/wigtn/timelens)';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = schema.safeParse({
    artifactName: searchParams.get('artifactName'),
    era: searchParams.get('era'),
  });

  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'artifactName is required' }, { status: 400 });
  }

  const { artifactName, era } = parsed.data;

  try {
    // 복수 쿼리: 영어 이름, "이름 era", 영어 정제
    const queries = buildQueries(artifactName, era);

    for (const q of queries) {
      // 1) Wikidata entity → P18 image
      const wdResult = await tryWikidata(q);
      if (wdResult) return ok(wdResult.imageUrl, wdResult.title);

      // 2) Wikimedia Commons file search
      const commonsResult = await tryWikimediaCommons(q);
      if (commonsResult) return ok(commonsResult.imageUrl, commonsResult.title);

      // 3) Wikipedia thumbnail
      const wikiResult = await tryWikipedia(q);
      if (wikiResult) return ok(wikiResult.imageUrl, wikiResult.title);
    }

    return NextResponse.json({ success: false, error: 'No image found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Search failed' },
      { status: 500 },
    );
  }
}

function ok(imageUrl: string, title: string) {
  return NextResponse.json({ success: true, imageUrl, description: title, source: 'wikimedia' });
}

function buildQueries(name: string, era?: string): string[] {
  const out: string[] = [name];
  if (era) out.push(`${name} ${era}`);
  // ASCII 추출 (한/일/중 혼재 시 영문만)
  const ascii = name.replace(/[^\x00-\x7F]/g, '').trim();
  if (ascii.length > 2 && ascii !== name) out.push(ascii);
  return out;
}

// ── 1. Wikidata: 검색 → P18(이미지) claim ──────────────────

async function tryWikidata(query: string): Promise<{ imageUrl: string; title: string } | null> {
  try {
    const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&type=item&format=json&limit=3&origin=*`;
    const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': WIKI_UA } });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();

    const hits: Array<{ id: string; label?: string }> = searchData?.search ?? [];
    if (!hits.length) return null;

    for (const hit of hits.slice(0, 3)) {
      const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${hit.id}&props=claims&format=json&origin=*`;
      const entityRes = await fetch(entityUrl, { headers: { 'User-Agent': WIKI_UA } });
      if (!entityRes.ok) continue;
      const entityData = await entityRes.json();

      const claims = entityData?.entities?.[hit.id]?.claims;
      // P18 = image
      const p18 = claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (!p18 || typeof p18 !== 'string') continue;

      // Wikimedia Commons 이미지 URL 구성
      const fileName = p18.replace(/ /g, '_');
      const imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=1200`;
      return { imageUrl, title: hit.label ?? query };
    }
  } catch {
    // 실패 시 다음 전략으로
  }
  return null;
}

// ── 2. Wikimedia Commons: File 네임스페이스 직접 검색 ────────

async function tryWikimediaCommons(query: string): Promise<{ imageUrl: string; title: string } | null> {
  try {
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url|size|mime&format=json&gsrlimit=8&origin=*`;
    const res = await fetch(searchUrl, { headers: { 'User-Agent': WIKI_UA } });
    if (!res.ok) return null;
    const data = await res.json();

    const pages = data?.query?.pages ?? {};
    // JPEG/PNG만, 최소 크기 필터(200px 이상 추정)
    for (const page of Object.values(pages) as Array<{ title: string; imageinfo?: Array<{ url: string; mime: string; width?: number }> }>) {
      const info = page.imageinfo?.[0];
      if (!info) continue;
      if (!info.mime || (!info.mime.includes('jpeg') && !info.mime.includes('png'))) continue;
      if (info.width && info.width < 200) continue;
      return { imageUrl: info.url, title: page.title.replace('File:', '') };
    }
  } catch {
    // 실패 시 다음 전략으로
  }
  return null;
}

// ── 3. Wikipedia: 페이지 thumbnail (기존 방식) ───────────────

async function tryWikipedia(query: string): Promise<{ imageUrl: string; title: string } | null> {
  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json&origin=*`,
      { headers: { 'User-Agent': WIKI_UA } },
    );
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    const hits: Array<{ title: string }> = searchData?.query?.search ?? [];

    for (const hit of hits) {
      const thumbRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(hit.title)}&prop=pageimages&pithumbsize=1200&format=json&origin=*`,
        { headers: { 'User-Agent': WIKI_UA } },
      );
      if (!thumbRes.ok) continue;
      const thumbData = await thumbRes.json();
      const pages = thumbData?.query?.pages ?? {};
      const pageId = Object.keys(pages)[0];
      if (!pageId || pageId === '-1') continue;
      const src = pages[pageId]?.thumbnail?.source;
      if (src) return { imageUrl: src, title: hit.title };
    }
  } catch {
    // 실패
  }
  return null;
}
