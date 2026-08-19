// Card renderer — pure function producing an SVG string for a card.
// Pure-string output means the same code drives on-screen preview (via {@html})
// and, later, PNG export (serialize SVG → canvas → toBlob).

import { type Card, type Suit, cardLabel } from '../model/deck';
import { suitColor, suitSymbol } from './suits';
import { classicTemplate, type PipTemplate } from './pipLayouts';

// Card geometry (SVG user units). Poker-ish 2.5:3.5 ratio.
export const CARD_W = 250;
export const CARD_H = 350;

// Inner rectangle the pips are laid out within.
const PIP_AREA = { x: 48, y: 52, w: CARD_W - 96, h: CARD_H - 104 };
const PIP_SIZE = 34; // nominal symbol box for pip cards
const ACE_SIZE = 82; // large centered Ace

export interface RenderOptions {
  pipTemplate?: PipTemplate;
}

/** One suit symbol placed at (cx,cy), rotated, scaled to `size`. */
function placeSymbol(inner: string, cx: number, cy: number, size: number, rot: number): string {
  const s = size / 100;
  return (
    `<g transform="translate(${round(cx)} ${round(cy)}) rotate(${rot}) ` +
    `scale(${round(s, 4)}) translate(-50 -50)">${inner}</g>`
  );
}

function cornerIndex(label: string, suit: Suit): string {
  const color = suitColor(suit);
  const mini = suitSymbol(suit, color);
  // Top-left index, then a 180°-rotated copy at bottom-right.
  const block = (x: number, y: number, rot: number) =>
    `<g transform="translate(${x} ${y}) rotate(${rot})">` +
    `<text x="0" y="0" text-anchor="middle" font-family="Georgia, serif" ` +
    `font-size="26" font-weight="600" fill="${color}">${label}</text>` +
    `<g transform="translate(-11 6) scale(0.22)">${mini}</g>` +
    `</g>`;
  return block(26, 34, 0) + block(CARD_W - 26, CARD_H - 34, 180);
}

function renderPips(suit: Suit, rank: number, tpl: PipTemplate): string {
  const inner = suitSymbol(suit);
  if (rank === 1) {
    return placeSymbol(inner, CARD_W / 2, CARD_H / 2, ACE_SIZE, 0);
  }
  const placements = tpl.layout(rank);
  return placements
    .map((pl) =>
      placeSymbol(
        inner,
        PIP_AREA.x + pl.x * PIP_AREA.w,
        PIP_AREA.y + pl.y * PIP_AREA.h,
        PIP_SIZE,
        pl.rot,
      ),
    )
    .join('');
}

/** Placeholder for court cards + atouts (illustrations come later). */
function renderPlaceholder(label: string, color: string, symbol?: string): string {
  const glyph = symbol
    ? `<g transform="translate(${CARD_W / 2} ${CARD_H / 2 - 10}) scale(1.1) translate(-50 -50)">${symbol}</g>`
    : '';
  return (
    `<rect x="34" y="44" width="${CARD_W - 68}" height="${CARD_H - 88}" rx="10" ` +
    `fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="5 5" opacity="0.5"/>` +
    glyph +
    `<text x="${CARD_W / 2}" y="${CARD_H / 2 + 70}" text-anchor="middle" ` +
    `font-family="Georgia, serif" font-size="40" font-weight="700" fill="${color}">${label}</text>`
  );
}

/** Render a card to a standalone SVG string. */
export function renderCardSVG(card: Card, opts: RenderOptions = {}): string {
  const tpl = opts.pipTemplate ?? classicTemplate;
  let body = '';
  let corners = '';

  switch (card.kind) {
    case 'pip':
      corners = cornerIndex(cardLabel(card), card.suit);
      body = renderPips(card.suit, card.rank, tpl);
      break;
    case 'court':
      corners = cornerIndex(cardLabel(card), card.suit);
      body = renderPlaceholder(cardLabel(card), suitColor(card.suit), suitSymbol(card.suit));
      break;
    case 'atout':
      body = renderPlaceholder(String(card.number), '#8a6d1f', undefined);
      break;
    case 'excuse':
      body = renderPlaceholder('★', '#8a6d1f', undefined);
      break;
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}" ` +
    `width="${CARD_W}" height="${CARD_H}" role="img">` +
    `<rect x="2" y="2" width="${CARD_W - 4}" height="${CARD_H - 4}" rx="16" ` +
    `fill="#ffffff" stroke="#d9d4c8" stroke-width="2"/>` +
    body +
    corners +
    `</svg>`
  );
}

function round(n: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
