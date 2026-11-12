<script lang="ts">
  // Floating "+N" numbers and the big centre banner.
  import { fx } from './fx.svelte';
</script>

{#each fx.floaters as f (f.id)}
  <div class="floater" style="left:{f.x}%; top:{f.y}%; --c: var(--{f.tone})">{f.text}</div>
{/each}

{#if fx.banner}
  <div class="banner">
    <div class="txt" style="--c: var(--{fx.banner.tone})">{fx.banner.text}</div>
    {#if fx.banner.sub}<div class="sub">{fx.banner.sub}</div>{/if}
  </div>
{/if}

<style>
  .floater {
    position: fixed;
    z-index: 80;
    translate: -50% 0;
    font-size: 34px;
    font-weight: 900;
    color: var(--c, var(--gold));
    text-shadow: 0 3px 0 rgba(0, 0, 0, .55), 0 0 22px rgba(0, 0, 0, .6);
    pointer-events: none;
    animation: rise 1.4s cubic-bezier(.2, .8, .3, 1) both;
  }
  @keyframes rise {
    0% { transform: translateY(14px) scale(.5); opacity: 0; }
    22% { transform: translateY(-6px) scale(1.25); opacity: 1; }
    40% { transform: translateY(-14px) scale(1); }
    100% { transform: translateY(-82px) scale(.95); opacity: 0; }
  }

  .banner {
    position: fixed; inset: 0; z-index: 75;
    display: grid; place-content: center; text-align: center;
    pointer-events: none;
  }
  .txt {
    font-size: clamp(30px, 11vw, 62px);
    font-weight: 900;
    letter-spacing: -.02em;
    color: var(--c, var(--gold));
    text-shadow: 0 5px 0 rgba(0, 0, 0, .5), 0 0 34px rgba(0, 0, 0, .75);
    animation: slam .5s cubic-bezier(.2, 1.5, .4, 1) both;
  }
  .sub {
    margin-top: 4px; font-size: 15px; font-weight: 700; color: var(--ink);
    text-shadow: 0 2px 8px rgba(0, 0, 0, .9);
    animation: slam .5s .08s cubic-bezier(.2, 1.5, .4, 1) both;
  }
  @keyframes slam {
    0% { transform: scale(2.6) rotate(-7deg); opacity: 0; }
    60% { transform: scale(.94) rotate(1.5deg); opacity: 1; }
    100% { transform: scale(1) rotate(0); opacity: 1; }
  }
</style>
