// Card renderer — pure function producing an SVG string for a card, plus a
// generator (cardElements) that emits the card as free-mode layers (the first
// step of the shared Document Model: generate → elements → render).

import { type Card, type Suit, cardLabel, cardId } from '../model/deck';
import { suitColor, suitSymbol } from './suits';
import { classicTemplate, type PipTemplate } from './pipLayouts';
import { atoutImage, excuseImage, courtImage } from './illustrations';
import { backBase } from './back';
import { type FreeCard, type FreeLayer, newLayerId } from '../editor/free';

export const CARD_W = 250; // default width
export const DEFAULT_W = CARD_W;

/** Card formats — width + height in card units. */
export type FormatId = 'standard' | 'carre' | 'tarot';
export const FORMATS: Record<FormatId, { label: string; w: number; h: number }> = {
  standard: { label: 'Standard', w: 250, h: 350 },
  carre: { label: 'Carré', w: 300, h: 300 },
  tarot: { label: 'Tarot', w: 250, h: 455 },
};
export const DEFAULT_H = FORMATS.standard.h;

export const PIP_SIZE = 34; // default nominal symbol box for pip cards
const ACE_RATIO = 82 / PIP_SIZE; // keep the Ace proportional to the pip size

export interface RenderOptions {
  width?: number;
  height?: number;
  pipTemplate?: PipTemplate;
  suitVariants?: Partial<Record<Suit, string>>;
  suitColors?: Partial<Record<Suit, string>>;
  customSuitImages?: Partial<Record<Suit, string | null>>;
  imageFit?: 'meet' | 'slice';
  pipSize?: number;
  /** Court set: 'marseille' | 'grimaud' | 'poker' | 'blanc'. */
  courtStyle?: string;
  /** Back motif (used by the 'back' card). */
  backConfig?: { templateId: string; color: string };
  /** Free-mode override for this card (layers on top of / instead of the base). */
  freeCard?: FreeCard;
}

function escapeXml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
}
function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function pipArea(w: number, h: number) {
  return { x: 0.19 * w, y: 0.15 * h, w: 0.62 * w, h: 0.7 * h };
}
function colorFor(suit: Suit, opts: RenderOptions): string {
  return opts.suitColors?.[suit] ?? suitColor(suit);
}
function symbolFor(suit: Suit, opts: RenderOptions, color: string = colorFor(suit, opts)): string {
  const custom = opts.customSuitImages?.[suit];
  if (custom) {
    return `<image href="${custom}" xlink:href="${custom}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet"/>`;
  }
  return suitSymbol(suit, opts.suitVariants?.[suit], color);
}

// ---- direct SVG rendering ----------------------------------------------------

function placeSymbol(inner: string, cx: number, cy: number, size: number, rot: number): string {
  const s = size / 100;
  return `<g transform="translate(${round(cx)} ${round(cy)}) rotate(${rot}) scale(${round(s, 4)}) translate(-50 -50)">${inner}</g>`;
}

function renderLayer(layer: FreeLayer, w: number, h: number): string {
  const cx = layer.x * w;
  const cy = layer.y * h;
  if (layer.type === 'suit') {
    const color = layer.color ?? suitColor(layer.suit);
    return placeSymbol(suitSymbol(layer.suit, layer.variant, color), cx, cy, layer.size, layer.rot as 0 | 180);
  }
  if (layer.type === 'text') {
    return `<g transform="translate(${round(cx)} ${round(cy)}) rotate(${layer.rot})"><text text-anchor="middle" dominant-baseline="central" font-family="Georgia, serif" font-size="${layer.size}" fill="${layer.color}">${escapeXml(layer.text)}</text></g>`;
  }
  const s = layer.size;
  return `<g transform="translate(${round(cx)} ${round(cy)}) rotate(${layer.rot})"><image href="${layer.href}" xlink:href="${layer.href}" x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" preserveAspectRatio="xMidYMid meet"/></g>`;
}

function cornerIndex(card: Card & { suit: Suit }, opts: RenderOptions, w: number, h: number): string {
  const label = cardLabel(card);
  const color = colorFor(card.suit, opts);
  const mini = symbolFor(card.suit, opts, color);
  const block = (x: number, y: number, rot: number) =>
    `<g transform="translate(${round(x)} ${round(y)}) rotate(${rot})">` +
    `<text x="0" y="0" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-weight="600" fill="${color}">${label}</text>` +
    `<g transform="translate(-11 6) scale(0.22)">${mini}</g></g>`;
  return block(0.104 * w, 0.097 * h, 0) + block(w - 0.104 * w, h - 0.097 * h, 180);
}

function renderPips(card: Card & { suit: Suit; rank: number }, tpl: PipTemplate, pipSize: number, opts: RenderOptions, w: number, h: number): string {
  const inner = symbolFor(card.suit, opts);
  if (card.rank === 1) return placeSymbol(inner, w / 2, h / 2, pipSize * ACE_RATIO, 0);
  const area = pipArea(w, h);
  return tpl.layout(card.rank).map((pl) => placeSymbol(inner, area.x + pl.x * area.w, area.y + pl.y * area.h, pipSize, pl.rot)).join('');
}

