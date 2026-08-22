<script lang="ts">
  import { SUITS, type Suit } from '../model/deck';
  import { SUIT_VARIANTS, suitColor, suitSymbol } from '../render/suits';
  import { editor, setSuitVariant, setCustomSuitImage } from '../editor/store.svelte';

  const SUIT_LABELS: Record<Suit, string> = {
    pique: 'Pique',
    coeur: 'Cœur',
    carreau: 'Carreau',
    trefle: 'Trèfle',
  };

  function pickVariant(suit: Suit, variantId: string) {
    setCustomSuitImage(suit, null); // vector variant overrides any uploaded PNG
    setSuitVariant(suit, variantId);
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
      <span class="suit-name">{SUIT_LABELS[suit]}</span>
      <div class="variants" role="group" aria-label={SUIT_LABELS[suit]}>
        {#each SUIT_VARIANTS[suit] as v}
          <button
            class="swatch"
            class:active={!editor.customSuitImages[suit] && editor.suitVariants[suit] === v.id}
            title={v.label}
            aria-label="{SUIT_LABELS[suit]} — {v.label}"
            onclick={() => pickVariant(suit, v.id)}
          >
            <svg viewBox="0 0 100 100" aria-hidden="true">
              {@html suitSymbol(suit, v.id, suitColor(suit))}
            </svg>
          </button>
        {/each}

        {#if editor.customSuitImages[suit]}
          <button
            class="swatch active custom"
            title="PNG chargé — cliquer pour retirer"
            aria-label="{SUIT_LABELS[suit]} — PNG personnalisé (retirer)"
            onclick={() => setCustomSuitImage(suit, null)}
          >
            <img src={editor.customSuitImages[suit]} alt="" />
          </button>
        {/if}

        <label class="swatch upload" title="Charger un PNG">
          <input type="file" accept="image/png,image/*" onchange={(e) => onFile(suit, e)} />
          <span>＋</span>
        </label>
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
    flex-wrap: wrap;
  }
  .swatch {
    width: 42px;
    height: 42px;
    padding: 6px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--panel);
    cursor: pointer;
    transition: border-color 0.1s, transform 0.1s;
    display: grid;
    place-items: center;
  }
  .swatch:hover {
    transform: translateY(-1px);
  }
  .swatch.active {
    border-color: var(--accent);
    box-shadow: inset 0 0 0 1px var(--accent);
  }
  .swatch svg,
  .swatch img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }
  .swatch.custom img {
    border-radius: 4px;
  }
  .upload {
    font-size: 1.2rem;
    opacity: 0.6;
  }
  .upload input {
    display: none;
  }
</style>
