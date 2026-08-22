// Parametric suit symbols ("enseignes") with multiple variants per suit.
// Each variant renders inner SVG markup in a 100×100 box centered on (50,50),
// recolorable. First-pass geometric glyphs; the API (suit + variantId + color)
// stays stable so richer artwork can slot in later.

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

export interface SuitVariant {
  id: string;
  label: string;
  /** Inner SVG markup (0..100 box, centered) filled/stroked with `color`. */
  render: (color: string) => string;
}

// ---- path data (0..100 box) --------------------------------------------------

const P = {
  pique:
    'M50 12 C50 12 87 41 87 61 C87 74 77 81 67 79 C62 78 58 74 56 69 ' +
    'C56 81 61 89 71 93 L29 93 C39 89 44 81 44 69 C42 74 38 78 33 79 ' +
    'C23 81 13 74 13 61 C13 41 50 12 50 12 Z',
  piqueFin:
    'M50 12 C50 12 78 42 78 60 C78 72 70 79 62 77 C58 76 55 72 54 68 ' +
    'C54 80 58 88 66 92 L34 92 C42 88 46 80 46 68 C45 72 42 76 38 77 ' +
    'C30 79 22 72 22 60 C22 42 50 12 50 12 Z',
  coeur:
    'M50 84 C24 64 13 49 13 35 C13 23 22 15 33 15 C41 15 47 20 50 27 ' +
    'C53 20 59 15 67 15 C78 15 87 23 87 35 C87 49 76 64 50 84 Z',
  coeurPointu:
    'M50 90 C22 62 12 47 12 33 C12 21 21 13 33 13 C42 13 48 20 50 29 ' +
    'C52 20 58 13 67 13 C79 13 88 21 88 33 C88 47 78 62 50 90 Z',
  carreau: 'M50 8 L84 50 L50 92 L16 50 Z',
  carreauCourbe: 'M50 9 Q55 45 83 50 Q55 55 50 91 Q45 55 17 50 Q45 45 50 9 Z',
};

const fill = (d: string, color: string) => `<path d="${d}" fill="${color}"/>`;
const outline = (d: string, color: string) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="8" stroke-linejoin="round"/>`;

// Tarot (Latin) suit glyphs — épée / coupe / denier / bâton.
function epee(c: string): string {
  return (
    `<g fill="${c}">` +
    `<path d="M50 6 L56 66 L44 66 Z"/>` +
    `<rect x="33" y="63" width="34" height="7" rx="2"/>` +
    `<rect x="46" y="70" width="8" height="16"/>` +
    `<circle cx="50" cy="90" r="6"/></g>`
  );
}
function coupe(c: string): string {
  return (
    `<g fill="${c}">` +
    `<ellipse cx="50" cy="34" rx="24" ry="6"/>` +
    `<path d="M26 34 C26 58 38 68 50 68 C62 68 74 58 74 34 Z"/>` +
    `<rect x="46" y="67" width="8" height="14"/>` +
    `<ellipse cx="50" cy="86" rx="17" ry="5"/></g>`
  );
}
function denier(c: string): string {
  return (
    `<g fill="${c}">` +
    `<circle cx="50" cy="50" r="30" fill="none" stroke="${c}" stroke-width="7"/>` +
    `<circle cx="50" cy="50" r="11"/>` +
    `<circle cx="50" cy="16" r="3"/><circle cx="50" cy="84" r="3"/>` +
    `<circle cx="16" cy="50" r="3"/><circle cx="84" cy="50" r="3"/></g>`
  );
}
function baton(c: string): string {
  return (
    `<g fill="${c}">` +
    `<path d="M50 8 L56 14 L53 88 L47 88 L44 14 Z"/>` +
    `<path d="M44 40 L33 33 L45 47 Z"/>` +
    `<path d="M56 56 L67 49 L55 63 Z"/></g>`
  );
}

/** Build a club (trèfle) from three lobes + a stem. */
function club(color: string, r: number, top: number, sideY: number, spread: number): string {
  const stemTop = sideY - 2;
  return (
    `<g fill="${color}">` +
    `<circle cx="50" cy="${top}" r="${r}"/>` +
    `<circle cx="${50 - spread}" cy="${sideY}" r="${r}"/>` +
    `<circle cx="${50 + spread}" cy="${sideY}" r="${r}"/>` +
    `<path d="M44 ${stemTop} C44 72 40 84 30 93 L70 93 C60 84 56 72 56 ${stemTop} Z"/>` +
    `</g>`
  );
}

// ---- variants per suit -------------------------------------------------------

export const SUIT_VARIANTS: Record<Suit, SuitVariant[]> = {
  pique: [
    { id: 'plein', label: 'Plein', render: (c) => fill(P.pique, c) },
    { id: 'contour', label: 'Contour', render: (c) => outline(P.pique, c) },
    { id: 'fin', label: 'Élancé', render: (c) => fill(P.piqueFin, c) },
    { id: 'epee', label: 'Épée', render: (c) => epee(c) },
  ],
  coeur: [
    { id: 'plein', label: 'Plein', render: (c) => fill(P.coeur, c) },
    { id: 'contour', label: 'Contour', render: (c) => outline(P.coeur, c) },
    { id: 'pointu', label: 'Pointu', render: (c) => fill(P.coeurPointu, c) },
    { id: 'coupe', label: 'Coupe', render: (c) => coupe(c) },
  ],
  carreau: [
    { id: 'plein', label: 'Plein', render: (c) => fill(P.carreau, c) },
    { id: 'contour', label: 'Contour', render: (c) => outline(P.carreau, c) },
    { id: 'courbe', label: 'Courbé', render: (c) => fill(P.carreauCourbe, c) },
    { id: 'denier', label: 'Denier', render: (c) => denier(c) },
  ],
  trefle: [
    { id: 'plein', label: 'Plein', render: (c) => club(c, 17, 30, 55, 18) },
    { id: 'fin', label: 'Fin', render: (c) => club(c, 14, 32, 54, 16) },
    { id: 'gras', label: 'Gras', render: (c) => club(c, 19, 28, 56, 20) },
    { id: 'baton', label: 'Bâton', render: (c) => baton(c) },
  ],
};

/** Default variant id for a suit. */
export function defaultVariantId(suit: Suit): string {
  return SUIT_VARIANTS[suit][0].id;
}

/** Resolve inner SVG for a suit's chosen variant (falls back to the first). */
export function suitSymbol(
  suit: Suit,
  variantId?: string,
  color: string = suitColor(suit),
): string {
  const variants = SUIT_VARIANTS[suit];
  const v = variants.find((x) => x.id === variantId) ?? variants[0];
  return v.render(color);
}
