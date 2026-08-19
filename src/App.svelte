<script lang="ts">
  import {
    generateDeck,
    cardId,
    cardName,
    DECK_SIZES,
  } from './lib/model/deck';
  import { editor } from './lib/editor/store.svelte';
  import CardView from './lib/components/CardView.svelte';
  import SuitVariantPicker from './lib/components/SuitVariantPicker.svelte';

  const deck = $derived(generateDeck(editor.deckSize));
  const selectedCard = $derived(
    deck.find((c) => cardId(c) === editor.selectedId) ?? null,
  );

  function select(id: string) {
    editor.selectedId = id;
  }
</script>

<div class="app">
  <header>
    <div class="brand">🂡 <strong>Tarotier</strong></div>

    <div class="seg" role="group" aria-label="Type de jeu">
      {#each DECK_SIZES as d}
        <button class:active={editor.deckSize === d} onclick={() => (editor.deckSize = d)}>
          {d}
        </button>
      {/each}
    </div>

    <div class="seg" role="group" aria-label="Mode de visualisation">
      <button class:active={editor.viewMode === 'mosaic'} onclick={() => (editor.viewMode = 'mosaic')}>
        Mosaïque
      </button>
      <button class:active={editor.viewMode === 'strip'} onclick={() => (editor.viewMode = 'strip')}>
        Bandeau
      </button>
    </div>

    <span class="count">{deck.length} cartes</span>
  </header>

  <div class="body" class:strip={editor.viewMode === 'strip'}>
    <!-- Left: design controls -->
    <aside class="rail left">
      <SuitVariantPicker />

      <div class="control">
        <label for="pipsize">
          Taille des enseignes
          <span class="val">{editor.pipSize} px</span>
        </label>
        <input
          id="pipsize"
          type="range"
          min="18"
          max="52"
          step="1"
          bind:value={editor.pipSize}
        />
      </div>
    </aside>

    <!-- Center: stage -->
    <main class="stage">
      {#if editor.viewMode === 'mosaic'}
        <div class="mosaic">
          {#each deck as card (cardId(card))}
            <CardView
              {card}
              selected={editor.selectedId === cardId(card)}
              onselect={() => select(cardId(card))}
            />
          {/each}
        </div>
      {:else}
        <div class="preview">
          {#if selectedCard}
            <div class="big"><CardView card={selectedCard} /></div>
            <p class="cardname">{cardName(selectedCard)}</p>
          {:else}
            <p class="hint">Sélectionne une carte dans le bandeau →</p>
          {/if}
        </div>
      {/if}
    </main>

    <!-- Right: thumbnail band (strip) or selection info (mosaic) -->
    <aside class="rail right">
      {#if editor.viewMode === 'strip'}
        <h2>Cartes</h2>
        <div class="band">
          {#each deck as card (cardId(card))}
            <CardView
              {card}
              selected={editor.selectedId === cardId(card)}
              onselect={() => select(cardId(card))}
            />
          {/each}
        </div>
      {:else}
        <h2>Sélection</h2>
        {#if selectedCard}
          <p class="cardname">{cardName(selectedCard)}</p>
          <div class="big"><CardView card={selectedCard} /></div>
        {:else}
          <p class="hint">Clique une carte pour la sélectionner.</p>
        {/if}
      {/if}
    </aside>
  </div>
</div>

<style>
  .app {
    display: grid;
    grid-template-rows: auto 1fr;
    height: 100svh;
  }

  header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.6rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--panel);
    flex-wrap: wrap;
  }
  .brand {
    font-size: 1.2rem;
  }
  .count {
    margin-left: auto;
    opacity: 0.6;
    font-size: 0.85rem;
  }

  .seg {
    display: inline-flex;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }
  .seg button {
    font: inherit;
    font-variant-numeric: tabular-nums;
    padding: 0.35rem 0.7rem;
    border: none;
    border-left: 1px solid var(--border);
    background: var(--panel);
    color: inherit;
    cursor: pointer;
  }
  .seg button:first-child {
    border-left: none;
  }
  .seg button.active {
    background: var(--accent);
    color: #fff;
  }

  .body {
    display: grid;
    grid-template-columns: 240px 1fr 210px;
    min-height: 0;
  }

  .rail {
    overflow: auto;
    padding: 1rem;
    background: var(--panel);
  }
  .rail.left {
    border-right: 1px solid var(--border);
  }
  .rail.right {
    border-left: 1px solid var(--border);
  }
  .rail h2 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.6;
    margin: 0 0 0.8rem;
  }

  .control {
    margin-top: 1.4rem;
    padding-top: 1.2rem;
    border-top: 1px solid var(--border);
  }
  .control label {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  .control .val {
    font-weight: 400;
    font-variant-numeric: tabular-nums;
    opacity: 0.6;
  }
  .control input[type='range'] {
    width: 100%;
    accent-color: var(--accent);
  }

  .stage {
    overflow: auto;
    min-width: 0;
  }

  .mosaic {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
    gap: 0.9rem;
    padding: 1.2rem;
  }

  .preview {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 1.5rem;
  }
  .preview .big {
    width: min(340px, 60vh);
  }

  .band {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }

  .cardname {
    font-weight: 600;
    text-align: center;
    margin: 0;
  }
  .hint {
    opacity: 0.6;
    font-size: 0.9rem;
    text-align: center;
  }

  @media (max-width: 780px) {
    .body,
    .body.strip {
      grid-template-columns: 1fr;
      grid-auto-rows: min-content;
    }
    .rail {
      border: none;
      border-bottom: 1px solid var(--border);
    }
  }
</style>