function renderImage(uid: string, href: string, w: number, h: number, fit: 'meet' | 'slice' = 'meet'): string {
  const m = 7;
  const iw = w - 2 * m;
  const ih = h - 2 * m;
  const id = `clip-${uid}`;
  return (
    `<defs><clipPath id="${id}"><rect x="${m}" y="${m}" width="${iw}" height="${ih}" rx="11"/></clipPath></defs>` +
    `<image href="${href}" xlink:href="${href}" x="${m}" y="${m}" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMid ${fit}" clip-path="url(#${id})"/>`
  );
}

// ---- generator: card → free-mode layers (Document Model amorce) --------------

const suitL = (suit: Suit, variant: string | undefined, color: string, x: number, y: number, size: number, rot: number): FreeLayer => ({ id: newLayerId(), type: 'suit', suit, variant, color, x, y, size, rot });
const textL = (text: string, color: string, x: number, y: number, size: number, rot: number): FreeLayer => ({ id: newLayerId(), type: 'text', text, color, x, y, size, rot });
const imageL = (href: string, x: number, y: number, size: number, rot: number): FreeLayer => ({ id: newLayerId(), type: 'image', href, x, y, size, rot });

/** Emit a card as free-mode layers (used to "explode" a generated card). */
export function cardElements(card: Card, opts: RenderOptions = {}): FreeLayer[] {
  const w = opts.width ?? DEFAULT_W;
  const h = opts.height ?? DEFAULT_H;
  const tpl = opts.pipTemplate ?? classicTemplate;
  const pipSize = opts.pipSize ?? PIP_SIZE;
  const els: FreeLayer[] = [];

  const sym = (suit: Suit, cx: number, cy: number, size: number, rot: number): FreeLayer => {
    const custom = opts.customSuitImages?.[suit];
    return custom
      ? imageL(custom, cx / w, cy / h, size, rot)
      : suitL(suit, opts.suitVariants?.[suit], colorFor(suit, opts), cx / w, cy / h, size, rot);
  };
  const corners = (suit: Suit, label: string) => {
    const color = colorFor(suit, opts);
    els.push(textL(label, color, 0.104, 0.088, 26, 0), sym(suit, 0.104 * w, 0.14 * h, 22, 0));
    els.push(textL(label, color, 1 - 0.104, 1 - 0.088, 26, 180), sym(suit, w - 0.104 * w, h - 0.14 * h, 22, 180));
  };

  switch (card.kind) {
    case 'pip':
      corners(card.suit, cardLabel(card));
      if (card.rank === 1) els.push(sym(card.suit, w / 2, h / 2, pipSize * ACE_RATIO, 0));
      else {
        const area = pipArea(w, h);
        for (const pl of tpl.layout(card.rank)) els.push(sym(card.suit, area.x + pl.x * area.w, area.y + pl.y * area.h, pipSize, pl.rot));
      }
      break;
    case 'court': {
      const img = courtImage(card.suit, card.rank, opts.courtStyle);
      if (img) els.push(imageL(img, 0.5, 0.5, h * 0.94, 0));
      else corners(card.suit, cardLabel(card));
      break;
    }
    case 'atout':
      els.push(imageL(atoutImage(card.number), 0.5, 0.5, h * 0.94, 0));
      break;
    case 'excuse':
      els.push(imageL(excuseImage(), 0.5, 0.5, h * 0.94, 0));
      break;
    case 'back':
      break; // back keeps its motif background, not decomposed
  }
  return els;
}

// ---- main entry --------------------------------------------------------------

/** Render a card to a standalone SVG string. */
export function renderCardSVG(card: Card, opts: RenderOptions = {}): string {
  const w = opts.width ?? DEFAULT_W;
  const h = opts.height ?? DEFAULT_H;
  const tpl = opts.pipTemplate ?? classicTemplate;
  const pipSize = opts.pipSize ?? PIP_SIZE;
  const free = opts.freeCard;
  let body = '';
  let corners = '';

  if (free?.hideBase) {
    // Blank base — only the free layers show.
  } else
    switch (card.kind) {
      case 'pip':
        corners = cornerIndex(card, opts, w, h);
        body = renderPips(card, tpl, pipSize, opts, w, h);
        break;
      case 'court': {
        const img = courtImage(card.suit, card.rank, opts.courtStyle);
        if (img) body = renderImage(cardId(card), img, w, h, opts.imageFit);
        else corners = cornerIndex(card, opts, w, h); // 'blanc' = index only
        break;
      }
      case 'atout':
        body = renderImage(cardId(card), atoutImage(card.number), w, h, opts.imageFit);
        break;
      case 'excuse':
        body = renderImage(cardId(card), excuseImage(), w, h, opts.imageFit);
        break;
      case 'back':
        body = backBase(opts.backConfig?.templateId ?? 'quadrille', opts.backConfig?.color ?? '#8a1f2b', w, h);
        break;
    }

  const overlay = free?.layers.length ? free.layers.map((l) => renderLayer(l, w, h)).join('') : '';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">` +
    `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="16" fill="#ffffff" stroke="#d9d4c8" stroke-width="2"/>` +
    body +
    corners +
    overlay +
    `</svg>`
  );
}
