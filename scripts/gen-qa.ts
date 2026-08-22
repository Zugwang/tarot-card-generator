// Dev-only visual QA of the whole engine. Writes labeled SVGs into dist/ root
// (so rsvg-convert can load /art images via descendant-relative href).
import { writeFileSync } from 'node:fs';
import type { Card } from '../src/lib/model/deck';
import { renderCardSVG, FORMATS, type FormatId } from '../src/lib/render/card';
import { PIP_TEMPLATES } from '../src/lib/render/pipLayouts';
import { renderBackSVG, BACK_TEMPLATES } from '../src/lib/render/back';

const dir = process.argv[2] || 'dist';
const rel = (svg: string) => svg.replace(/"\/art\//g, '"art/');
const write = (name: string, svg: string) => writeFileSync(`${dir}/__qa_${name}.svg`, rel(svg));

const pip5: Card = { kind: 'pip', suit: 'coeur', rank: 5 };
const pip10: Card = { kind: 'pip', suit: 'pique', rank: 10 };
const dame: Card = { kind: 'court', suit: 'coeur', rank: 'dame' };

// 1. pip templates (on a 10)
for (const t of PIP_TEMPLATES) write(`tpl-${t.id}`, renderCardSVG(pip10, { pipTemplate: t }));
// 2. court styles
for (const s of ['marseille', 'grimaud', 'genere']) write(`court-${s}`, renderCardSVG(dame, { courtStyle: s }));
// 3. formats (pip)
for (const f of Object.keys(FORMATS) as FormatId[]) write(`fmt-${f}`, renderCardSVG(pip5, { height: FORMATS[f].h }));
// 4. backs
for (const b of BACK_TEMPLATES) write(`back-${b.id}`, renderBackSVG({ templateId: b.id, color: '#8a1f2b' }));

// 5. free mode (static render used by export)
const freeLayers = [
  { id: 'a', type: 'suit', suit: 'trefle', x: 0.3, y: 0.32, size: 70, rot: 20, color: '#1a7a3a' } as const,
  { id: 'b', type: 'text', text: 'JOKER', color: '#8a1f2b', x: 0.5, y: 0.7, size: 30, rot: 0 } as const,
  { id: 'c', type: 'suit', suit: 'coeur', x: 0.72, y: 0.5, size: 40, rot: -15 } as const,
];
write('free-overlay', renderCardSVG(pip5, { freeCard: { hideBase: false, layers: freeLayers } }));
write('free-blank', renderCardSVG(pip5, { freeCard: { hideBase: true, layers: freeLayers } }));

// 6. refinements: image fit (meet vs slice) + suit recolor
write('fit-meet', renderCardSVG(dame, { courtStyle: 'marseille', imageFit: 'meet' }));
write('fit-slice', renderCardSVG(dame, { courtStyle: 'marseille', imageFit: 'slice' }));
write('recolor', renderCardSVG({ kind: 'pip', suit: 'pique', rank: 7 }, { suitColors: { pique: '#0e7c7b' } }));

console.log('QA svgs written to', dir);
