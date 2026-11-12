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
    onplay: (id: string) => void;
  }
  let { cards, playable, template, yourTurn, onplay }: Props = $props();

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
    return { x: d * step, angle: d * 4.2, lift: Math.abs(d) ** 2 * 2.4 };
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
    height: calc(var(--card-h) + 54px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 6px;
  }
  .slot {
    position: absolute;
    bottom: 6px;
    transition: transform .3s var(--spring);
  }
  .hint {
    position: absolute;
    bottom: -2px;
    left: 50%;
    translate: -50% 0;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--gold);
    text-shadow: 0 2px 6px rgba(0, 0, 0, .8);
    animation: blink 1.4s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes blink { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
</style>
