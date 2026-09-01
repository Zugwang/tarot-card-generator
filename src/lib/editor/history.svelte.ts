// Undo/redo history (Ctrl+Z / Ctrl+Shift+Z).
//
// Design goals (client RAM matters — see project notes):
//   • Snapshots are compact JSON strings of the serializable editor state
//     (the same KEYS the project save uses), NOT live object clones.
//   • The stack is bounded twice over: by entry COUNT and by a total BYTE
//     budget. Whichever limit is hit first evicts the oldest snapshot, so the
//     history can never grow without bound even when cards carry heavy
//     data-URL images (Commons backgrounds, uploads).
//   • Capturing is driven by a single debounced watcher in App.svelte, so a
//     continuous gesture (drag, slider sweep) collapses into ONE step.
//
// RAM math: a snapshot's cost ≈ the sum of the data-URL bytes currently in the
// deck (geometry is negligible). MAX_BYTES caps the *whole* history, so the
// worst case is bounded by the budget below regardless of deck size or how
// many undo steps exist.

import { snapshotState, restoreState } from './project';

const MAX_ENTRIES = 60;
const MAX_BYTES = 24 * 1024 * 1024; // ~24 MB of snapshot text (≈48 MB UTF-16)

let past: string[] = [];
let future: string[] = [];
let baseline: string | null = null; // snapshot matching the live state
let restoring = false;

/** Reactive flags for the toolbar buttons + a debug read-out of the cost. */
export const history = $state({ canUndo: false, canRedo: false, steps: 0, bytes: 0 });

function totalChars(): number {
  let n = baseline ? baseline.length : 0;
  for (const s of past) n += s.length;
  for (const s of future) n += s.length;
  return n;
}
function refresh(): void {
  history.canUndo = past.length > 0;
  history.canRedo = future.length > 0;
  history.steps = past.length;
  history.bytes = totalChars() * 2; // JS strings are UTF-16 in memory
}
function evict(): void {
  while (past.length > MAX_ENTRIES) past.shift();
  // Keep at least one undo step even if a single snapshot is huge.
  while (past.length > 1 && totalChars() > MAX_BYTES) past.shift();
}

/** Adopt the current state as the baseline and clear history (call at startup
 *  and after loading a project). */
export function primeHistory(): void {
  baseline = snapshotState();
  past = [];
  future = [];
  refresh();
}

/** Record the current state as a new undo step (no-op if unchanged). Called by
 *  the debounced watcher — never while restoring. */
export function commit(): void {
  if (restoring) return;
  const snap = snapshotState();
  if (baseline === null) {
    baseline = snap;
    return;
  }
  if (snap === baseline) return;
  past.push(baseline);
  baseline = snap;
  future = [];
  evict();
  refresh();
}

export function isRestoring(): boolean {
  return restoring;
}

function apply(json: string): void {
  restoring = true;
  restoreState(json);
  // Release the guard after the reactive flush settles, so the watcher effect
  // that reacts to this restore does NOT record it as a fresh step.
  const release = () => (restoring = false);
  if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(release);
  else setTimeout(release, 30);
}

export function undo(): void {
  if (!past.length) return;
  future.push(baseline!);
  baseline = past.pop()!;
  apply(baseline);
  refresh();
}

export function redo(): void {
  if (!future.length) return;
  past.push(baseline!);
  baseline = future.pop()!;
  apply(baseline);
  refresh();
}
