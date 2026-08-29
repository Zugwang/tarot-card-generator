// Registry mapping cards to illustration image URLs (served statically from
// /art/, same-origin so the CSP img-src 'self' allows them).
//
// Atouts + l'Excuse: authentic Tarot de Marseille (Jean Dodal, ~1701, PD).
// Court cards: selectable style — 'grimaud' (Tarot nouveau 1898, PD),
// 'marseille' (PD Marseille scans), or 'genere' (drawn by the renderer, no image).

import type { Suit, CourtRank } from '../model/deck';

export type AtoutStyle = 'marseille' | 'grimaud' | 'carrington';

// Léonora Carrington painted only part of the Major Arcana — map the trumps we
// have; the rest fall back to the Marseille scans so the deck stays complete.
const CARRINGTON = new Set([6, 10, 13, 14, 15, 16, 17, 18, 19, 21]);

/** Image URL for atout number `n` (1..21) in the chosen style. */
export function atoutImage(n: number, style?: string): string {
  const nn = String(n).padStart(2, '0');
  if (style === 'carrington') {
    return CARRINGTON.has(n) ? `/art/atouts-carrington/${nn}.jpg` : atoutImage(n, 'marseille');
  }
  const dir = style === 'grimaud' ? 'atouts-grimaud' : 'atouts';
  return `/art/${dir}/${nn}.jpg`;
}

export function excuseImage(style?: string): string {
  if (style === 'carrington') return '/art/atouts-carrington/fool.jpg';
  return style === 'grimaud' ? '/art/atouts-grimaud/excuse.jpg' : '/art/atouts/fool.jpg';
}

/** Image URL for an Oracle de Marseille card (number 0..77). */
export function oracleImage(n: number): string {
  return `/art/atouts-oracle/${String(n).padStart(2, '0')}.webp`;
}

export type CourtStyle = 'marseille' | 'grimaud' | 'poker' | 'danois' | 'blanc';

/**
 * Image URL for a court card in the given style, or null when the style draws
 * no image ('blanc' → blank card with index) or the asset is absent.
 * Poker + Danish courts have no Cavalier → null (blank) for that rank.
 */
export function courtImage(suit: Suit, rank: CourtRank, style?: string): string | null {
  if (style === 'poker') {
    return rank === 'cavalier' ? null : `/art/courts/poker/${suit}-${rank}.svg`;
  }
  if (style === 'danois') {
    // Two-headed Danish-pattern engravings (BnF, Georges Marteau — public
    // domain). Roi / Dame / Valet only; no Cavalier.
    return rank === 'cavalier' ? null : `/art/courts/danois/${suit}-${rank}.jpg`;
  }
  if (style === 'grimaud' || style === 'marseille') {
    return `/art/courts/${style}/${suit}-${rank}.jpg`;
  }
  return null; // 'blanc' or unknown
}
