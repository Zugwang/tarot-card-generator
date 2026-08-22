<script lang="ts">
  import { generateDeck, cardId, cardName, DECK_SIZES, BACK_CARD, type Card } from './lib/model/deck';
  import { editor, cardRenderOptions, ensureExploded, removeLayer } from './lib/editor/store.svelte';
  import { theme, toggleTheme } from './lib/editor/theme.svelte';
  import CardView from './lib/components/CardView.svelte';
  import SuitVariantPicker from './lib/components/SuitVariantPicker.svelte';
  import FreeCanvas from './lib/components/FreeCanvas.svelte';
  import FreeTools from './lib/components/FreeTools.svelte';
  import { renderCardSVG, FORMATS, type FormatId } from './lib/render/card';
  import { PIP_TEMPLATES } from './lib/render/pipLayouts';
  import { BACK_TEMPLATES } from './lib/render/back';
  import { exportPng, exportSheetPng } from './lib/export/png';
  import { exportSvg, exportSheetSvg } from './lib/export/svg';
  import { saveProject, loadProjectFromFile } from './lib/editor/project';

  const COURT_STYLES = [
    { id: 'marseille', label: 'Marseille' },
    { id: 'grimaud', label: 'Trad 1898' },
    { id: 'poker', label: 'Poker' },
    { id: 'blanc', label: 'Blanc' },
  ];
  const formatIds = Object.keys(FORMATS) as FormatId[];

  const deck = $derived(generateDeck(editor.deckSize));
  const displayCards = $derived<Card[]>([BACK_CARD, ...deck]);
  const selectedCard = $derived(displayCards.find((c) => cardId(c) === editor.selectedId) ?? null);

  // Auto-decompose the edited card into layers when entering free mode.
  $effect(() => {
    if (editor.tab === 'libre' && selectedCard) ensureExploded(selectedCard);
  });

  const renderOne = (c: Card) =>
    renderCardSVG(c, { ...cardRenderOptions(), freeCard: editor.freeCards[cardId(c)] });

  function select(id: string) {
    editor.selectedId = id;
    editor.freeLayerId = null;
  }
  function step(delta: number) {
    if (!displayCards.length) return;
    let i = displayCards.findIndex((c) => cardId(c) === editor.selectedId);
    if (i < 0) i = delta > 0 ? -1 : 0;
    i = (i + delta + displayCards.length) % displayCards.length;
    select(cardId(displayCards[i]));
  }
  function onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return; // don't hijack typing
    if (editor.tab === 'libre') {
      if ((e.key === 'Delete' || e.key === 'Backspace') && editor.freeLayerId && selectedCard) {
        e.preventDefault();
        removeLayer(cardId(selectedCard), editor.freeLayerId);
      } else if (e.key === 'Escape') {
        editor.freeLayerId = null;
      }
      return;
    }
    if (editor.viewMode !== 'strip') return;
    if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  }

  // --- export ---
  let busy = $state('');
  let scope = $state<'carte' | 'jeu'>('carte');
  async function run(label: string, fn: () => Promise<void>) {
    busy = label;
    try {
      await fn();
    } catch (e) {
      alert('Échec : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      busy = '';
    }
  }
  function doExport(fmt: 'png' | 'svg') {
    const cols = editor.deckSize >= 78 ? 14 : 13;
    if (scope === 'jeu') {
      const svgs = displayCards.map(renderOne);
      run(`Export planche ${fmt.toUpperCase()}…`, () =>
        fmt === 'png'
          ? exportSheetPng(svgs, cols, `tarotier-${editor.deckSize}.png`)
          : exportSheetSvg(svgs, cols, `tarotier-${editor.deckSize}.svg`),
      );
    } else if (selectedCard) {
      const svg = renderOne(selectedCard);
      const name = cardId(selectedCard);
      run(`Export ${fmt.toUpperCase()}…`, () =>
        fmt === 'png' ? exportPng(svg, `${name}.png`) : exportSvg(svg, `${name}.svg`),
      );
    }
  }

  function onLoadFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) loadProjectFromFile(file).catch((err) => alert('Projet invalide : ' + err.message));
    input.value = '';
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="app">
  <header>
    <div class="brand">
      <img class="logo" src="/marseille-bb.webp" alt="" />
      <strong>Tarotier</strong>
    </div>

    <div class="seg" role="group" aria-label="Onglet">
      <button class:active={editor.tab === 'cartes'} onclick={() => (editor.tab = 'cartes')}>Cartes</button>
      <button class:active={editor.tab === 'libre'} onclick={() => (editor.tab = 'libre')}>Libre</button>
    </div>

    <div class="seg" role="group" aria-label="Type de jeu">
      {#each DECK_SIZES as d}
        <button class:active={editor.deckSize === d} onclick={() => (editor.deckSize = d)}>{d}</button>
      {/each}
    </div>
    {#if editor.tab === 'cartes'}
      <div class="seg" role="group" aria-label="Visualisation">
        <button class:active={editor.viewMode === 'mosaic'} onclick={() => (editor.viewMode = 'mosaic')}>Mosaïque</button>
        <button class:active={editor.viewMode === 'strip'} onclick={() => (editor.viewMode = 'strip')}>Bandeau</button>
      </div>
    {/if}
    <span class="count">{deck.length} cartes</span>

    <button class="theme-toggle" onclick={toggleTheme} aria-label="Thème" title={theme.mode === 'dark' ? 'Mode clair' : 'Mode nuit'}>
      {#if theme.mode === 'dark'}<img class="sun" src="/marseille-bb.webp" alt="" />{:else}🌙{/if}
    </button>
  </header>

  <div class="body">
    <!-- Left: controls -->
    <aside class="rail left">
      <section class="ctl">
        <h2>Projet {#if busy}<span class="val">{busy}</span>{/if}</h2>
        <div class="opts">
          <button class="opt" onclick={() => saveProject()}>💾 Enregistrer</button>
          <label class="opt file">📂 Ouvrir<input type="file" accept="application/json" onchange={onLoadFile} /></label>
        </div>
        <div class="scope">
          <div class="seg small" role="group" aria-label="Portée export">
            <button class:active={scope === 'carte'} onclick={() => (scope = 'carte')}>Carte</button>
            <button class:active={scope === 'jeu'} onclick={() => (scope = 'jeu')}>Jeu</button>
          </div>
          <div class="opts">
            <button class="opt" onclick={() => doExport('png')} disabled={!!busy || (scope === 'carte' && !selectedCard)}>Export PNG</button>
            <button class="opt" onclick={() => doExport('svg')} disabled={!!busy || (scope === 'carte' && !selectedCard)}>Export SVG</button>
          </div>
        </div>
      </section>

      {#if editor.tab === 'cartes'}
        <section class="ctl">
          <h2>Format</h2>
          <div class="opts">
            {#each formatIds as f}
              <button class="opt" class:active={editor.format === f} onclick={() => (editor.format = f)}>
                {FORMATS[f].label} <span class="ratio">{FORMATS[f].w}×{FORMATS[f].h}</span>
              </button>
            {/each}
            <button class="opt" class:active={editor.format === 'libre'} onclick={() => (editor.format = 'libre')}>Libre</button>
          </div>
          {#if editor.format === 'libre'}
            <div class="dims">
              <label>L <input type="number" min="60" max="1000" bind:value={editor.customFormat.w} /></label>
              <label>H <input type="number" min="60" max="1000" bind:value={editor.customFormat.h} /></label>
            </div>
          {/if}
        </section>

        <SuitVariantPicker />

        <section class="ctl">
          <h2>Taille des enseignes <span class="val">{editor.pipSize} px</span></h2>
          <input type="range" min="12" max="100" step="1" bind:value={editor.pipSize} />
        </section>

        <section class="ctl">
          <h2>Positionnement</h2>
          <div class="opts">
            {#each PIP_TEMPLATES as t}
              <button class="opt" class:active={editor.pipTemplateId === t.id} onclick={() => (editor.pipTemplateId = t.id)}>{t.label}</button>
            {/each}
          </div>
        </section>

        <section class="ctl">
          <h2>Figures</h2>
          <div class="opts">
            {#each COURT_STYLES as s}
              <button class="opt" class:active={editor.courtStyle === s.id} onclick={() => (editor.courtStyle = s.id)}>{s.label}</button>
            {/each}
          </div>
        </section>

        <section class="ctl">
          <h2>Cadrage illustrations</h2>
          <div class="opts">
            <button class="opt" class:active={editor.illustrationFit === 'meet'} onclick={() => (editor.illustrationFit = 'meet')}>Entier</button>
            <button class="opt" class:active={editor.illustrationFit === 'slice'} onclick={() => (editor.illustrationFit = 'slice')}>Rempli</button>
          </div>
        </section>
      {:else if selectedCard}
        {#if selectedCard.kind === 'back'}
          <section class="ctl">
            <h2>Motif du dos</h2>
            <div class="opts">
              {#each BACK_TEMPLATES as b}
                <button class="opt" class:active={editor.back.templateId === b.id} onclick={() => (editor.back.templateId = b.id)}>{b.label}</button>
              {/each}
            </div>
            <label class="row">Couleur <input type="color" bind:value={editor.back.color} /></label>
          </section>
        {/if}
        <FreeTools card={selectedCard} />
      {:else}
        <p class="hint">Choisis une carte à éditer dans la liste →</p>
      {/if}
    </aside>

    <!-- Center: stage -->
    <main class="stage">
      {#if editor.tab === 'libre'}
        <div class="preview">
          {#if selectedCard}
            <FreeCanvas card={selectedCard} />
            <p class="hint">Glisse, redimensionne (coin) et pivote (poignée) les calques.</p>
          {:else}
            <div class="hint">Choisis une carte à éditer →</div>
          {/if}
        </div>
      {:else if editor.viewMode === 'mosaic'}
        <div class="mosaic">
          {#each displayCards as card (cardId(card))}
            <CardView {card} selected={editor.selectedId === cardId(card)} onselect={() => select(cardId(card))} />
          {/each}
        </div>
      {:else}
        <div class="preview">
          <div class="nav">
            <button class="arrow" onclick={() => step(-1)} aria-label="Précédente">‹</button>
            {#if selectedCard}<div class="big"><CardView card={selectedCard} /></div>{:else}<div class="hint">Choisis une carte →</div>{/if}
            <button class="arrow" onclick={() => step(1)} aria-label="Suivante">›</button>
          </div>
          {#if selectedCard}<p class="cardname">{cardName(selectedCard)}</p>{/if}
        </div>
      {/if}
    </main>

    <!-- Right: card picker / selection -->
    <aside class="rail right">
      {#if editor.tab === 'libre' || editor.viewMode === 'strip'}
        <h2>Cartes</h2>
        <div class="band">
          {#each displayCards as card (cardId(card))}
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .brand .logo {
    height: 30px;
    width: 30px;
    object-fit: contain;
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
  .theme-toggle .sun {
    height: 20px;
    width: 20px;
    object-fit: contain;
    display: block;
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
  .seg.small button {
    padding: 0.25rem 0.6rem;
    font-size: 0.85rem;
  }

  .body {
    display: grid;
    grid-template-columns: 250px 1fr 210px;
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
  .opt:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .opt.file input {
    display: none;
  }
  .ratio {
    opacity: 0.55;
    font-size: 0.75em;
  }
  .scope {
    margin-top: 0.7rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .dims {
    display: flex;
    gap: 0.6rem;
    margin-top: 0.5rem;
  }
  .dims label {
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .dims input {
    width: 100%;
    padding: 0.25rem 0.4rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--panel);
    color: inherit;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.85rem;
    margin-top: 0.5rem;
  }
  .ctl input[type='range'] {
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
    .body {
      grid-template-columns: 1fr;
      grid-auto-rows: min-content;
    }
    .rail {
      border: none;
      border-bottom: 1px solid var(--border);
    }
  }
</style>
