// Central editor state (Svelte 5 runes). Components import `editor` and mutate
// its fields directly; reads in markup are reactive. Kept plain and
// serializable so it maps cleanly to the future JSON project save/load.

import { type DeckSize, type Suit, type Card, SUITS, cardId } from '../model/deck';
import { defaultVariantId, SUIT_COLORS } from '../render/suits';
import { FORMATS, type FormatId, type RenderOptions, cardElements } from '../render/card';
import { pipTemplate } from '../render/pipLayouts';
import { type FreeCard, emptyFreeCard, duplicated } from './free';

export type FormatChoice = FormatId | 'libre';

export type ViewMode = 'mosaic' | 'strip';
export type Tab = 'cartes' | 'dos' | 'libre';

function defaultVariants(): Record<Suit, string> {
  return Object.fromEntries(SUITS.map((s) => [s, defaultVariantId(s)])) as Record<Suit, string>;
}

function nullImages(): Record<Suit, string | null> {
  return Object.fromEntries(SUITS.map((s) => [s, null])) as Record<Suit, string | null>;
}

export const editor = $state({
  tab: 'cartes' as Tab,
  deckSize: 52 as DeckSize,
  /** 'cartes' = standard deck; 'oracle' = Oracle de Marseille; 'image' = a full-art image deck. */
  deckKind: 'cartes' as 'cartes' | 'oracle' | 'image',
  /** Which full-art image deck is active when deckKind === 'image' (see IMAGE_DECKS). */
  imageSet: 'rws' as string,
  viewMode: 'mosaic' as ViewMode,
  format: 'standard' as FormatChoice,
  /** Custom dimensions used when format === 'libre'. */
  customFormat: { w: 250, h: 350 },
  suitVariants: defaultVariants(),
  /** Per-suit symbol color (overrides the default red/black). */
  suitColors: { ...SUIT_COLORS } as Record<Suit, string>,
  /** Card background color. */
  cardBg: '#ffffff',
  /** Per-suit uploaded PNG (data-URL) overriding the vector symbol. */
  customSuitImages: nullImages(),
  /** How illustrations (atouts/figures) fit the card: 'meet' (entier) or 'slice' (rempli). */
  illustrationFit: 'meet' as 'meet' | 'slice',
  /** Suit-symbol size (card units) on pip cards. */
  pipSize: 34,
  /** Pip positioning template id. */
  pipTemplateId: 'classic',
  /** Court-illustration style: 'marseille' | 'grimaud' | 'poker' | 'blanc'. */
  courtStyle: 'marseille' as string,
  /** Atout-illustration style: 'marseille' | 'grimaud'. */
  atoutStyle: 'marseille' as string,
  /** Font id for the generated card indices (corner numbers/letters). */
  indexFont: 'georgia' as string,
  /** Index corners (number + suit): 0 (none), 2 (classic) or 4. */
  cornerCount: 2 as 0 | 2 | 4,
  selectedId: null as string | null,
  back: { templateId: 'quadrille', color: '#8a1f2b', suit: 'pique' as Suit },
  /** Free-mode overrides, keyed by card id. */
  freeCards: {} as Record<string, FreeCard>,
  /** Currently selected free layer id (for the properties panel). */
  freeLayerId: null as string | null,
});

/** Get (creating if needed) the free-mode override for a card. */
export function ensureFree(cardId: string): FreeCard {
  if (!editor.freeCards[cardId]) editor.freeCards[cardId] = emptyFreeCard();
  return editor.freeCards[cardId];
}

/** Move a free layer up/down in the z-order (dir +1 = forward). */
export function reorderLayer(cardId: string, layerId: string, dir: 1 | -1): void {
  const f = editor.freeCards[cardId];
  if (!f) return;
  const i = f.layers.findIndex((l) => l.id === layerId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= f.layers.length) return;
  const [x] = f.layers.splice(i, 1);
  f.layers.splice(j, 0, x);
}

let clipboard: import('./free').FreeLayer | null = null;
/** Copy a layer to the internal clipboard. */
export function copyLayer(cardId: string, layerId: string): void {
  const l = editor.freeCards[cardId]?.layers.find((x) => x.id === layerId);
  if (l) clipboard = $state.snapshot(l) as import('./free').FreeLayer;
}
/** Paste the clipboard layer (offset) onto a card. */
export function pasteLayer(cardId: string): void {
  if (!clipboard) return;
  const c = duplicated(clipboard);
  ensureFree(cardId).layers.push(c);
  editor.freeLayerId = c.id;
}

