<script lang="ts">
  // One card. Carries most of the "juice": a pointer-following 3D tilt, a spring
  // lift when picked, a gold rim when playable and a desaturated wash when not.
  import { cardSrc, backSrc, cardText } from './cards';

  interface Props {
    template: string;
    id?: string;
    faceDown?: boolean;
    playable?: boolean;
    selected?: boolean;
    dim?: boolean;
    angle?: number;      // fan rotation, degrees
    lift?: number;       // base vertical offset within the fan, px
    idle?: number;       // idle-float phase offset, seconds
    flying?: boolean;    // just landed on the table
    onpick?: () => void;
    label?: string;
  }
  let {
    template, id = '', faceDown = false, playable = false, selected = false,
    dim = false, angle = 0, lift = 0, idle = 0, flying = false, onpick, label,
  }: Props = $props();

  let el = $state<HTMLElement | undefined>();
  let rx = $state(0);
  let ry = $state(0);

  function move(e: PointerEvent) {
    // Touch has no hover, and tilting under a finger just fights the tap.
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    rx = -((e.clientY - r.top) / r.height - 0.5) * 16;
    ry = ((e.clientX - r.left) / r.width - 0.5) * 16;
  }
  function rest() { rx = 0; ry = 0; }

  const src = $derived(faceDown || !id ? backSrc(template) : cardSrc(template, id));
  const alt = $derived(faceDown || !id ? 'Carte face cachée' : cardText(id));
</script>

{#snippet face()}
  <span class="inner">
    <img {src} {alt} draggable="false" />
    {#if playable}<span class="rim" aria-hidden="true"></span>{/if}
  </span>
{/snippet}

{#if onpick}
  <button
    bind:this={el}
    class="card tappable"
    class:playable class:selected class:dim class:flying
    style="--a:{angle}deg; --lift:{lift}px; --idle:{idle}s; --rx:{rx}deg; --ry:{ry}deg"
    onpointermove={move}
    onpointerleave={rest}
    onpointerup={rest}
    onclick={onpick}
    disabled={!playable}
    aria-label={label ?? alt}
  >{@render face()}</button>
{:else}
  <div
    bind:this={el}
    class="card"
    class:playable class:selected class:dim class:flying
    style="--a:{angle}deg; --lift:{lift}px; --idle:{idle}s; --rx:{rx}deg; --ry:{ry}deg"
    role="img"
    aria-label={label ?? alt}
  >{@render face()}</div>
{/if}

<style>
  .card {
    position: relative;
    width: var(--card-w);
    height: var(--card-h);
    padding: 0;
    border: 0;
    background: none;
    box-shadow: none;
    min-height: 0;
    transform: rotate(var(--a)) translateY(var(--lift));
    transition: transform .26s var(--spring), filter .2s ease, opacity .2s ease;
    transform-origin: 50% 118%;
    will-change: transform;
  }
  .tappable { cursor: pointer; }
  .card:disabled { cursor: default; opacity: 1; }

  .inner {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 10px;
    transform: perspective(620px) rotateX(var(--rx)) rotateY(var(--ry));
    transform-style: preserve-3d;
    transition: transform .18s var(--snap), box-shadow .2s ease;
    box-shadow: var(--shadow);
    animation: bob 3.6s ease-in-out infinite;
    animation-delay: var(--idle);
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 10px;
    object-fit: cover;
    pointer-events: none;
  }

  /* Gold rim on anything you are allowed to play. */
  .rim {
    position: absolute;
    inset: -3px;
    border-radius: 13px;
    border: 2px solid var(--gold);
    box-shadow: 0 0 14px rgba(240, 181, 46, .55), inset 0 0 10px rgba(240, 181, 46, .3);
    animation: pulse 1.9s ease-in-out infinite;
    pointer-events: none;
  }

  .tappable:hover .inner { box-shadow: var(--shadow-lift); }
  .playable:hover { transform: rotate(var(--a)) translateY(calc(var(--lift) - 16px)) scale(1.06); }

  .selected { transform: rotate(0deg) translateY(calc(var(--lift) - 42px)) scale(1.14); z-index: 20; }
  .selected .inner {
    box-shadow: var(--shadow-lift), 0 0 0 3px var(--gold), 0 0 26px rgba(240, 181, 46, .65);
    animation: none;
  }

  /* Cards you may not play recede rather than disappear. */
  .dim { filter: grayscale(.72) brightness(.62); opacity: .78; }

  .flying { animation: land .34s var(--spring) both; }

  @keyframes bob {
    0%, 100% { translate: 0 0; }
    50% { translate: 0 -3px; }
  }
  @keyframes pulse {
    0%, 100% { opacity: .75; }
    50% { opacity: 1; }
  }
  @keyframes land {
    from { transform: perspective(620px) scale(1.5) translateY(-60px) rotate(-14deg); opacity: 0; }
    to { transform: perspective(620px) scale(1) translateY(0) rotate(0); opacity: 1; }
  }
</style>
