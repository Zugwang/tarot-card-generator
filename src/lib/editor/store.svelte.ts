// Central editor state (Svelte 5 runes). Components import `editor` and mutate
// its fields directly; reads in markup are reactive. Kept plain and
// serializable so it maps cleanly to the future JSON project save/load.

import { type DeckSize, type Suit, SUITS } from '../model/deck';
import { defaultVariantId } from '../render/suits';

export type ViewMode = 'mosaic' | 'strip';

function defaultVariants(): Record<Suit, string> {
  return Object.fromEntries(SUITS.map((s) => [s, defaultVariantId(s)])) as Record<Suit, string>;
}

export const editor = $state({
  deckSize: 52 as DeckSize,
  viewMode: 'mosaic' as ViewMode,
  suitVariants: defaultVariants(),
  /** Suit-symbol size (card units) on pip cards. */
  pipSize: 34,
  selectedId: null as string | null,
});

export function setSuitVariant(suit: Suit, variantId: string): void {
  editor.suitVariants[suit] = variantId;
}
