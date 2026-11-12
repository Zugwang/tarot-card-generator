<script lang="ts">
  // Floating "+N" numbers and the big centre banner.
  import { fx } from './fx.svelte';
  import Suit from './Suit.svelte';
</script>

{#each fx.floaters as f (f.id)}
  <div class="floater num" style="left:{f.x}%; top:{f.y}%; --c: var(--{f.tone})">{f.text}</div>
{/each}

{#if fx.banner}
  <div class="banner" class:seal={fx.banner.seal}>
    <div class="plate">
      <div class="txt outlined" style="--c: var(--{fx.banner.tone})">{fx.banner.text}</div>
      {#if fx.banner.suit}
        <div class="mark"><Suit suit={fx.banner.suit} size={58} color="#f6e6d2" /></div>
      {/if}
      {#if fx.banner.sub}<div class="sub engraved">{fx.banner.sub}</div>{/if}
    </div>
  </div>
{/if}

<style>
  .floater {
    position: fixed;
    z-index: 80;
    translate: -50% 0;
    font-size: 36px;
    color: var(--c, var(--gold));
    /* Outlined like Balatro's score pops: a hard dark edge is what lets a number
       stay legible over cards, leather and candle glow all at once. */
    paint-order: stroke fill;
    -webkit-text-stroke: 4px var(--void);
    text-shadow: 0 3px 0 var(--void), 0 0 22px rgba(0, 0, 0, .7);
    pointer-events: none;
    animation: rise 1.4s var(--ease-out-3) both;
  }
  @keyframes rise {
    0% { transform: translateY(14px) scale(.5); opacity: 0; }
    22% { transform: translateY(-6px) scale(1.3); opacity: 1; }
    40% { transform: translateY(-14px) scale(1); }
    100% { transform: translateY(-86px) scale(.95); opacity: 0; }
  }

  .banner {
    position: fixed; inset: 0; z-index: 75;
    display: grid; place-content: center; text-align: center;
    pointer-events: none;
  }
  .plate { display: grid; gap: 6px; justify-items: center; }

  .txt {
    font-size: clamp(34px, 13vw, 70px);
    color: var(--c, var(--gold));
    animation: slam .52s var(--ease-elastic-4) both;
  }
  .sub {
    font-size: 12px;
    color: var(--parchment-dim);
    text-shadow: 0 2px 10px rgba(0, 0, 0, .95);
    animation: slam .52s .07s var(--ease-elastic-4) both;
  }
  @keyframes slam {
    0% { transform: scale(2.7) rotate(-7deg); opacity: 0; }
    60% { transform: scale(.93) rotate(1.6deg); opacity: 1; }
    100% { transform: scale(1) rotate(0); opacity: 1; }
  }

  /* --- cachet de cire -------------------------------------------------------
     The contract banner is pressed rather than announced: a wax disc drops in,
     squashes on impact and settles crooked, the way a real seal lands. */
  .seal .plate {
    padding: 26px 34px;
    background: radial-gradient(60% 60% at 38% 30%, var(--vermillon), var(--oxblood) 56%, var(--oxblood-deep) 100%);
    border-radius: 47% 53% 45% 55% / 55% 45% 54% 46%;
    box-shadow:
      inset 0 4px 14px rgba(255, 190, 160, .22),
      inset 0 -8px 18px rgba(0, 0, 0, .55),
      0 14px 34px rgba(0, 0, 0, .65);
    animation: stamp .54s var(--ease-squish-3) both;
  }
  .seal .txt {
    -webkit-text-stroke: 3px rgba(60, 14, 8, .9);
    color: #f6e6d2;
    animation: none;
  }
  .seal .sub { animation: none; color: rgba(246, 230, 210, .72); }
  /* The enseigne pressed into the wax. */
  .mark {
    filter: drop-shadow(0 2px 2px rgba(60, 14, 8, .8)) drop-shadow(0 -1px 0 rgba(255, 200, 170, .3));
    animation: emboss .5s .16s var(--ease-elastic-3) both;
  }
  @keyframes emboss {
    0% { transform: scale(1.8); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes stamp {
    0%   { transform: scale(2.2) rotate(-14deg); opacity: 0; }
    45%  { transform: scale(.88) rotate(2deg); opacity: 1; }
    70%  { transform: scaleX(1.06) scaleY(.94) rotate(-1deg); }
    100% { transform: scale(1) rotate(-1.5deg); opacity: 1; }
  }
</style>
