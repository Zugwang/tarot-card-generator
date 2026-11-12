// Visual flourishes: screen shake, floating score numbers, and a confetti burst.
// Deliberately tiny and dependency-free; everything is DOM + CSS transforms.

export const fx = $state({
  shaking: false,
  floaters: [] as { id: number; text: string; tone: string; x: number; y: number }[],
  banner: null as { text: string; sub: string; tone: string } | null,
});

let seq = 0;

export function shake(): void {
  fx.shaking = false;
  requestAnimationFrame(() => {
    fx.shaking = true;
    setTimeout(() => (fx.shaking = false), 460);
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

export function banner(text: string, sub = '', tone = 'gold', ms = 2200): void {
  fx.banner = { text, sub, tone };
  setTimeout(() => {
    if (fx.banner?.text === text) fx.banner = null;
  }, ms);
}

/** Confetti, drawn straight into a throwaway canvas overlay. */
export function confetti(durationMs = 2600): void {
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
  const colours = ['#f0b52e', '#e0414f', '#3d82e0', '#f6f1e2', '#6cc070'];
  const bits = Array.from({ length: 110 }, () => ({
    x: innerWidth * (0.2 + Math.random() * 0.6),
    y: -20 - Math.random() * innerHeight * 0.4,
    vx: (Math.random() - 0.5) * 3.2,
    vy: 2 + Math.random() * 3.4,
    w: 5 + Math.random() * 7,
    h: 8 + Math.random() * 10,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.26,
    c: colours[(Math.random() * colours.length) | 0],
  }));
  const start = performance.now();
  let raf = 0;
  const step = (now: number) => {
    const t = now - start;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const b of bits) {
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.045;
      b.rot += b.vr;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);
      ctx.fillStyle = b.c;
      ctx.globalAlpha = Math.max(0, 1 - t / durationMs);
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
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
