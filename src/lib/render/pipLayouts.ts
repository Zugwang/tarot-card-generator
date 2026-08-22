// Pip positioning templates. Each layout maps a pip count (1..10) to a list of
// symbol placements in NORMALIZED pip-area coordinates (0..1, origin top-left).
// Pips below the horizontal midline are drawn rotated 180°, like a real deck.

export interface PipPlacement {
  x: number;
  y: number;
  rot: 0 | 180;
}

export type PipLayout = (n: number) => PipPlacement[];

export interface PipTemplate {
  id: string;
  label: string;
  layout: PipLayout;
}

const p = (x: number, y: number): PipPlacement => ({
  x,
  y,
  rot: y > 0.5 + 1e-6 ? 180 : 0,
});

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);
const clamp = (v: number) => Math.max(0.06, Math.min(0.94, v));

// ---- classic (traditional French/English arrangement) -----------------------

const L = 0.28;
const C = 0.5;
const R = 0.72;
const T = 0.14;
const B = 0.86;

const CLASSIC: Record<number, PipPlacement[]> = {
  1: [p(C, C)],
  2: [p(C, T), p(C, B)],
  3: [p(C, T), p(C, C), p(C, B)],
  4: [p(L, T), p(R, T), p(L, B), p(R, B)],
  5: [p(L, T), p(R, T), p(C, C), p(L, B), p(R, B)],
  6: [p(L, T), p(R, T), p(L, C), p(R, C), p(L, B), p(R, B)],
  7: [p(L, T), p(R, T), p(C, (T + C) / 2), p(L, C), p(R, C), p(L, B), p(R, B)],
  8: [
    p(L, T), p(R, T), p(C, (T + C) / 2),
    p(L, C), p(R, C),
    p(C, (C + B) / 2), p(L, B), p(R, B),
  ],
  9: [
    p(L, T), p(R, T),
    p(L, 0.39), p(R, 0.39),
    p(C, C),
    p(L, 0.61), p(R, 0.61),
    p(L, B), p(R, B),
  ],
  10: [
    p(L, T), p(R, T),
    p(C, 0.3),
    p(L, 0.39), p(R, 0.39),
    p(C, 0.7),
    p(L, 0.61), p(R, 0.61),
    p(L, B), p(R, B),
  ],
};

const classicLayout: PipLayout = (n) => CLASSIC[n] ?? [];

// ---- spaced (classic pushed toward the edges) -------------------------------

const spacedLayout: PipLayout = (n) =>
  classicLayout(n).map((pl) => ({
    x: clamp(0.5 + (pl.x - 0.5) * 1.4),
    y: clamp(0.5 + (pl.y - 0.5) * 1.18),
    rot: pl.rot,
  }));

// ---- circular ---------------------------------------------------------------

const circularLayout: PipLayout = (n) => {
  if (n <= 1) return [p(C, C)];
  const radius = 0.37;
  return range(n).map((i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return p(0.5 + radius * Math.cos(a), 0.5 + radius * Math.sin(a));
  });
};

// ---- grid -------------------------------------------------------------------

const gridLayout: PipLayout = (n) => {
  if (n <= 1) return [p(C, C)];
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const step = 0.74 / cols;
  return range(n).map((i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const cellsInRow = Math.min(cols, n - row * cols);
    const x = 0.5 + (col - (cellsInRow - 1) / 2) * step;
    const y = rows === 1 ? C : 0.12 + 0.76 * (row / (rows - 1));
    return p(clamp(x), clamp(y));
  });
};

// ---- diagonal ---------------------------------------------------------------

const diagonalLayout: PipLayout = (n) => {
  if (n <= 1) return [p(C, C)];
  return range(n).map((i) => {
    const t = i / (n - 1);
    return p(0.16 + 0.68 * t, 0.12 + 0.76 * t);
  });
};

// ---- registry ---------------------------------------------------------------

export const classicTemplate: PipTemplate = { id: 'classic', label: 'Classique', layout: classicLayout };

export const PIP_TEMPLATES: PipTemplate[] = [
  classicTemplate,
  { id: 'spaced', label: 'Espacé', layout: spacedLayout },
  { id: 'circular', label: 'Circulaire', layout: circularLayout },
  { id: 'grid', label: 'Grille', layout: gridLayout },
  { id: 'diagonal', label: 'Diagonale', layout: diagonalLayout },
];

export function pipTemplate(id: string | undefined): PipTemplate {
  return PIP_TEMPLATES.find((t) => t.id === id) ?? classicTemplate;
}
