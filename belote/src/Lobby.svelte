<script lang="ts">
  // The way in. No owner, no invite: the four chairs are shown as they stand and
  // you take whichever is free. Occupancy is live, straight from the server.
  import { SEAT_LABEL, SUIT_INK } from './cards';
  import Suit from './Suit.svelte';
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
  <h1 class="outlined">Belotier</h1>
  <div class="enseignes" aria-hidden="true">
    {#each ['epee', 'coupe', 'denier', 'baton'] as _, i}
      {@const suit = ['pique', 'coeur', 'carreau', 'trefle'][i]}
      <Suit {suit} size={22} color={SUIT_INK[suit]} />
    {/each}
  </div>
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

  /* The wordmark: blackletter, cut into the dark. This one element does more for
     the page's character than any amount of colour tuning. */
  h1 {
    font-size: clamp(42px, 15vw, 76px);
    margin: 10px 0 2px;
    color: var(--gold);
    -webkit-text-stroke-width: 6px;
  }
  /* A rule of enseignes under the title, the way a deck's box is marked. */
  .enseignes {
    display: flex; gap: 16px; justify-content: center; align-items: center;
    margin: 2px 0 14px;
    opacity: .5;
  }
  .enseignes::before, .enseignes::after {
    content: '';
    width: 42px; height: 1px;
    background: linear-gradient(90deg, transparent, var(--gold-deep));
  }
  .enseignes::after { background: linear-gradient(90deg, var(--gold-deep), transparent); }

  .lede {
    font-family: var(--font-text); font-size: 17px;
    color: var(--parchment-dim); line-height: 1.55; margin: 0 auto 18px; max-width: 36ch;
  }

  .name {
    font-family: var(--font-roman); font-size: 15px; font-weight: 600;
    letter-spacing: .06em; text-align: center;
    padding: 12px 14px; min-height: 48px; width: min(280px, 92%);
    margin-bottom: 16px;
    border-radius: 4px;
    border: 1px solid var(--gold-dark);
    background: rgba(11, 9, 8, .55);
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, .6);
    color: var(--parchment);
  }
  .name::placeholder { color: var(--parchment-faint); font-style: italic; }
  .name:focus-visible { outline: 2px solid var(--gold); outline-offset: 1px; border-color: var(--gold); }

  .count { font-family: var(--font-roman); font-size: 12px; letter-spacing: .12em;
           text-transform: uppercase; color: var(--parchment-faint); margin-bottom: 14px; }
  .count b { font-family: var(--font-display); font-size: 26px; color: var(--gold); letter-spacing: 0; }

  .table-plan {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    grid-template-rows: auto auto auto;
    gap: 10px;
    align-items: center;
  }
  .nord { grid-area: 1 / 2; }
  .ouest { grid-area: 2 / 1; }
  .est { grid-area: 2 / 3; }
  .sud { grid-area: 3 / 2; }

  /* The table itself: tanned leather with a gilt rim, not green felt. */
  .felt {
    grid-area: 2 / 2;
    display: flex; flex-direction: column; gap: 2px;
    padding: 14px 8px; border-radius: 50%;
    background:
      radial-gradient(circle at 38% 30%, var(--leather-2), var(--leather-0) 62%, var(--void));
    border: 1px solid var(--gold-dark);
    box-shadow:
      inset 0 2px 0 rgba(234, 211, 160, .14),
      inset 0 -8px 18px rgba(0, 0, 0, .6),
      0 0 24px rgba(200, 160, 74, .12);
    font-family: var(--font-roman);
    font-size: 9.5px; color: var(--parchment-faint);
    text-transform: uppercase; letter-spacing: .12em;
  }
  .felt .vs { color: var(--gold); font-size: 8.5px; opacity: .8; }

  /* Chairs are brass plates; the base button style already supplies the bevel. */
  .chair {
    display: flex; flex-direction: column; gap: 3px;
    padding: 13px 8px; min-height: 70px;
    border-radius: 4px;
    border-color: var(--c);
    text-transform: none; letter-spacing: normal;
  }
  .who {
    font-family: var(--font-roman); font-size: 14px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase;
  }
  .st {
    font-family: var(--font-text); font-size: 12.5px; font-style: italic;
    color: var(--parchment-dim); letter-spacing: 0;
  }
  .busy { opacity: .45; }
  .busy .st { color: var(--oxblood); font-style: normal; }
  /* A chair someone left behind: dashed, like a reserved place card. */
  .held { border-style: dashed; border-color: var(--gold); }
  .held .st { color: var(--gold); font-style: normal; }

  .note {
    font-family: var(--font-text); font-style: italic;
    color: var(--parchment-faint); font-size: 13px; margin-top: 18px;
  }
</style>
