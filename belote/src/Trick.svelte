<script lang="ts">
  // The four played cards, laid out around the middle. Each lands with a spring;
  // when the trick is won the whole pile slides off towards its winner.
  import Card from './Card.svelte';
  import { relative } from './cards';

  interface Props {
    trick: { seat: string; card: string }[];
    you: string;
    template: string;
    winner: string | null;
    trump?: string | null;
  }
  let { trick, you, template, winner, trump = null }: Props = $props();
  const sweepTo = $derived(winner ? relative(you, winner) : null);
</script>

<div class="trick" class:sweeping={!!sweepTo} data-to={sweepTo}>
  {#each trick as p (p.seat)}
    <div class="pos {relative(you, p.seat)}">
      <Card {template} id={p.card} {trump} flying />
    </div>
  {/each}
</div>

<style>
  .trick {
    position: relative;
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    transition: transform .5s var(--spring), opacity .5s ease;
  }
  .pos { position: absolute; transition: all .4s var(--spring); }
  .bottom { translate: 0 42px; }
  .top { translate: 0 -42px; }
  .left { translate: -58px 0; rotate: -8deg; }
  .right { translate: 58px 0; rotate: 8deg; }

  /* Sweep the pile toward whoever won it. */
  .sweeping { opacity: 0; }
  .sweeping[data-to="bottom"] { transform: translateY(150px) scale(.6); }
  .sweeping[data-to="top"] { transform: translateY(-150px) scale(.6); }
  .sweeping[data-to="left"] { transform: translateX(-190px) scale(.6); }
  .sweeping[data-to="right"] { transform: translateX(190px) scale(.6); }
</style>
