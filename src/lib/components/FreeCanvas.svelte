<script lang="ts">
  import { type Card, cardId } from '../model/deck';
  import { renderCardSVG } from '../render/card';
  import { editor, cardRenderOptions, formatWH } from '../editor/store.svelte';
  import { type FreeLayer, normalizeAngle, isCover } from '../editor/free';

  let { card }: { card: Card } = $props();

  const w = $derived(formatWH().w);
  const h = $derived(formatWH().h);
  const free = $derived(editor.freeCards[cardId(card)]);
  const layers = $derived(free?.layers ?? []);
  const selected = $derived(layers.find((l) => l.id === editor.freeLayerId) ?? null);
  const baseSvg = $derived(renderCardSVG(card, { ...cardRenderOptions(), freeCard: free }));

  // Layer currently in crop (Rogner) mode — must be a non-cover image layer.
  const cropLayer = $derived(
    layers.find((l) => l.id === editor.cropId && l.type === 'image' && !(l as { cover?: boolean }).cover) as
      | (FreeLayer & { type: 'image'; crop?: { x: number; y: number; w: number; h: number } })
      | undefined,
  );

  let svgEl: SVGSVGElement;
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const clampSize = (v: number) => Math.max(8, Math.min(600, v));

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

  /** Is a card-unit point inside a layer's (rotated) bounding box? */
  function inside(l: FreeLayer, p: { x: number; y: number }) {
    const b = half(l);
    const a = (l.rot * Math.PI) / 180;
    const dx = p.x - l.x * w;
    const dy = p.y - l.y * h;
    const rx = dx * Math.cos(a) + dy * Math.sin(a); // rotate point by -rot into the box frame
    const ry = -dx * Math.sin(a) + dy * Math.cos(a);
    return Math.abs(rx) <= b.w && Math.abs(ry) <= b.h;
  }
  /** Pick the layer to grab at a point. Repeated clicks at the same spot walk
   *  DOWN the stack of overlapping layers, so a covered layer becomes reachable. */
  function pickAt(p: { x: number; y: number }, currentId: string | null): FreeLayer | null {
    const hits = layers.filter((l) => !isCover(l) && inside(l, p));
    if (!hits.length) return null;
    const topDown = [...hits].reverse(); // last drawn = visually on top
    const i = topDown.findIndex((l) => l.id === currentId);
    return topDown[i >= 0 ? (i + 1) % topDown.length : 0];
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
  function startMove(e: PointerEvent, lTop: FreeLayer) {
    e.stopPropagation();
    // Cycle to the layer underneath if the top one is already selected.
    const target = pickAt(cardPt(e), editor.freeLayerId) ?? lTop;
    const f = frac(e);
    begin({ mode: 'move', id: target.id, ox: target.x, oy: target.y, sx: f.x, sy: f.y }, target.id);
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
      l.rot = normalizeAngle(Math.round((Math.atan2(c.y - l.y * h, c.x - l.x * w) * 180) / Math.PI + 90));
    }
  }
  function end() {
    drag = null;
    snapX = false;
    snapY = false;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', end);
  }

  // ---- crop (Rogner) mode -------------------------------------------------
  type Corner = 'nw' | 'ne' | 'sw' | 'se' | 'move';
  type CropDrag = { corner: Corner; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number };
  let cropDrag: CropDrag | null = null;
  const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  /** Pointer → the crop layer's box-normalized coords (0..1), un-rotated. */
  function localUV(e: PointerEvent) {
    const cl = cropLayer!;
    const s = cl.size;
    const a = (cl.rot * Math.PI) / 180;
    const p = cardPt(e);
    const dx = p.x - cl.x * w;
    const dy = p.y - cl.y * h;
    const rx = dx * Math.cos(a) + dy * Math.sin(a);
    const ry = -dx * Math.sin(a) + dy * Math.cos(a);
    return { u: rx / s + 0.5, v: ry / s + 0.5 };
  }
  function cbegin(corner: Corner, e: PointerEvent) {
    e.stopPropagation();
    if (!cropLayer) return;
    const c = cropLayer.crop ?? { x: 0, y: 0, w: 1, h: 1 };
    if (!cropLayer.crop) cropLayer.crop = { ...c };
    const { u, v } = localUV(e);
    cropDrag = { corner, sx: u, sy: v, ox: c.x, oy: c.y, ow: c.w, oh: c.h };
    window.addEventListener('pointermove', cmove);
    window.addEventListener('pointerup', cend);
  }
  function cmove(e: PointerEvent) {
    if (!cropDrag || !cropLayer) return;
    const { u, v } = localUV(e);
    const c = cropLayer.crop ?? { x: 0, y: 0, w: 1, h: 1 };
    let { x, y, w: cw, h: ch } = c;
    if (cropDrag.corner === 'move') {
      x = clampN(cropDrag.ox + (u - cropDrag.sx), 0, 1 - cropDrag.ow);
      y = clampN(cropDrag.oy + (v - cropDrag.sy), 0, 1 - cropDrag.oh);
      cw = cropDrag.ow;
      ch = cropDrag.oh;
    } else {
      let x0 = x;
      let y0 = y;
      let x1 = x + cw;
      let y1 = y + ch;
      if (cropDrag.corner.includes('w')) x0 = clampN(u, 0, x1 - 0.05);
      if (cropDrag.corner.includes('e')) x1 = clampN(u, x0 + 0.05, 1);
      if (cropDrag.corner.includes('n')) y0 = clampN(v, 0, y1 - 0.05);
      if (cropDrag.corner.includes('s')) y1 = clampN(v, y0 + 0.05, 1);
      x = x0;
      y = y0;
      cw = x1 - x0;
      ch = y1 - y0;
    }
    cropLayer.crop = { x, y, w: cw, h: ch };
  }
  function cend() {
    cropDrag = null;
    window.removeEventListener('pointermove', cmove);
    window.removeEventListener('pointerup', cend);
  }

  // Geometry of the crop editor (box + current crop rect) in card units.
  const cropBox = $derived.by(() => {
    const cl = cropLayer;
    if (!cl) return null;
    const s = cl.size;
    const cx = cl.x * w;
    const cy = cl.y * h;
    const bx = cx - s / 2;
    const by = cy - s / 2;
    const c = cl.crop ?? { x: 0, y: 0, w: 1, h: 1 };
    return { cx, cy, s, bx, by, rot: cl.rot, href: cl.href, rx: bx + c.x * s, ry: by + c.y * s, rw: c.w * s, rh: c.h * s };
  });
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
      {#if !isCover(l)}
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
      {/if}
    {/each}

    {#if selected && !isCover(selected) && !cropLayer}
      {@const b = half(selected)}
      {@const cx = selected.x * w}
      {@const cy = selected.y * h}
      <g transform="rotate({selected.rot} {cx} {cy})" pointer-events="all">
        <!-- translucent tint + double stroke = clearly-visible selection -->
        <rect
          x={cx - b.w}
          y={cy - b.h}
          width={b.w * 2}
          height={b.h * 2}
          fill="var(--accent)"
          fill-opacity="0.1"
          stroke="#fff"
          stroke-width="3"
          vector-effect="non-scaling-stroke"
          pointer-events="none"
        />
        <rect
          x={cx - b.w}
          y={cy - b.h}
          width={b.w * 2}
          height={b.h * 2}
          fill="none"
          stroke="var(--accent)"
          stroke-width="2"
          stroke-dasharray="5 3"
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

    <!-- Crop (Rogner) editor: full image shown, drag the rectangle / corners -->
    {#if cropBox}
      {@const cb = cropBox}
      <g transform="rotate({cb.rot} {cb.cx} {cb.cy})">
        <image href={cb.href} x={cb.bx} y={cb.by} width={cb.s} height={cb.s} preserveAspectRatio="none" opacity="0.9" />
        <!-- dark bands outside the crop rectangle -->
        <rect x={cb.bx} y={cb.by} width={cb.s} height={cb.ry - cb.by} fill="#000" fill-opacity="0.5" pointer-events="none" />
        <rect x={cb.bx} y={cb.ry + cb.rh} width={cb.s} height={cb.by + cb.s - (cb.ry + cb.rh)} fill="#000" fill-opacity="0.5" pointer-events="none" />
        <rect x={cb.bx} y={cb.ry} width={cb.rx - cb.bx} height={cb.rh} fill="#000" fill-opacity="0.5" pointer-events="none" />
        <rect x={cb.rx + cb.rw} y={cb.ry} width={cb.bx + cb.s - (cb.rx + cb.rw)} height={cb.rh} fill="#000" fill-opacity="0.5" pointer-events="none" />
        <!-- move the crop window -->
        <rect x={cb.rx} y={cb.ry} width={cb.rw} height={cb.rh} fill="transparent" class="cropmove" role="button" aria-label="Déplacer le cadrage" tabindex="-1" onpointerdown={(e) => cbegin('move', e)} />
        <rect x={cb.rx} y={cb.ry} width={cb.rw} height={cb.rh} fill="none" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke" pointer-events="none" />
        <rect x={cb.rx} y={cb.ry} width={cb.rw} height={cb.rh} fill="none" stroke="var(--accent)" stroke-width="1" stroke-dasharray="5 3" vector-effect="non-scaling-stroke" pointer-events="none" />
        {#each [['nw', cb.rx, cb.ry], ['ne', cb.rx + cb.rw, cb.ry], ['sw', cb.rx, cb.ry + cb.rh], ['se', cb.rx + cb.rw, cb.ry + cb.rh]] as [corner, hx, hy]}
          <rect x={(hx as number) - 7} y={(hy as number) - 7} width="14" height="14" rx="2" fill="#fff" stroke="var(--accent)" stroke-width="1.5" class="crophandle" role="button" aria-label="Rogner" tabindex="-1" onpointerdown={(e) => cbegin(corner as Corner, e)} />
        {/each}
      </g>
    {/if}
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
  .cropmove {
    cursor: move;
  }
  .crophandle {
    cursor: crosshair;
  }
</style>
