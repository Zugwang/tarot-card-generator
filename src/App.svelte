<script lang="ts">
  import { onMount } from 'svelte';
  import { generateDeck, generateOracleDeck, generateImageDeck, cardId, cardName, DECK_SIZES, BACK_CARD, type Card } from './lib/model/deck';
  import { IMAGE_DECKS } from './lib/render/tarotData';
  import {
    editor,
    cardRenderOptions,
    ensureExploded,
    removeLayer,
    copyLayer,
    pasteLayer,
    setRouge,
    setNoire,
    slightlyRandomPalette,
    trulyRandomPalette,
    standardPalette,
  } from './lib/editor/store.svelte';
  import { theme, setTheme, THEMES, currentTheme } from './lib/editor/theme.svelte';
  import CardView from './lib/components/CardView.svelte';
  import SuitVariantPicker from './lib/components/SuitVariantPicker.svelte';
  import { suitSymbol } from './lib/render/suits';
  import { FONTS } from './lib/render/fonts';
  import FreeCanvas from './lib/components/FreeCanvas.svelte';
  import FreeTools from './lib/components/FreeTools.svelte';
  import { renderCardSVG, cardElements, FORMATS, type FormatId } from './lib/render/card';
  import { PIP_TEMPLATES } from './lib/render/pipLayouts';
  import { BACK_TEMPLATES } from './lib/render/back';
  import { exportPng, exportSheetPng } from './lib/export/png';
  import { exportSvg, exportSheetSvg } from './lib/export/svg';
  import { exportZip } from './lib/export/zip';
  import { saveProject, loadProjectFromFile } from './lib/editor/project';
  import { randomImage, IMAGE_SOURCES } from './lib/editor/sources';
  import { history, commit, undo, redo, primeHistory, isRestoring } from './lib/editor/history.svelte';
  import { newCoverLayer } from './lib/editor/free';

  const COURT_STYLES = [
    { id: 'marseille', label: 'Marseille' },
    { id: 'grimaud', label: 'Trad 1898' },
    { id: 'poker', label: 'Poker' },
    { id: 'danois', label: 'Danois (BnF)' },
    { id: 'blanc', label: 'Blanc' },
  ];
  const ATOUT_STYLES = [
    { id: 'marseille', label: 'Marseille' },
    { id: 'grimaud', label: 'Trad 1898' },
    { id: 'carrington', label: 'L. Carrington' },
  ];
  const formatIds = Object.keys(FORMATS) as FormatId[];

  const imageDeckIds = Object.keys(IMAGE_DECKS);
  const deck = $derived(
    editor.deckKind === 'oracle'
      ? generateOracleDeck()
      : editor.deckKind === 'image'
        ? generateImageDeck(editor.imageSet)
        : generateDeck(editor.deckSize),
  );
  // Tarot vocabulary for image/oracle decks: a card is a "lame".
  const isTarot = $derived(editor.deckKind === 'oracle' || editor.deckKind === 'image');
  const noun = $derived(isTarot ? 'lame' : 'carte');
  const nounC = $derived(isTarot ? 'Lame' : 'Carte');
  const nounP = $derived(isTarot ? 'lames' : 'cartes');
  const displayCards = $derived<Card[]>([BACK_CARD, ...deck]);
  const selectedCard = $derived(displayCards.find((c) => cardId(c) === editor.selectedId) ?? null);

  // Auto-decompose the edited card into layers when entering free mode.
  $effect(() => {
    if (editor.tab === 'libre' && selectedCard) ensureExploded(selectedCard);
  });

  // --- undo/redo history: a single debounced watcher records a step whenever
  // the editor state settles. Reading the fields below subscribes this effect
  // to every meaningful change; a continuous gesture collapses into one step.
  let primed = false;
  let histTimer: ReturnType<typeof setTimeout> | undefined;
  function editorFingerprint(): number {
    // Cheap read of all reactive state (no big string copies: only href *length*).
    const e = editor;
    let n = `${e.deckKind}|${e.deckSize}|${e.imageSet}|${e.format}|${e.customFormat.w}x${e.customFormat.h}`.length;
    n += e.cardBg.length + e.pipSize + (e.cornerCount ?? 0) + (e.contrastPips ? 1 : 0);
    n += e.pipTemplateId.length + e.courtStyle.length + e.atoutStyle.length + e.indexFont.length + e.illustrationFit.length;
    for (const s of Object.values(e.suitColors)) n += s.length;
    for (const s of Object.values(e.suitVariants)) n += s.length;
    for (const v of Object.values(e.customSuitImages)) n += v ? v.length : 0;
    n += e.back.color.length + e.back.templateId.length + (e.back.suit?.length ?? 0);
    for (const id of Object.keys(e.freeCards)) {
      const f = e.freeCards[id];
      n += id.length + (f.hideBase ? 1 : 0) + (f.bgImage ? f.bgImage.href.length + f.bgImage.rot : 0);
      for (const l of f.layers) {
        n += l.id.length + Math.round(l.x * 1e4) + Math.round(l.y * 1e4);
        n += Math.round(l.size * 10) + Math.round(l.rot * 10);
        n += Math.round((l.opacity ?? 1) * 100) + (l.name?.length ?? 0);
        if (l.type === 'text') n += l.text.length;
        if (l.type === 'image') {
          n += l.href.length + (l.cover ? 1 : 0);
          if (l.crop) n += Math.round((l.crop.x + l.crop.y + l.crop.w + l.crop.h) * 1e3);
        }
        if (l.type === 'suit') n += (l.color?.length ?? 0) + (l.variant?.length ?? 0);
        if (l.type === 'shape') n += l.fill.length + l.stroke.length + l.strokeWidth;
      }
    }
    return n;
  }
  $effect(() => {
    editorFingerprint(); // subscribe to all editor state
    if (!primed || isRestoring()) {
      clearTimeout(histTimer);
      return;
    }
    clearTimeout(histTimer);
    histTimer = setTimeout(commit, 350);
  });
  onMount(() => {
    // Prime the baseline once (untracked — must not re-run and wipe history).
    primeHistory();
    primed = true;
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
    const typing = tag === 'TEXTAREA' || (tag === 'INPUT' && ['text', 'number', 'search', ''].includes((e.target as HTMLInputElement).type));
    // Undo / redo — global, but leave native undo to text fields being typed in.
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !typing) {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y' && !typing) {
      e.preventDefault();
      redo();
      return;
    }
    if (tag === 'INPUT' || tag === 'TEXTAREA') return; // don't hijack typing
    if (editor.tab === 'libre') {
      if (!selectedCard) return;
      const id = cardId(selectedCard);
      if ((e.key === 'Delete' || e.key === 'Backspace') && editor.freeLayerId) {
        e.preventDefault();
        removeLayer(id, editor.freeLayerId);
      } else if (e.key === 'Escape') {
        editor.freeLayerId = null;
        editor.cropId = null;
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c' && editor.freeLayerId) {
        copyLayer(id, editor.freeLayerId);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        pasteLayer(id);
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
  let asZip = $state(false);
  /** Custom export base name (empty = automatic default). */
  let exportName = $state('');
  /** Opt-in: append an incrementing suffix (-01, -02…) the site remembers. */
  let autoNumber = $state(false);
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
  /** Default base name when the field is left empty. */
  function defaultBase(): string {
    if (scope === 'jeu') {
      const tag = editor.deckKind === 'oracle' ? 'oracle' : editor.deckKind === 'image' ? editor.imageSet : editor.deckSize;
      return `tarotier-${tag}`;
    }
    return selectedCard ? cardId(selectedCard) : 'carte';
  }
  /** Next counter for a base name, remembered across sessions (localStorage). */
  function bumpSeq(base: string): number {
    let map: Record<string, number> = {};
    try {
      map = JSON.parse(localStorage.getItem('tarotier.exportSeq') || '{}');
    } catch {
      /* private window — start fresh */
    }
    const n = (map[base] || 0) + 1;
    map[base] = n;
    try {
      localStorage.setItem('tarotier.exportSeq', JSON.stringify(map));
    } catch {
      /* quota / private window — the number still applies for this export */
    }
    return n;
  }
  /** Sanitize + resolve the base name (with optional running number). */
  function resolveBase(): string {
    const base = (exportName.trim() || defaultBase()).replace(/[/\\:*?"<>|]+/g, '-').slice(0, 80) || 'tarotier';
    return autoNumber ? `${base}-${String(bumpSeq(base)).padStart(2, '0')}` : base;
  }
  function doExport(fmt: 'png' | 'svg') {
    const cols = editor.deckKind !== 'cartes' || editor.deckSize >= 78 ? 14 : 13;
    const base = resolveBase();
    if (scope === 'jeu') {
      const entries = displayCards.map((c) => ({ name: cardId(c), svg: renderOne(c) }));
      if (asZip) {
        run(`ZIP ${fmt.toUpperCase()}…`, () => exportZip(entries, fmt, `${base}-${fmt}.zip`));
      } else {
        const svgs = entries.map((e) => e.svg);
        run(`Planche ${fmt.toUpperCase()}…`, () =>
          fmt === 'png' ? exportSheetPng(svgs, cols, `${base}.png`) : exportSheetSvg(svgs, cols, `${base}.svg`),
        );
      }
    } else if (selectedCard) {
      const svg = renderOne(selectedCard);
      run(`Export ${fmt.toUpperCase()}…`, () =>
        fmt === 'png' ? exportPng(svg, `${base}.png`) : exportSvg(svg, `${base}.svg`),
      );
    }
  }

  // --- resizable rails (widen the controls, or the single-card preview) ---
  let rightW = $state(210);
  let leftW = $state(250);
  function drag(set: (px: number) => void) {
    return (e: PointerEvent) => {
      e.preventDefault();
      const move = (ev: PointerEvent) => set(ev.clientX);
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };
  }
  const startResizeRight = drag((x) => (rightW = Math.min(640, Math.max(170, window.innerWidth - x))));
  const startResizeLeft = drag((x) => (leftW = Math.min(460, Math.max(200, x))));

  // --- theme cycling (single button steps through the 5 themes) ---
  function cycleTheme() {
    const i = THEMES.findIndex((t) => t.id === theme.id);
    setTheme(THEMES[(i + 1) % THEMES.length].id);
  }

  // --- fill every card with a random Wikimedia Commons image ---
  // Orientation-aware (landscape sources rotated 90°) and uniformly cover-fit.
  let fillBusy = $state('');
  let fillStop = false;
  async function fillAllCommons() {
    if (fillBusy) {
      fillStop = true;
      return;
    }
    const cards = deck;
    if (!cards.length) return;
    if (!confirm(`Remplir les ${cards.length} ${nounP} avec des images aléatoires ? Cela remplace les fonds actuels.`)) return;
    fillStop = false;
    let done = 0;
    for (const card of cards) {
      if (fillStop) break;
      fillBusy = `${done + 1}/${cards.length}`;
      try {
        const pick = await randomImage(editor.imageSource);
        const rot = pick.width > pick.height ? 90 : 0; // détecte le sens
        // Integrated into the layer system: the Commons image is the BOTTOM layer
        // (cover-fit), and the card's enseignes/numéros are exploded as layers on
        // top of it — so the image stays behind and the symbols always in front.
        const cover = newCoverLayer(pick.dataUrl, rot);
        editor.freeCards[cardId(card)] = { hideBase: true, layers: [cover, ...cardElements(card, cardRenderOptions())] };
      } catch {
        /* skip this card, keep going */
      }
      done++;
    }
    fillBusy = '';
    fillStop = false;
  }

  function onLoadFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) loadProjectFromFile(file).then(primeHistory).catch((err) => alert('Projet invalide : ' + err.message));
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
      <button class:active={editor.tab === 'cartes'} onclick={() => (editor.tab = 'cartes')}>Packet</button>
      <button class:active={editor.tab === 'libre'} onclick={() => (editor.tab = 'libre')}>Libre</button>
    </div>

    <div class="seg" role="group" aria-label="Type de jeu">
      {#each DECK_SIZES as d}
        <button class:active={editor.deckKind === 'cartes' && editor.deckSize === d} onclick={() => { editor.deckKind = 'cartes'; editor.deckSize = d; }}>{d}</button>
      {/each}
      <button class:active={editor.deckKind === 'oracle'} onclick={() => (editor.deckKind = 'oracle')} title="Oracle de Marseille — 78 lames">Oracle</button>
      {#each imageDeckIds as id}
        <button class:active={editor.deckKind === 'image' && editor.imageSet === id} onclick={() => { editor.deckKind = 'image'; editor.imageSet = id; }} title={IMAGE_DECKS[id].label}>{IMAGE_DECKS[id].short}</button>
      {/each}
    </div>
    {#if editor.tab === 'cartes'}
      <div class="seg" role="group" aria-label="Visualisation">
        <button class:active={editor.viewMode === 'mosaic'} onclick={() => (editor.viewMode = 'mosaic')}>Mosaïque</button>
        <button class:active={editor.viewMode === 'strip'} onclick={() => (editor.viewMode = 'strip')}>Bandeau</button>
      </div>
    {/if}

    <div class="seg" role="group" aria-label="Historique">
      <button onclick={undo} disabled={!history.canUndo} title="Annuler (Ctrl+Z)" aria-label="Annuler">↶</button>
      <button onclick={redo} disabled={!history.canRedo} title="Rétablir (Ctrl+Maj+Z)" aria-label="Rétablir">↷</button>
    </div>

    <a class="reflink" href="/references.html" title="Références & crédits">Références</a>
    <button
      class="theme-toggle"
      onclick={cycleTheme}
      aria-label="Thème"
      title="Thème : {currentTheme().label} — cliquer pour changer"
    >{@html currentTheme().icon}</button>
  </header>

  <div class="body" style="--left-w:{leftW}px; --right-w:{rightW}px">
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
            <button class:active={scope === 'carte'} onclick={() => (scope = 'carte')}>{nounC}</button>
            <button class:active={scope === 'jeu'} onclick={() => (scope = 'jeu')}>Jeu</button>
          </div>
          <input
            class="exportname"
            type="text"
            bind:value={exportName}
            placeholder="Nom d'export : {defaultBase()}"
            aria-label="Nom du fichier d'export"
          />
          <div class="opts">
            <button class="opt" onclick={() => doExport('png')} disabled={!!busy || (scope === 'carte' && !selectedCard)}>Export PNG</button>
            <button class="opt" onclick={() => doExport('svg')} disabled={!!busy || (scope === 'carte' && !selectedCard)}>Export SVG</button>
          </div>
          <label class="check"><input type="checkbox" bind:checked={autoNumber} /> Numéroter (-01, -02…)</label>
          {#if scope === 'jeu'}
            <label class="check"><input type="checkbox" bind:checked={asZip} /> Fichiers séparés (zip)</label>
          {/if}
        </div>
      </section>

      <section class="ctl">
        <h2>Images aléatoires {#if fillBusy}<span class="val">{fillBusy}</span>{/if}</h2>
        <button class="opt wide" onclick={fillAllCommons}>
          {fillBusy ? '⏹ Arrêter' : `🎲 Remplir toutes les ${nounP}`}
        </button>
        <div class="seg src" role="group" aria-label="Source d'images">
          {#each IMAGE_SOURCES as s}
            <button class:active={editor.imageSource === s.id} onclick={() => (editor.imageSource = s.id)}>{s.label}</button>
          {/each}
        </div>
      </section>

      {#if editor.tab === 'cartes'}
        <section class="ctl">
          <h2>Palette</h2>
          <div class="palette">
            <label class="sw">Fond<input type="color" bind:value={editor.cardBg} /></label>
            <label class="sw">Dos<input type="color" bind:value={editor.back.color} /></label>
            <label class="sw">Rouge<input type="color" value={editor.suitColors.coeur} oninput={(e) => setRouge(e.currentTarget.value)} /></label>
            <label class="sw">Noire<input type="color" value={editor.suitColors.pique} oninput={(e) => setNoire(e.currentTarget.value)} /></label>
          </div>
          <div class="opts" style="margin-top:.5rem">
            <button class="opt" onclick={slightlyRandomPalette}>🎲 Slightly random</button>
            <button class="opt" onclick={trulyRandomPalette}>🎲 Random</button>
            <button class="opt" onclick={standardPalette}>Standard</button>
          </div>
        </section>

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
          <h2>Enseignes aux coins</h2>
          <div class="seg small" role="group" aria-label="Nombre de coins">
            <button class:active={editor.cornerCount === 0} onclick={() => (editor.cornerCount = 0)}>0 coin</button>
            <button class:active={editor.cornerCount === 2} onclick={() => (editor.cornerCount = 2)}>2 coins</button>
            <button class:active={editor.cornerCount === 4} onclick={() => (editor.cornerCount = 4)}>4 coins</button>
          </div>
          <label class="check" style="margin-top:.6rem">
            <input type="checkbox" bind:checked={editor.contrastPips} />
            Contraste (halo sous enseignes/numéros)
          </label>
        </section>

        <section class="ctl">
          <h2>Police des numéros</h2>
          <select class="fontsel" bind:value={editor.indexFont}>
            {#each FONTS as f}
              <option value={f.id} style="font-family:{f.family}">{f.label}</option>
            {/each}
          </select>
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
          <h2>Atouts (78)</h2>
          <div class="opts">
            {#each ATOUT_STYLES as s}
              <button class="opt" class:active={editor.atoutStyle === s.id} onclick={() => (editor.atoutStyle = s.id)}>{s.label}</button>
            {/each}
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
            {#if editor.back.templateId === 'enseigne'}
              <div class="backsuits">
                {#each ['pique', 'coeur', 'carreau', 'trefle'] as const as s}
                  <button
                    class="backswatch"
                    class:active={editor.back.suit === s}
                    title={s}
                    aria-label={s}
                    onclick={() => (editor.back.suit = s)}
                  >
                    <svg viewBox="0 0 100 100" aria-hidden="true">{@html suitSymbol(s, editor.suitVariants[s], editor.back.color)}</svg>
                  </button>
                {/each}
              </div>
            {/if}
          </section>
        {/if}
        <FreeTools card={selectedCard} />
      {:else}
        <p class="hint">Choisis une {noun} à éditer dans la liste →</p>
      {/if}
    </aside>

    <!-- Drag handle to widen the left controls rail -->
    <div
      class="resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label="Redimensionner les réglages"
      title="Glisser pour élargir les réglages"
      onpointerdown={startResizeLeft}
    ></div>

    <!-- Center: stage -->
    <main class="stage">
      {#if editor.tab === 'libre'}
        <div class="preview">
          {#if selectedCard}
            <FreeCanvas card={selectedCard} />
            <p class="hint">Glisse, redimensionne (coin) et pivote (poignée) les calques.</p>
          {:else}
            <div class="hint">Choisis une {noun} à éditer →</div>
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
            {#if selectedCard}<div class="big"><CardView card={selectedCard} /></div>{:else}<div class="hint">Choisis une {noun} →</div>{/if}
            <button class="arrow" onclick={() => step(1)} aria-label="Suivante">›</button>
          </div>
          {#if selectedCard}<p class="cardname">{cardName(selectedCard)}</p>{/if}
        </div>
      {/if}
    </main>

    <!-- Drag handle to widen the right rail (bigger single-card preview) -->
    <div
      class="resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label="Redimensionner le panneau"
      title="Glisser pour élargir la sélection"
      onpointerdown={startResizeRight}
    ></div>

    <!-- Right: card picker / selection -->
    <aside class="rail right">
      {#if editor.tab === 'libre' || editor.viewMode === 'strip'}
        <h2>{isTarot ? 'Lames' : 'Cartes'}</h2>
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
          <p class="hint">Clique une {noun}.</p>
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
  .reflink {
    margin-left: auto;
    font-size: 0.82rem;
    color: inherit;
    opacity: 0.7;
    text-decoration: none;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .reflink:hover {
    opacity: 1;
    border-color: var(--accent);
  }
  .theme-toggle {
    line-height: 1;
    padding: 0.3rem 0.45rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--panel);
    color: inherit;
    cursor: pointer;
    display: flex;
  }
  .theme-toggle :global(svg) {
    display: block;
  }
  .theme-toggle:hover {
    border-color: var(--accent);
    color: var(--accent);
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
    color: var(--accent);
    box-shadow: inset 0 0 0 1.5px var(--accent);
  }
  .seg.small button {
    padding: 0.25rem 0.6rem;
    font-size: 0.85rem;
  }

  .body {
    display: grid;
    grid-template-columns: var(--left-w, 250px) 6px 1fr 6px var(--right-w, 210px);
    min-height: 0;
  }
  .resizer {
    cursor: col-resize;
    background: var(--border);
    opacity: 0.4;
    transition: opacity 0.15s;
    touch-action: none;
  }
  .resizer:hover {
    opacity: 1;
    background: var(--accent);
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
    border-color: var(--accent);
    color: var(--accent);
    box-shadow: inset 0 0 0 1px var(--accent);
  }
  .opt:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .opt.wide {
    width: 100%;
    justify-content: center;
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
  .check {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.82rem;
  }
  .exportname {
    width: 100%;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--panel);
    color: inherit;
    font: inherit;
    font-size: 0.85rem;
  }
  .exportname:focus {
    outline: none;
    border-color: var(--accent);
  }
  .palette {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.4rem;
  }
  .palette .sw {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.72rem;
    opacity: 0.85;
  }
  .palette .sw input[type='color'] {
    width: 100%;
    height: 30px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
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
  .fontsel {
    width: 100%;
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--panel);
    color: inherit;
    font: inherit;
  }
  .backsuits {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.4rem;
    margin-top: 0.6rem;
  }
  .backswatch {
    aspect-ratio: 1;
    padding: 6px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--panel);
    color: inherit;
    cursor: pointer;
  }
  .backswatch:hover {
    border-color: var(--accent);
  }
  .backswatch.active {
    border-color: var(--accent);
    box-shadow: inset 0 0 0 1px var(--accent);
  }
  .backswatch svg {
    width: 100%;
    height: 100%;
    display: block;
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
    .resizer {
      display: none;
    }
  }
</style>
