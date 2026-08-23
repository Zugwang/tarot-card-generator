<script lang="ts">
  import { SUITS, type Suit } from '../model/deck';
  import { SUIT_VARIANTS, suitSymbol } from '../render/suits';
  import { editor, setSuitVariant, setCustomSuitImage } from '../editor/store.svelte';

  const SUIT_LABELS: Record<Suit, string> = {
    pique: 'Pique',
    coeur: 'Cœur',
    carreau: 'Carreau',
    trefle: 'Trèfle',
  };

  let open = $state<Suit | null>(null);
  let pos = $state({ x: 0, y: 0 });

  function toggle(suit: Suit, e: MouseEvent) {
    if (open === suit) {
      open = null;
      return;
    }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    pos = { x: r.right + 8, y: r.top };
    open = suit;
  }
  function pick(suit: Suit, variantId: string) {
    setCustomSuitImage(suit, null);
    setSuitVariant(suit, variantId);
    open = null;
  }
  function onFile(suit: Suit, e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setCustomSuitImage(suit, reader.result as string);
      reader.readAsDataURL(file);
    }
    input.value = '';
  }
</script>

<div class="picker">
  <h2>Enseignes</h2>
  {#each SUITS as suit}
    <div class="suit">
      <span class="suit-name">
        {SUIT_LABELS[suit]}
        <input class="suitcolor" type="color" bind:value={editor.suitColors[suit]} aria-label="Couleur {SUIT_LABELS[suit]}" />
      </span>
      <div class="row2">
        <button class="current" onclick={(e) => toggle(suit, e)} aria-haspopup="true" aria-expanded={open === suit}>
          {#if editor.customSuitImages[suit]}
            <img src={editor.customSuitImages[suit]} alt="" />
          {:else}
            <svg viewBox="0 0 100 100" aria-hidden="true">{@html suitSymbol(suit, editor.suitVariants[suit], editor.suitColors[suit])}</svg>
          {/if}
          <span class="caret">▸</span>
        </button>
        <label class="up" title="Charger un PNG">＋<input type="file" accept="image/png,image/*" onchange={(e) => onFile(suit, e)} /></label>
      </div>
    </div>
  {/each}
</div>

{#if open}
  <button class="backdrop" aria-label="Fermer" onclick={() => (open = null)}></button>
  {@const s = open}
  <div class="flyout" style="left:{pos.x}px; top:{pos.y}px">
    {#each SUIT_VARIANTS[s] as v (v.id)}
      <button
        class="swatch"
        class:active={!editor.customSuitImages[s] && editor.suitVariants[s] === v.id}
        title={v.label}
        onclick={() => pick(s, v.id)}
      >
        <svg viewBox="0 0 100 100" aria-hidden="true">{@html suitSymbol(s, v.id, editor.suitColors[s])}</svg>
      </button>
    {/each}
  </div>
{/if}

<style>
  h2 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.6;
    margin: 0 0 0.8rem;
  }
  .suit {
    margin-bottom: 0.8rem;
  }
  .suit-name {
    font-size: 0.85rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.35rem;
  }
  .suitcolor {
    width: 26px;
    height: 20px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 5px;
    background: transparent;
    cursor: pointer;
  }
  .row2 {
    display: flex;
    gap: 0.4rem;
  }
  .current {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--panel);
    color: inherit;
    cursor: pointer;
  }
  .current:hover {
    border-color: var(--accent);
  }
  .current svg,
  .current img {
    width: 26px;
    height: 26px;
    object-fit: contain;
  }
  .caret {
    margin-left: auto;
    opacity: 0.5;
  }
  .up {
    display: grid;
    place-items: center;
    width: 34px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--panel);
    cursor: pointer;
    font-size: 1.1rem;
    opacity: 0.7;
  }
  .up input {
    display: none;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    background: transparent;
    border: none;
    padding: 0;
    z-index: 40;
    cursor: default;
  }
  .flyout {
    position: fixed;
    z-index: 41;
    display: grid;
    grid-template-columns: repeat(3, 44px);
    gap: 0.4rem;
    padding: 0.6rem;
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    max-height: 70vh;
    overflow: auto;
  }
  .swatch {
    width: 44px;
    height: 44px;
    padding: 6px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--panel);
    cursor: pointer;
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
