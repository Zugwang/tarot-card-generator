<script lang="ts">
  import { onMount } from 'svelte';
  import { connect, joinSeat, leaveSeat, net, onEvent, readSeat, send, watchLifecycle } from './net.svelte';
  import { audio, sfx, toggleMute, unlock } from './sfx.svelte';
  import { banner, confetti, floatText, fx, shake } from './fx.svelte';
  import { SEAT_LABEL, SUIT_GLYPH, SUIT_IS_RED, TEAM_LABEL, relative } from './cards';
  import Bidding from './Bidding.svelte';
  import DealEnd from './DealEnd.svelte';
  import Hand from './Hand.svelte';
  import Lobby from './Lobby.svelte';
  import Overlay from './Overlay.svelte';
  import Seat from './Seat.svelte';
  import Trick from './Trick.svelte';

  const urlSeat = readSeat();
  let joined = $state(!!urlSeat);
  let playerName = $state(localStorage.getItem('belotier.name') ?? '');

  const s = $derived(net.state);
  const you = $derived(s?.you ?? link.seat ?? 'sud');
  const template = $derived(s?.template ?? 'marseille');
  const yourTurn = $derived(!!s && s.turn === you);
  const others = $derived(
    (['nord', 'est', 'sud', 'ouest'] as const)
      .filter((x) => x !== you)
      .map((x) => ({ seat: x, where: relative(you, x) as 'left' | 'top' | 'right' })),
  );

  /** Take a chair from the lobby. No key, no owner: first come, first served. */
  function sit(seat: string, takeover = false) {
    localStorage.setItem('belotier.name', playerName);
    joined = true;
    joinSeat(seat, playerName || null, takeover);
  }
  function retake() {
    unlock();
    sit(net.state?.you ?? urlSeat ?? 'nord', true);
  }

  function play(card: string) {
    sfx.play();
    send({ t: 'play', card });
  }
  function bid(action: string, suit?: string) {
    send({ t: 'bid', action, suit });
  }
  function ready() {
    sfx.click();
    send({ t: 'ready' });
  }

  onMount(() => {
    watchLifecycle();
    // A reload (or a phone waking up) on /s/<seat> puts you straight back in
    // your chair; otherwise we just watch the lobby.
    if (urlSeat) joinSeat(urlSeat, playerName || null);
    else connect();

    onEvent((e) => {
      switch (e.type) {
        case 'deal':
          for (let i = 0; i < 8; i++) sfx.deal(i);
          banner('Nouvelle donne', `Donneur : ${SEAT_LABEL[e.dealer] ?? e.dealer}`, 'gold', 1500);
          break;
        case 'bid':
          if (e.seat !== you) (e.action === 'prends' ? sfx.take : sfx.pass)();
          break;
        case 'contract': {
          const g = SUIT_GLYPH[e.suit] ?? '';
          banner(`${SEAT_LABEL[e.seat ?? e.taker] ?? e.taker} prend ${g}`, `Atout ${e.suit}`, 'gold');
          shake();
          break;
        }
        case 'play':
          if (e.seat !== you) sfx.play();
          break;
        case 'trick': {
          sfx.trick();
          const tone = e.team === 'ns' ? 'ns' : 'eo';
          if (e.points > 0) floatText(`+${e.points}`, tone, 50, 40);
          if (e.points >= 30) shake();
          break;
        }
        case 'belote':
          sfx.belote();
          banner('Belote !', SEAT_LABEL[e.seat] ?? '', 'gold', 1600);
          shake();
          break;
        case 'deal_end':
          if (e.capot) { shake(); }
          break;
        case 'game_end': {
          const mine = s?.teams?.[you];
          const win = e.winner === mine;
          (win ? sfx.win : sfx.lose)();
          if (win) confetti();
          break;
        }
        case 'paused':
          banner('Pause', `${SEAT_LABEL[e.seat] ?? ''} s'est déconnecté`, 'red', 2000);
          break;
        case 'resumed':
          banner('On reprend', '', 'gold', 1200);
          sfx.join();
          break;
        case 'seated':
          if (e.seat !== you) sfx.join();
          break;
        case 'redeal':
          banner('Tous passent', 'On redonne', 'gold', 1500);
          break;
      }
    });
  });
