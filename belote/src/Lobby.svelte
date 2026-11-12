<script lang="ts">
  // The way in. No owner, no invite: the four chairs are shown as they stand and
  // you take whichever is free. Occupancy is live, straight from the server.
  import { SEAT_LABEL } from './cards';
  import { sfx, unlock } from './sfx.svelte';
  import { net } from './net.svelte';

  interface Props {
    name: string;
    onsit: (seat: string, takeover: boolean) => void;
  }
  let { name = $bindable(), onsit }: Props = $props();

  const SEATS = ['nord', 'est', 'sud', 'ouest'];
  const teamOf = (s: string) => (s === 'nord' || s === 'sud' ? 'ns' : 'eo');
  const seats = $derived(net.state?.seats ?? null);
  const taken = $derived(
    seats ? Object.values(seats).filter((s) => s.online).length : 0,
  );

  function sit(seat: string) {
    const info = seats?.[seat];
    if (info?.online) return;
    unlock();                       // the gesture that lets sound start
    sfx.join();
    onsit(seat, !!info?.name);      // reclaiming a seat left by someone offline
  }
</script>

<div class="lobby">
  <h1>Belotier</h1>
  <p class="lede">
    Belote à quatre. Choisis une place : la partie démarre d'elle-même dès que
    les quatre chaises sont occupées.
  </p>

  {#if seats}
    <input class="name" bind:value={name} maxlength="18" placeholder="Ton prénom (facultatif)" />
    <div class="count"><b>{taken}</b> / 4 joueurs</div>
    <div class="table-plan">
      {#each SEATS as seat}
        {@const info = seats[seat]}
        <button
          class="chair {seat}"
          class:busy={info.online}
          class:held={!info.online && info.name}
          style="--c: var(--{teamOf(seat)})"
          onclick={() => sit(seat)}
          disabled={info.online}
        >
          <span class="who">{SEAT_LABEL[seat]}</span>
          <span class="st">
            {#if info.online}{info.name ?? 'occupée'}
            {:else if info.name}reprendre {info.name}
            {:else}libre{/if}
          </span>
        </button>
      {/each}
      <div class="felt">
        <span>Nord-Sud</span>
        <span class="vs">contre</span>
        <span>Est-Ouest</span>
      </div>
    </div>
    <p class="note">Les partenaires se font face. Ton siège est retenu si tu recharges la page.</p>
  {:else}
    <p class="lede">Connexion au serveur…</p>
  {/if}
</div>

<style>
  .lobby { max-width: 520px; margin: 0 auto; padding: 14px 4px 36px; text-align: center; }
  h1 { font-size: clamp(34px, 12vw, 58px); margin: 6px 0 4px; letter-spacing: -.03em; color: var(--gold); text-shadow: 0 4px 0 rgba(0, 0, 0, .4); }
  .lede { color: var(--ink-dim); line-height: 1.5; margin: 0 auto 16px; max-width: 36ch; }
  .name {
    font: inherit; font-weight: 700; text-align: center;
    padding: 11px 14px; min-height: 46px; width: min(280px, 92%);
    margin-bottom: 14px;
    border-radius: 12px; border: 2px solid rgba(255, 255, 255, .2);
    background: rgba(0, 0, 0, .3); color: var(--ink);
  }
  .count { font-size: 14px; color: var(--ink-dim); margin-bottom: 12px; }
  .count b { font-size: 22px; color: var(--gold); }

  .table-plan {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: auto auto auto;
    gap: 9px;
    align-items: center;
  }
  .nord { grid-area: 1 / 2; }
  .ouest { grid-area: 2 / 1; }
  .est { grid-area: 2 / 3; }
  .sud { grid-area: 3 / 2; }
  .felt {
    grid-area: 2 / 2;
    display: flex; flex-direction: column; gap: 1px;
    padding: 12px 8px; border-radius: 50%;
    background: radial-gradient(circle, #15503c, #0c2a20);
    border: 2px solid rgba(255, 255, 255, .1);
    font-size: 10.5px; color: var(--ink-dim); text-transform: uppercase; letter-spacing: .06em;
  }
  .felt .vs { color: var(--gold); font-size: 9px; }

  .chair {
    display: flex; flex-direction: column; gap: 2px;
    padding: 13px 8px; min-height: 68px;
    border: 2px solid var(--c);
    background: rgba(0, 0, 0, .3);
  }
  .chair:not(:disabled):hover { background: rgba(255, 255, 255, .07); }
  .who { font-size: 15px; font-weight: 900; }
  .st { font-size: 11px; color: var(--ink-dim); font-weight: 700; }
  .busy { opacity: .5; }
  .busy .st { color: #ff9aa2; }
  .held { border-style: dashed; }
  .held .st { color: var(--gold); }

  .note { color: var(--ink-dim); font-size: 12px; margin-top: 16px; }
</style>
