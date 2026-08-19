<script lang="ts">
  import { SUITS, type Suit } from '../model/deck';
  import { SUIT_VARIANTS, suitColor, suitSymbol } from '../render/suits';
  import { editor, setSuitVariant } from '../editor/store.svelte';

  const SUIT_LABELS: Record<Suit, string> = {
    pique: 'Pique',
    coeur: 'Cœur',
    carreau: 'Carreau',
    trefle: 'Trèfle',
  };
</script>

<div class="picker">
  <h2>Enseignes</h2>
  {#each SUITS as suit}
    <div class="suit">
      <span class="suit-name">{SUIT_LABELS[suit]}</span>
      <div class="variants" role="group" aria-label={SUIT_LABELS[suit]}>
        {#each SUIT_VARIANTS[suit] as v}
          <button
            class="swatch"
            class:active={editor.suitVariants[suit] === v.id}
            title={v.label}
            aria-label="{SUIT_LABELS[suit]} — {v.label}"
            aria-pressed={editor.suitVariants[suit] === v.id}
            onclick={() => setSuitVariant(suit, v.id)}
          >
            <svg viewBox="0 0 100 100" aria-hidden="true">
              {@html suitSymbol(suit, v.id, suitColor(suit))}
            </svg>
          </button>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  h2 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.6;
    margin: 0 0 0.8rem;
  }
  .suit {
    margin-bottom: 1rem;
  }
  .suit-name {
    font-size: 0.85rem;
    font-weight: 600;
    display: block;
    margin-bottom: 0.35rem;
  }
  .variants {
    display: flex;
    gap: 0.4rem;
  }
  .swatch {
    flex: 1;
    aspect-ratio: 1;
    padding: 6px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--panel);
    cursor: pointer;
    transition: border-color 0.1s, transform 0.1s;
  }
  .swatch:hover {
    transform: translateY(-1px);
  }
  .swatch.active {
    border-color: var(--accent);
    box-shadow: inset 0 0 0 1px var(--accent);
  }
  .swatch svg {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
