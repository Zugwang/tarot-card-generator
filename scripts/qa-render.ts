import { generateDeck } from '../src/lib/model/deck';
import { renderCardSVG } from '../src/lib/render/card';
import { pipTemplate } from '../src/lib/render/pipLayouts';
import { writeFileSync } from 'node:fs';

const c = generateDeck(52)[0];
const base = { width: 250, height: 455, pipTemplate: pipTemplate('classic') };
const mk = (rot: number) => renderCardSVG(c, { ...base, freeCard: { hideBase: true, layers: [], bgImage: { href: 'land.png', rot } } });
writeFileSync('dist/qa-cover0.svg', mk(0));
writeFileSync('dist/qa-cover90.svg', mk(90));
console.log('wrote cover0, cover90');
