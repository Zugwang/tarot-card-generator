<script lang="ts">
  /* The engraved wind rose behind the trick zone. It is not pure decoration:
     the branches carry the four seats' initials placed where those players
     actually sit ON SCREEN (you are always at the bottom), and the branch of
     whoever must play lights up. So the esoteric motif doubles as the table's
     orientation diagram — which is also why the seats being named Nord/Est/
     Sud/Ouest made a compass the obvious choice. */
  import { SEAT_LABEL, relative } from './cards';

  interface Props {
    you?: string;
    turn?: string | null;
    size?: number;
  }
  let { you = 'sud', turn = null, size = 300 }: Props = $props();

  const SEATS = ['nord', 'est', 'sud', 'ouest'];
  // Screen position -> coordinates on the 200x200 face, and text anchor.
  // Pulled inside the outer ring (r=92) rather than sitting on it: at the rim
  // the letters ended up over the neighbouring seats on a 390px screen.
  const AT: Record<string, { x: number; y: number }> = {
    top: { x: 100, y: 16 },
    right: { x: 184, y: 104 },
    bottom: { x: 100, y: 192 },
    left: { x: 16, y: 104 },
  };

  const branches = $derived(
    SEATS.map((seat) => {
      const where = relative(you, seat);
      return { seat, ...AT[where], active: turn === seat, initial: SEAT_LABEL[seat]?.[0] ?? '?' };
    }),
  );

  // Eight ticks, long on the cardinals.
  const ticks = Array.from({ length: 16 }, (_, i) => ({
    a: (i * 360) / 16,
    long: i % 4 === 0,
  }));
</script>

<svg class="sigil" viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
  <!-- Rotating outer ring of marks: the only moving part, so the fixed
       lettering stays readable. -->
  <g class="ring">
    <circle cx="100" cy="100" r="92" />
    <circle cx="100" cy="100" r="86" stroke-dasharray="2 7" />
    {#each ticks as t (t.a)}
      <line
        x1="100" y1={t.long ? 6 : 10} x2="100" y2={t.long ? 18 : 15}
        transform="rotate({t.a} 100 100)"
      />
    {/each}
  </g>

  <g class="rose">
    <circle cx="100" cy="100" r="68" stroke-dasharray="1 5" />
    <circle cx="100" cy="100" r="40" />
    <!-- Four long points and four short, the usual wind-rose construction. -->
    <path d="M100 32 L112 100 L100 168 L88 100 Z" />
    <path d="M32 100 L100 88 L168 100 L100 112 Z" />
    <g class="minor">
      <path d="M100 52 L108 100 L100 148 L92 100 Z" transform="rotate(45 100 100)" />
      <path d="M52 100 L100 92 L148 100 L100 108 Z" transform="rotate(45 100 100)" />
    </g>
    <circle cx="100" cy="100" r="7" class="hub" />
  </g>

  {#each branches as b (b.seat)}
    <text class="label" class:active={b.active} x={b.x} y={b.y}>{b.initial}</text>
  {/each}
</svg>

<style>
  .sigil {
    position: absolute;
    left: 50%;
    top: 50%;
    translate: -50% -50%;
    pointer-events: none;
    z-index: 0;
    /* Driven by the column it sits in, never by the `size` attribute, which is
       only a fallback for a context with no width of its own. */
    width: min(100%, 300px);
    height: auto;
    aspect-ratio: 1;
  }

  /* Engraved, not drawn: hairlines at low opacity, no fills. */
  .ring, .rose { fill: none; stroke: var(--gold); stroke-width: 1; opacity: .13; }
  .ring line { stroke-width: 1.4; }
  .rose path { fill: var(--gold); fill-opacity: .05; stroke-opacity: .5; }
  .minor path { fill-opacity: .025; }
  .hub { fill: var(--gold); fill-opacity: .14; }

  .ring { animation: turn 150s linear infinite; transform-origin: 50% 50%; }
  @keyframes turn { to { rotate: 360deg; } }

  .label {
    font-family: var(--font-roman);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: .08em;
    text-anchor: middle;
    dominant-baseline: middle;
    fill: var(--gold);
    opacity: .18;
    transition: opacity .4s ease, filter .4s ease;
  }
  /* Whose turn it is. Subtle on purpose: the hand's gold rim is the loud cue,
     this is the quiet confirmation. */
  .label.active {
    opacity: .95;
    filter: drop-shadow(0 0 7px rgba(200, 160, 74, .75));
  }
</style>
