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
  viewMode: 'mosaic' as ViewMode,
  format: 'standard' as FormatChoice,
  /** Custom dimensions used when format === 'libre'. */
  customFormat: { w: 250, h: 350 },
  suitVariants: defaultVariants(),
  /** Per-suit symbol color (overrides the default red/black). */
  suitColors: { ...SUIT_COLORS } as Record<Suit, string>,
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
    customSuitImages: editor.customSuitImages,
    pipSize: editor.pipSize,
    courtStyle: editor.courtStyle,
    atoutStyle: editor.atoutStyle,
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
