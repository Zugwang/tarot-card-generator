<script lang="ts">
  import { type Card, cardId, cardName, SUITS, type Suit } from '../model/deck';
  import { suitColor, suitSymbol } from '../render/suits';
  import { editor, ensureFree, reorderLayer, duplicateLayer, regenerateCard } from '../editor/store.svelte';
  import { newSuitLayer, newTextLayer, newImageLayer, newShapeLayer, type FreeLayer } from '../editor/free';
  import { FONTS } from '../render/fonts';
  import { assets, rememberImage, forgetImage } from '../editor/assets.svelte';
  import { randomCommonsImage, type CommonsPick } from '../editor/wikimedia';

  let { card }: { card: Card } = $props();

  let randomBusy = $state(false);
  let lastPick = $state<CommonsPick | null>(null);
  async function addRandom() {
    if (randomBusy) return;
    randomBusy = true;
    try {
      const pick = await randomCommonsImage();
      rememberImage(pick.dataUrl);
      add(newImageLayer(pick.dataUrl));
      lastPick = pick;
    } catch (e) {
      alert('Image aléatoire : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      randomBusy = false;
    }
  }

  const id = $derived(cardId(card));
  const free = $derived(editor.freeCards[id]);
  const layers = $derived(free?.layers ?? []);
  const selected = $derived(layers.find((l) => l.id === editor.freeLayerId) ?? null);

  const SUIT_LABELS: Record<Suit, string> = { pique: 'Pique', coeur: 'Cœur', carreau: 'Carreau', trefle: 'Trèfle' };
  // Tarot vocabulary in Oracle mode.
  const noun = $derived(editor.deckKind === 'cartes' ? 'carte' : 'lame');
  const nounC = $derived(editor.deckKind === 'cartes' ? 'Carte' : 'Lame');

  function add(layer: FreeLayer) {
    ensureFree(id).layers.push(layer);
    editor.freeLayerId = layer.id;
  }
  function addImage(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const r = new FileReader();
      r.onload = () => {
        const href = r.result as string;
        rememberImage(href);
        add(newImageLayer(href));
      };
      r.readAsDataURL(file);
    }
    input.value = '';
  }
  function setBgImage(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const r = new FileReader();
      r.onload = () => {
        const href = r.result as string;
        const im = new Image();
        im.onload = () => {
          const rot = im.naturalWidth > im.naturalHeight ? 90 : 0; // orient landscape → portrait
          ensureFree(id).bgImage = { href, rot };
        };
        im.src = href;
        rememberImage(href);
      };
      r.readAsDataURL(file);
    }
    input.value = '';
  }
  function clearBgImage() {
    const f = editor.freeCards[id];
    if (f) f.bgImage = undefined;
  }
  function del(layerId: string) {
    const f = editor.freeCards[id];
    if (f) f.layers = f.layers.filter((l) => l.id !== layerId);
    if (editor.freeLayerId === layerId) editor.freeLayerId = null;
  }
  function layerLabel(l: FreeLayer): string {
    if (l.type === 'suit') return SUIT_LABELS[l.suit];
    if (l.type === 'text') return `« ${l.text} »`;
    if (l.type === 'shape') return { rect: 'Rectangle', ellipse: 'Cercle', line: 'Ligne' }[l.shape];
    if (l.type === 'image' && l.cover) return '🖼 Image de fond';
    return 'Image';
  }
</script>

