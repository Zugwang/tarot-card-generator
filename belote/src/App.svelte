<script lang="ts">
  import { onMount } from 'svelte';
  import { connect, joinSeat, leaveSeat, net, onEvent, readSeat, send, watchLifecycle } from './net.svelte';
  import { audio, sfx, toggleMute, unlock } from './sfx.svelte';
  import { banner, embers, floatText, fx, shake } from './fx.svelte';
  import { SEAT_LABEL, SUIT_INK, SUIT_LABEL, TEAM_LABEL, relative } from './cards';
  import Bidding from './Bidding.svelte';
  import DealEnd from './DealEnd.svelte';
  import Hand from './Hand.svelte';
  import Lobby from './Lobby.svelte';
  import Overlay from './Overlay.svelte';
  import Seat from './Seat.svelte';
  import Sigil from './Sigil.svelte';
  import Suit from './Suit.svelte';
  import Trick from './Trick.svelte';

  const urlSeat = readSeat();
  let joined = $state(!!urlSeat);
  let playerName = $state(localStorage.getItem('belotier.name') ?? '');

  const s = $derived(net.state);
  const you = $derived(s?.you ?? urlSeat ?? 'sud');
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
          // The server names this field `trump`, not `suit` — reading the wrong
          // one silently produced "Atout undefined" on screen. The enseigne is
          // stamped into the wax rather than spelled out.
          banner(
            `${SEAT_LABEL[e.taker] ?? e.taker} prend`,
            `Atout ${SUIT_LABEL[e.trump] ?? e.trump}`,
            'gold',
            2400,
            { seal: true, suit: e.trump },
          );
          shake(2);
          break;
        }
        case 'play':
          if (e.seat !== you) sfx.play();
          break;
        case 'trick': {
          sfx.trick();
          const tone = e.team === 'ns' ? 'ns' : 'eo';
          if (e.points > 0) floatText(`+${e.points}`, tone, 50, 40);
          // Amplitude follows the stakes: a 12-point trick should not hit as
          // hard as a 40-point one.
          if (e.points >= 30) shake(3);
          else if (e.points >= 18) shake(1);
          break;
        }
        case 'belote':
          sfx.belote();
          banner('Belote !', SEAT_LABEL[e.seat] ?? '', 'gold', 1600);
          shake(2);
          break;
        case 'deal_end':
          if (e.capot) { shake(3); embers(2200, 60); }
          break;
        case 'game_end': {
          const mine = s?.teams?.[you];
          const win = e.winner === mine;
          (win ? sfx.win : sfx.lose)();
          if (win) embers();
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

<div class="root shake-{fx.shakeTier}" class:shake={fx.shaking}>
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
          <span class="trump" title={SUIT_LABEL[s.trump]}>
            <Suit suit={s.trump} size={26} color={SUIT_INK[s.trump]} labelled />
          </span>
        {/if}
        {#if s.taker}<span class="pill">{SEAT_LABEL[s.taker]} preneur</span>{/if}
        {#if s.carried}<span class="pill">report {s.carried}</span>{/if}
      </div>
      <!-- Inline SVG, not an emoji: a headless/older font set renders the
           speaker emoji as an empty box. -->
      <button class="icon" onclick={() => toggleMute()} aria-label={audio.muted ? 'Activer le son' : 'Couper le son'}>
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
          {#if audio.muted}
            <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
          {:else}
            <path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
          {/if}
        </svg>
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
          <Sigil {you} turn={s.turn} />
          {#if s.phase === 'bidding' && s.bidding}
            <Bidding bidding={s.bidding} retourne={s.retourne} {template}
                     yourTurn={s.bidding.current === you} onbid={bid} />
          {:else if s.phase === 'lobby'}
            <div class="await">
              <div class="big-num">{Object.values(s.seats).filter((x) => x.online).length} / 4</div>
              <p>En attente des joueurs…</p>
            </div>
          {:else}
            <Trick trick={s.trick} {you} {template} winner={s.trickWinner} trump={s.trump} />
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
        <Hand cards={s.hand} playable={s.playable} {template} {yourTurn} trump={s.trump} onplay={play} />
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
  /* Scores on brass tallies. The team colour is the engraved edge, not a fill:
     a filled block of team colour is what made the old header read as generic. */
  .sc {
    display: flex; flex-direction: column; align-items: center; line-height: 1.05;
    padding: 5px 12px; border-radius: 4px;
    background: linear-gradient(var(--leather-2), var(--leather-0));
    border: 1px solid var(--c);
    box-shadow:
      inset 0 1px 0 rgba(234, 211, 160, .16),
      inset 0 -2px 5px rgba(0, 0, 0, .5),
      0 2px 0 var(--void);
  }
  .sc.mine { box-shadow: inset 0 1px 0 rgba(234, 211, 160, .22), 0 2px 0 var(--void), 0 0 0 1px var(--c), 0 0 16px color-mix(in srgb, var(--c) 40%, transparent); }
  .lab {
    font-family: var(--font-roman);
    font-size: 8.5px; text-transform: uppercase; letter-spacing: .1em;
    white-space: nowrap;
    color: var(--parchment-faint);
  }
  .sc b {
    font-family: var(--font-roman);
    font-variant-numeric: tabular-nums;
    font-size: 20px; font-weight: 800; color: var(--parchment);
    text-shadow: 0 -1px 0 rgba(0, 0, 0, .6);
  }
  .mid { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; justify-content: center; }
  /* The trump, struck on a brass medallion — the single most consulted piece of
     information on the screen, so it gets the only round frame on the board. */
  .trump {
    display: grid; place-items: center;
    width: 44px; height: 44px;
    border-radius: 50%;
    background: radial-gradient(60% 60% at 38% 30%, var(--leather-2), var(--void));
    border: 1px solid var(--gold-deep);
    box-shadow:
      inset 0 1px 0 rgba(234, 211, 160, .22),
      inset 0 -3px 7px rgba(0, 0, 0, .6),
      0 0 16px rgba(200, 160, 74, .22);
  }
  .icon {
    padding: 9px 11px; min-height: 42px; display: grid; place-items: center;
    color: var(--parchment-dim);
  }

  .board { flex: 1; display: grid; grid-template-rows: auto 1fr auto; min-height: 0; gap: 4px; }
  .row { display: flex; align-items: center; justify-content: center; }
  .middle { display: grid; grid-template-columns: auto 1fr auto; gap: 6px; align-items: center; min-height: 0; }
  .side { display: flex; justify-content: center; }
  .centre { position: relative; min-height: 150px; display: grid; place-items: center; }
  .bottom { flex-direction: column; gap: 2px; }

  .status {
    font-family: var(--font-roman);
    font-size: 11px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase;
    color: var(--parchment-faint); min-height: 18px;
  }
  .status.yours { color: var(--gold); text-shadow: 0 0 16px rgba(200, 160, 74, .55); }

  .await { text-align: center; color: var(--parchment-dim); position: relative; z-index: 1; }
  .await p { font-family: var(--font-text); font-size: 15px; font-style: italic; }
  .big-num {
    font-family: var(--font-display);
    font-size: 56px; color: var(--gold);
    text-shadow: 0 3px 0 var(--void), 0 0 30px rgba(200, 160, 74, .3);
  }

  .gate {
    flex: 1; display: flex; flex-direction: column; gap: 14px;
    align-items: center; justify-content: center; text-align: center; padding: 20px;
  }
  .gate h1 {
    font-family: var(--font-display);
    font-size: clamp(34px, 12vw, 56px); margin: 0; color: var(--gold);
    text-shadow: 0 3px 0 var(--void), 0 0 34px rgba(200, 160, 74, .25);
  }
  .lede {
    font-family: var(--font-text); font-size: 17px;
    color: var(--parchment-dim); max-width: 34ch; line-height: 1.55;
  }
  .big { font-size: 17px; padding: 15px 28px; }

  .net, .toast {
    position: fixed; left: 50%; translate: -50% 0; z-index: 85;
    padding: 9px 17px; border-radius: 3px;
    font-family: var(--font-roman);
    font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
    border: 1px solid rgba(0, 0, 0, .5);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, .14), 0 6px 20px rgba(0, 0, 0, .6);
  }
  .net { top: calc(env(safe-area-inset-top) + 8px); background: var(--gold-dark); color: var(--gold-hi); }
  .toast { bottom: calc(env(safe-area-inset-bottom) + 14px); background: var(--oxblood-deep); color: #f4ccc6; }

  @media (min-width: 760px) {
    :root { --card-w: 104px; --card-h: 146px; }
    .centre { min-height: 250px; }
  }
</style>
