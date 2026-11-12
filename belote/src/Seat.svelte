<script lang="ts">
  // An opponent (or your partner): name, team colour, a fanned stack of card
  // backs, and a ring while it is their turn.
  import { SEAT_LABEL, backSrc } from './cards';

  interface Props {
    seat: string;
    info: { name: string | null; online: boolean; ready: boolean; team: string; cards: number };
    where: 'left' | 'top' | 'right';
    active: boolean;
    isDealer: boolean;
    isTaker: boolean;
    template: string;
  }
  let { seat, info, where, active, isDealer, isTaker, template }: Props = $props();
  const shown = $derived(Math.min(info.cards, 8));
</script>

<div class="seat {where}" class:active class:offline={!info.online}>
  <div class="backs" aria-hidden="true">
    {#each Array(shown) as _, i}
      <img src={backSrc(template)} alt="" style="--i:{i}" />
    {/each}
  </div>
  <div class="tag" style="--team: var(--{info.team})">
    <b>{info.name ?? SEAT_LABEL[seat]}</b>
    <span class="meta">
      {#if !info.online}hors ligne{:else}{info.cards}{/if}
      {#if isDealer}<i title="Donneur">D</i>{/if}
      {#if isTaker}<i class="taker" title="Preneur">P</i>{/if}
    </span>
  </div>
</div>

<style>
  .seat { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .left, .right { flex-direction: column; }

  .backs { position: relative; height: 34px; display: flex; justify-content: center; }
  .backs img {
    width: 24px; height: 34px; border-radius: 4px;
    margin-left: -16px;
    box-shadow: 0 2px 0 rgba(0, 0, 0, .4);
    rotate: calc((var(--i) - 3.5) * 3deg);
  }
  .backs img:first-child { margin-left: 0; }

  .tag {
    display: flex; flex-direction: column; align-items: center; line-height: 1.15;
    padding: 4px 10px; border-radius: 10px;
    background: rgba(0, 0, 0, .34);
    border: 2px solid var(--team);
    font-size: 12px;
    max-width: 104px;
  }
  .tag b { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 86px; }
  .meta { color: var(--ink-dim); font-size: 11px; display: flex; gap: 5px; align-items: center; }
  .meta i {
    font-style: normal; font-weight: 900; font-size: 9px;
    background: var(--ink-dim); color: var(--felt-0);
    border-radius: 3px; padding: 0 3px;
  }
  .meta i.taker { background: var(--gold); }

  .offline { opacity: .45; filter: grayscale(.7); }
  .active .tag {
    box-shadow: 0 0 0 3px rgba(240, 181, 46, .35), 0 0 18px rgba(240, 181, 46, .5);
    animation: breathe 1.6s ease-in-out infinite;
  }
  @keyframes breathe { 0%, 100% { scale: 1; } 50% { scale: 1.06; } }
</style>
