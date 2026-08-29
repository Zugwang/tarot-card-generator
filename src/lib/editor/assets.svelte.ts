// Local image memory: a small, persistent library of images the user has
// imported (free-mode layers or custom suit PNGs). Kept as data-URLs in
// localStorage so they survive reloads and can be re-used without re-uploading.
//
// localStorage is ~5 MB, so we cap the number of remembered images and evict
// the oldest. Everything stays client-side (no upload) — matches the static
// deployment. Reads/writes are wrapped in try/catch (private windows throw).

const STORE_KEY = 'tarotier.assets.v1';
const MAX = 24;

export interface Asset {
  id: string;
  href: string; // data-URL
  addedAt: number;
}

function load(): Asset[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((a) => a && typeof a.href === 'string') : [];
  } catch {
    return [];
  }
}

export const assets = $state<{ items: Asset[] }>({ items: load() });

function persist(): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(assets.items));
  } catch {
    // Quota exceeded or unavailable — drop the oldest and retry once.
    try {
      assets.items = assets.items.slice(0, Math.max(1, Math.floor(assets.items.length / 2)));
      localStorage.setItem(STORE_KEY, JSON.stringify(assets.items));
    } catch {
      /* give up silently — memory is a convenience, not critical state */
    }
  }
}

/** Remember an imported image (deduped by content, most-recent first). */
export function rememberImage(href: string): void {
  if (!href || !href.startsWith('data:')) return;
  const existing = assets.items.findIndex((a) => a.href === href);
  if (existing >= 0) assets.items.splice(existing, 1);
  assets.items.unshift({ id: crypto.randomUUID?.() ?? String(Math.random()), href, addedAt: Date.now() });
  if (assets.items.length > MAX) assets.items = assets.items.slice(0, MAX);
  persist();
}

/** Forget one remembered image. */
export function forgetImage(id: string): void {
  assets.items = assets.items.filter((a) => a.id !== id);
  persist();
}

/** Clear the whole library. */
export function clearImages(): void {
  assets.items = [];
  persist();
}
