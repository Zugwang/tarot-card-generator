<script lang="ts">
  // Bidding panel. Round 1 offers only the turned suit; round 2 lets you name
  // another. Which suits are legal comes from the server, never computed here.
  import { SUIT_GLYPH, SUIT_IS_RED, SUIT_LABEL } from './cards';
  import { sfx } from './sfx.svelte';
  import Card from './Card.svelte';

  interface Props {
    bidding: { round: number; current: string | null; allowed: string[]; history: any[] };
    retourne: string | null;
    template: string;
    yourTurn: boolean;
    onbid: (action: string, suit?: string) => void;
  }
  let { bidding, retourne, template, yourTurn, onbid }: Props = $props();
  let chosen = $state<string | null>(null);

  function take(suit?: string) {
    sfx.take();
    onbid('prends', suit);
  }
  function pass() {
    sfx.pass();
    onbid('passe');
  }
</script>

<div class="bid">
  {#if retourne}
    <div class="retourne">
      <Card {template} id={retourne} />
      <span class="cap">Retourne</span>
    </div>
  {/if}

  <div class="panel">
    <div class="round">Tour {bidding.round} / 2</div>
    {#if yourTurn}
      {#if bidding.round === 1}
        <div class="row">
          <button class="primary" onclick={() => take()}>Je prends</button>
          <button onclick={pass}>Je passe</button>
        </div>
      {:else}
        <div class="suits">
          {#each bidding.allowed as s}
            <button
              class="suit"
              class:red={SUIT_IS_RED[s]}
              class:on={chosen === s}
              onclick={() => { chosen = s; sfx.click(); }}
              aria-label={SUIT_LABEL[s]}
            >{SUIT_GLYPH[s]}</button>
          {/each}
        </div>
        <div class="row">
          <button class="primary" disabled={!chosen} onclick={() => take(chosen!)}>
            Je prends {chosen ? SUIT_GLYPH[chosen] : ''}
          </button>
          <button onclick={pass}>Je passe</button>
        </div>
      {/if}
    {:else}
      <div class="waiting">En attente de <b>{bidding.current ?? '...'}</b></div>
    {/if}

    {#if bidding.history.length}
      <div class="hist">
        {#each bidding.history.slice(-4) as h}
          <span class="pill">{h.seat} : {h.action === 'passe' ? 'passe' : `prend ${SUIT_GLYPH[h.suit] ?? ''}`}</span>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .bid { display: flex; gap: 14px; align-items: center; justify-content: center; flex-wrap: wrap; }
  .retourne { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .cap { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-dim); }
  .panel { display: flex; flex-direction: column; gap: 9px; align-items: center; }
  .round { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: var(--gold); font-weight: 800; }
  .row { display: flex; gap: 9px; }
  .suits { display: flex; gap: 8px; }
  .suit {
    width: 52px; height: 52px; min-height: 52px; padding: 0;
    font-size: 26px; line-height: 1; color: #f2ead8;
  }
  .suit.red { color: #ff7a85; }
  .suit.on { background: linear-gradient(#f3c14a, var(--gold-deep)); color: #2a1c02; scale: 1.08; }
  .waiting { color: var(--ink-dim); font-size: 14px; }
  .waiting b { color: var(--ink); text-transform: capitalize; }
  .hist { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; max-width: 320px; }
</style>
