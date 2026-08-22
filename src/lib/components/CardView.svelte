<script lang="ts">
  import { type Card, cardId } from '../model/deck';
  import { renderCardSVG } from '../render/card';
  import { editor, cardRenderOptions } from '../editor/store.svelte';

  let {
    card,
    selected = false,
    onselect,
  }: { card: Card; selected?: boolean; onselect?: () => void } = $props();

  const svg = $derived(
    renderCardSVG(card, { ...cardRenderOptions(), freeCard: editor.freeCards[cardId(card)] }),
  );
</script>

<button class="cardview" class:selected type="button" onclick={onselect} aria-pressed={selected}>
  {@html svg}
</button>

<style>
  .cardview {
    display: block;
    padding: 0;
    border: 2px solid transparent;
    border-radius: 12px;
    background: none;
    cursor: pointer;
    line-height: 0;
    transition: transform 0.1s, border-color 0.1s;
  }
  .cardview:hover {
    transform: translateY(-2px);
  }
  .cardview.selected {
    border-color: var(--accent);
  }
  .cardview :global(svg) {
    width: 100%;
    height: auto;
    border-radius: 9px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
  }
</style>
