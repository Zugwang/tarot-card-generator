// Registry mapping cards to illustration image URLs (served statically from
// /art/, same-origin so the CSP img-src 'self' allows them).
//
// Atouts + l'Excuse: authentic Tarot de Marseille (Jean Dodal, ~1701, PD).
// Court cards: selectable style — 'grimaud' (Tarot nouveau 1898, PD),
// 'marseille' (PD Marseille scans), or 'genere' (drawn by the renderer, no image).

import type { Suit, CourtRank } from '../model/deck';

export function atoutImage(n: number): string {
  return `/art/atouts/${String(n).padStart(2, '0')}.jpg`;
}

export function excuseImage(): string {
  return '/art/atouts/fool.jpg';
}

export type CourtStyle = 'grimaud' | 'marseille' | 'genere';

/** Court styles that have image assets available. */
export const IMAGE_COURT_STYLES: CourtStyle[] = ['grimaud', 'marseille'];

/**
 * Image URL for a court card in the given style, or null when the style draws
 * the card without an image ('genere') or the asset is absent.
 */
export function courtImage(suit: Suit, rank: CourtRank, style?: string): string | null {
  if (style === 'grimaud' || style === 'marseille') {
    return `/art/courts/${style}/${suit}-${rank}.jpg`;
  }
  return null;
}
