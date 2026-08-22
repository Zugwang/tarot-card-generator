// Card renderer — pure function producing an SVG string for a card.
// Pure-string output means the same code drives on-screen preview (via {@html})
// and, later, PNG export (serialize SVG → canvas → toBlob).
//
// Geometry: width is fixed (CARD_W); only height varies by format, so pip size
// and corner indices stay consistent across formats.

import { type Card, type Suit, type CourtRank, cardLabel, cardId } from '../model/deck';
import { suitColor, suitSymbol } from './suits';
import { classicTemplate, type PipTemplate } from './pipLayouts';
import { atoutImage, excuseImage, courtImage } from './illustrations';
import type { FreeCard, FreeLayer } from '../editor/free';

export const CARD_W = 250;

/** Card formats — fixed width, varying height. */
export type FormatId = 'standard' | 'carre' | 'tarot';
export const FORMATS: Record<FormatId, { label: string; h: number }> = {
  standard: { label: 'Standard', h: 350 },
  carre: { label: 'Carré', h: 250 },
  tarot: { label: 'Tarot', h: 455 },
};
export const DEFAULT_H = FORMATS.standard.h;

export const PIP_SIZE = 34; // default nominal symbol box for pip cards
const ACE_RATIO = 82 / PIP_SIZE; // keep the Ace proportional to the pip size

export interface RenderOptions {
  /** Card height in units (width is fixed at {@link CARD_W}). */
  height?: number;
  pipTemplate?: PipTemplate;
  /** Chosen enseigne variant id per suit (falls back to each suit's default). */
  suitVariants?: Partial<Record<Suit, string>>;
  /** Data-URL PNG overriding a suit's symbol (from user upload). */
  customSuitImages?: Partial<Record<Suit, string | null>>;
  /** Suit-symbol size in card units for pip cards (default {@link PIP_SIZE}). */
  pipSize?: number;
  /** Which court-illustration set to use. */
  courtStyle?: string;
  /** Free-mode override for this card (layers on top of / instead of the base). */
  freeCard?: FreeCard;
}

function escapeXml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
}

/** Render one free-mode layer to SVG markup. */
function renderLayer(layer: FreeLayer, h: number): string {
  const cx = layer.x * CARD_W;
  const cy = layer.y * h;
  if (layer.type === 'suit') {
    const color = layer.color ?? suitColor(layer.suit);
    return placeSymbol(suitSymbol(layer.suit, layer.variant, color), cx, cy, layer.size, layer.rot as 0 | 180);
  }
  if (layer.type === 'text') {
    return (
      `<g transform="translate(${round(cx)} ${round(cy)}) rotate(${layer.rot})">` +
      `<text text-anchor="middle" dominant-baseline="central" font-family="Georgia, serif" ` +
      `font-size="${layer.size}" fill="${layer.color}">${escapeXml(layer.text)}</text></g>`
    );
  }
  const s = layer.size;
  return (
    `<g transform="translate(${round(cx)} ${round(cy)}) rotate(${layer.rot})">` +
    `<image href="${layer.href}" xlink:href="${layer.href}" x="${-s / 2}" y="${-s / 2}" ` +
    `width="${s}" height="${s}" preserveAspectRatio="xMidYMid meet"/></g>`
  );
}

/** Pip layout area for a given height. */
function pipArea(h: number) {
  return { x: 48, y: 0.15 * h, w: CARD_W - 96, h: 0.7 * h };
}

/** Inner SVG for a suit's symbol: user PNG if present, else the vector variant. */
function symbolFor(suit: Suit, opts: RenderOptions, color?: string): string {
  const custom = opts.customSuitImages?.[suit];
  if (custom) {
    return (
      `<image href="${custom}" xlink:href="${custom}" x="0" y="0" width="100" height="100" ` +
      `preserveAspectRatio="xMidYMid meet"/>`
    );
  }
  return suitSymbol(suit, opts.suitVariants?.[suit], color);
}

/** One suit symbol placed at (cx,cy), rotated, scaled to `size`. */
function placeSymbol(inner: string, cx: number, cy: number, size: number, rot: number): string {
  const s = size / 100;
  return (
    `<g transform="translate(${round(cx)} ${round(cy)}) rotate(${rot}) ` +
    `scale(${round(s, 4)}) translate(-50 -50)">${inner}</g>`
  );
}

