<script lang="ts">
  /* The four tarot suits, borrowed from Tarotier's own parametric registry
     rather than from Unicode. `suitSymbol` is a pure function returning inner
     SVG markup in a 100x100 box centred on (50,50) — it runs under node, has no
     DOM dependency, and is the same code that renders the printed cards.
     Belotier used to display ♠♥♦♣ while this sat unused two directories away. */
  import { suitSymbol } from '../../src/lib/render/suits';
  import type { Suit } from '../../src/lib/model/deck';
  import { SUIT_LABEL, SUIT_VARIANT } from './cards';

  interface Props {
    suit: string;
    size?: number;
    /** Override the variant; defaults to the tarot one (epee/coupe/denier/baton). */
    variant?: string;
    /** Any CSS colour. `currentColor` lets the parent drive it. */
    color?: string;
    /** Decorative instances get aria-hidden; standalone ones get a label. */
    labelled?: boolean;
  }
  let {
    suit, size = 20, variant, color = 'currentColor', labelled = false,
  }: Props = $props();

  const markup = $derived(
    suitSymbol(suit as Suit, variant ?? SUIT_VARIANT[suit] ?? undefined, color),
  );
</script>

<svg
  class="suit"
  viewBox="0 0 100 100"
  width={size}
  height={size}
  role={labelled ? 'img' : 'presentation'}
  aria-label={labelled ? SUIT_LABEL[suit] : undefined}
  aria-hidden={labelled ? undefined : 'true'}
>{@html markup}</svg>

<style>
  .suit {
    display: inline-block;
    vertical-align: -.15em;
    flex: none;
    /* The engraved look: a hairline highlight below, a shadow above. */
    filter: drop-shadow(0 1px 0 rgba(234, 211, 160, .16)) drop-shadow(0 -1px 1px rgba(0, 0, 0, .5));
  }
</style>
