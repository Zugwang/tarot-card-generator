// Pip positioning templates. Each layout maps a pip count (1..10) to a list of
// symbol placements in NORMALIZED pip-area coordinates (0..1, origin top-left).
// Pips below the horizontal midline are drawn rotated 180°, exactly like a real
// deck. Multiple templates can coexist — `classic` is the traditional French/
// English arrangement; alternates (e.g. `grid`) can be added with the same shape.

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

// Column x-positions and key row y-positions.
const L = 0.28;
const C = 0.5;
const R = 0.72;
const T = 0.14; // top row
const B = 0.86; // bottom row

const p = (x: number, y: number): PipPlacement => ({
  x,
  y,
  rot: y > 0.5 + 1e-6 ? 180 : 0,
});

// Traditional arrangement, ranks 1..10.
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

export const classicTemplate: PipTemplate = {
  id: 'classic',
  label: 'Classique',
  layout: (n) => CLASSIC[n] ?? [],
};

export const PIP_TEMPLATES: PipTemplate[] = [classicTemplate];
