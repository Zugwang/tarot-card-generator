<script lang="ts">
  // One card. Carries most of the "juice": a pointer-following 3D tilt, a spring
  // lift when picked, a gold rim when playable, a desaturated wash when not, and
  // a moving foil sheen when it belongs to the trump suit.
  import { cardSrc, backSrc, cardText, suitOf } from './cards';

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
    /** Current trump suit; a match switches the foil sheen on. */
    trump?: string | null;
    onpick?: () => void;
    label?: string;
  }
  let {
    template, id = '', faceDown = false, playable = false, selected = false,
    dim = false, angle = 0, lift = 0, idle = 0, flying = false, trump = null,
    onpick, label,
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
  // Foil only on face-up trumps. `mix-blend-mode` is expensive in GPU memory, so
  // it is confined to at most the eight cards of one suit.
  const foil = $derived(!faceDown && !!id && !!trump && suitOf(id) === trump);
</script>

{#snippet face()}
  <span class="inner" class:foil>
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
    overflow: visible;
    transform: rotate(var(--a)) translateY(var(--lift));
    transition: transform .26s var(--spring), filter .2s ease, opacity .2s ease;
    transform-origin: 50% 118%;
    will-change: transform;
  }
  .tappable { cursor: pointer; }
  .card:disabled { cursor: default; opacity: 1; }

  .inner {
    display: block;
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 9px;
    transform: perspective(620px) rotateX(var(--rx)) rotateY(var(--ry));
    transform-style: preserve-3d;
    transition: transform .18s var(--snap), box-shadow .2s ease;
    /* A thin dark edge: printed cards have a cut edge, not a glow. */
    box-shadow: 0 0 0 1px rgba(11, 9, 8, .8), var(--shadow);
    animation: bob 3.6s ease-in-out infinite;
    animation-delay: var(--idle);
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 9px;
    object-fit: cover;
    pointer-events: none;
  }

  /* Gold rim on anything you are allowed to play. */
  .rim {
    position: absolute;
    inset: -3px;
    border-radius: 12px;
    border: 2px solid var(--gold);
    box-shadow: 0 0 14px rgba(200, 160, 74, .5), inset 0 0 10px rgba(200, 160, 74, .26);
    animation: pulse 1.9s ease-in-out infinite;
    pointer-events: none;
  }

  /* --- foil -----------------------------------------------------------------
     A sheen that travels across the trump cards, so the atout is readable at a
     glance instead of needing to be worked out from the suit. */
  .foil { overflow: hidden; }
  .foil::after {
    content: '';
    position: absolute;
    inset: -50%;
    pointer-events: none;
    background: linear-gradient(
      72deg,
      transparent 40%,
      rgba(234, 211, 160, .5) 48%,
      rgba(255, 252, 242, .75) 50%,
      rgba(200, 160, 74, .45) 53%,
      transparent 62%
    );
    mix-blend-mode: color-dodge;
    animation: foil 3.4s var(--ease-in-out-3) infinite;
  }
  @keyframes foil {
    0%, 100% { translate: -85% 0; }
    50% { translate: 85% 0; }
  }

  .tappable:hover .inner { box-shadow: 0 0 0 1px rgba(11, 9, 8, .8), var(--shadow-lift); }
  .playable:hover { transform: rotate(var(--a)) translateY(calc(var(--lift) - 16px)) scale(1.06); }

  .selected { transform: rotate(0deg) translateY(calc(var(--lift) - 42px)) scale(1.14); z-index: 20; }
  .selected .inner {
    box-shadow: var(--shadow-lift), 0 0 0 2px var(--gold), 0 0 26px rgba(200, 160, 74, .6);
    animation: none;
  }

  /* Cards you may not play recede rather than disappear. */
  .dim { filter: grayscale(.72) brightness(.52) sepia(.25); opacity: .72; }

  /* --- la pose ---------------------------------------------------------------
     Squash and stretch is what gives a card mass: it arrives stretched along its
     travel, flattens on impact, then overshoots back. Without the flatten it
     just scales, and reads as a web transition rather than an object landing. */
  .flying { animation: land .42s var(--ease-elastic-3) both; }
  .flying .inner { animation: squash .42s var(--ease-out-3) both; }

  @keyframes land {
    0%   { transform: scale(1.45) translateY(-70px) rotate(-15deg); opacity: 0; }
    55%  { opacity: 1; }
    100% { transform: scale(1) translateY(0) rotate(0); opacity: 1; }
  }
  @keyframes squash {
    0%   { scale: .88 1.2; }
    48%  { scale: 1.16 .84; }
    72%  { scale: .96 1.05; }
    100% { scale: 1 1; }
  }

  /* Dust kicked up where the card met the leather. */
  .flying::before {
    content: '';
    position: absolute;
    left: 50%;
    bottom: -6px;
    width: 130%;
    height: 26px;
    translate: -50% 0;
    pointer-events: none;
    border-radius: 50%;
    background: radial-gradient(ellipse at center, rgba(200, 160, 74, .3), transparent 70%);
    animation: dust .6s .12s var(--ease-out-3) both;
  }
  @keyframes dust {
    0%   { opacity: 0; scale: .3 .6; }
    30%  { opacity: .85; }
    100% { opacity: 0; scale: 1.7 1.1; }
  }

  @keyframes bob {
    0%, 100% { translate: 0 0; }
    50% { translate: 0 -3px; }
  }
  @keyframes pulse {
    0%, 100% { opacity: .72; }
    50% { opacity: 1; }
  }
</style>