</script>

<svelte:window onpointerdown={unlock} />

<div class="root" class:shake={fx.shaking}>
  {#if !joined}
    <Lobby bind:name={playerName} onsit={sit} />
  {:else if net.seatBusy}
    <div class="gate">
      <h1>Place occupée</h1>
      <p class="lede">Quelqu'un est déjà assis là. Si c'est toi sur un autre appareil, reprends la place.</p>
      <button class="primary big" onclick={retake}>Reprendre la place</button>
      <button onclick={() => { joined = false; leaveSeat(); }}>Choisir une autre place</button>
    </div>
  {:else if !s}
    <div class="gate"><h1>Connexion…</h1></div>
  {:else}
    <header>
      <div class="scores">
        {#each ['ns', 'eo'] as t}
          <div class="sc" class:mine={s.teams[you] === t} style="--c: var(--{t})">
            <span class="lab">{TEAM_LABEL[t]}</span>
            <b>{s.scores[t]}</b>
          </div>
        {/each}
      </div>
      <div class="mid">
        {#if s.trump}
          <span class="trump" class:red={SUIT_IS_RED[s.trump]}>{SUIT_GLYPH[s.trump]}</span>
        {/if}
        {#if s.taker}<span class="pill">{SEAT_LABEL[s.taker]} preneur</span>{/if}
        {#if s.carried}<span class="pill">report {s.carried}</span>{/if}
      </div>
      <button class="icon" onclick={() => { toggleMute(); }} aria-label={audio.muted ? 'Activer le son' : 'Couper le son'}>
        {audio.muted ? '\u{1F507}' : '\u{1F50A}'}
      </button>
    </header>

    <main class="board">
      <div class="row top">
        {#each others.filter((o) => o.where === 'top') as o}
          <Seat seat={o.seat} info={s.seats[o.seat]} where="top" active={s.turn === o.seat}
                isDealer={s.dealer === o.seat} isTaker={s.taker === o.seat} {template} />
        {/each}
      </div>

      <div class="row middle">
        <div class="side">
          {#each others.filter((o) => o.where === 'left') as o}
            <Seat seat={o.seat} info={s.seats[o.seat]} where="left" active={s.turn === o.seat}
                  isDealer={s.dealer === o.seat} isTaker={s.taker === o.seat} {template} />
          {/each}
        </div>

        <div class="centre">
          {#if s.phase === 'bidding' && s.bidding}
            <Bidding bidding={s.bidding} retourne={s.retourne} {template}
                     yourTurn={s.bidding.current === you} onbid={bid} />
          {:else if s.phase === 'lobby'}
            <div class="await">
              <div class="big-num">{Object.values(s.seats).filter((x) => x.online).length} / 4</div>
              <p>En attente des joueurs…</p>
            </div>
          {:else}
            <Trick trick={s.trick} {you} {template} winner={s.trickWinner} />
          {/if}
        </div>

        <div class="side">
          {#each others.filter((o) => o.where === 'right') as o}
            <Seat seat={o.seat} info={s.seats[o.seat]} where="right" active={s.turn === o.seat}
                  isDealer={s.dealer === o.seat} isTaker={s.taker === o.seat} {template} />
          {/each}
        </div>
      </div>

      <div class="row bottom">
        <div class="status" class:yours={yourTurn}>
          {#if s.phase === 'paused'}
            En pause — on attend un joueur
          {:else if s.phase === 'playing'}
            {yourTurn ? 'À toi de jouer' : `Au tour de ${SEAT_LABEL[s.turn ?? ''] ?? '…'}`}
          {:else if s.phase === 'bidding'}
            Enchères — {s.bidding?.current === you ? 'à toi' : SEAT_LABEL[s.bidding?.current ?? ''] ?? ''}
          {:else if s.phase === 'trick_done'}
            Pli pour {SEAT_LABEL[s.trickWinner ?? ''] ?? ''}
          {:else}
            &nbsp;
          {/if}
        </div>
        <Hand cards={s.hand} playable={s.playable} {template} {yourTurn} onplay={play} />
      </div>
    </main>

    {#if s.dealScore && (s.phase === 'deal_end' || s.phase === 'game_end')}
      <DealEnd score={s.dealScore} scores={s.scores} target={s.target} {you} teams={s.teams}
               ready={s.seats[you].ready} gameOver={s.phase === 'game_end'} onready={ready} />
    {/if}
  {/if}

  <Overlay />

  {#if net.status === 'retrying' || net.status === 'connecting'}
    <div class="net">Reconnexion…</div>
  {/if}
  {#if net.error}
    <div class="toast">{net.error}</div>
  {/if}
</div>

<style>
  .root { display: flex; flex-direction: column; flex: 1; min-height: 0; }

  header {
    display: flex; align-items: center; gap: 10px; justify-content: space-between;
    padding: 2px 2px 8px;
  }
  .scores { display: flex; gap: 7px; }
  .sc {
    display: flex; flex-direction: column; align-items: center; line-height: 1;
    padding: 5px 11px; border-radius: 11px;
    background: rgba(0, 0, 0, .3); border: 2px solid var(--c);
  }
  .sc.mine { box-shadow: 0 0 0 2px rgba(255, 255, 255, .2); }
  .lab { font-size: 9.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-dim); }
  .sc b { font-size: 19px; }
  .mid { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; justify-content: center; }
  .trump {
    font-size: 27px; line-height: 1; color: #f2ead8;
    text-shadow: 0 2px 0 rgba(0, 0, 0, .5);
  }
  .trump.red { color: #ff7a85; }
  .icon { padding: 9px 11px; min-height: 42px; font-size: 17px; }

  .board { flex: 1; display: grid; grid-template-rows: auto 1fr auto; min-height: 0; gap: 4px; }
  .row { display: flex; align-items: center; justify-content: center; }
  .middle { display: grid; grid-template-columns: auto 1fr auto; gap: 6px; align-items: center; min-height: 0; }
  .side { display: flex; justify-content: center; }
  .centre { position: relative; min-height: 190px; display: grid; place-items: center; }
  .bottom { flex-direction: column; gap: 2px; }

  .status {
    font-size: 13px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase;
    color: var(--ink-dim); min-height: 18px;
  }
  .status.yours { color: var(--gold); text-shadow: 0 0 14px rgba(240, 181, 46, .5); }

  .await { text-align: center; color: var(--ink-dim); }
  .big-num { font-size: 50px; font-weight: 900; color: var(--gold); }

  .gate {
    flex: 1; display: flex; flex-direction: column; gap: 14px;
    align-items: center; justify-content: center; text-align: center; padding: 20px;
  }
  .gate h1 { font-size: clamp(32px, 11vw, 52px); margin: 0; color: var(--gold); letter-spacing: -.03em; }
  .lede { color: var(--ink-dim); max-width: 34ch; line-height: 1.5; }
  .big { font-size: 17px; padding: 15px 28px; }

  .net, .toast {
    position: fixed; left: 50%; translate: -50% 0; z-index: 85;
    padding: 9px 16px; border-radius: 999px; font-size: 13px; font-weight: 800;
    box-shadow: 0 6px 20px rgba(0, 0, 0, .5);
  }
  .net { top: calc(env(safe-area-inset-top) + 8px); background: #6a4b12; color: #ffe6ae; }
  .toast { bottom: calc(env(safe-area-inset-bottom) + 14px); background: #7d2029; color: #ffd9dc; }

  @media (min-width: 760px) {
    :root { --card-w: 104px; --card-h: 146px; }
    .centre { min-height: 250px; }
  }
</style>
