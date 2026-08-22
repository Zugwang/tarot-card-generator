// Night-mode / theme state. Applies `data-theme` on <html> and persists the
// explicit choice. Falls back to the system preference when nothing is saved.

export type Theme = 'light' | 'dark';
const KEY = 'tarotier-theme';

function detect(): Theme {
  const saved = localStorage.getItem(KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const theme = $state({ mode: detect() as Theme });

/** Reflect the current theme onto the document root. */
export function applyTheme(): void {
  document.documentElement.dataset.theme = theme.mode;
}

export function toggleTheme(): void {
  theme.mode = theme.mode === 'dark' ? 'light' : 'dark';
  localStorage.setItem(KEY, theme.mode);
  applyTheme();
}
