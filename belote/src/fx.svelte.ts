// Visual flourishes: screen shake, floating score numbers, the centre banner and
// an ember burst. Deliberately tiny and dependency-free; everything is DOM, CSS
// transforms, or one throwaway canvas that removes itself.

export type Tier = 1 | 2 | 3;

export const fx = $state({
  shaking: false,
  shakeTier: 2 as Tier,
  floaters: [] as { id: number; text: string; tone: string; x: number; y: number }[],
  banner: null as
    | { text: string; sub: string; tone: string; seal: boolean; suit: string | null }
    | null,
});

let seq = 0;

/** Shake the board. The tier picks the amplitude via a CSS custom property. */
export function shake(tier: Tier = 2): void {
  fx.shaking = false;
  fx.shakeTier = tier;
  requestAnimationFrame(() => {
    fx.shaking = true;
    setTimeout(() => (fx.shaking = false), 600);
  });
}

/** A "+32" that pops out of the table and drifts up. x/y are viewport percents. */
export function floatText(text: string, tone = 'gold', x = 50, y = 46): void {
  const id = ++seq;
  fx.floaters.push({ id, text, tone, x, y });
  setTimeout(() => {
    const i = fx.floaters.findIndex((f) => f.id === id);
    if (i >= 0) fx.floaters.splice(i, 1);
  }, 1400);
}

/**
 * The centre banner. `seal: true` stamps it like hot wax — used for the contract,
 * where the gesture of sealing a deal is the whole point.
 */
export function banner(
  text: string,
  sub = '',
  tone = 'gold',
  ms = 2200,
  opts: { seal?: boolean; suit?: string | null } = {},
): void {
  fx.banner = { text, sub, tone, seal: !!opts.seal, suit: opts.suit ?? null };
  setTimeout(() => {
    if (fx.banner?.text === text) fx.banner = null;
  }, ms);
}

/**
 * Embers: gold and oxblood motes that rise, flicker and burn out — the grimoire
 * counterpart to confetti, which read as a birthday party. Still one throwaway
 * canvas that cancels its own rAF and removes itself, so nothing is left behind
 * on a box where a stray loop costs real battery and CPU.
 */
export function embers(durationMs = 2800, count = 90): void {
  // Honour the user's motion setting: a particle storm is exactly what someone
  // with vestibular trouble has asked not to see.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:90';
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const palette = ['#ead3a0', '#c8a04a', '#b5432c', '#8c2b1e', '#f2e2bd'];
  const motes = Array.from({ length: count }, () => ({
    x: innerWidth * Math.random(),
    y: innerHeight + 10 + Math.random() * innerHeight * 0.5,
    vx: (Math.random() - 0.5) * 0.5,
    // Rising, not falling: embers go up.
    vy: -(0.7 + Math.random() * 1.9),
    r: 1 + Math.random() * 2.6,
    // Each mote flickers on its own phase, which is what reads as fire.
    phase: Math.random() * Math.PI * 2,
    flick: 0.06 + Math.random() * 0.14,
    drift: 0.004 + Math.random() * 0.012,
    c: palette[(Math.random() * palette.length) | 0],
  }));

  const start = performance.now();
  let raf = 0;
  const step = (now: number) => {
    const t = now - start;
    const fade = Math.max(0, 1 - t / durationMs);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalCompositeOperation = 'lighter';
    for (const m of motes) {
      m.phase += m.flick;
      // Sideways wander, so they do not rise in straight lines.
      m.vx += Math.sin(m.phase) * m.drift;
      m.x += m.vx;
      m.y += m.vy;
      const flicker = 0.55 + 0.45 * Math.sin(m.phase * 2.3);
      ctx.globalAlpha = fade * flicker;
      ctx.fillStyle = m.c;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * (0.75 + flicker * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    if (t < durationMs) {
      raf = requestAnimationFrame(step);
    } else {
      cancelAnimationFrame(raf);
      canvas.remove();
    }
  };
  raf = requestAnimationFrame(step);
}
