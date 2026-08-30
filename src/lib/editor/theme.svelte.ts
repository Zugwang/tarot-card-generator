// Theme state. Applies `data-theme` on <html> and persists the choice.
// Beyond plain day/night, a set of "mystic" celestial themes inspired by the
// art direction of Clair Obscur: Expédition 33 (muted petrol + antique gold)
// and Hades II (moonlit indigo/violet + witch-gold). Each theme carries a
// small celestial glyph (sunrise → sun → eclipse → crescent → full moon).

export type ThemeId = 'aurore' | 'jour' | 'clair-obscur' | 'hades' | 'nuit';

export interface ThemeDef {
  id: ThemeId;
  label: string;
  /** Inline SVG (24×24, currentColor) — a mystic sun/moon glyph. */
  icon: string;
}

const RISE = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M7 19a5 5 0 0 1 10 0" fill="currentColor" fill-opacity=".18"/><line x1="3" y1="19" x2="21" y2="19"/><line x1="12" y1="4" x2="12" y2="6.5"/><line x1="5.2" y1="7.6" x2="6.9" y2="9.3"/><line x1="18.8" y1="7.6" x2="17.1" y2="9.3"/></svg>`;

const SUN = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4.2" fill="currentColor" fill-opacity=".18"/><line x1="12" y1="2.5" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21.5" y2="12"/><line x1="5.2" y1="5.2" x2="6.9" y2="6.9"/><line x1="17.1" y1="17.1" x2="18.8" y2="18.8"/><line x1="18.8" y1="5.2" x2="17.1" y2="6.9"/><line x1="6.9" y1="17.1" x2="5.2" y2="18.8"/></svg>`;

const ECLIPSE = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="3.5" y1="12" x2="6" y2="12"/><line x1="10" y1="3.2" x2="10" y2="5.5"/><line x1="4.6" y1="6.4" x2="6.2" y2="8"/><line x1="4.6" y1="17.6" x2="6.2" y2="16"/><line x1="10" y1="20.8" x2="10" y2="18.5"/><circle cx="10" cy="12" r="6.4"/><circle cx="14.6" cy="10.4" r="6" fill="currentColor" stroke="none"/></svg>`;

const CRESCENT = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M17.2 15.4A6.6 6.6 0 1 1 12 4.8a5.1 5.1 0 0 0 5.2 10.6Z" fill="currentColor" fill-opacity=".2"/><path d="M18.6 4.6l.62 1.5 1.5.62-1.5.62-.62 1.5-.62-1.5-1.5-.62 1.5-.62Z" fill="currentColor" stroke="none"/></svg>`;

const MOON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="7.6" fill="currentColor" fill-opacity=".16"/><circle cx="9.6" cy="9.8" r="1.2" fill="currentColor" fill-opacity=".55" stroke="none"/><circle cx="14.2" cy="13.4" r="1.7" fill="currentColor" fill-opacity=".45" stroke="none"/><circle cx="10.4" cy="15.2" r=".9" fill="currentColor" fill-opacity=".5" stroke="none"/></svg>`;

export const THEMES: ThemeDef[] = [
  { id: 'aurore', label: 'Aurore', icon: RISE },
  { id: 'jour', label: 'Jour', icon: SUN },
  { id: 'clair-obscur', label: 'Clair-obscur', icon: ECLIPSE },
  { id: 'hades', label: 'Crépuscule', icon: CRESCENT },
  { id: 'nuit', label: 'Nuit', icon: MOON },
];

const KEY = 'tarotier-theme';

function detect(): ThemeId {
  const saved = localStorage.getItem(KEY);
  if (saved === 'light') return 'jour'; // migrate legacy values
  if (saved === 'dark') return 'nuit';
  if (saved && THEMES.some((t) => t.id === saved)) return saved as ThemeId;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'nuit' : 'jour';
}

export const theme = $state({ id: detect() as ThemeId });

/** Reflect the current theme onto the document root. */
export function applyTheme(): void {
  document.documentElement.dataset.theme = theme.id;
}

export function setTheme(id: ThemeId): void {
  theme.id = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* private window / quota — theme still applies for the session */
  }
  applyTheme();
}

export function currentTheme(): ThemeDef {
  return THEMES.find((t) => t.id === theme.id) ?? THEMES[1];
}
