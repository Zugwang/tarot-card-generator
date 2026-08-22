<script lang="ts">
  import { type Card, cardId } from '../model/deck';
  import { renderCardSVG } from '../render/card';
  import { editor, cardRenderOptions, formatWH } from '../editor/store.svelte';
  import type { FreeLayer } from '../editor/free';

  let { card }: { card: Card } = $props();

  const w = $derived(formatWH().w);
  const h = $derived(formatWH().h);
  const free = $derived(editor.freeCards[cardId(card)]);
  const layers = $derived(free?.layers ?? []);
  const selected = $derived(layers.find((l) => l.id === editor.freeLayerId) ?? null);
  const baseSvg = $derived(renderCardSVG(card, { ...cardRenderOptions(), freeCard: free }));

  let svgEl: SVGSVGElement;
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const clampSize = (v: number) => Math.max(8, Math.min(400, v));

  /** Half-extents of a layer's box in card units. */
  function half(l: FreeLayer) {
    if (l.type === 'text') return { w: Math.max(l.size, l.text.length * l.size * 0.55) / 2, h: (l.size * 1.3) / 2 };
    return { w: l.size / 2, h: l.size / 2 };
  }
  function frac(e: PointerEvent) {
    const r = svgEl.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }
  function cardPt(e: PointerEvent) {
    const f = frac(e);
    return { x: f.x * w, y: f.y * h };
  }

  type Drag =
    | { mode: 'move'; id: string; ox: number; oy: number; sx: number; sy: number }
    | { mode: 'resize'; id: string; origSize: number; startDist: number }
    | { mode: 'rotate'; id: string };
  let drag: Drag | null = null;
  let snapX = $state(false);
  let snapY = $state(false);

  function begin(d: Drag, id: string) {
    editor.freeLayerId = id;
    drag = d;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
  }
  function startMove(e: PointerEvent, l: FreeLayer) {
    e.stopPropagation();
    const f = frac(e);
    begin({ mode: 'move', id: l.id, ox: l.x, oy: l.y, sx: f.x, sy: f.y }, l.id);
  }
  function startResize(e: PointerEvent, l: FreeLayer) {
    e.stopPropagation();
    const c = cardPt(e);
    const d = Math.hypot(c.x - l.x * w, c.y - l.y * h) || 1;
    begin({ mode: 'resize', id: l.id, origSize: l.size, startDist: d }, l.id);
  }
  function startRotate(e: PointerEvent, l: FreeLayer) {
    e.stopPropagation();
    begin({ mode: 'rotate', id: l.id }, l.id);
  }
  function move(e: PointerEvent) {
    if (!drag) return;
    const l = layers.find((x) => x.id === drag!.id);
    if (!l) return;
    if (drag.mode === 'move') {
      const f = frac(e);
      let nx = clamp01(drag.ox + (f.x - drag.sx));
      let ny = clamp01(drag.oy + (f.y - drag.sy));
      snapX = Math.abs(nx - 0.5) < 0.018;
      snapY = Math.abs(ny - 0.5) < 0.018;
      if (snapX) nx = 0.5;
      if (snapY) ny = 0.5;
      l.x = nx;
      l.y = ny;
    } else if (drag.mode === 'resize') {
      const c = cardPt(e);
      const d = Math.hypot(c.x - l.x * w, c.y - l.y * h);
      l.size = clampSize(drag.origSize * (d / drag.startDist));
    } else {
      const c = cardPt(e);
      l.rot = Math.round((Math.atan2(c.y - l.y * h, c.x - l.x * w) * 180) / Math.PI + 90);
    }
  }
  function end() {
    drag = null;
    snapX = false;
    snapY = false;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', end);
  }
</script>

<div class="freecanvas">
  <div class="base">{@html baseSvg}</div>
  <svg
    class="overlay"
    viewBox="0 0 {w} {h}"
    bind:this={svgEl}
    onpointerdown={() => (editor.freeLayerId = null)}
    role="presentation"
  >
    {#each layers as l (l.id)}
      {@const b = half(l)}
      <rect
        x={l.x * w - b.w}
        y={l.y * h - b.h}
        width={b.w * 2}
        height={b.h * 2}
        transform="rotate({l.rot} {l.x * w} {l.y * h})"
        fill="transparent"
        class="handle"
        role="button"
        aria-label="Déplacer le calque"
        tabindex="-1"
        onpointerdown={(e) => startMove(e, l)}
      />
    {/each}

    {#if selected}
      {@const b = half(selected)}
      {@const cx = selected.x * w}
      {@const cy = selected.y * h}
      <g transform="rotate({selected.rot} {cx} {cy})" pointer-events="all">
        <rect
          x={cx - b.w}
          y={cy - b.h}
          width={b.w * 2}
          height={b.h * 2}
          fill="none"
          stroke="var(--accent)"
          stroke-width="1.5"
          stroke-dasharray="4 3"
          vector-effect="non-scaling-stroke"
          pointer-events="none"
        />
        <!-- rotation handle -->
        <line x1={cx} y1={cy - b.h} x2={cx} y2={cy - b.h - 20} stroke="var(--accent)" stroke-width="1.5" vector-effect="non-scaling-stroke" pointer-events="none" />
        <circle
          cx={cx}
          cy={cy - b.h - 20}
          r="7"
          fill="var(--accent)"
          class="rot"
          role="button"
          aria-label="Pivoter"
          tabindex="-1"
          onpointerdown={(e) => startRotate(e, selected)}
        />
        <!-- resize handle (bottom-right) -->
        <rect
          x={cx + b.w - 6}
          y={cy + b.h - 6}
          width="12"
          height="12"
          rx="2"
          fill="#fff"
          stroke="var(--accent)"
          stroke-width="1.5"
          class="resize"
          role="button"
          aria-label="Redimensionner"
          tabindex="-1"
          onpointerdown={(e) => startResize(e, selected)}
        />
      </g>
    {/if}

    {#if snapX}<line x1={w / 2} y1="0" x2={w / 2} y2={h} stroke="var(--accent)" stroke-dasharray="4 4" stroke-opacity="0.6" vector-effect="non-scaling-stroke" pointer-events="none" />{/if}
    {#if snapY}<line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="var(--accent)" stroke-dasharray="4 4" stroke-opacity="0.6" vector-effect="non-scaling-stroke" pointer-events="none" />{/if}
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
  .rot {
    cursor: grab;
  }
  .resize {
    cursor: nwse-resize;
  }
</style>
