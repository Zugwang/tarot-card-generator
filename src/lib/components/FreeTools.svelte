<script lang="ts">
  import { type Card, cardId, cardName, SUITS, type Suit } from '../model/deck';
  import { suitColor, suitSymbol } from '../render/suits';
  import { editor, ensureFree } from '../editor/store.svelte';
  import { newSuitLayer, newTextLayer, newImageLayer, type FreeLayer } from '../editor/free';

  let { card }: { card: Card } = $props();

  const id = $derived(cardId(card));
  const free = $derived(editor.freeCards[id]);
  const layers = $derived(free?.layers ?? []);
  const selected = $derived(layers.find((l) => l.id === editor.freeLayerId) ?? null);

  const SUIT_LABELS: Record<Suit, string> = { pique: 'Pique', coeur: 'Cœur', carreau: 'Carreau', trefle: 'Trèfle' };

  function add(layer: FreeLayer) {
    ensureFree(id).layers.push(layer);
    editor.freeLayerId = layer.id;
  }
  function addImage(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const r = new FileReader();
      r.onload = () => add(newImageLayer(r.result as string));
      r.readAsDataURL(file);
    }
    input.value = '';
  }
  function del(layerId: string) {
    const f = editor.freeCards[id];
    if (f) f.layers = f.layers.filter((l) => l.id !== layerId);
    if (editor.freeLayerId === layerId) editor.freeLayerId = null;
  }
  function layerLabel(l: FreeLayer): string {
    return l.type === 'suit' ? SUIT_LABELS[l.suit] : l.type === 'text' ? `« ${l.text} »` : 'Image';
  }
</script>

<section class="ctl">
  <h2>Carte éditée</h2>
  <p class="which">{cardName(card)}</p>
  {#if free}
    <label class="check">
      <input type="checkbox" bind:checked={free.hideBase} />
      Masquer le fond généré
    </label>
  {/if}
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
  </div>
</section>

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
      <label class="row">Couleur <input type="color" bind:value={selected.color} /></label>
    {/if}
    {#if selected.type === 'suit'}
      <label class="row">Couleur <input type="color" bind:value={selected.color} /></label>
    {/if}
    <label class="slider">Taille <span class="val">{Math.round(selected.size)}</span>
      <input type="range" min="8" max="180" step="1" bind:value={selected.size} />
    </label>
    <label class="slider">Rotation <span class="val">{Math.round(selected.rot)}°</span>
      <input type="range" min="-180" max="180" step="1" bind:value={selected.rot} />
    </label>
    <button class="opt danger" onclick={() => del(selected.id)}>Supprimer le calque</button>
  </section>
{/if}

<style>
  .which {
    font-weight: 600;
    margin: 0 0 0.6rem;
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
  .text {
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
  .opt.danger {
    margin-top: 0.8rem;
    width: 100%;
    border-color: var(--accent);
    color: var(--accent);
  }
</style>
