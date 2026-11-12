<script lang="ts">
  // Your eight cards, fanned. Tap once to raise a card, tap again to play it —
  // playing on the first tap causes far too many misplays on a phone.
  import Card from './Card.svelte';
  import { sfx } from './sfx.svelte';

  interface Props {
    cards: string[];
    playable: string[];
    template: string;
    yourTurn: boolean;
    trump?: string | null;
    onplay: (id: string) => void;
  }
  let { cards, playable, template, yourTurn, trump = null, onplay }: Props = $props();

  let width = $state(340);
  let selected = $state<string | null>(null);

  // Keep the raised card honest when the hand changes under us.
  $effect(() => {
    if (selected && !cards.includes(selected)) selected = null;
  });

  const n = $derived(cards.length);
  const step = $derived(
    n <= 1 ? 0 : Math.min(74, Math.max(26, (width - 96) / (n - 1))),
  );

  function geom(i: number) {
    const mid = (n - 1) / 2;
    const d = i - mid;
    // Arc UPWARDS from the baseline: the outermost cards sit at 0 and the middle
    // ones rise. Curving downwards instead pushed the edge cards off the bottom
    // of a phone screen, which is exactly what happened in the first build.
    const lift = -(mid ** 2 - d ** 2) * 2.2;
    return { x: d * step, angle: d * 4.2, lift };
  }

  function pick(id: string) {
    if (!playable.includes(id)) {
      sfx.error();
      return;
    }
    if (selected === id) {
      selected = null;
      onplay(id);
    } else {
      selected = id;
      sfx.lift();
    }
  }
</script>

<div class="hand" bind:clientWidth={width}>
  {#each cards as id, i (id)}
    {@const g = geom(i)}
    <div class="slot" style="transform: translateX({g.x}px); z-index: {selected === id ? 50 : i}">
      <Card
        {template}
        {id}
        {trump}
        angle={g.angle}
        lift={g.lift}
        idle={i * 0.18}
        playable={yourTurn && playable.includes(id)}
        dim={yourTurn && !playable.includes(id)}
        selected={selected === id}
        onpick={() => pick(id)}
        label={selected === id ? `Jouer ${id}` : `Choisir ${id}`}
      />
    </div>
  {/each}
  {#if selected}
    <div class="hint">Retape pour jouer</div>
  {/if}
</div>

<style>
  .hand {
    position: relative;
    /* Room for the arc, for the 42px selection lift and for its 1.14 scale. */
    height: calc(var(--card-h) + 104px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .slot {
    position: absolute;
    /* The fan rotates about a point below the card, so the outer cards swing
       their bottom corner down; this clears it. */
    bottom: 18px;
    transition: transform .3s var(--spring);
  }
  .hint {
    position: absolute;
    top: 0;
    left: 50%;
    translate: -50% 0;
    font-family: var(--font-roman);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .16em;
    text-transform: uppercase;
    white-space: nowrap;
    color: var(--gold);
    text-shadow: 0 2px 6px rgba(0, 0, 0, .8);
    animation: blink 1.4s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes blink { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
</style>
