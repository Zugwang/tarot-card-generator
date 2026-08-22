// Card-back motifs — procedural SVG parameterised by a base color. Self-contained
// (takes w,h) so it can be used as the base of a "back" card without importing
// the card renderer. Pattern ink is white at low opacity to read on any color.

export interface BackTemplate {
  id: string;
  label: string;
}

export const BACK_TEMPLATES: BackTemplate[] = [
  { id: 'uni', label: 'Uni' },
  { id: 'quadrille', label: 'Quadrillé' },
  { id: 'losanges', label: 'Losanges' },
  { id: 'pois', label: 'Pois' },
  { id: 'chevrons', label: 'Chevrons' },
  { id: 'etoiles', label: 'Étoiles' },
  { id: 'ornement', label: 'Ornement' },
  { id: 'enseigne', label: 'Enseigne' },
];

function pattern(id: string): string {
  const ink = '#ffffff';
  const common = `stroke="${ink}" stroke-opacity="0.28" fill="none" stroke-width="1.6"`;
  switch (id) {
    case 'quadrille':
      return `<pattern id="${id}" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M0 0 L18 18 M18 0 L0 18" ${common}/></pattern>`;
    case 'losanges':
      return `<pattern id="${id}" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M10 0 L20 10 L10 20 L0 10 Z" ${common}/></pattern>`;
    case 'pois':
      return `<pattern id="${id}" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="2.6" fill="${ink}" fill-opacity="0.32"/></pattern>`;
    case 'chevrons':
      return `<pattern id="${id}" width="22" height="16" patternUnits="userSpaceOnUse"><path d="M0 16 L11 5 L22 16 M0 6 L11 -5 L22 6" ${common}/></pattern>`;
    case 'etoiles':
      return `<pattern id="${id}" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M12 4 L14 10 L20 12 L14 14 L12 20 L10 14 L4 12 L10 10 Z" fill="${ink}" fill-opacity="0.3"/></pattern>`;
    default:
      return '';
  }
}

/** Inner markup for a back motif (defs + fills), inside the card's rounded frame. */
export function backBase(templateId: string, color: string, w: number, h: number): string {
  const id = templateId || 'uni';
  const m = 12;
  const iw = w - 2 * m;
  const ih = h - 2 * m;
  const pat = pattern(id);
  const fill = pat ? `<rect x="${m}" y="${m}" width="${iw}" height="${ih}" rx="12" fill="url(#${id})"/>` : '';

  let ornement = '';
  if (id === 'ornement') {
    ornement =
      `<rect x="${m + 8}" y="${m + 8}" width="${iw - 16}" height="${ih - 16}" rx="8" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="2"/>` +
      `<rect x="${m + 14}" y="${m + 14}" width="${iw - 28}" height="${ih - 28}" rx="6" fill="none" stroke="#fff" stroke-opacity="0.3" stroke-width="1"/>` +
      `<g transform="translate(${w / 2} ${h / 2})" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="2">` +
      `<circle r="30"/><circle r="20"/><circle r="10"/>` +
      `<path d="M-30 0 L30 0 M0 -30 L0 30" stroke-opacity="0.35"/></g>`;
  }

  return (
    (pat ? `<defs>${pat}</defs>` : '') +
    `<rect x="${m}" y="${m}" width="${iw}" height="${ih}" rx="12" fill="${color}"/>` +
    fill +
    ornement
  );
}

/** Standalone back SVG (kept for convenience / thumbnails). */
export function renderBackSVG(opts: { width?: number; height?: number; templateId?: string; color?: string } = {}): string {
  const w = opts.width ?? 250;
  const h = opts.height ?? 350;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">` +
    `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="16" fill="#ffffff" stroke="#d9d4c8" stroke-width="2"/>` +
    backBase(opts.templateId ?? 'quadrille', opts.color ?? '#8a1f2b', w, h) +
    `</svg>`
  );
}
