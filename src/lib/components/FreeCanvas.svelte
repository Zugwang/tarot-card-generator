<script lang="ts">
  import { type Card, cardId } from '../model/deck';
  import { renderCardSVG, FORMATS } from '../render/card';
  import { editor, cardRenderOptions } from '../editor/store.svelte';
  import type { FreeLayer } from '../editor/free';

  let { card }: { card: Card } = $props();

  const h = $derived(FORMATS[editor.format].h);
  const free = $derived(editor.freeCards[cardId(card)]);
  const layers = $derived(free?.layers ?? []);
  const baseSvg = $derived(renderCardSVG(card, { ...cardRenderOptions(), freeCard: free }));

  let svgEl: SVGSVGElement;

  function bounds(l: FreeLayer) {
    const w = l.type === 'text' ? Math.max(l.size, l.text.length * l.size * 0.55) : l.size;
    const bh = l.type === 'text' ? l.size * 1.3 : l.size;
    return { x: l.x * 250 - w / 2, y: l.y * h - bh / 2, w, h: bh };
  }

  function frac(e: PointerEvent) {
    const r = svgEl.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }

  let drag: { id: string; ox: number; oy: number; sx: number; sy: number } | null = null;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));

  function down(e: PointerEvent, l: FreeLayer) {
    e.stopPropagation();
    editor.freeLayerId = l.id;
    const f = frac(e);
    drag = { id: l.id, ox: l.x, oy: l.y, sx: f.x, sy: f.y };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
  function move(e: PointerEvent) {
    if (!drag) return;
    const l = layers.find((x) => x.id === drag!.id);
    if (!l) return;
    const f = frac(e);
    l.x = clamp(drag.ox + (f.x - drag.sx));
    l.y = clamp(drag.oy + (f.y - drag.sy));
  }
  function up() {
    drag = null;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  }
</script>

<div class="freecanvas">
  <div class="base">{@html baseSvg}</div>
  <svg
    class="overlay"
    viewBox="0 0 250 {h}"
    bind:this={svgEl}
    onpointerdown={() => (editor.freeLayerId = null)}
    role="presentation"
  >
    {#each layers as l (l.id)}
      {@const b = bounds(l)}
      <rect
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        transform="rotate({l.rot} {l.x * 250} {l.y * h})"
        fill="transparent"
        stroke={editor.freeLayerId === l.id ? 'var(--accent)' : 'transparent'}
        stroke-width="2"
        stroke-dasharray="4 3"
        vector-effect="non-scaling-stroke"
        class="handle"
        role="button"
        aria-label="Déplacer le calque"
        tabindex="-1"
        onpointerdown={(e) => down(e, l)}
      />
    {/each}
  </svg>
</div>

<style>
  .freecanvas {
    position: relative;
    width: min(360px, 55vh);
    touch-action: none;
    user-select: none;
  }
  .base :global(svg) {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
  }
  .overlay {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .handle {
    cursor: move;
  }
</style>
