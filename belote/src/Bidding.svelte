<script lang="ts">
  // Bidding panel. Round 1 offers only the turned suit; round 2 lets you name
  // another. Which suits are legal comes from the server, never computed here.
  import { SEAT_LABEL, SUIT_INK, SUIT_LABEL } from './cards';
  import { sfx } from './sfx.svelte';
  import Card from './Card.svelte';
  import Suit from './Suit.svelte';

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
      <span class="cap engraved">Retourne</span>
    </div>
  {/if}

  <div class="panel">
    <div class="round engraved">Tour {bidding.round} sur 2</div>
    {#if yourTurn}
      {#if bidding.round === 1}
        <div class="row">
          <button class="seal" onclick={() => take()}>Je prends</button>
          <button class="ghost" onclick={pass}>Je passe</button>
        </div>
      {:else}
        <div class="suits">
          {#each bidding.allowed as s}
            <button
              class="suitbtn"
              class:on={chosen === s}
              onclick={() => { chosen = s; sfx.click(); }}
              aria-label={SUIT_LABEL[s]}
            ><Suit suit={s} size={30} color={chosen === s ? '#2a1c02' : SUIT_INK[s]} /></button>
          {/each}
        </div>
        <div class="row">
          <button class="seal" disabled={!chosen} onclick={() => take(chosen!)}>
            Je prends
            {#if chosen}<Suit suit={chosen} size={22} color="#f6e6d2" />{/if}
          </button>
          <button class="ghost" onclick={pass}>Je passe</button>
        </div>
      {/if}
    {:else}
      <div class="waiting">
        En attente de <b>{SEAT_LABEL[bidding.current ?? ''] ?? bidding.current ?? '…'}</b>
      </div>
    {/if}

    {#if bidding.history.length}
      <div class="hist">
        {#each bidding.history.slice(-4) as h}
          <span class="pill">
            {SEAT_LABEL[h.seat] ?? h.seat}
            {#if h.action === 'passe'}
              passe
            {:else}
              prend <Suit suit={h.suit} size={13} color={SUIT_INK[h.suit]} />
            {/if}
          </span>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .bid { display: flex; gap: 16px; align-items: center; justify-content: center; flex-wrap: wrap; }
  .retourne { display: flex; flex-direction: column; align-items: center; gap: 5px; }
  .panel { display: flex; flex-direction: column; gap: 10px; align-items: center; }
  .round { color: var(--gold); opacity: .85; }
  .row { display: flex; gap: 10px; align-items: center; }
  .suits { display: flex; gap: 9px; }

  /* An enseigne pressed into a brass stud. */
  .suitbtn {
    width: 54px; height: 54px; min-height: 54px; padding: 0;
    display: grid; place-items: center;
    border-radius: 50%;
  }
  .suitbtn.on {
    background: linear-gradient(170deg, var(--gold-hi), var(--gold) 46%, var(--gold-deep));
    border-color: var(--gold-hi);
    scale: 1.1;
    box-shadow:
      inset 0 1px 0 rgba(255, 250, 235, .7),
      0 4px 0 var(--gold-dark),
      0 0 22px rgba(200, 160, 74, .45);
  }

  .waiting { color: var(--parchment-dim); font-size: 15px; font-family: var(--font-text); }
  .waiting b { color: var(--parchment); font-family: var(--font-roman); font-weight: 700; }
  .hist { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; max-width: 320px; }
</style>
