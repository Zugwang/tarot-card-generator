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
          <div class="pts">{score.cardPoints[t]}<small> pts</small></div>
          <div class="gain">+{shown[t]}</div>
          <div class="tot">{scores[t]} / {target}</div>
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
    background: rgba(4, 14, 11, .72);
    backdrop-filter: blur(3px);
    padding: 16px;
    animation: fade .25s ease both;
  }
  .card-panel {
    width: min(430px, 100%);
    display: flex; flex-direction: column; gap: 14px;
    padding: 20px;
    border-radius: 20px;
    background: linear-gradient(#154232, #0c2a20);
    border: 3px solid var(--gold);
    box-shadow: 0 18px 50px rgba(0, 0, 0, .7);
    animation: pop .4s var(--spring) both;
  }
  .lost { border-color: #8e3038; }
  h2 { margin: 0; text-align: center; font-size: 25px; letter-spacing: -.01em; }
  .won h2 { color: var(--gold); text-shadow: 0 3px 0 rgba(0, 0, 0, .4); }
  .lost h2 { color: #ff8d96; }

  .teams { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .team {
    padding: 10px; border-radius: 13px; text-align: center;
    background: rgba(0, 0, 0, .28); border: 2px solid var(--c);
  }
  .mine { box-shadow: 0 0 0 2px rgba(255, 255, 255, .18); }
  .nm { font-size: 12px; font-weight: 800; }
  .nm i { display: block; font-style: normal; font-size: 10px; color: var(--gold); text-transform: uppercase; }
  .pts { font-size: 26px; font-weight: 900; }
  .pts small { font-size: 11px; font-weight: 700; color: var(--ink-dim); }
  .gain { font-size: 17px; font-weight: 900; color: var(--gold); }
  .tot { font-size: 11px; color: var(--ink-dim); margin-top: 3px; }
  .bar { height: 5px; border-radius: 3px; background: rgba(0, 0, 0, .4); overflow: hidden; margin-top: 4px; }
  .bar span { display: block; height: 100%; background: var(--c); transition: width .7s var(--spring); }

  .notes { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }

  @keyframes fade { from { opacity: 0; } }
  @keyframes pop { from { transform: scale(.86) translateY(14px); opacity: 0; } }
</style>
