import { generateDeck } from '../src/lib/model/deck';
import { renderCardSVG } from '../src/lib/render/card';
import { pipTemplate } from '../src/lib/render/pipLayouts';
import { writeFileSync } from 'node:fs';

const cards = generateDeck(52);
const seven = cards.find((c) => c.kind === 'pip' && c.suit === 'pique' && c.rank === 7)!;
const base = { width: 250, height: 455, pipTemplate: pipTemplate('classic') };
const free = { hideBase: false, layers: [], bgImage: { href: 'land.png', rot: 0 } };
writeFileSync('dist/qa-nohalo.svg', renderCardSVG(seven, { ...base, freeCard: free, contrastPips: false }));
writeFileSync('dist/qa-halo.svg', renderCardSVG(seven, { ...base, freeCard: free, contrastPips: true }));
console.log('wrote nohalo, halo');
