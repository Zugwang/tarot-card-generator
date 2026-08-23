// Curated, self-hosted font set for text overlays. woff2 in /public/fonts,
// loaded via @font-face (app.css). Deliberately varied for card indices.
// System families need no file; custom ones carry a `url` used both for the
// @font-face and for data-URL inlining at export time.

export interface FontDef {
  id: string;
  label: string;
  family: string; // CSS font-family value used in SVG
  url?: string; // /fonts/*.woff2 for self-hosted faces
}

export const FONTS: FontDef[] = [
  { id: 'georgia', label: 'Georgia (serif)', family: 'Georgia, serif' },
  { id: 'sans', label: 'Sans système', family: 'system-ui, sans-serif' },
  { id: 'cinzel', label: 'Cinzel (romain)', family: 'Cinzel', url: '/fonts/cinzel.woff2' },
  { id: 'bebas', label: 'Bebas Neue (bâton)', family: 'Bebas Neue', url: '/fonts/bebas.woff2' },
  { id: 'pirata', label: 'Pirata One (gothique)', family: 'Pirata One', url: '/fonts/pirata.woff2' },
  { id: 'rye', label: 'Rye (western)', family: 'Rye', url: '/fonts/rye.woff2' },
  { id: 'majormono', label: 'Major Mono', family: 'Major Mono Display', url: '/fonts/majormono.woff2' },
];

export function fontById(id: string | undefined): FontDef {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}
export function fontFamily(id: string | undefined): string {
  return fontById(id).family;
}