function cornerIndex(card: Card & { suit: Suit }, opts: RenderOptions, h: number): string {
  const label = cardLabel(card);
  const color = suitColor(card.suit);
  const mini = symbolFor(card.suit, opts, color);
  const block = (x: number, y: number, rot: number) =>
    `<g transform="translate(${x} ${y}) rotate(${rot})">` +
    `<text x="0" y="0" text-anchor="middle" font-family="Georgia, serif" ` +
    `font-size="26" font-weight="600" fill="${color}">${label}</text>` +
    `<g transform="translate(-11 6) scale(0.22)">${mini}</g>` +
    `</g>`;
  return block(26, 34, 0) + block(CARD_W - 26, h - 34, 180);
}

function renderPips(
  card: Card & { suit: Suit; rank: number },
  tpl: PipTemplate,
  pipSize: number,
  opts: RenderOptions,
  h: number,
): string {
  const inner = symbolFor(card.suit, opts);
  if (card.rank === 1) {
    return placeSymbol(inner, CARD_W / 2, h / 2, pipSize * ACE_RATIO, 0);
  }
  const area = pipArea(h);
  return tpl
    .layout(card.rank)
    .map((pl) =>
      placeSymbol(inner, area.x + pl.x * area.w, area.y + pl.y * area.h, pipSize, pl.rot),
    )
    .join('');
}

/** Full-frame illustration (e.g. Marseille atout), fitted inside the card. */
function renderImage(uid: string, href: string, h: number): string {
  const m = 7;
  const w = CARD_W - 2 * m;
  const ih = h - 2 * m;
  const id = `clip-${uid}`;
  return (
    `<defs><clipPath id="${id}"><rect x="${m}" y="${m}" width="${w}" height="${ih}" rx="11"/></clipPath></defs>` +
    `<image href="${href}" xlink:href="${href}" x="${m}" y="${m}" width="${w}" height="${ih}" ` +
    `preserveAspectRatio="xMidYMid meet" clip-path="url(#${id})"/>`
  );
}

const COURT_NAMES: Record<CourtRank, string> = {
  valet: 'Valet',
  cavalier: 'Cavalier',
  dame: 'Dame',
  roi: 'Roi',
};

/** Generated court figure (style "généré"): tinted panel + big enseigne + name band. */
function renderGeneratedCourt(suit: Suit, rank: CourtRank, opts: RenderOptions, h: number): string {
  const color = suitColor(suit);
  const symbol = symbolFor(suit, opts, color);
  const panelY = 0.1 * h;
  const panelH = 0.8 * h;
  const bandH = 0.12 * h;
  const bandY = panelY + panelH - bandH;
  return (
    `<rect x="22" y="${panelY}" width="${CARD_W - 44}" height="${panelH}" rx="14" ` +
    `fill="${color}14" stroke="${color}" stroke-width="2"/>` +
    `<g transform="translate(${CARD_W / 2} ${panelY + (panelH - bandH) / 2}) scale(1.15) translate(-50 -50)">${symbol}</g>` +
    `<rect x="22" y="${bandY}" width="${CARD_W - 44}" height="${bandH}" rx="0" fill="${color}"/>` +
    `<text x="${CARD_W / 2}" y="${bandY + bandH / 2}" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="Georgia, serif" font-size="26" font-weight="700" fill="#fff">${COURT_NAMES[rank]}</text>`
  );
}

/** Render a card to a standalone SVG string. */
export function renderCardSVG(card: Card, opts: RenderOptions = {}): string {
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
      corners = cornerIndex(card, opts, h);
      body = renderPips(card, tpl, pipSize, opts, h);
      break;
    case 'court': {
      const img = courtImage(card.suit, card.rank, opts.courtStyle);
      if (img) {
        body = renderImage(cardId(card), img, h);
      } else {
        corners = cornerIndex(card, opts, h);
        body = renderGeneratedCourt(card.suit, card.rank, opts, h);
      }
      break;
    }
    case 'atout':
      body = renderImage(cardId(card), atoutImage(card.number), h);
      break;
    case 'excuse':
      body = renderImage(cardId(card), excuseImage(), h);
      break;
  }

  const overlay = free?.layers.length ? free.layers.map((l) => renderLayer(l, h)).join('') : '';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `viewBox="0 0 ${CARD_W} ${h}" width="${CARD_W}" height="${h}" role="img">` +
    `<rect x="2" y="2" width="${CARD_W - 4}" height="${h - 4}" rx="16" ` +
    `fill="#ffffff" stroke="#d9d4c8" stroke-width="2"/>` +
    body +
    corners +
    overlay +
    `</svg>`
  );
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
