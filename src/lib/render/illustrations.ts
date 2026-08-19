// Registry mapping cards to illustration image URLs (served statically from
// /art/, same-origin so the CSP img-src 'self' allows them).
//
// Atouts + l'Excuse: authentic Tarot de Marseille (Jean Dodal, ~1701, public
// domain). Court cards: no clean PD Marseille source yet → returns null so the
// renderer falls back to a generated placeholder.

import type { Suit, CourtRank } from '../model/deck';

export function atoutImage(n: number): string {
  return `/art/atouts/${String(n).padStart(2, '0')}.jpg`;
}

export function excuseImage(): string {
  return '/art/atouts/fool.jpg';
}

export function courtImage(_suit: Suit, _rank: CourtRank): string | null {
  return null;
}
