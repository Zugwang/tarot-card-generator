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
export type ShapeKind = 'rect' | 'ellipse' | 'line';
export type FreeLayer =
  | (BaseLayer & { type: 'suit'; suit: Suit; variant?: string; color?: string })
  | (BaseLayer & { type: 'text'; text: string; color: string; font?: string })
  | (BaseLayer & { type: 'image'; href: string; cover?: boolean })
  | (BaseLayer & { type: 'shape'; shape: ShapeKind; fill: string; stroke: string; strokeWidth: number });

export interface FreeCard {
  hideBase: boolean;
  layers: FreeLayer[];
  /** Optional full-card cover image (used by "fill all with random images"). */
  bgImage?: { href: string; rot: number };
}

export function emptyFreeCard(): FreeCard {
  return { hideBase: false, layers: [] };
}

/** Canonical rotation range shared by the slider and the mouse handle: (-180, 180]. */
export function normalizeAngle(deg: number): number {
  const a = ((deg % 360) + 360) % 360; // [0, 360)
  return a > 180 ? a - 360 : a; // (-180, 180]
}

export const newLayerId = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
const uid = newLayerId;

const base = (): BaseLayer => ({ id: uid(), x: 0.5, y: 0.5, size: 46, rot: 0 });

export function newSuitLayer(suit: Suit): FreeLayer {
  return { ...base(), type: 'suit', suit };
}
export function newTextLayer(): FreeLayer {
  return { ...base(), type: 'text', text: 'Texte', color: '#161616', size: 28, font: 'georgia' };
}
export function newImageLayer(href: string): FreeLayer {
  return { ...base(), type: 'image', href, size: 90 };
}
/** Full-card background image pinned to the bottom of the layer stack (cover-fit).
 *  `rot` (0 or 90) orients a landscape source into a portrait card. */
export function newCoverLayer(href: string, rot = 0): FreeLayer {
  return { ...base(), type: 'image', href, cover: true, size: 0, rot };
}
/** A cover image layer fills the whole card and isn't directly draggable. */
export function isCover(l: FreeLayer): boolean {
  return l.type === 'image' && (l as { cover?: boolean }).cover === true;
}
export function newShapeLayer(shape: ShapeKind): FreeLayer {
  return { ...base(), type: 'shape', shape, size: 80, fill: shape === 'line' ? 'none' : '#8a1f2b', stroke: '#161616', strokeWidth: shape === 'line' ? 3 : 0 };
}

/** Copy of a (plain) layer with a fresh id, nudged slightly. */
export function duplicated(l: FreeLayer): FreeLayer {
  return { ...l, id: uid(), x: Math.min(1, l.x + 0.04), y: Math.min(1, l.y + 0.04) };
}