<section class="ctl">
  <h2>{nounC} éditée</h2>
  <p class="which">{cardName(card)}</p>
  {#if free}
    <label class="check">
      <input type="checkbox" bind:checked={free.hideBase} />
      Masquer le fond généré
    </label>
  {/if}
  <button
    class="opt regen"
    title="Reconstruit la {noun} depuis le modèle (annule les modifications libres)"
    onclick={() => confirm(`Regénérer cette ${noun} depuis le modèle ? Les modifications libres seront perdues.`) && regenerateCard(card)}
  >↻ Regénérer depuis le modèle</button>
</section>

<section class="ctl">
  <h2>Fond de la {noun}</h2>
  <label class="row">Couleur <input type="color" bind:value={editor.cardBg} /></label>
  <div class="opts" style="margin-top:.5rem">
    <label class="opt file">🖼 Image de fond<input type="file" accept="image/*" onchange={setBgImage} /></label>
    {#if free?.bgImage}<button class="opt" onclick={clearBgImage}>Retirer le fond</button>{/if}
  </div>
</section>

<section class="ctl">
  <h2>Ajouter</h2>
  <div class="opts">
    {#each SUITS as s}
      <button class="swatch" title="Enseigne {SUIT_LABELS[s]}" aria-label="Ajouter {SUIT_LABELS[s]}" onclick={() => add(newSuitLayer(s))}>
        <svg viewBox="0 0 100 100" aria-hidden="true">{@html suitSymbol(s, undefined, suitColor(s))}</svg>
      </button>
    {/each}
    <button class="opt" onclick={() => add(newTextLayer())}>Texte</button>
    <label class="opt file">Image<input type="file" accept="image/*" onchange={addImage} /></label>
    <button class="opt" onclick={() => add(newShapeLayer('rect'))}>▭</button>
    <button class="opt" onclick={() => add(newShapeLayer('ellipse'))}>◯</button>
    <button class="opt" onclick={() => add(newShapeLayer('line'))}>╱</button>
    <button class="opt" onclick={addRandom} disabled={randomBusy} title="Image libre au hasard (Wikimedia Commons)">
      {randomBusy ? '🎲 …' : '🎲 Commons'}
    </button>
  </div>
  {#if lastPick}
    <p class="credit">
      <span title={lastPick.title}>{lastPick.title}</span>
      {#if lastPick.author}<br />par {lastPick.author}{/if}
      {#if lastPick.license} · {lastPick.license}{/if}
      {#if lastPick.pageUrl}<a href={lastPick.pageUrl} target="_blank" rel="noreferrer noopener">source ↗</a>{/if}
    </p>
  {/if}
</section>

{#if assets.items.length}
  <section class="ctl">
    <h2>Images récentes</h2>
    <div class="recent">
      {#each assets.items as a (a.id)}
        <div class="thumb">
          <button class="use" title="Réutiliser cette image" onclick={() => add(newImageLayer(a.href))}>
            <img src={a.href} alt="" />
          </button>
          <button class="rm" title="Oublier" aria-label="Oublier" onclick={() => forgetImage(a.id)}>✕</button>
        </div>
      {/each}
    </div>
  </section>
{/if}

{#if layers.length}
  <section class="ctl">
    <h2>Calques</h2>
    <ul class="layers">
      {#each layers as l (l.id)}
        <li class:active={editor.freeLayerId === l.id}>
          <button class="pick" onclick={() => (editor.freeLayerId = l.id)}>{layerLabel(l)}</button>
          <button class="del" title="Supprimer" aria-label="Supprimer" onclick={() => del(l.id)}>✕</button>
        </li>
      {/each}
    </ul>
  </section>
{/if}

{#if selected}
  <section class="ctl">
    <h2>Propriétés</h2>
    {#if selected.type === 'text'}
      <input class="text" type="text" bind:value={selected.text} placeholder="Texte" />
      <select class="font" bind:value={selected.font}>
        {#each FONTS as f}
          <option value={f.id} style="font-family:{f.family}">{f.label}</option>
        {/each}
      </select>
      <label class="row">Couleur <input type="color" bind:value={selected.color} /></label>
    {/if}
    {#if selected.type === 'suit'}
      <label class="row">Couleur <input type="color" bind:value={selected.color} /></label>
    {/if}
    {#if selected.type === 'shape'}
      {#if selected.shape !== 'line'}
        <label class="row">Remplissage <input type="color" bind:value={selected.fill} /></label>
      {/if}
      <label class="row">Contour <input type="color" bind:value={selected.stroke} /></label>
      <label class="slider">Épaisseur contour <span class="val">{selected.strokeWidth}</span>
        <input type="range" min="0" max="20" step="1" bind:value={selected.strokeWidth} />
      </label>
    {/if}
    {#if !(selected.type === 'image' && selected.cover)}
      <label class="slider">Taille <span class="val">{Math.round(selected.size)}</span>
        <input type="range" min="8" max="600" step="1" bind:value={selected.size} />
      </label>
    {/if}
    <label class="slider">Rotation <span class="val">{Math.round(selected.rot)}°</span>
      <input type="range" min="-180" max="180" step="1" bind:value={selected.rot} />
    </label>
    <div class="opts zorder">
      <button class="opt" title="Reculer" onclick={() => reorderLayer(id, selected.id, -1)}>↓ Reculer</button>
      <button class="opt" title="Avancer" onclick={() => reorderLayer(id, selected.id, 1)}>↑ Avancer</button>
      <button class="opt" onclick={() => duplicateLayer(id, selected.id)}>⧉ Dupliquer</button>
    </div>
    <button class="opt danger" onclick={() => del(selected.id)}>Supprimer le calque</button>
  </section>
{/if}

<style>
  .which {
    font-weight: 600;
    margin: 0 0 0.6rem;
  }
  .credit {
    margin: 0.5rem 0 0;
    font-size: 0.72rem;
    line-height: 1.35;
    opacity: 0.7;
    overflow-wrap: anywhere;
  }
  .credit span {
    display: inline-block;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    vertical-align: bottom;
  }
  .credit a {
    color: var(--accent);
    white-space: nowrap;
  }
  .check,
  .row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    margin-top: 0.4rem;
  }
  .row {
    justify-content: space-between;
  }
  .opts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }
  .swatch {
    width: 40px;
    height: 40px;
    padding: 5px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--panel);
    cursor: pointer;
  }
  .swatch svg {
    width: 100%;
    height: 100%;
    display: block;
  }
  .recent {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.35rem;
  }
  .thumb {
    position: relative;
    aspect-ratio: 1;
  }
  .thumb .use {
    width: 100%;
    height: 100%;
    padding: 2px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--panel);
    cursor: pointer;
    overflow: hidden;
  }
  .thumb .use img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 4px;
  }
  .thumb .rm {
    position: absolute;
    top: -6px;
    right: -6px;
    width: 18px;
    height: 18px;
    line-height: 1;
    font-size: 0.7rem;
    border: 1px solid var(--border);
    border-radius: 50%;
    background: var(--panel);
    color: inherit;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.12s;
  }
  .thumb:hover .rm {
    opacity: 1;
  }
  .layers {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .layers li {
    display: flex;
    align-items: center;
    border: 1px solid var(--border);
    border-radius: 7px;
    overflow: hidden;
  }
  .layers li.active {
    border-color: var(--accent);
  }
  .pick {
    flex: 1;
    text-align: left;
    font: inherit;
    font-size: 0.85rem;
    padding: 0.35rem 0.5rem;
    background: transparent;
    color: inherit;
    border: none;
    cursor: pointer;
  }
  .del {
    padding: 0.35rem 0.5rem;
    background: transparent;
    color: inherit;
    border: none;
    border-left: 1px solid var(--border);
    cursor: pointer;
    opacity: 0.7;
  }
  .del:hover {
    color: var(--accent);
  }
  .text,
  .font {
    width: 100%;
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 7px;
    background: var(--panel);
    color: inherit;
    margin-bottom: 0.4rem;
  }
  .slider {
    display: block;
    font-size: 0.85rem;
    margin-top: 0.6rem;
  }
  .slider .val {
    float: right;
    opacity: 0.7;
  }
  .slider input {
    width: 100%;
    accent-color: var(--accent);
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
  .opt.file input {
    display: none;
  }
  .zorder {
    margin-top: 0.7rem;
  }
  .regen {
    margin-top: 0.7rem;
    width: 100%;
  }
  .opt.danger {
    margin-top: 0.8rem;
    width: 100%;
    border-color: var(--accent);
    color: var(--accent);
  }
</style>
