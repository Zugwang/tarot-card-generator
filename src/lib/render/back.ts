// Card-back renderer — same pure-SVG-string approach as the card front.
// Procedural templates parameterised by a base color; the pattern ink is white
// at low opacity so it reads on any base color.

import { CARD_W, DEFAULT_H } from './card';

export interface BackTemplate {
  id: string;
  label: string;
}

export const BACK_TEMPLATES: BackTemplate[] = [
  { id: 'uni', label: 'Uni' },
  { id: 'quadrille', label: 'Quadrillé' },
  { id: 'losanges', label: 'Losanges' },
  { id: 'pois', label: 'Pois' },
  { id: 'ornement', label: 'Ornement' },
];

export interface BackOptions {
  height?: number;
  templateId?: string;
  color?: string;
}

function pattern(id: string): string {
  const ink = '#ffffff';
  const common = `stroke="${ink}" stroke-opacity="0.28" fill="none" stroke-width="1.6"`;
  switch (id) {
    case 'quadrille':
      return (
        `<pattern id="${id}" width="18" height="18" patternUnits="userSpaceOnUse">` +
        `<path d="M0 0 L18 18 M18 0 L0 18" ${common}/></pattern>`
      );
    case 'losanges':
      return (
        `<pattern id="${id}" width="20" height="20" patternUnits="userSpaceOnUse">` +
        `<path d="M10 0 L20 10 L10 20 L0 10 Z" ${common}/></pattern>`
      );
    case 'pois':
      return (
        `<pattern id="${id}" width="18" height="18" patternUnits="userSpaceOnUse">` +
        `<circle cx="9" cy="9" r="2.6" fill="${ink}" fill-opacity="0.32"/></pattern>`
      );
    default:
      return '';
  }
}

/** Render a card back to a standalone SVG string. */
export function renderBackSVG(opts: BackOptions = {}): string {
  const h = opts.height ?? DEFAULT_H;
  const id = opts.templateId ?? 'quadrille';
  const color = opts.color ?? '#8a1f2b';
  const m = 12; // inner border margin
  const iw = CARD_W - 2 * m;
  const ih = h - 2 * m;

  const pat = pattern(id);
  const fill = pat ? `<rect x="${m}" y="${m}" width="${iw}" height="${ih}" rx="12" fill="url(#${id})"/>` : '';

  let ornement = '';
  if (id === 'ornement') {
    ornement =
      `<rect x="${m + 8}" y="${m + 8}" width="${iw - 16}" height="${ih - 16}" rx="8" ` +
      `fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="2"/>` +
      `<rect x="${m + 14}" y="${m + 14}" width="${iw - 28}" height="${ih - 28}" rx="6" ` +
      `fill="none" stroke="#fff" stroke-opacity="0.3" stroke-width="1"/>` +
      `<g transform="translate(${CARD_W / 2} ${h / 2})" fill="none" stroke="#fff" stroke-opacity="0.5" stroke-width="2">` +
      `<circle r="30"/><circle r="20"/><circle r="10"/>` +
      `<path d="M-30 0 L30 0 M0 -30 L0 30" stroke-opacity="0.35"/></g>`;
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${h}" ` +
    `width="${CARD_W}" height="${h}" role="img">` +
    (pat ? `<defs>${pat}</defs>` : '') +
    `<rect x="2" y="2" width="${CARD_W - 4}" height="${h - 4}" rx="16" fill="#ffffff" stroke="#d9d4c8" stroke-width="2"/>` +
    `<rect x="${m}" y="${m}" width="${iw}" height="${ih}" rx="12" fill="${color}"/>` +
    fill +
    ornement +
    `</svg>`
  );
}
