<script lang="ts">
  // End-of-deal panel. The numbers count up rather than appear, each tick
  // firing a rising blip — the one borrowing most directly from Balatro.
  import { TEAM_LABEL } from './cards';
  import { sfx } from './sfx.svelte';

  interface Props {
    score: Record<string, any>;
    scores: Record<string, number>;
    target: number;
    you: string;
    teams: Record<string, string>;
    ready: boolean;
    gameOver: boolean;
    onready: () => void;
  }
  let { score, scores, target, you, teams, ready, gameOver, onready }: Props = $props();

  const yourTeam = $derived(teams[you]);
  const won = $derived(
    gameOver
      ? scores[yourTeam] > scores[yourTeam === 'ns' ? 'eo' : 'ns']
      : score.takerTeam === yourTeam ? score.success : !score.success,
  );

  // Animated counters, one per team.
  let shown = $state<Record<string, number>>({ ns: 0, eo: 0 });
  $effect(() => {
    const targets = score.awarded as Record<string, number>;
    let step = 0;
    const steps = 18;
    sfx.chips(Math.min(12, Math.round((targets.ns + targets.eo) / 20) + 3));
    const t = setInterval(() => {
      step++;
      const k = step / steps;
      const ease = 1 - (1 - k) ** 3;
      shown = { ns: Math.round(targets.ns * ease), eo: Math.round(targets.eo * ease) };
      if (step >= steps) clearInterval(t);
    }, 42);
    return () => clearInterval(t);
  });
</script>

<div class="wrap">
  <div class="card-panel" class:won class:lost={!won}>
    <h2>
      {#if gameOver}
        {won ? 'Partie gagnée !' : 'Partie perdue'}
      {:else if score.litige}
        Litige — 81 partout
      {:else if score.capot}
        Capot !
      {:else}
        {score.success ? 'Contrat réussi' : 'Dedans !'}
      {/if}
    </h2>

    <div class="teams">
      {#each ['ns', 'eo'] as t}
        <div class="team" class:mine={t === yourTeam} style="--c: var(--{t})">
          <div class="nm">{TEAM_LABEL[t]}{#if t === score.takerTeam}<i>preneur</i>{/if}</div>
          <div class="pts num">{score.cardPoints[t]}<small> pts</small></div>
          <div class="gain num">+{shown[t]}</div>
          <div class="tot num">{scores[t]} / {target}</div>
          <div class="bar"><span style="width: {Math.min(100, (scores[t] / target) * 100)}%"></span></div>
        </div>
      {/each}
    </div>

    <div class="notes">
      {#if score.belote}<span class="pill">Belote-rebelote +20 ({TEAM_LABEL[score.belote]})</span>{/if}
      {#if score.litige}<span class="pill">81 points reportés à la donne suivante</span>{/if}
      <span class="pill">Plis {score.tricksWon.ns} / {score.tricksWon.eo}</span>
    </div>

    <button class="primary" onclick={onready} disabled={ready}>
      {ready ? 'En attente des autres…' : gameOver ? 'Rejouer' : 'Donne suivante'}
    </button>
  </div>
</div>

<style>
  .wrap {
    position: fixed; inset: 0; z-index: 70;
    display: grid; place-items: center;
    /* Warm smoke, not a cold grey scrim. */
    background: rgba(11, 9, 8, .78);
    backdrop-filter: blur(3px);
    padding: 16px;
    animation: fade .25s ease both;
  }

  /* A page torn from the score book: parchment-edged leather, gilt rule. */
  .card-panel {
    width: min(430px, 100%);
    display: flex; flex-direction: column; gap: 15px;
    padding: 22px;
    border-radius: 6px;
    background:
      radial-gradient(120% 90% at 50% 0%, var(--leather-1), var(--bister) 60%, var(--void));
    border: 1px solid var(--gold-deep);
    box-shadow:
      inset 0 1px 0 rgba(234, 211, 160, .2),
      inset 0 0 0 4px rgba(11, 9, 8, .5),
      inset 0 0 0 5px rgba(200, 160, 74, .18),
      0 20px 54px rgba(0, 0, 0, .75);
    animation: pop .42s var(--ease-elastic-3) both;
  }
  .lost { border-color: var(--oxblood); }

  h2 {
    margin: 0; text-align: center;
    font-family: var(--font-display);
    font-size: clamp(26px, 8vw, 36px);
    font-weight: 400;
    line-height: 1.05;
  }
  .won h2 { color: var(--gold); text-shadow: 0 2px 0 var(--void), 0 0 28px rgba(200, 160, 74, .3); }
  .lost h2 { color: var(--vermillon); text-shadow: 0 2px 0 var(--void); }

  .teams { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
  .team {
    padding: 11px 9px; border-radius: 4px; text-align: center;
    background: rgba(11, 9, 8, .45);
    border: 1px solid var(--c);
    box-shadow: inset 0 1px 0 rgba(234, 211, 160, .1);
  }
  .mine { box-shadow: inset 0 1px 0 rgba(234, 211, 160, .16), 0 0 16px color-mix(in srgb, var(--c) 35%, transparent); }
  .nm {
    font-family: var(--font-roman); font-size: 10.5px; font-weight: 700;
    letter-spacing: .12em; text-transform: uppercase; color: var(--parchment);
  }
  .nm i {
    display: block; font-style: normal; font-size: 9px; letter-spacing: .14em;
    color: var(--gold); margin-top: 1px;
  }
  .pts { font-size: 28px; color: var(--parchment); text-shadow: 0 -1px 0 rgba(0, 0, 0, .6); }
  .pts small {
    font-family: var(--font-roman); font-size: 10px; font-weight: 600;
    letter-spacing: .1em; color: var(--parchment-faint);
  }
  /* The counter that rolls up with a rising blip — the most Balatro thing here. */
  .gain {
    font-size: 19px; color: var(--gold);
    text-shadow: 0 1px 0 var(--void), 0 0 14px rgba(200, 160, 74, .4);
  }
  .tot { font-size: 11px; color: var(--parchment-faint); margin-top: 3px; letter-spacing: .06em; }
  .bar {
    height: 4px; border-radius: 2px; margin-top: 5px; overflow: hidden;
    background: rgba(0, 0, 0, .55);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, .7);
  }
  .bar span {
    display: block; height: 100%;
    background: linear-gradient(90deg, color-mix(in srgb, var(--c) 55%, var(--void)), var(--c));
    transition: width .7s var(--ease-elastic-3);
  }

  .notes { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }

  @keyframes fade { from { opacity: 0; } }
  @keyframes pop { from { transform: scale(.86) translateY(14px); opacity: 0; } }
</style>
