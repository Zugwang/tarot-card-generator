<script lang="ts">
  /* A replayable animation tile. Tap it and the animation restarts, which is the
     only way to judge an animation on a phone: you need to see it again, and
     again, without reloading. Restarting means removing the class, forcing a
     reflow, then putting it back — reassigning the same animation name alone
     does nothing. */
  interface Props {
    name: string;
    label: string;
    detail?: string;
  }
  let { name, label, detail }: Props = $props();
  let playing = $state(true);
  let el = $state<HTMLElement | undefined>();

  function replay() {
    playing = false;
    requestAnimationFrame(() => {
      void el?.offsetWidth; // force reflow so the animation is re-armed
      playing = true;
    });
  }
</script>

<button class="tile" onclick={replay} aria-label="Rejouer {label}">
  <div class="stage">
    <div bind:this={el} class="mote" class:playing data-anim={name}></div>
  </div>
  <span class="lab">{label}</span>
  {#if detail}<span class="det">{detail}</span>{/if}
</button>

<style>
  .tile {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 10px 8px 9px;
    min-height: 0;
    text-transform: none; letter-spacing: normal;
    border-radius: 4px;
  }
  .stage {
    width: 100%; height: 56px;
    display: grid; place-items: center;
    overflow: hidden;
    border-radius: 3px;
    background: rgba(11, 9, 8, .5);
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, .6);
  }
  .mote {
    width: 30px; height: 42px;
    border-radius: 3px;
    background: linear-gradient(160deg, var(--gold-hi), var(--gold) 50%, var(--gold-deep));
    box-shadow: 0 0 0 1px rgba(11, 9, 8, .8), 0 3px 8px rgba(0, 0, 0, .5);
  }
  .lab {
    font-family: var(--font-roman); font-size: 10px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase; color: var(--parchment);
  }
  .det { font-family: var(--font-text); font-size: 11.5px; font-style: italic; color: var(--parchment-faint); }

  /* --- the catalogue -------------------------------------------------------
     Each entry is driven by data-anim so the list stays declarative. Only the
     ones marked "en service" are used by the game today. */

  .playing[data-anim='spring-in']   { animation: d-spring .6s var(--ease-elastic-3) both; }
  .playing[data-anim='squash']      { animation: d-squash .5s var(--ease-out-3) both; }
  .playing[data-anim='land']        { animation: d-land .5s var(--ease-elastic-3) both; }
  .playing[data-anim='flip']        { animation: d-flip .7s var(--ease-in-out-3) both; }
  .playing[data-anim='foil']        { animation: d-foil 2.4s var(--ease-in-out-3) infinite; }
  .playing[data-anim='stamp']       { animation: d-stamp .6s var(--ease-squish-3) both; }
  .playing[data-anim='slam']        { animation: d-slam .55s var(--ease-elastic-4) both; }
  .playing[data-anim='rise']        { animation: d-rise 1.4s var(--ease-out-3) both; }
  .playing[data-anim='bob']         { animation: d-bob 2.6s ease-in-out infinite; }
  .playing[data-anim='breathe']     { animation: d-breathe 1.8s ease-in-out infinite; }
  .playing[data-anim='candle']      { animation: d-candle 5.4s ease-in-out infinite; }
  .playing[data-anim='turn']        { animation: d-turn 7s linear infinite; }
  .playing[data-anim='pulse']       { animation: d-pulse 1.7s ease-in-out infinite; }
  .playing[data-anim='sweep']       { animation: d-sweep 1.6s var(--ease-out-3) infinite; }
  .playing[data-anim='emboss']      { animation: d-emboss .6s var(--ease-elastic-3) both; }
  .playing[data-anim='dust']        { animation: d-dust .9s var(--ease-out-3) both; }
  .playing[data-anim='sweep-out']   { animation: d-sweepout .8s var(--ease-elastic-3) both; }
  .playing[data-anim='wobble']      { animation: d-wobble 1.3s var(--ease-in-out-3) infinite; }
  .playing[data-anim='bloom']       { animation: d-bloom 1.5s var(--ease-out-3) infinite; }
  .playing[data-anim='smoke']       { animation: d-smoke 2.2s var(--ease-out-3) infinite; }
  .playing[data-anim='tilt']        { animation: d-tilt 2.8s var(--ease-in-out-3) infinite; }
  .playing[data-anim='shiver']      { animation: d-shiver .5s linear both; }

  @keyframes d-spring { 0% { transform: scale(.3) translateY(26px); opacity: 0; } 100% { transform: none; opacity: 1; } }
  @keyframes d-squash { 0% { scale: .86 1.22; } 46% { scale: 1.18 .82; } 74% { scale: .96 1.05; } 100% { scale: 1 1; } }
  @keyframes d-land {
    0% { transform: scale(1.5) translateY(-40px) rotate(-16deg); opacity: 0; }
    55% { opacity: 1; }
    100% { transform: none; opacity: 1; }
  }
  @keyframes d-flip { 0% { transform: perspective(300px) rotateY(0); } 100% { transform: perspective(300px) rotateY(360deg); } }
  @keyframes d-foil {
    0%, 100% { background: linear-gradient(160deg, var(--gold-deep), var(--gold) 50%, var(--gold-hi)); filter: brightness(.9); }
    50% { background: linear-gradient(20deg, var(--gold-hi), #fffdf6 50%, var(--gold)); filter: brightness(1.3); }
  }
  @keyframes d-stamp {
    0% { transform: scale(2.1) rotate(-14deg); opacity: 0; }
    45% { transform: scale(.88) rotate(2deg); opacity: 1; }
    70% { transform: scaleX(1.07) scaleY(.93) rotate(-1deg); }
    100% { transform: rotate(-1.5deg); opacity: 1; }
  }
  @keyframes d-slam { 0% { transform: scale(2.6) rotate(-7deg); opacity: 0; } 60% { transform: scale(.93) rotate(2deg); opacity: 1; } 100% { transform: none; } }
  @keyframes d-rise {
    0% { transform: translateY(12px) scale(.5); opacity: 0; }
    22% { transform: translateY(-4px) scale(1.3); opacity: 1; }
    100% { transform: translateY(-40px) scale(.95); opacity: 0; }
  }
  @keyframes d-bob { 0%, 100% { translate: 0 0; } 50% { translate: 0 -7px; } }
  @keyframes d-breathe { 0%, 100% { scale: 1; } 50% { scale: 1.12; } }
  @keyframes d-candle {
    0% { opacity: .8; scale: 1; } 13% { opacity: 1; scale: 1.05; }
    27% { opacity: .7; scale: .98; } 44% { opacity: .96; scale: 1.03; }
    61% { opacity: .66; scale: .96; } 78% { opacity: .9; scale: 1.01; }
    100% { opacity: .8; scale: 1; }
  }
  @keyframes d-turn { to { rotate: 360deg; } }
  @keyframes d-pulse { 0%, 100% { box-shadow: 0 0 0 1px rgba(11,9,8,.8); } 50% { box-shadow: 0 0 0 2px var(--gold), 0 0 20px rgba(200,160,74,.7); } }
  @keyframes d-sweep { 0% { filter: brightness(.85); } 45% { filter: brightness(1.7) saturate(1.3); } 100% { filter: brightness(.85); } }
  @keyframes d-emboss { 0% { transform: scale(1.9); opacity: 0; } 100% { transform: none; opacity: 1; } }
  @keyframes d-dust {
    0% { opacity: 0; transform: translateY(-14px); }
    40% { opacity: 1; transform: none; }
    100% { opacity: .25; box-shadow: 0 14px 10px -8px rgba(200,160,74,.5); }
  }
  @keyframes d-sweepout { 0% { transform: none; opacity: 1; } 100% { transform: translateX(70px) scale(.5); opacity: 0; } }
  @keyframes d-wobble { 0%, 100% { rotate: -4deg; } 50% { rotate: 4deg; } }
  @keyframes d-bloom {
    0% { box-shadow: 0 0 0 0 rgba(200,160,74,.6); }
    70% { box-shadow: 0 0 0 20px rgba(200,160,74,0); }
    100% { box-shadow: 0 0 0 0 rgba(200,160,74,0); }
  }
  @keyframes d-smoke {
    0% { opacity: 1; filter: blur(0); transform: none; }
    100% { opacity: 0; filter: blur(7px); transform: translateY(-26px) scale(1.4); }
  }
  @keyframes d-tilt {
    0%, 100% { transform: perspective(300px) rotateX(0) rotateY(0); }
    25% { transform: perspective(300px) rotateX(13deg) rotateY(-15deg); }
    75% { transform: perspective(300px) rotateX(-13deg) rotateY(15deg); }
  }
  @keyframes d-shiver {
    10%, 90% { translate: -2px 0; } 20%, 80% { translate: 3px 0; }
    30%, 50%, 70% { translate: -5px 0; } 40%, 60% { translate: 5px 0; }
  }
</style>
