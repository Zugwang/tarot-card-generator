// Parametric suit symbols ("enseignes"), drawn in a 100×100 box centered on
// (50,50). Returned as inner SVG markup so callers can place/scale/recolor them.
// These are first-pass geometric glyphs — the Marseille-quality artwork comes
// later; the API (id + color) stays the same so variants can slot in.

import type { Suit } from '../model/deck';

/** Default colors — red for coeur/carreau, black for pique/trefle. */
export const SUIT_COLORS: Record<Suit, string> = {
  coeur: '#c0392b',
  carreau: '#c0392b',
  pique: '#161616',
  trefle: '#161616',
};

export function suitColor(suit: Suit): string {
  return SUIT_COLORS[suit];
}

// Path data in a 0..100 box, visually centered near (50,50).
const PATHS: Record<Suit, string> = {
  coeur:
    'M50 84 C24 64 13 49 13 35 C13 23 22 15 33 15 C41 15 47 20 50 27 ' +
    'C53 20 59 15 67 15 C78 15 87 23 87 35 C87 49 76 64 50 84 Z',
  carreau: 'M50 8 L84 50 L50 92 L16 50 Z',
  pique:
    'M50 12 C50 12 87 41 87 61 C87 74 77 81 67 79 C62 78 58 74 56 69 ' +
    'C56 81 61 89 71 93 L29 93 C39 89 44 81 44 69 C42 74 38 78 33 79 ' +
    'C23 81 13 74 13 61 C13 41 50 12 50 12 Z',
  trefle: '', // rendered from circles + stem below
};

/** Return inner SVG markup for a suit symbol filled with `color`. */
export function suitSymbol(suit: Suit, color: string = suitColor(suit)): string {
  if (suit === 'trefle') {
    // three lobes + stem
    return (
      `<g fill="${color}">` +
      `<circle cx="50" cy="30" r="17"/>` +
      `<circle cx="32" cy="55" r="17"/>` +
      `<circle cx="68" cy="55" r="17"/>` +
      `<path d="M44 55 C44 72 40 84 30 93 L70 93 C60 84 56 72 56 55 Z"/>` +
      `</g>`
    );
  }
  return `<path d="${PATHS[suit]}" fill="${color}"/>`;
}
