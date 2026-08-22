// Central editor state (Svelte 5 runes). Components import `editor` and mutate
// its fields directly; reads in markup are reactive. Kept plain and
// serializable so it maps cleanly to the future JSON project save/load.

import { type DeckSize, type Suit, SUITS } from '../model/deck';
import { defaultVariantId } from '../render/suits';
import { FORMATS, type FormatId, type RenderOptions } from '../render/card';
import { pipTemplate } from '../render/pipLayouts';
import { type FreeCard, emptyFreeCard } from './free';

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
  format: 'standard' as FormatId,
  suitVariants: defaultVariants(),
  /** Per-suit uploaded PNG (data-URL) overriding the vector symbol. */
  customSuitImages: nullImages(),
  /** Suit-symbol size (card units) on pip cards. */
  pipSize: 34,
  /** Pip positioning template id. */
  pipTemplateId: 'classic',
  /** Court-illustration style: 'grimaud' | 'marseille' | 'genere'. */
  courtStyle: 'marseille' as string,
  selectedId: null as string | null,
  back: { templateId: 'quadrille', color: '#8a1f2b' },
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

/** Current render options derived from editor state (without the per-card free layer). */
export function cardRenderOptions(): RenderOptions {
  return {
    height: FORMATS[editor.format].h,
    pipTemplate: pipTemplate(editor.pipTemplateId),
    suitVariants: editor.suitVariants,
    customSuitImages: editor.customSuitImages,
    pipSize: editor.pipSize,
    courtStyle: editor.courtStyle,
  };
}

export function setSuitVariant(suit: Suit, variantId: string): void {
  editor.suitVariants[suit] = variantId;
}

export function setCustomSuitImage(suit: Suit, dataUrl: string | null): void {
  editor.customSuitImages[suit] = dataUrl;
}
