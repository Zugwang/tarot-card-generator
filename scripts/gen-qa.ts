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

console.log('QA svgs written to', dir);