/** Remove a free layer. */
export function removeLayer(cardId: string, layerId: string): void {
  const f = editor.freeCards[cardId];
  if (!f) return;
  f.layers = f.layers.filter((l) => l.id !== layerId);
  if (editor.freeLayerId === layerId) editor.freeLayerId = null;
}

/** Duplicate a free layer and select the copy. */
export function duplicateLayer(cardId: string, layerId: string): void {
  const f = editor.freeCards[cardId];
  const l = f?.layers.find((x) => x.id === layerId);
  if (!f || !l) return;
  const copy = duplicated($state.snapshot(l));
  f.layers.push(copy);
  editor.freeLayerId = copy.id;
}

// ---- deck palette -----------------------------------------------------------

export function setRouge(c: string): void {
  editor.suitColors.coeur = c;
  editor.suitColors.carreau = c;
}
export function setNoire(c: string): void {
  editor.suitColors.pique = c;
  editor.suitColors.trefle = c;
}

function hslHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}
const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Tasteful randomization (light bg, legible inks) — "slightly random". */
export function slightlyRandomPalette(): void {
  editor.cardBg = hslHex(rand(0, 360), rand(12, 45), rand(90, 97));
  editor.back.color = hslHex(rand(0, 360), rand(40, 72), rand(28, 55));
  setRouge(hslHex(rand(0, 360), rand(55, 82), rand(38, 52)));
  setNoire(hslHex(rand(0, 360), rand(8, 40), rand(14, 30)));
}

/** Fully random — any hue, saturation and lightness for all four. */
export function trulyRandomPalette(): void {
  const any = () => hslHex(rand(0, 360), rand(0, 100), rand(0, 100));
  editor.cardBg = any();
  editor.back.color = any();
  setRouge(any());
  setNoire(any());
}

/** Reset the palette to the classic defaults. */
export function standardPalette(): void {
  editor.cardBg = '#ffffff';
  editor.back.color = '#8a1f2b';
  setRouge('#c0392b');
  setNoire('#161616');
}

/** Effective card dimensions from the current format choice. */
export function formatWH(): { w: number; h: number } {
  if (editor.format === 'libre') {
    return { w: Math.max(60, editor.customFormat.w), h: Math.max(60, editor.customFormat.h) };
  }
  const f = FORMATS[editor.format];
  return { w: f.w, h: f.h };
}

/** Current render options derived from editor state (without the per-card free layer). */
export function cardRenderOptions(): RenderOptions {
  const { w, h } = formatWH();
  return {
    width: w,
    height: h,
    pipTemplate: pipTemplate(editor.pipTemplateId),
    suitVariants: editor.suitVariants,
    suitColors: editor.suitColors,
    cardBg: editor.cardBg,
    customSuitImages: editor.customSuitImages,
    pipSize: editor.pipSize,
    courtStyle: editor.courtStyle,
    atoutStyle: editor.atoutStyle,
    indexFont: editor.indexFont,
    cornerCount: editor.cornerCount,
    imageFit: editor.illustrationFit,
    backConfig: editor.back,
  };
}

/** Build the free-mode state for a card from the current deck options. */
function freeFromModel(card: Card): FreeCard {
  return card.kind === 'back'
    ? emptyFreeCard()
    : { hideBase: true, layers: cardElements(card, cardRenderOptions()) };
}

/** Auto-decompose a card into free layers on entering free mode (except the back). */
export function ensureExploded(card: Card): void {
  const id = cardId(card);
  if (editor.freeCards[id]) return;
  editor.freeCards[id] = freeFromModel(card);
}

/** Discard manual edits and rebuild the card from the current model/options. */
export function regenerateCard(card: Card): void {
  editor.freeLayerId = null;
  editor.freeCards[cardId(card)] = freeFromModel(card);
}

export function setSuitVariant(suit: Suit, variantId: string): void {
  editor.suitVariants[suit] = variantId;
}

export function setCustomSuitImage(suit: Suit, dataUrl: string | null): void {
  editor.customSuitImages[suit] = dataUrl;
}
