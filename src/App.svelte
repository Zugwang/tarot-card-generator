<script lang="ts">
  import { generateDeck, cardId, cardName, DECK_SIZES } from './lib/model/deck';
  import { editor } from './lib/editor/store.svelte';
  import { theme, toggleTheme } from './lib/editor/theme.svelte';
  import CardView from './lib/components/CardView.svelte';
  import SuitVariantPicker from './lib/components/SuitVariantPicker.svelte';
  import { FORMATS, type FormatId } from './lib/render/card';
  import { PIP_TEMPLATES } from './lib/render/pipLayouts';
  import { BACK_TEMPLATES, renderBackSVG } from './lib/render/back';

  const COURT_STYLES = [
    { id: 'marseille', label: 'Marseille' },
    { id: 'grimaud', label: 'Trad 1898' },
    { id: 'genere', label: 'Généré' },
  ];
  const formatIds = Object.keys(FORMATS) as FormatId[];

  const deck = $derived(generateDeck(editor.deckSize));
  const selectedCard = $derived(deck.find((c) => cardId(c) === editor.selectedId) ?? null);
  const backSvg = $derived(
    renderBackSVG({
      height: FORMATS[editor.format].h,
      templateId: editor.back.templateId,
      color: editor.back.color,
    }),
  );

  function select(id: string) {
    editor.selectedId = id;
  }

  function step(delta: number) {
    if (!deck.length) return;
    let i = deck.findIndex((c) => cardId(c) === editor.selectedId);
    if (i < 0) i = delta > 0 ? -1 : 0;
    i = (i + delta + deck.length) % deck.length;
    editor.selectedId = cardId(deck[i]);
  }

  function onKey(e: KeyboardEvent) {
    if (editor.tab !== 'cartes' || editor.viewMode !== 'strip') return;
    if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="app">
  <header>
    <div class="brand">🂡 <strong>Tarotier</strong></div>

    <div class="seg" role="group" aria-label="Onglet">
      <button class:active={editor.tab === 'cartes'} onclick={() => (editor.tab = 'cartes')}>Cartes</button>
      <button class:active={editor.tab === 'dos'} onclick={() => (editor.tab = 'dos')}>Dos</button>
    </div>

    {#if editor.tab === 'cartes'}
      <div class="seg" role="group" aria-label="Type de jeu">
        {#each DECK_SIZES as d}
          <button class:active={editor.deckSize === d} onclick={() => (editor.deckSize = d)}>{d}</button>
        {/each}
      </div>
      <div class="seg" role="group" aria-label="Visualisation">
        <button class:active={editor.viewMode === 'mosaic'} onclick={() => (editor.viewMode = 'mosaic')}>Mosaïque</button>
        <button class:active={editor.viewMode === 'strip'} onclick={() => (editor.viewMode = 'strip')}>Bandeau</button>
      </div>
      <span class="count">{deck.length} cartes</span>
    {/if}

    <button
      class="theme-toggle"
      onclick={toggleTheme}
      aria-label={theme.mode === 'dark' ? 'Mode clair' : 'Mode nuit'}
      title={theme.mode === 'dark' ? 'Mode clair' : 'Mode nuit'}
    >
      {theme.mode === 'dark' ? '☀️' : '🌙'}
    </button>
  </header>

  <div class="body" class:full={editor.tab === 'dos'}>
    <!-- Left: controls -->
    <aside class="rail left">
      {#if editor.tab === 'cartes'}
        <section class="ctl">
          <h2>Format</h2>
          <div class="opts">
            {#each formatIds as f}
              <button class="opt" class:active={editor.format === f} onclick={() => (editor.format = f)}>
                {FORMATS[f].label}
              </button>
            {/each}
          </div>
        </section>

        <SuitVariantPicker />

        <section class="ctl">
          <h2>Taille des enseignes <span class="val">{editor.pipSize} px</span></h2>
          <input type="range" min="18" max="52" step="1" bind:value={editor.pipSize} />
        </section>

        <section class="ctl">
          <h2>Positionnement</h2>
          <div class="opts">
            {#each PIP_TEMPLATES as t}
              <button class="opt" class:active={editor.pipTemplateId === t.id} onclick={() => (editor.pipTemplateId = t.id)}>
                {t.label}
              </button>
            {/each}
          </div>
        </section>

        <section class="ctl">
          <h2>Figures</h2>
          <div class="opts">
            {#each COURT_STYLES as s}
              <button class="opt" class:active={editor.courtStyle === s.id} onclick={() => (editor.courtStyle = s.id)}>
                {s.label}
              </button>
            {/each}
          </div>
        </section>
      {:else}
        <section class="ctl">
          <h2>Motif du dos</h2>
          <div class="opts">
            {#each BACK_TEMPLATES as b}
              <button class="opt" class:active={editor.back.templateId === b.id} onclick={() => (editor.back.templateId = b.id)}>
                {b.label}
              </button>
            {/each}
          </div>
        </section>
        <section class="ctl">
          <h2>Couleur</h2>
          <input class="color" type="color" bind:value={editor.back.color} />
        </section>
        <section class="ctl">
          <h2>Format</h2>
          <div class="opts">
            {#each formatIds as f}
              <button class="opt" class:active={editor.format === f} onclick={() => (editor.format = f)}>
                {FORMATS[f].label}
              </button>
            {/each}
          </div>
        </section>
      {/if}
    </aside>

    <!-- Center: stage -->
    <main class="stage">
      {#if editor.tab === 'dos'}
        <div class="preview">
          <div class="big">{@html backSvg}</div>
        </div>
      {:else if editor.viewMode === 'mosaic'}
        <div class="mosaic">
          {#each deck as card (cardId(card))}
            <CardView {card} selected={editor.selectedId === cardId(card)} onselect={() => select(cardId(card))} />
          {/each}
        </div>
      {:else}
        <div class="preview">
          <div class="nav">
            <button class="arrow" onclick={() => step(-1)} aria-label="Carte précédente">‹</button>
            {#if selectedCard}
              <div class="big"><CardView card={selectedCard} /></div>
            {:else}
              <div class="hint">Choisis une carte →</div>
            {/if}
            <button class="arrow" onclick={() => step(1)} aria-label="Carte suivante">›</button>
          </div>
          {#if selectedCard}<p class="cardname">{cardName(selectedCard)}</p>{/if}
        </div>
      {/if}
    </main>

    <!-- Right: thumbnails (strip) or selection (mosaic) -->
    {#if editor.tab === 'cartes'}
      <aside class="rail right">
        {#if editor.viewMode === 'strip'}
          <h2>Cartes</h2>
          <div class="band">
            {#each deck as card (cardId(card))}
              <CardView {card} selected={editor.selectedId === cardId(card)} onselect={() => select(cardId(card))} />
            {/each}
          </div>
        {:else}
          <h2>Sélection</h2>
          {#if selectedCard}
            <p class="cardname">{cardName(selectedCard)}</p>
            <div class="big"><CardView card={selectedCard} /></div>
          {:else}
            <p class="hint">Clique une carte.</p>
          {/if}
        {/if}
      </aside>
    {/if}
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
    gap: 0.8rem;
    padding: 0.6rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--panel);
    flex-wrap: wrap;
  }
  .brand {
    font-size: 1.2rem;
  }
  .count {
    opacity: 0.6;
    font-size: 0.85rem;
  }
  .theme-toggle {
    margin-left: auto;
    font-size: 1.1rem;
    line-height: 1;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--panel);
    color: inherit;
    cursor: pointer;
  }
  .theme-toggle:hover {
    border-color: var(--accent);
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
  .body.full {
    grid-template-columns: 240px 1fr;
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
    margin: 0 0 0.6rem;
    display: flex;
    justify-content: space-between;
  }
  .val {
    font-weight: 400;
    opacity: 0.7;
    text-transform: none;
    letter-spacing: 0;
  }

  .ctl {
    margin-bottom: 1.3rem;
    padding-bottom: 1.1rem;
    border-bottom: 1px solid var(--border);
  }
  .opts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .opt {
    font: inherit;
    font-size: 0.85rem;
    padding: 0.3rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
  .opt:hover {
    border-color: var(--accent);
  }
  .opt.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .ctl input[type='range'] {
    width: 100%;
    accent-color: var(--accent);
  }
  .color {
    width: 100%;
    height: 34px;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: transparent;
    cursor: pointer;
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
    width: min(340px, 55vh);
  }
  .nav {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .arrow {
    font-size: 2rem;
    line-height: 1;
    width: 48px;
    height: 48px;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: var(--panel);
    color: inherit;
    cursor: pointer;
    flex: none;
  }
  .arrow:hover {
    border-color: var(--accent);
    color: var(--accent);
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

  @media (max-width: 820px) {
    .body,
    .body.full {
      grid-template-columns: 1fr;
      grid-auto-rows: min-content;
    }
    .rail {
      border: none;
      border-bottom: 1px solid var(--border);
    }
  }
</style>
