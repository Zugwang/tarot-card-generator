// Open-licensed random-image sources. Each returns the same CommonsPick shape
// so the UI (credit line, orientation, cover-fit) is source-agnostic.
//
// CORS constraint: we fetch the image bytes in the browser and turn them into a
// data: URL (so PNG export stays untainted). That only works when the *image*
// host sends `ACAO: *`. So every source here fetches from a FIXED, CORS-enabled
// host that must be whitelisted in the nginx CSP `connect-src`:
//   • Commons   → commons.wikimedia.org + upload.wikimedia.org
//   • Openverse → api.openverse.org (its /thumb/ proxy, ACAO:*)
// (Art Institute of Chicago was evaluated but its IIIF image host sits behind a
//  Cloudflare bot-challenge that 403s automated fetches, so it's not usable.)

import { randomCommonsImage, blobToDataURL, type CommonsPick } from './wikimedia';

export type ImagePick = CommonsPick;

export interface ImageSource {
  id: string;
  label: string;
  pick: () => Promise<ImagePick>;
}

function shuffle<T>(a: T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
async function fetchAsPick(url: string, meta: Omit<ImagePick, 'dataUrl'>): Promise<ImagePick | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const blob = await r.blob();
    if (!/^image\//.test(blob.type)) return null;
    return { ...meta, dataUrl: await blobToDataURL(blob) };
  } catch {
    return null;
  }
}

const SEED_WORDS = ['sky', 'forest', 'flower', 'mountain', 'city', 'ocean', 'bird', 'tree', 'moon', 'star', 'river', 'desert', 'fruit', 'stone', 'cloud', 'garden', 'animal', 'portrait', 'landscape', 'pattern'];
const seed = () => SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)];

/** Openverse — aggregated CC/PD images; thumbnails proxied by api.openverse.org. */
export async function randomOpenverseImage(): Promise<ImagePick> {
  const qs = new URLSearchParams({ q: seed(), page: String(1 + Math.floor(Math.random() * 10)), page_size: '20', mature: 'false' });
  const r = await fetch(`https://api.openverse.org/v1/images/?${qs}`);
  if (!r.ok) throw new Error(`Openverse ${r.status}`);
  const j = await r.json();
  for (const it of shuffle((j?.results ?? []) as any[])) {
    const thumb = it.thumbnail || it.url;
    if (!thumb) continue;
    const pick = await fetchAsPick(thumb, {
      title: it.title || '',
      pageUrl: it.foreign_landing_url || it.url || '',
      license: `${it.license || ''} ${it.license_version || ''}`.trim().toUpperCase(),
      author: it.creator || '',
      width: it.width || 0,
      height: it.height || 0,
    });
    if (pick) return pick;
  }
  throw new Error('Openverse : aucune image — réessaie.');
}

export const IMAGE_SOURCES: ImageSource[] = [
  { id: 'commons', label: 'Commons', pick: randomCommonsImage },
  { id: 'openverse', label: 'Openverse', pick: randomOpenverseImage },
];

export function randomImage(sourceId: string): Promise<ImagePick> {
  const s = IMAGE_SOURCES.find((x) => x.id === sourceId) ?? IMAGE_SOURCES[0];
  return s.pick();
}
