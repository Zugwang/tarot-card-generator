<script lang="ts">
  import { generateDeck, cardId, DECK_SIZES, type DeckSize } from './lib/model/deck';
  import { renderCardSVG } from './lib/render/card';

  let size = $state<DeckSize>(52);
  const deck = $derived(generateDeck(size));
</script>

<header>
  <h1>Tarotier</h1>
  <p class="tagline">Générateur de jeux de cartes — aperçu du moteur</p>

  <div class="deck-picker" role="group" aria-label="Type de jeu">
    {#each DECK_SIZES as d}
      <button class:active={size === d} onclick={() => (size = d)}>{d}</button>
    {/each}
  </div>
  <p class="count">{deck.length} cartes</p>
</header>

<main class="mosaic">
  {#each deck as card (cardId(card))}
    <div class="card">
      {@html renderCardSVG(card)}
    </div>
  {/each}
</main>

<style>
  header {
    text-align: center;
    padding: 2rem 1rem 1rem;
  }
  h1 {
    margin: 0;
    font-size: 2.4rem;
    letter-spacing: 0.02em;
  }
  .tagline {
    opacity: 0.7;
    margin: 0.3rem 0 1.2rem;
  }
  .deck-picker {
    display: inline-flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    justify-content: center;
  }
  .deck-picker button {
    font: inherit;
    font-variant-numeric: tabular-nums;
    padding: 0.45rem 0.9rem;
    border: 1px solid color-mix(in srgb, currentColor 35%, transparent);
    border-radius: 0.5rem;
    background: transparent;
    color: inherit;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .deck-picker button:hover {
    border-color: var(--accent);
  }
  .deck-picker button.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .count {
    opacity: 0.6;
    font-size: 0.9rem;
    margin: 0.7rem 0 0;
  }
  .mosaic {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 0.9rem;
    max-width: 1200px;
    margin: 1.5rem auto;
    padding: 0 1rem 3rem;
  }
  .card :global(svg) {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 10px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
  }
</style>
