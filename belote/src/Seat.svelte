<script lang="ts">
  // An opponent (or your partner): an engraved brass nameplate, a fanned stack of
  // card backs, and a lit plate while it is their turn.
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
  <div class="plate" style="--team: var(--{info.team})">
    <b>{info.name ?? SEAT_LABEL[seat]}</b>
    <span class="meta">
      {#if !info.online}
        <span class="off">hors ligne</span>
      {:else}
        <span class="num">{info.cards}</span>
      {/if}
      {#if isDealer}<i title="Donneur" aria-label="Donneur">D</i>{/if}
      {#if isTaker}<i class="taker" title="Preneur" aria-label="Preneur">P</i>{/if}
    </span>
  </div>
</div>

<style>
  .seat { display: flex; flex-direction: column; align-items: center; gap: 5px; }

  .backs { position: relative; height: 34px; display: flex; justify-content: center; }
  .backs img {
    width: 24px; height: 34px; border-radius: 3px;
    margin-left: -16px;
    box-shadow: 0 0 0 1px rgba(11, 9, 8, .8), 0 2px 0 rgba(0, 0, 0, .5);
    rotate: calc((var(--i) - 3.5) * 3deg);
  }
  .backs img:first-child { margin-left: 0; }

  /* A nameplate screwed to the table rail: brass, bevelled, with the team's
     colour as the engraved border rather than as a fill. */
  .plate {
    display: flex; flex-direction: column; align-items: center; line-height: 1.2;
    padding: 5px 11px;
    border-radius: 4px;
    background: linear-gradient(var(--leather-2), var(--leather-0));
    border: 1px solid var(--team);
    box-shadow:
      inset 0 1px 0 rgba(234, 211, 160, .18),
      inset 0 -2px 5px rgba(0, 0, 0, .5),
      0 2px 0 var(--void),
      0 4px 10px rgba(0, 0, 0, .45);
    max-width: 112px;
  }
  .plate b {
    font-family: var(--font-roman);
    font-size: 12px; font-weight: 700; letter-spacing: .07em;
    text-transform: uppercase;
    color: var(--parchment);
    text-shadow: 0 -1px 0 rgba(0, 0, 0, .7);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 92px;
  }
  .meta { color: var(--parchment-dim); font-size: 11px; display: flex; gap: 5px; align-items: center; }
  .meta .num { font-size: 12px; color: var(--gold); }
  .meta .off { font-family: var(--font-text); font-style: italic; color: var(--oxblood); }
  .meta i {
    font-family: var(--font-roman);
    font-style: normal; font-weight: 800; font-size: 9px;
    background: var(--parchment-faint); color: var(--void);
    border-radius: 2px; padding: 0 3px;
  }
  .meta i.taker { background: var(--gold); }

  .offline { opacity: .42; filter: grayscale(.7) sepia(.3); }

  /* Their turn: the plate catches the candle light. */
  .active .plate {
    border-color: var(--gold);
    box-shadow:
      inset 0 1px 0 rgba(255, 245, 220, .3),
      0 2px 0 var(--void),
      0 0 0 1px rgba(200, 160, 74, .3),
      0 0 22px rgba(200, 160, 74, .45);
    animation: breathe 1.8s ease-in-out infinite;
  }
  @keyframes breathe { 0%, 100% { scale: 1; } 50% { scale: 1.05; } }
</style>
