// Card presentation helpers. Ids are Tarotier's (`pip-coeur-1`, `court-pique-roi`),
// which also name the pre-rendered WebP files.

/* Unicode glyphs. Kept ONLY for text contexts — aria-labels, `cardText` — where
 * a screen reader needs characters, not SVG. Everything visible goes through
 * <Suit> and Tarotier's parametric enseignes instead. */
export const SUIT_GLYPH: Record<string, string> = {
  pique: '♠', coeur: '♥', carreau: '♦', trefle: '♣',
};
export const SUIT_LABEL: Record<string, string> = {
  pique: 'Pique', coeur: 'Cœur', carreau: 'Carreau', trefle: 'Trèfle',
};
export const SUIT_IS_RED: Record<string, boolean> = {
  pique: false, coeur: true, carreau: true, trefle: false,
};
/* The tarot (Latin) enseignes, which is what gives the table its character:
 * sword, cup, coin, baton. These ids come from SUIT_VARIANTS in
 * ../../src/lib/render/suits.ts — keep them in step with it. */
export const SUIT_VARIANT: Record<string, string> = {
  pique: 'epee', coeur: 'coupe', carreau: 'denier', trefle: 'baton',
};

/* On dark leather the "black" suits must read light, so the pairing is
 * parchment vs vermillon rather than the usual black vs red. */
export const SUIT_INK: Record<string, string> = {
  pique: 'var(--parchment)', trefle: 'var(--parchment)',
  coeur: 'var(--vermillon)', carreau: 'var(--vermillon)',
};

const RANK_LABEL: Record<string, string> = {
  '1': 'A', '7': '7', '8': '8', '9': '9', '10': '10',
  valet: 'V', dame: 'D', roi: 'R',
};

export function cardSrc(template: string, id: string): string {
  return `/cards/${template}/${id}.webp`;
}
export function backSrc(template: string): string {
  return `/cards/${template}/back.webp`;
}
export function suitOf(id: string): string {
  return id.split('-')[1] ?? 'pique';
}
export function rankOf(id: string): string {
  return RANK_LABEL[id.split('-')[2] ?? ''] ?? '?';
}
export function cardText(id: string): string {
  return `${rankOf(id)} ${SUIT_GLYPH[suitOf(id)] ?? ''}`;
}

export const SEAT_LABEL: Record<string, string> = {
  nord: 'Nord', est: 'Est', sud: 'Sud', ouest: 'Ouest',
};
export const TEAM_LABEL: Record<string, string> = { ns: 'Nord-Sud', eo: 'Est-Ouest' };

const ORDER = ['nord', 'est', 'sud', 'ouest'];
/** Where each seat sits on screen, with "you" always at the bottom. */
export function relative(you: string, seat: string): 'bottom' | 'left' | 'top' | 'right' {
  const d = (ORDER.indexOf(seat) - ORDER.indexOf(you) + 4) % 4;
  return (['bottom', 'left', 'top', 'right'] as const)[d];
}
