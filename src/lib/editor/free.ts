// Free-mode model: per-card override made of freely-placed layers on top of
// (or instead of) the generated card. Positions are fractions of the card
// (0..1); size is in card units; rot in degrees. Serializable → travels in the
// JSON project and is rendered statically by renderCardSVG (so PNG export works).

import type { Suit } from '../model/deck';

export interface BaseLayer {
  id: string;
  x: number;
  y: number;
  size: number;
  rot: number;
}
export type FreeLayer =
  | (BaseLayer & { type: 'suit'; suit: Suit; variant?: string; color?: string })
  | (BaseLayer & { type: 'text'; text: string; color: string })
  | (BaseLayer & { type: 'image'; href: string });

export interface FreeCard {
  hideBase: boolean;
  layers: FreeLayer[];
}

export function emptyFreeCard(): FreeCard {
  return { hideBase: false, layers: [] };
}

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const base = (): BaseLayer => ({ id: uid(), x: 0.5, y: 0.5, size: 46, rot: 0 });

export function newSuitLayer(suit: Suit): FreeLayer {
  return { ...base(), type: 'suit', suit };
}
export function newTextLayer(): FreeLayer {
  return { ...base(), type: 'text', text: 'Texte', color: '#161616', size: 28 };
}
export function newImageLayer(href: string): FreeLayer {
  return { ...base(), type: 'image', href, size: 90 };
}
